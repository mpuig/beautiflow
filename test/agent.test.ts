import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { agentInspection } from '../src/agent.ts'
import { doctorReport } from '../src/doctor.ts'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function fixture(name: string, source: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'beautiflow-agent-'))
  directories.push(directory)
  const path = join(directory, name)
  await writeFile(path, source)
  return path
}

describe('agent protocol', () => {
  test('discovers graph capabilities and bounded operations', async () => {
    const path = await fixture('flow.mmd', 'flowchart LR\n  start[Start] --> done[Done]\n')
    const result = await agentInspection(path)

    expect(result.protocolVersion).toBe('1.0')
    expect(result.family).toBe('graph')
    expect(result.capabilities.polish!.supported).toBe(true)
    expect(result.capabilities.transform!.supported).toBe(true)
    expect(result.context.sidecarExists).toBe(false)
    expect(result.recommendedOperations[0]?.operation).toBe('polish')
    expect(result.budget).toEqual({ automaticPolishRuns: 1, targetedCorrectionRuns: 1, visualInspectionRuns: 1 })
    expect(result.stopWhen.length).toBeGreaterThanOrEqual(4)
  })

  test('routes architecture diagrams to audit without offering mutation', async () => {
    const path = await fixture('architecture.mmd', 'architecture-beta\n  service api(lucide:box)[API]\n')
    const result = await agentInspection(path)

    expect(result.family).toBe('architecture')
    expect(result.capabilities.audit!.supported).toBe(true)
    expect(result.capabilities.polish!.supported).toBe(false)
    expect(result.capabilities.transform!.mutates).toBe(false)
    expect(result.recommendedOperations[0]?.operation).toBe('audit')
  })

  test('doctor validates the local environment and an input diagram', async () => {
    const path = await fixture('flow.mmd', 'flowchart TD\n  A --> B\n')
    const result = await doctorReport('0.7.0', path)

    expect(result.ok).toBe(true)
    expect(result.operation).toBe('doctor')
    expect(result.diagram?.family).toBe('graph')
    expect(result.checks.find((check) => check.name === 'parse-and-render')?.status).toBe('pass')
    expect(result.summary.failures).toBe(0)
  })
})
