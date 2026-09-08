import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { polishProject } from '../src/diagram/polish.ts'
import { loadProject, saveSidecar } from '../src/diagram/project.ts'
import { layoutProject } from '../src/diagram/layout.ts'
import * as auditModule from '../src/diagram/audit.ts'
import { findFlowContext } from '../src/flow-context.ts'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('bounded polish workflow', () => {
  test('keeps the incumbent when all valid initialization candidates score worse', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-rejected-'))
    directories.push(directory)
    const sourcePath = join(directory, 'flow.mmd')
    await writeFile(sourcePath, 'flowchart TD\n A[Start] --> B[Done]\n')
    const project = await loadProject(sourcePath)
    const original = structuredClone(project.sidecar)
    const audit = auditModule.auditDiagram
    let calls = 0
    const mocked = spyOn(auditModule, 'auditDiagram').mockImplementation((diagram) => ({
      ...audit(diagram), score: calls++ === 0 ? 100 : 90,
    }))
    try {
      const result = await polishProject(project)
      expect(result.status).toBe('unchanged')
      expect(result.selected).toBe('current')
      expect(result.after).toEqual(result.before)
      expect(project.sidecar).toEqual(original)
      await saveSidecar(project)
      expect((await loadProject(sourcePath)).sidecar.nodes).toEqual({})
    } finally { mocked.mockRestore() }
  })

  test('preserves the fresh baseline and reaches an exact persisted fixed point', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-baseline-'))
    directories.push(directory)
    const sourcePath = join(directory, 'flow.mmd')
    await writeFile(sourcePath, await Bun.file(join(import.meta.dir, 'fixtures/polish-baseline.mmd')).text())
    const project = await loadProject(sourcePath)
    const first = await polishProject(project)
    expect(first.after.score).toBeGreaterThanOrEqual(first.before.score)
    await saveSidecar(project)
    const restored = await loadProject(sourcePath)
    const before = await layoutProject(restored, { direction: restored.sidecar.direction })
    const second = await polishProject(restored)
    expect(second.status).toBe('unchanged')
    expect(second.after).toEqual(first.after)
    expect(await layoutProject(restored, { direction: restored.sidecar.direction })).toEqual(before)
    const result = Bun.spawnSync(['bun', 'run', join(import.meta.dir, '../src/cli.ts'), 'layout', sourcePath, '--candidates', '5', '--json'])
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString())
    expect(output.score).toBe(output.candidates[0].score)
  })

  test('selects one valid layout without exposing tuning options', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-polish-'))
    directories.push(directory)
    const sourcePath = join(directory, 'flow.mmd')
    await writeFile(sourcePath, `flowchart LR\n  start[Start] --> choice{Ready?}\n  choice -->|Yes| done[Done]\n  choice -->|No| retry[Retry]\n  retry --> choice\n`)
    const project = await loadProject(sourcePath)
    const originalSource = project.source
    const originalEdges = structuredClone(project.graph.edges)
    const result = await polishProject(project)

    expect(result.status).toBe('initialized')
    expect(result.after.score).toBeGreaterThanOrEqual(result.before.score)
    expect(result.after.metrics.nodeOverlaps).toBe(0)
    expect(result.after.metrics.edgeNodeIntersections).toBe(0)
    expect(Object.keys(project.sidecar.nodes)).toHaveLength(4)
    expect(project.source).toBe(originalSource)
    expect(await Bun.file(sourcePath).text()).toBe(originalSource)
    expect(project.graph.edges).toEqual(originalEdges)
  })

  test('uses the nearest FLOW.md as prose context', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-context-'))
    directories.push(directory)
    const nested = join(directory, 'docs', 'diagrams')
    await mkdir(nested, { recursive: true })
    await Bun.write(join(directory, 'FLOW.md'), '# Flow\n\nKeep the main path obvious.\n')
    await Bun.write(join(nested, 'diagram.mmd'), 'flowchart TD\n  A --> B\n')

    const context = await findFlowContext(join(nested, 'diagram.mmd'))
    expect(context?.path).toBe(join(directory, 'FLOW.md'))
    expect(context?.content).toContain('Keep the main path obvious')
  })
})
