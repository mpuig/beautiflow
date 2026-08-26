import { createHash } from 'node:crypto'
import { parseMermaid } from 'beautiful-mermaid'
import { dirname, resolve } from 'node:path'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { applyActions, parseActions } from './diagram/actions.ts'
import { auditDiagram } from './diagram/audit.ts'
import { layoutProject } from './diagram/layout.ts'
import { defaultSidecarPath, loadProject, saveSidecar } from './diagram/project.ts'
import { polishProject } from './diagram/polish.ts'
import { diagnoseProject } from './diagram/semantic.ts'
import { parseTransformActions, transformProject } from './diagram/transform.ts'
import { CliError } from './errors.ts'
import { readInput, requestedOutputPath, writeOutput } from './io.ts'
import { diagramFamily, renderProjectOutput } from './diagram/pipeline.ts'

export type AgentMutationOperation = 'polish' | 'apply' | 'transform'
export type AgentReceiptState = 'validated' | 'applied' | 'verified' | 'needs-correction' | 'complete' | 'stale' | 'blocked' | 'rolled-back'

interface AgentReceipt {
  receiptVersion: 1
  protocolVersion: '1.1'
  state: AgentReceiptState
  source: string
  sidecar: string
  initialOperation: AgentMutationOperation
  pendingOperation: AgentMutationOperation
  actions: string | null
  hashes: {
    sourceBefore: string
    sidecarBefore: string | null
    actions: string | null
    sourceCurrent: string
    sidecarCurrent: string | null
  }
  snapshot: { source: string; sidecar: string | null }
  expected: { score: number; metrics: Record<string, number>; semanticScore: number }
  evidence: unknown
  budget: { initialOperations: 0 | 1; targetedCorrections: 0 | 1; visualInspections: 0 | 1 }
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function optionalText(path: string): Promise<string | null> {
  const file = Bun.file(path)
  return await file.exists() ? file.text() : null
}

async function fileState(sourcePath: string, sidecarPath: string) {
  const source = await readInput(sourcePath)
  const sidecar = await optionalText(sidecarPath)
  return { source, sidecar, sourceHash: hash(source), sidecarHash: sidecar === null ? null : hash(sidecar) }
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`)
  await rename(temporary, path)
}

async function loadReceipt(path: string): Promise<AgentReceipt> {
  let value: unknown
  try { value = JSON.parse(await readInput(path)) }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not read agent receipt: ${message}`, 2, 'INVALID_RECEIPT')
  }
  if (!value || typeof value !== 'object') throw new CliError('Agent receipt must be an object', 2, 'INVALID_RECEIPT')
  const receipt = value as Partial<AgentReceipt>
  if (receipt.receiptVersion !== 1 || receipt.protocolVersion !== '1.1' || !receipt.source || !receipt.sidecar || !receipt.state) {
    throw new CliError('Unsupported or incomplete agent receipt', 2, 'INVALID_RECEIPT')
  }
  const source = resolve(receipt.source)
  if (resolve(receipt.sidecar) !== resolve(defaultSidecarPath(source))) {
    throw new CliError('Agent receipt sidecar does not match its Mermaid source', 2, 'INVALID_RECEIPT')
  }
  receipt.source = source
  receipt.sidecar = resolve(receipt.sidecar)
  return receipt as AgentReceipt
}

function nextAction(operation: string, argv: string[], reason: string) {
  return { operation, argv, reason, requiresConfirmation: false }
}

