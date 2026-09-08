#!/usr/bin/env bun

import packageJson from '../package.json' with { type: 'json' }
import { parseArgs } from './args.ts'
import { agentInspection } from './agent.ts'
import { applyActions, parseActions } from './diagram/actions.ts'
import { auditDiagram } from './diagram/audit.ts'
import { generateCandidates, layoutProject } from './diagram/layout.ts'
import { diagramFamily, renderProjectOutput, renderStandaloneOutput } from './diagram/pipeline.ts'
import { loadProject, saveSidecar } from './diagram/project.ts'
import { CliError } from './errors.ts'
import { HELP } from './help.ts'
import { readInput, requestedOutputPath, writeOutput } from './io.ts'
import { themeNames } from './render.ts'
import { installSkill } from './skill.ts'
import { parseTransformActions, transformProject } from './diagram/transform.ts'
import { diagnoseProject } from './diagram/semantic.ts'
import { polishProject } from './diagram/polish.ts'
import { findFlowContext } from './flow-context.ts'
import { startPreviewServer } from './server.ts'
import { doctorReport } from './doctor.ts'
import { schemaContract } from './schemas.ts'
import { commitAgentMutation, finishAgentMutation, planAgentCorrection, planAgentMutation, rollbackAgentMutation, verifyAgentMutation } from './agent-runtime.ts'

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2))
}

function graphSummary(project: Awaited<ReturnType<typeof loadProject>>) {
  return {
    source: project.sourcePath,
    sourceHash: project.sidecar.sourceHash,
    sidecar: project.sidecarPath,
    direction: project.sidecar.direction,
    primaryFlow: project.sidecar.primaryFlow ?? [],
    nodes: [...project.graph.nodes.values()].map((node) => ({
      ...node,
      layout: project.sidecar.nodes[node.id] ?? null,
    })),
    edges: project.graph.edges.map((edge, index) => ({
      id: `${edge.source}->${edge.target}#${index}`,
      ...edge,
    })),
  }
}

async function runInspect(inputPath: string, json: boolean, agent: boolean): Promise<void> {
  if (agent) {
    const contract = await agentInspection(inputPath)
    if (json) printJson(contract)
    else {
      console.log(`${contract.family} · ${Object.values(contract.capabilities).filter((capability) => capability.supported).length} supported operations`)
      console.log(`Next: ${contract.recommendedOperations[0]?.argv.join(' ') ?? 'No operation recommended'}`)
    }
    return
  }
  const project = await loadProject(inputPath)
  const context = await findFlowContext(inputPath)
  const summary = { ...graphSummary(project), flowContext: context ?? null }
  if (json) printJson(summary)
  else {
    console.log(`${summary.nodes.length} nodes · ${summary.edges.length} edges · ${summary.direction}`)
    console.log(`Layout: ${summary.sidecar}`)
    if (context) console.log(`Context: ${context.path}`)
    for (const node of summary.nodes) console.log(`  ${node.id}: ${node.label}`)
  }
}

