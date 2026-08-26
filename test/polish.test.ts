import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { polishProject } from '../src/diagram/polish.ts'
import { loadProject } from '../src/diagram/project.ts'
import { findFlowContext } from '../src/flow-context.ts'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('bounded polish workflow', () => {
  test('selects one valid layout without exposing tuning options', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-polish-'))
    directories.push(directory)
    const sourcePath = join(directory, 'flow.mmd')
    await writeFile(sourcePath, `flowchart LR\n  start[Start] --> choice{Ready?}\n  choice -->|Yes| done[Done]\n  choice -->|No| retry[Retry]\n  retry --> choice\n`)
    const project = await loadProject(sourcePath)
    const result = await polishProject(project)

    expect(result.status).toBe('initialized')
    expect(result.after.score).toBeGreaterThanOrEqual(result.before.score)
    expect(result.after.metrics.nodeOverlaps).toBe(0)
    expect(result.after.metrics.edgeNodeIntersections).toBe(0)
    expect(Object.keys(project.sidecar.nodes)).toHaveLength(4)
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