async function parseActionFile(operation: AgentMutationOperation, actionsPath: string | null) {
  if (operation === 'polish') return { actions: null, text: null }
  if (!actionsPath) throw new CliError(`${operation} requires --actions <file>`, 2, 'MISSING_ACTIONS')
  const path = resolve(actionsPath)
  let text: string
  let input: unknown
  try { text = await readInput(path); input = JSON.parse(text) }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not parse actions file: ${message}`, 2, 'INVALID_ACTIONS')
  }
  const actions = operation === 'apply' ? parseActions(input) : parseTransformActions(input)
  return { actions, text, path }
}

async function dryRun(sourcePath: string, operation: AgentMutationOperation, actionsPath: string | null) {
  const project = await loadProject(sourcePath)
  const parsed = await parseActionFile(operation, actionsPath)
  if (operation === 'polish') {
    const result = await polishProject(project)
    return {
      evidence: { status: result.status, before: result.before, after: result.after, selected: result.selected, semantic: result.semantic },
      score: result.after.score,
      metrics: result.after.metrics as unknown as Record<string, number>,
      semanticScore: result.semantic.score,
      actionsPath: null,
      actionsText: null,
    }
  }
  if (operation === 'apply') {
    const original = structuredClone(project.sidecar)
    const result = await applyActions(project, parsed.actions as ReturnType<typeof parseActions>)
    project.sidecar = original
    const semantic = diagnoseProject(project)
    return {
      evidence: { actionsApplied: result.actionsApplied, score: result.audit.score, metrics: result.audit.metrics, warnings: result.audit.issues },
      score: result.audit.score,
      metrics: result.audit.metrics as unknown as Record<string, number>,
      semanticScore: semantic.score,
      actionsPath: parsed.path!,
      actionsText: parsed.text!,
    }
  }
  const result = await transformProject(project, parsed.actions as ReturnType<typeof parseTransformActions>)
  return {
    evidence: { actionsApplied: result.actionsApplied, before: result.before, after: result.after, score: result.audit.score, metrics: result.audit.metrics, semantic: result.semantic },
    score: result.audit.score,
    metrics: result.audit.metrics as unknown as Record<string, number>,
    semanticScore: result.semantic.score,
    actionsPath: parsed.path!,
    actionsText: parsed.text!,
  }
}

export async function planAgentMutation(inputPath: string, operation: AgentMutationOperation, actionsPath?: string, receiptPath?: string) {
  const sourcePath = resolve(inputPath)
  const source = await readInput(sourcePath)
  if (diagramFamily(source) !== 'graph') {
    throw new CliError('Receipt-backed mutations currently support flowchart and state diagrams only', 2, 'UNSUPPORTED_OPERATION')
  }
  const project = await loadProject(sourcePath)
  const receiptFile = resolve(receiptPath ?? `${sourcePath}.beautiflow-agent.json`)
  const before = await fileState(project.sourcePath, project.sidecarPath)
  const planned = await dryRun(sourcePath, operation, actionsPath ?? null)
  const receipt: AgentReceipt = {
    receiptVersion: 1,
    protocolVersion: '1.1',
    state: 'validated',
    source: project.sourcePath,
    sidecar: project.sidecarPath,
    initialOperation: operation,
    pendingOperation: operation,
    actions: planned.actionsPath,
    hashes: {
      sourceBefore: before.sourceHash,
      sidecarBefore: before.sidecarHash,
      actions: planned.actionsText === null ? null : hash(planned.actionsText),
      sourceCurrent: before.sourceHash,
      sidecarCurrent: before.sidecarHash,
    },
    snapshot: { source: before.source, sidecar: before.sidecar },
    expected: { score: planned.score, metrics: planned.metrics, semanticScore: planned.semanticScore },
    evidence: planned.evidence,
    budget: { initialOperations: 1, targetedCorrections: 1, visualInspections: 1 },
  }
  await atomicJson(receiptFile, receipt)
  return {
    protocolVersion: '1.1', ok: true, operation: 'agent-plan', state: receipt.state,
    changed: true, diagramChanged: false, receipt: receiptFile,
    files: { source: receipt.source, sidecar: receipt.sidecar, receipt: receiptFile, actions: receipt.actions },
    evidence: receipt.evidence, budget: receipt.budget, warnings: [],
    nextAction: nextAction('agent-commit', ['beautiflow', 'agent', 'commit', '--receipt', receiptFile, '--json'], 'Commit the validated plan while its hashes remain current'),
  }
}

async function assertCurrent(receipt: AgentReceipt, receiptPath: string) {
  const current = await fileState(receipt.source, receipt.sidecar)
  const actionsText = receipt.actions ? await readInput(receipt.actions) : null
  const stale = current.sourceHash !== receipt.hashes.sourceCurrent
    || current.sidecarHash !== receipt.hashes.sidecarCurrent
    || (actionsText === null ? null : hash(actionsText)) !== receipt.hashes.actions
  if (stale) {
    receipt.state = 'stale'
    await atomicJson(receiptPath, receipt)
    throw new CliError('Agent receipt is stale because the source, sidecar, or action file changed after validation', 2, 'STALE_RECEIPT')
  }
}

async function commitOperation(receipt: AgentReceipt) {
  const project = await loadProject(receipt.source)
  if (receipt.pendingOperation === 'polish') {
    const result = await polishProject(project)
    await saveSidecar(project)
    for (const format of ['svg', 'png'] as const) {
      const request = { inputPath: receipt.source, format, transparent: false }
      await writeOutput(requestedOutputPath(request), await renderProjectOutput(project, request))
    }
    return { status: result.status, score: result.after.score, metrics: result.after.metrics, semantic: result.semantic }
  }
  const parsed = await parseActionFile(receipt.pendingOperation, receipt.actions)
  if (receipt.pendingOperation === 'apply') {
    const result = await applyActions(project, parsed.actions as ReturnType<typeof parseActions>)
    await saveSidecar(project)
    return { actionsApplied: result.actionsApplied, score: result.audit.score, metrics: result.audit.metrics, warnings: result.audit.issues }
  }
  const result = await transformProject(project, parsed.actions as ReturnType<typeof parseTransformActions>)
  await writeOutput(project.sourcePath, result.source)
  project.source = result.source
  project.sidecar = result.sidecar
  await saveSidecar(project)
  return { actionsApplied: result.actionsApplied, score: result.audit.score, metrics: result.audit.metrics, semantic: result.semantic }
}

export async function commitAgentMutation(receiptPath: string) {
  const path = resolve(receiptPath)
  const receipt = await loadReceipt(path)
  if (receipt.state !== 'validated') throw new CliError(`Cannot commit an agent receipt in state ${receipt.state}`, 2, 'INVALID_AGENT_STATE')
  await assertCurrent(receipt, path)
  const beforeCommit = await fileState(receipt.source, receipt.sidecar)
  let evidence: Awaited<ReturnType<typeof commitOperation>>
  try {
    evidence = await commitOperation(receipt)
  } catch (error) {
    await writeOutput(receipt.source, beforeCommit.source)
    if (beforeCommit.sidecar === null) await rm(receipt.sidecar, { force: true })
    else await writeOutput(receipt.sidecar, beforeCommit.sidecar)
    receipt.state = 'blocked'
    await atomicJson(path, receipt)
    throw error
  }
  const current = await fileState(receipt.source, receipt.sidecar)
  receipt.hashes.sourceCurrent = current.sourceHash
  receipt.hashes.sidecarCurrent = current.sidecarHash
  receipt.state = 'applied'
  receipt.evidence = evidence
  receipt.budget.initialOperations = 0
  await atomicJson(path, receipt)
  return {
    protocolVersion: '1.1', ok: true, operation: 'agent-commit', state: receipt.state,
    changed: true, diagramChanged: true, receipt: path,
    files: { source: receipt.source, sidecar: receipt.sidecar, receipt: path },
    evidence, budget: receipt.budget, warnings: [],
    nextAction: nextAction('agent-verify', ['beautiflow', 'agent', 'verify', '--receipt', path, '--json'], 'Verify final geometry and semantics against the validated plan'),
  }
}

export async function verifyAgentMutation(receiptPath: string) {
  const path = resolve(receiptPath)
  const receipt = await loadReceipt(path)
  if (receipt.state !== 'applied') throw new CliError(`Cannot verify an agent receipt in state ${receipt.state}`, 2, 'INVALID_AGENT_STATE')
  await assertCurrent(receipt, path)
  const project = await loadProject(receipt.source)
  const diagram = await layoutProject(project, { direction: project.sidecar.direction, applyOverrides: true })
  const audit = auditDiagram(diagram)
  const semantic = diagnoseProject(project)
  const regressions = [
    ...(audit.score < receipt.expected.score ? [`Geometry score ${audit.score} is below validated score ${receipt.expected.score}`] : []),
    ...(semantic.score < receipt.expected.semanticScore ? [`Semantic score ${semantic.score} is below validated score ${receipt.expected.semanticScore}`] : []),
    ...(audit.metrics.nodeOverlaps ? [`${audit.metrics.nodeOverlaps} node overlaps remain`] : []),
    ...(audit.metrics.edgeNodeIntersections ? [`${audit.metrics.edgeNodeIntersections} edge/node intersections remain`] : []),
  ]
  receipt.state = regressions.length ? 'needs-correction' : 'verified'
  receipt.evidence = { audit, semantic, regressions }
  await atomicJson(path, receipt)
  const canCorrect = regressions.length > 0 && receipt.budget.targetedCorrections > 0
  return {
    protocolVersion: '1.1', ok: regressions.length === 0, operation: 'agent-verify', state: receipt.state,
    changed: true, diagramChanged: false, receipt: path,
    files: { source: receipt.source, sidecar: receipt.sidecar, receipt: path },
    evidence: receipt.evidence, budget: receipt.budget, warnings: regressions,
    nextAction: canCorrect
      ? { operation: 'agent-correct', argv: ['beautiflow', 'agent', 'correct', '--receipt', path, '--operation', '<apply|transform>', '--actions', '<actions.json>', '--json'], reason: 'Use the single correction budget only for a named regression', requiresConfirmation: false }
      : regressions.length === 0
        ? { operation: 'agent-finish', argv: ['beautiflow', 'agent', 'finish', '--receipt', path, '--json'], reason: 'Inspect one final render when vision is available, then record completion', requiresConfirmation: false }
        : null,
  }
}

export async function planAgentCorrection(receiptPath: string, operation: Exclude<AgentMutationOperation, 'polish'>, actionsPath: string) {
  const path = resolve(receiptPath)
  const receipt = await loadReceipt(path)
  if (receipt.state !== 'needs-correction' && receipt.state !== 'verified') {
    throw new CliError(`Cannot plan a correction in state ${receipt.state}`, 2, 'INVALID_AGENT_STATE')
  }
  if (receipt.budget.targetedCorrections === 0) throw new CliError('The targeted correction budget is exhausted', 2, 'AGENT_BUDGET_EXHAUSTED')
  await assertCurrent(receipt, path)
  const planned = await dryRun(receipt.source, operation, actionsPath)
  receipt.pendingOperation = operation
  receipt.actions = planned.actionsPath
  receipt.hashes.actions = hash(planned.actionsText!)
  receipt.expected = { score: planned.score, metrics: planned.metrics, semanticScore: planned.semanticScore }
  receipt.evidence = planned.evidence
  receipt.state = 'validated'
  receipt.budget.targetedCorrections = 0
  await atomicJson(path, receipt)
  return {
    protocolVersion: '1.1', ok: true, operation: 'agent-correct', state: receipt.state,
    changed: true, diagramChanged: false, receipt: path,
    evidence: receipt.evidence, budget: receipt.budget, warnings: [],
    nextAction: nextAction('agent-commit', ['beautiflow', 'agent', 'commit', '--receipt', path, '--json'], 'Commit the one validated targeted correction'),
  }
}

export async function finishAgentMutation(receiptPath: string, visualInspected: boolean) {
  const path = resolve(receiptPath)
  const receipt = await loadReceipt(path)
  if (receipt.state !== 'verified') throw new CliError(`Cannot finish an agent receipt in state ${receipt.state}`, 2, 'INVALID_AGENT_STATE')
  await assertCurrent(receipt, path)
  receipt.state = 'complete'
  receipt.budget.visualInspections = 0
  receipt.evidence = { verification: receipt.evidence, visualInspected }
  await atomicJson(path, receipt)
  return {
    protocolVersion: '1.1', ok: true, operation: 'agent-finish', state: receipt.state,
    changed: true, diagramChanged: false, receipt: path,
    evidence: receipt.evidence, budget: receipt.budget, warnings: [], nextAction: null,
  }
}

export async function rollbackAgentMutation(receiptPath: string) {
  const path = resolve(receiptPath)
  const receipt = await loadReceipt(path)
  if (receipt.state === 'rolled-back') throw new CliError('Agent receipt has already been rolled back', 2, 'INVALID_AGENT_STATE')
  try { parseMermaid(receipt.snapshot.source) }
  catch { throw new CliError('Agent receipt contains an invalid Mermaid rollback snapshot', 2, 'INVALID_RECEIPT') }
  await writeOutput(receipt.source, receipt.snapshot.source)
  if (receipt.snapshot.sidecar === null) await rm(receipt.sidecar, { force: true })
  else await writeOutput(receipt.sidecar, receipt.snapshot.sidecar)
  receipt.state = 'rolled-back'
  const current = await fileState(receipt.source, receipt.sidecar)
  receipt.hashes.sourceCurrent = current.sourceHash
  receipt.hashes.sidecarCurrent = current.sidecarHash
  await atomicJson(path, receipt)
  return {
    protocolVersion: '1.1', ok: true, operation: 'agent-rollback', state: receipt.state,
    changed: true, diagramChanged: true, receipt: path,
    files: { source: receipt.source, sidecar: receipt.sidecar, receipt: path },
    warnings: [], nextAction: null,
  }
}