async function runPolish(inputPath: string, dryRun: boolean, json: boolean): Promise<void> {
  const source = await readInput(inputPath)
  if (diagramFamily(source) !== 'graph') {
    throw new CliError('Polish currently supports flowchart and state diagrams; this diagram family is render-only', 2)
  }
  const project = await loadProject(inputPath)
  const originalSidecar = structuredClone(project.sidecar)
  const context = await findFlowContext(inputPath)
  const result = await polishProject(project)

  if (dryRun) project.sidecar = originalSidecar
  else {
    await saveSidecar(project)
    for (const format of ['svg', 'png'] as const) {
      const request = { inputPath, format, transparent: false }
      const content = await renderProjectOutput(project, request)
      await writeOutput(requestedOutputPath(request), content)
    }
  }

  const output = {
    ok: true,
    operation: 'polish',
    changed: !dryRun && result.status !== 'unchanged',
    status: dryRun ? `dry-run-${result.status}` : result.status,
    files: {
      source: project.sourcePath,
      sidecar: project.sidecarPath,
      ...(dryRun ? {} : {
        svg: requestedOutputPath({ inputPath, format: 'svg', transparent: false }),
        png: requestedOutputPath({ inputPath, format: 'png', transparent: false }),
      }),
    },
    before: { score: result.before.score, metrics: result.before.metrics },
    after: { score: result.after.score, metrics: result.after.metrics },
    semantic: result.semantic,
    selected: result.selected,
    direction: result.direction,
    sidecar: project.sidecarPath,
    flowContext: context?.path ?? null,
    ...(dryRun ? {} : {
      outputs: [requestedOutputPath({ inputPath, format: 'svg', transparent: false }), requestedOutputPath({ inputPath, format: 'png', transparent: false })],
    }),
    warnings: result.semantic.issues ?? [],
    nextAction: null,
  }
  if (json) printJson(output)
  else {
    const change = result.after.score - result.before.score
    console.log(`${dryRun ? 'Previewed' : 'Polished'} ${inputPath} · ${result.status} · score ${result.before.score}→${result.after.score}${change > 0 ? ` (+${change})` : ''}`)
    if (context) console.log(`Using ${context.path}`)
    if (!dryRun) console.log(`Rendered SVG and PNG beside the source`)
  }
}

async function runLayout(inputPath: string, count: number, json: boolean): Promise<void> {
  const project = await loadProject(inputPath)
  const candidates = await generateCandidates(project, count)
  candidates.sort((a, b) =>
    b.audit.score - a.audit.score
    || a.audit.metrics.edgeCrossings - b.audit.metrics.edgeCrossings
    || a.audit.metrics.totalBends - b.audit.metrics.totalBends)
  const best = candidates[0]!

  project.sidecar.direction = best.direction
  for (const node of best.diagram.nodes) {
    const existing = project.sidecar.nodes[node.id]
    if (existing?.pinned) continue
    project.sidecar.nodes[node.id] = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      pinned: false,
      role: existing?.role ?? node.role,
    }
  }
  await saveSidecar(project)
  const selected = await layoutProject(project, {
    direction: project.sidecar.direction,
    applyOverrides: true,
  })
  const audit = auditDiagram(selected)

  const result = {
    ok: true,
    operation: 'layout',
    changed: true,
    selected: best.id,
    score: audit.score,
    direction: best.direction,
    sidecar: project.sidecarPath,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      score: candidate.audit.score,
      direction: candidate.direction,
      nodeSpacing: candidate.nodeSpacing,
      layerSpacing: candidate.layerSpacing,
      metrics: candidate.audit.metrics,
    })),
  }
  if (json) printJson(result)
  else console.log(`Selected ${best.id} · score ${audit.score} · ${best.direction}\nSaved ${project.sidecarPath}`)
}

async function runDiagnose(inputPath: string, json: boolean): Promise<void> {
  const project = await loadProject(inputPath)
  const semantic = diagnoseProject(project)
  const report = {
    ok: true,
    operation: 'diagnose',
    changed: false,
    ...semantic,
    warnings: semantic.issues,
    nextAction: semantic.issues.length ? { operation: 'agent-plan', argv: ['beautiflow', 'agent', 'plan', inputPath, '--operation', 'transform', '--actions', '<transformations.json>', '--json'], reason: 'Address one named semantic issue through a receipt-backed dry-run', requiresConfirmation: false } : null,
  }
  if (json) printJson(report)
  else {
    console.log(`Semantic score ${report.score}/100`)
    console.log(`${report.metrics.entryPoints} entries · ${report.metrics.exitPoints} exits · ${report.metrics.unreachableNodes} unreachable · ${report.metrics.cycles} cycles`)
    for (const issue of report.issues) console.log(`  ${issue.severity}: ${issue.message}`)
  }
}

