import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { commitAgentMutation, finishAgentMutation, planAgentCorrection, planAgentMutation, rollbackAgentMutation, verifyAgentMutation } from '../src/agent-runtime.ts'
import { CliError } from '../src/errors.ts'
import { schemaContract } from '../src/schemas.ts'

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'beautiflow-agent-'))
  const source = join(directory, 'flow.mmd')
  const actions = join(directory, 'actions.json')
  const correction = join(directory, 'correction.json')
  const receipt = join(directory, 'receipt.json')
  await writeFile(source, 'flowchart LR\n  A[Request] --> B[Complete]\n')
  await writeFile(actions, JSON.stringify({ actions: [{ type: 'set-direction', direction: 'TD' }] }))
  await writeFile(correction, JSON.stringify({ actions: [{ type: 'pin', nodes: ['A'], pinned: true }] }))
  return { directory, source, actions, correction, receipt }
}

describe('enforced agent runtime', () => {
  test('records the polish baseline and retains it through targeted correction', async () => {
    const files = await fixture()
    try {
      await planAgentMutation(files.source, 'polish', undefined, files.receipt)
      const receipt = JSON.parse(await readFile(files.receipt, 'utf8'))
      expect(receipt.expected.baselineScore).toBe(receipt.evidence.before.score)
      await commitAgentMutation(files.receipt)
      const applied = JSON.parse(await readFile(files.receipt, 'utf8'))
      applied.expected.baselineScore = 101
      await writeFile(files.receipt, JSON.stringify(applied))
      const verified = await verifyAgentMutation(files.receipt)
      expect(verified.state).toBe('needs-correction')
      expect(verified.warnings.some((warning) => warning.includes('pre-plan baseline 101'))).toBe(true)
      await planAgentCorrection(files.receipt, 'apply', files.correction)
      const corrected = JSON.parse(await readFile(files.receipt, 'utf8'))
      expect(corrected.expected.baselineScore).toBe(101)
    } finally { await rm(files.directory, { recursive: true, force: true }) }
  })

  test('publishes machine schemas and JSON errors', () => {
    const contract = schemaContract()
    expect(contract.protocolVersion).toBe('1.1')
    expect(contract.schemas.actions.properties.actions.items.oneOf).toHaveLength(7)
    expect(contract.schemas.transformations.properties.actions.items.oneOf).toHaveLength(12)

    const result = Bun.spawnSync(['bun', 'run', join(import.meta.dir, '../src/cli.ts'), 'agent', 'commit', '--receipt', '/missing/receipt.json', '--json'])
    expect(result.exitCode).toBe(2)
    const failure = JSON.parse(result.stdout.toString()) as { ok: boolean; state: string; error: { code: string } }
    expect(failure.ok).toBe(false)
    expect(failure.state).toBe('blocked')
    expect(failure.error.code).toBe('INVALID_RECEIPT')
  })

  test('executes the validated → applied → verified → complete state machine', async () => {
    const files = await fixture()
    try {
      const originalSource = await readFile(files.source, 'utf8')
      const planned = await planAgentMutation(files.source, 'apply', files.actions, files.receipt)
      expect(planned.state).toBe('validated')
      expect(planned.diagramChanged).toBe(false)
      expect(planned.nextAction?.argv).toEqual(['beautiflow', 'agent', 'commit', '--receipt', files.receipt, '--json'])

      const committed = await commitAgentMutation(files.receipt)
      expect(committed.state).toBe('applied')
      const verified = await verifyAgentMutation(files.receipt)
      expect(verified.ok).toBe(true)
      expect(verified.state).toBe('verified')
      const finished = await finishAgentMutation(files.receipt, true)
      expect(finished.state).toBe('complete')
      expect(finished.budget.visualInspections).toBe(0)
      expect(await readFile(files.source, 'utf8')).toBe(originalSource)
    } finally { await rm(files.directory, { recursive: true, force: true }) }
  })

  test('rejects mutation plans for render-only families', async () => {
    const files = await fixture()
    try {
      await writeFile(files.source, 'sequenceDiagram\n  A->>B: Request\n')
      await expect(planAgentMutation(files.source, 'polish', undefined, files.receipt)).rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' })
    } finally { await rm(files.directory, { recursive: true, force: true }) }
  })

  test('rejects a commit when validated evidence becomes stale', async () => {
    const files = await fixture()
    try {
      await planAgentMutation(files.source, 'apply', files.actions, files.receipt)
      await writeFile(files.source, 'flowchart LR\n  A[Changed] --> B[Complete]\n')
      let error: unknown
      try { await commitAgentMutation(files.receipt) } catch (caught) { error = caught }
      expect(error).toBeInstanceOf(CliError)
      expect((error as CliError).code).toBe('STALE_RECEIPT')
      const receipt = JSON.parse(await readFile(files.receipt, 'utf8')) as { state: string }
      expect(receipt.state).toBe('stale')
    } finally { await rm(files.directory, { recursive: true, force: true }) }
  })

  test('enforces one targeted correction and no more', async () => {
    const files = await fixture()
    try {
      await planAgentMutation(files.source, 'apply', files.actions, files.receipt)
      await commitAgentMutation(files.receipt)
      await verifyAgentMutation(files.receipt)
      const correction = await planAgentCorrection(files.receipt, 'apply', files.correction)
      expect(correction.budget.targetedCorrections).toBe(0)
      await commitAgentMutation(files.receipt)
      await verifyAgentMutation(files.receipt)
      await expect(planAgentCorrection(files.receipt, 'apply', files.correction)).rejects.toMatchObject({ code: 'AGENT_BUDGET_EXHAUSTED' })
    } finally { await rm(files.directory, { recursive: true, force: true }) }
  })

  test('rolls a structural mutation back to the original source and sidecar', async () => {
    const files = await fixture()
    try {
      const original = await readFile(files.source, 'utf8')
      await writeFile(files.actions, JSON.stringify({ actions: [{ type: 'rename-node', id: 'A', label: 'Validated request' }] }))
      await planAgentMutation(files.source, 'transform', files.actions, files.receipt)
      await commitAgentMutation(files.receipt)
      expect(await readFile(files.source, 'utf8')).toContain('Validated request')
      const rolledBack = await rollbackAgentMutation(files.receipt)
      expect(rolledBack.state).toBe('rolled-back')
      expect(await readFile(files.source, 'utf8')).toBe(original)
      expect(existsSync(files.source.replace(/\.mmd$/, '.beautiflow.json'))).toBe(false)
    } finally { await rm(files.directory, { recursive: true, force: true }) }
  })
})
