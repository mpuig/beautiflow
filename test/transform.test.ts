import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseMermaid } from 'beautiful-mermaid'
import { loadProject } from '../src/diagram/project.ts'
import { parseTransformActions, transformProject } from '../src/diagram/transform.ts'
import { diagnoseProject } from '../src/diagram/semantic.ts'

const temporaryDirectories: string[] = []

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'beautiflow-transform-'))
  temporaryDirectories.push(directory)
  const sourcePath = join(directory, 'flow.mmd')
  await writeFile(sourcePath, `flowchart LR
  %% This worker comment and formatting must survive transformations.
  start[Start] --> api[API]
  api -->|ok| worker[Worker]
  worker --> done[Done]
`)
  return { sourcePath, project: await loadProject(sourcePath) }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('graph transformations', () => {
  test('inserts, renames, and reconnects nodes transactionally', async () => {
    const { project } = await fixture()
    const result = await transformProject(project, [
      { type: 'insert-node', id: 'validate', label: 'Validate request', shape: 'diamond', between: { source: 'start', target: 'api' } },
      { type: 'rename-node', id: 'worker', newId: 'processor', label: 'Processor' },
      { type: 'add-edge', source: 'validate', target: 'done', label: 'invalid', style: 'dotted' },
    ])
    const parsed = parseMermaid(result.source)

    expect(project.graph.nodes.has('validate')).toBe(false)
    expect(result.source).toContain('%% This worker comment and formatting must survive transformations.')
    expect(result.source).toContain('  api -->|ok| processor["Processor"]')
    expect(parsed.nodes.get('validate')?.shape).toBe('diamond')
    expect(parsed.nodes.get('processor')?.label).toBe('Processor')
    expect(parsed.nodes.has('worker')).toBe(false)
    expect(parsed.edges.some((edge) => edge.source === 'start' && edge.target === 'validate')).toBe(true)
    expect(parsed.edges.some((edge) => edge.source === 'validate' && edge.target === 'api')).toBe(true)
    expect(parsed.edges.some((edge) => edge.source === 'validate' && edge.target === 'done' && edge.style === 'dotted')).toBe(true)
    expect(result.audit.metrics.nodeOverlaps).toBe(0)
    expect(result.after).toEqual({ nodes: 5, edges: 5 })
  })

  test('bypasses a node while preserving reachability', async () => {
    const { project } = await fixture()
    const result = await transformProject(project, [{ type: 'bypass-node', id: 'api' }])
    const parsed = parseMermaid(result.source)

    expect(parsed.nodes.has('api')).toBe(false)
    expect(parsed.edges.some((edge) => edge.source === 'start' && edge.target === 'worker')).toBe(true)
    expect(result.after).toEqual({ nodes: 3, edges: 2 })
  })

  test('creates a parseable Mermaid subgraph', async () => {
    const { project } = await fixture()
    const result = await transformProject(project, [
      { type: 'create-subgraph', id: 'processing', label: 'Processing', nodes: ['api', 'worker'] },
    ])
    const parsed = parseMermaid(result.source)

    expect(parsed.subgraphs[0]?.id).toBe('processing')
    expect(parsed.subgraphs[0]?.nodeIds).toEqual(['api', 'worker'])
  })

  test('rejects transformations that introduce semantic errors', async () => {
    const { project } = await fixture()
    expect(transformProject(project, [{ type: 'add-node', id: 'orphan', label: 'Orphan' }])).rejects.toThrow('disconnected')
  })

  test('diagnoses incomplete decisions and disconnected nodes', async () => {
    const { sourcePath } = await fixture()
    await writeFile(sourcePath, `flowchart TD\n  start[Start] --> choice{Choose}\n  choice --> done[Done]\n  orphan[Orphan]\n`)
    const report = diagnoseProject(await loadProject(sourcePath))

    expect(report.metrics.isolatedNodes).toBe(1)
    expect(report.issues.some((issue) => issue.type === 'decision-without-branches')).toBe(true)
    expect(report.issues.some((issue) => issue.type === 'isolated-node')).toBe(true)
  })

  test('advises a focused-view split without lowering semantic quality', async () => {
    const { sourcePath } = await fixture()
    await writeFile(sourcePath, `flowchart LR
  subgraph request[Request path]
    a1 --> a2 --> a3 --> a4 --> a5 --> a6 --> a7
  end
  subgraph operations[Operations]
    b1 --> b2 --> b3 --> b4 --> b5 --> b6 --> b7
  end
  a7 --> b1
`)
    const report = diagnoseProject(await loadProject(sourcePath))

    expect(report.metrics.groups).toBe(2)
    expect(report.issues.some((issue) => issue.type === 'detail-budget' && issue.severity === 'info')).toBe(true)
    expect(report.issues.some((issue) => issue.type === 'view-split-recommended' && issue.message.includes('Request path, Operations'))).toBe(true)
    expect(report.score).toBe(100)
  })

  test('flags weak labels and fan-in as informational focus evidence', async () => {
    const { sourcePath } = await fixture()
    await writeFile(sourcePath, `flowchart LR
  start --> a
  start --> b
  start --> c
  start --> d
  a --> hub[System]
  b --> hub
  c --> hub
  d --> hub
  hub --> done[Done]
`)
    const report = diagnoseProject(await loadProject(sourcePath))

    expect(report.metrics.labelQualityFindings).toBe(1)
    expect(report.metrics.fanInHotspots).toBe(1)
    expect(report.issues.some((issue) => issue.type === 'label-quality' && issue.nodes.includes('hub'))).toBe(true)
    expect(report.issues.some((issue) => issue.type === 'fan-in-focus' && issue.nodes.includes('hub'))).toBe(true)
    expect(report.score).toBe(100)
  })

  test('validates transformation schemas', () => {
    expect(() => parseTransformActions({ actions: [{ type: 'add-node', id: 'bad id', label: 'Bad' }] })).toThrow('must match')
    expect(() => parseTransformActions({ actions: [{ type: 'unknown' }] })).toThrow('Unknown transformation')
  })
})