async function runAudit(inputPath: string, json: boolean): Promise<void> {
  const source = await readInput(inputPath)
  if (diagramFamily(source) === 'architecture') {
    const svg = await renderStandaloneOutput(source, { inputPath, format: 'svg', transparent: false }) as string
    const metric = (name: string): number => Number(svg.match(new RegExp(`data-beautiflow-${name}="([\\d.]+)"`))?.[1] ?? 0)
    const metrics = {
      sharedSegments: metric('shared-segments'),
      headerCrossings: metric('header-crossings'),
      excessiveBends: metric('excessive-bends'),
      wrappedLabels: metric('wrapped-labels'),
      complexityLoad: metric('complexity-load'),
      detachedEndpoints: metric('detached-endpoints'),
      portViolations: metric('port-violations'),
      nodeOverlaps: metric('node-overlaps'),
      edgeNodeIntersections: metric('edge-node-intersections'),
      labelCollisions: metric('label-collisions'),
    }
    const audited = svg.includes('data-beautiflow-quality-score=')
    const score = audited ? metric('quality-score') : null
    const issues = [
      ...(metrics.sharedSegments ? [{ severity: metrics.sharedSegments > 10 ? 'high' : 'medium', type: 'shared-segments', message: `${metrics.sharedSegments} connector segments share a routing channel` }] : []),
      ...(metrics.headerCrossings ? [{ severity: 'high', type: 'header-crossings', message: `${metrics.headerCrossings} connectors cross a group header` }] : []),
      ...(metrics.excessiveBends ? [{ severity: 'medium', type: 'excessive-bends', message: `${metrics.excessiveBends} bends exceed the route complexity budget` }] : []),
      ...(metrics.wrappedLabels ? [{ severity: 'medium', type: 'wrapped-labels', message: `${metrics.wrappedLabels} service labels split words or wrap beyond two lines` }] : []),
      ...(['detachedEndpoints', 'portViolations', 'nodeOverlaps', 'edgeNodeIntersections', 'labelCollisions'] as const).flatMap((name) => metrics[name]
        ? [{ severity: 'high', type: name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), message: `${metrics[name]} architecture geometry defects: ${name}` }]
        : []),
      ...(metrics.complexityLoad ? [{ severity: 'low', type: 'complexity-load', message: `${metrics.complexityLoad} services exceed the single-slide detail budget` }] : []),
    ]
    const report = {
      ok: true,
      operation: 'audit',
      changed: false,
      score,
      family: 'architecture',
      coverage: audited ? 'compound-geometry' : 'native-renderer-only',
      limitations: audited ? ['Geometry does not validate provider semantics or readability at a chosen display size.'] : ['Native rendering succeeded; fallback geometry checks were not run.'],
      metrics,
      issues,
      warnings: issues,
      nextAction: issues.some((issue) => issue.severity === 'high') ? { operation: 'edit-source', argv: [], reason: 'Correct high-severity architecture findings before accepting the render; architecture mutation is not supported', requiresConfirmation: true } : null,
    }
    if (json) printJson(report)
    else {
      console.log(audited ? `Architecture score ${score}/100` : 'Native architecture rendered; geometry score unavailable')
      console.log(`${metrics.sharedSegments} shared segments · ${metrics.headerCrossings} header crossings · ${metrics.excessiveBends} excessive bends · ${metrics.wrappedLabels} wrapped labels · ${metrics.complexityLoad} complexity load`)
      for (const issue of issues) console.log(`  ${issue.severity}: ${issue.message}`)
    }
    return
  }
  const project = await loadProject(inputPath)
  const diagram = await layoutProject(project, {
    direction: project.sidecar.direction,
    applyOverrides: true,
  })
  const geometry = auditDiagram(diagram)
  const audit = {
    ok: true,
    operation: 'audit',
    changed: false,
    ...geometry,
    warnings: geometry.issues,
    nextAction: geometry.issues.some((issue) => issue.severity === 'high') ? { operation: 'agent-plan', argv: ['beautiflow', 'agent', 'plan', inputPath, '--operation', 'apply', '--actions', '<actions.json>', '--json'], reason: 'Correct one named high-severity geometry finding', requiresConfirmation: false } : null,
  }
  if (json) printJson(audit)
  else {
    console.log(`Score ${audit.score}/100`)
    console.log(`${audit.metrics.nodeOverlaps} overlaps · ${audit.metrics.edgeCrossings} crossings · ${audit.metrics.edgeNodeIntersections} edge/node intersections · ${audit.metrics.totalBends} bends`)
    for (const issue of audit.issues) console.log(`  ${issue.severity}: ${issue.message}`)
  }
}

async function runTransform(
  inputPath: string,
  actionsPath: string,
  dryRun: boolean,
  json: boolean,
): Promise<void> {
  const project = await loadProject(inputPath)
  let actionsInput: unknown
  try {
    actionsInput = JSON.parse(await readInput(actionsPath)) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not parse transformations file: ${message}`, 2)
  }
  const actions = parseTransformActions(actionsInput)
  const result = await transformProject(project, actions)

  if (!dryRun) {
    const originalSource = project.source
    const sidecarFile = Bun.file(project.sidecarPath)
    const hadSidecar = await sidecarFile.exists()
    const originalSidecar = hadSidecar ? await sidecarFile.text() : undefined
    try {
      await writeOutput(project.sourcePath, result.source)
      project.source = result.source
      project.sidecar = result.sidecar
      await saveSidecar(project)
    } catch (error) {
      await writeOutput(project.sourcePath, originalSource)
      if (originalSidecar !== undefined) await writeOutput(project.sidecarPath, originalSidecar)
      else if (await Bun.file(project.sidecarPath).exists()) await Bun.file(project.sidecarPath).delete()
      throw error
    }
  }

  const output = {
    ok: true,
    operation: 'transform',
    changed: !dryRun,
    actionsApplied: result.actionsApplied,
    dryRun,
    before: result.before,
    after: result.after,
    score: result.audit.score,
    metrics: result.audit.metrics,
    semantic: result.semantic,
    source: project.sourcePath,
    sidecar: project.sidecarPath,
    files: { source: project.sourcePath, sidecar: project.sidecarPath },
    warnings: [...result.semantic.issues, ...result.audit.issues],
    nextAction: dryRun ? { operation: 'agent-plan', argv: ['beautiflow', 'agent', 'plan', inputPath, '--operation', 'transform', '--actions', actionsPath, '--json'], reason: 'Revalidate this transformation through the receipt-backed agent runtime before mutation', requiresConfirmation: false } : null,
    ...(dryRun ? { transformedSource: result.source } : {}),
  }
  if (json) printJson(output)
  else console.log(`${dryRun ? 'Validated' : 'Applied'} ${actions.length} transformation(s) · ${result.before.nodes}→${result.after.nodes} nodes · score ${result.audit.score}`)
}

async function runApply(
  inputPath: string,
  actionsPath: string,
  dryRun: boolean,
  json: boolean,
): Promise<void> {
  const project = await loadProject(inputPath)
  let actionsInput: unknown
  try {
    actionsInput = JSON.parse(await readInput(actionsPath)) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not parse actions file: ${message}`, 2)
  }
  const actions = parseActions(actionsInput)
  const original = structuredClone(project.sidecar)
  const result = await applyActions(project, actions)
  if (!dryRun) await saveSidecar(project)
  else project.sidecar = original

  const output = {
    ok: true,
    operation: 'apply',
    changed: !dryRun,
    actionsApplied: result.actionsApplied,
    dryRun,
    score: result.audit.score,
    metrics: result.audit.metrics,
    sidecar: project.sidecarPath,
    files: { source: project.sourcePath, sidecar: project.sidecarPath },
    warnings: result.audit.issues,
    nextAction: dryRun ? { operation: 'agent-plan', argv: ['beautiflow', 'agent', 'plan', inputPath, '--operation', 'apply', '--actions', actionsPath, '--json'], reason: 'Revalidate this action through the receipt-backed agent runtime before mutation', requiresConfirmation: false } : null,
  }
  if (json) printJson(output)
  else console.log(`${dryRun ? 'Validated' : 'Applied'} ${actions.length} action(s) · score ${result.audit.score}`)
}

export async function run(args: string[]): Promise<void> {
  const command = parseArgs(args)

  switch (command.name) {
    case 'help': process.stdout.write(HELP); return
    case 'version': console.log(`beautiflow ${packageJson.version}`); return
    case 'themes': console.log(themeNames().join('\n')); return
    case 'server': {
      const preview = await startPreviewServer(command.inputPath)
      console.log(`Beautiflow preview: ${preview.url}`)
      console.log(`Watching ${command.inputPath} · press Ctrl+C to stop`)
      await new Promise<void>((resolve) => {
        const stop = () => { preview.close(); resolve() }
        process.once('SIGINT', stop)
        process.once('SIGTERM', stop)
      })
      return
    }
    case 'inspect': await runInspect(command.inputPath, command.json, command.agent); return
    case 'doctor': {
      const report = await doctorReport(packageJson.version, command.inputPath)
      if (command.json) printJson(report)
      else {
        for (const check of report.checks) console.log(`${check.status.padEnd(4)}  ${check.name}: ${check.message}`)
        console.log(report.ok ? 'Beautiflow is ready' : 'Beautiflow needs attention')
      }
      if (!report.ok) process.exitCode = 1
      return
    }
    case 'schema': {
      const report = schemaContract()
      if (command.json) printJson(report)
      else console.log('Agent protocol 1.1 · actions, transformations, and receipt schemas')
      return
    }
    case 'agent': {
      const report = command.action === 'plan'
        ? await planAgentMutation(command.inputPath, command.operation, command.actionsPath, command.receiptPath)
        : command.action === 'commit'
          ? await commitAgentMutation(command.receiptPath)
          : command.action === 'verify'
            ? await verifyAgentMutation(command.receiptPath)
            : command.action === 'correct'
              ? await planAgentCorrection(command.receiptPath, command.operation, command.actionsPath)
              : command.action === 'finish'
                ? await finishAgentMutation(command.receiptPath, command.visualInspected)
                : await rollbackAgentMutation(command.receiptPath)
      if (command.json) printJson(report)
      else {
        console.log(`${report.operation} · ${report.state}`)
        if (report.nextAction) console.log(`Next: ${report.nextAction.argv.join(' ')}`)
      }
      return
    }
    case 'layout': await runLayout(command.inputPath, command.candidates, command.json); return
    case 'polish': await runPolish(command.inputPath, command.dryRun, command.json); return
    case 'audit': await runAudit(command.inputPath, command.json); return
    case 'diagnose': await runDiagnose(command.inputPath, command.json); return
    case 'apply': await runApply(command.inputPath, command.actionsPath, command.dryRun, command.json); return
    case 'transform': await runTransform(command.inputPath, command.actionsPath, command.dryRun, command.json); return
    case 'install-skill': {
      const directory = await installSkill(command.target, command.local)
      console.log(`Installed Beautiflow skill to ${directory}`)
      return
    }
    case 'render': {
      const source = await readInput(command.request.inputPath)
      const family = diagramFamily(source)
      if (family === 'unknown') {
        throw new CliError('Diagram family is not yet supported by the standalone Beautiflow renderer', 2)
      }
      const content = family === 'graph'
        ? await renderProjectOutput(await loadProject(command.request.inputPath), command.request)
        : await renderStandaloneOutput(source, command.request)
      const outputPath = requestedOutputPath(command.request)
      await writeOutput(outputPath, content)
      if (outputPath !== '-') console.error(`Rendered ${outputPath}`)
    }
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  void run(argv).catch((error: unknown) => {
    const cliError = error instanceof CliError ? error : null
    const message = error instanceof Error ? error.message : String(error)
    const exitCode = cliError?.exitCode ?? 1
    if (argv.includes('--json')) {
      const operation = argv[0] === 'agent' ? `agent-${argv[1] ?? 'unknown'}` : (argv[0] ?? 'unknown')
      printJson({
        protocolVersion: '1.1',
        ok: false,
        operation,
        state: 'blocked',
        changed: false,
        error: {
          code: cliError?.code ?? 'INTERNAL_ERROR',
          message: cliError ? message : 'Beautiflow encountered an unexpected internal error',
          retryable: false,
        },
        warnings: [],
        nextAction: null,
      })
    } else if (cliError) console.error(`error: ${message}`)
    else console.error(error)
    process.exit(exitCode)
  })
}
