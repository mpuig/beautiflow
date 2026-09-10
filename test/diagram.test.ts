import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyActions } from '../src/diagram/actions.ts'
import { auditDiagram } from '../src/diagram/audit.ts'
import { generateCandidates, layoutProject } from '../src/diagram/layout.ts'
import { renderProjectOutput } from '../src/diagram/pipeline.ts'
import { loadProject, saveSidecar } from '../src/diagram/project.ts'

const source = `flowchart LR
  client[Client] --> api[API]
  api --> decision{Ready?}
  decision -->|Yes| worker[Worker]
  decision -->|No| denied[Denied]
  worker --> db[(Database)]
`

const temporaryDirectories: string[] = []

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'beautiflow-test-'))
  temporaryDirectories.push(directory)
  const sourcePath = join(directory, 'diagram.mmd')
  await writeFile(sourcePath, source)
  return { directory, sourcePath, project: await loadProject(sourcePath) }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('diagram pipeline', () => {
  test('round-trips every preset with nested groups, labels, and exact routes', async () => {
    const { sourcePath } = await fixture()
    const reproduction = await Bun.file(join(import.meta.dir, 'fixtures/polish-baseline.mmd')).text()
    for (const source of [reproduction, 'flowchart TD\n subgraph outer[Outer]\n subgraph inner[Inner]\n A[Request] -->|Accepted| B[Process]\n end\n B --> C[Store]\n end\n C --> D[Done]\n', 'stateDiagram-v2\n [*] --> Waiting\n Waiting --> Running: start\n Running --> Waiting: retry\n Running --> [*]\n']) {
      await writeFile(sourcePath, source)
      const project = await loadProject(sourcePath)
      for (const candidate of await generateCandidates(project, 5)) {
        project.sidecar.direction = candidate.direction
        project.sidecar.nodeSpacing = candidate.nodeSpacing
        project.sidecar.layerSpacing = candidate.layerSpacing
        project.sidecar.nodes = Object.fromEntries(candidate.diagram.nodes.map((node) => [node.id, {
          x: node.x, y: node.y, width: node.width, height: node.height, pinned: false,
        }]))
        await saveSidecar(project)
        const restored = await loadProject(sourcePath)
        const diagram = await layoutProject(restored, { direction: restored.sidecar.direction })
        expect(diagram).toEqual(candidate.diagram)
        expect(auditDiagram(diagram)).toEqual(candidate.audit)
      }
    }
  })

  test('rejects invalid persisted spacing', async () => {
    const { sourcePath, project } = await fixture()
    for (const spacing of [0, -1, '48', null]) {
      await writeFile(project.sidecarPath, JSON.stringify({ ...project.sidecar, nodeSpacing: spacing }))
      await expect(loadProject(sourcePath)).rejects.toThrow('Invalid nodeSpacing')
    }
  })

  test('reroutes resized endpoints instead of preserving detached ELK anchors', async () => {
    const { project } = await fixture()
    const original = await layoutProject(project, { direction: 'LR' })
    const client = original.nodes.find((node) => node.id === 'client')!
    project.sidecar.nodes.client = { x: client.x, y: client.y, width: client.width + 20, height: client.height }
    const resized = await layoutProject(project, { direction: 'LR' })
    const edge = resized.edges.find((edge) => edge.source === 'client')!
    expect(edge.points).not.toEqual(original.edges.find((edge) => edge.source === 'client')!.points)
    expect(edge.points[0]!.x).toBeCloseTo(client.x + client.width + 20)
  })

  test('generates valid layout candidates', async () => {
    const { project } = await fixture()
    const candidates = await generateCandidates(project, 3)

    expect(candidates).toHaveLength(3)
    expect(candidates.every((candidate) => candidate.audit.metrics.nodeOverlaps === 0)).toBe(true)
    expect(candidates.every((candidate) => candidate.diagram.nodes.length === 6)).toBe(true)
  })

  test('persists and reapplies semantic actions', async () => {
    const { sourcePath, project } = await fixture()
    const result = await applyActions(project, [
      { type: 'set-primary-flow', nodes: ['client', 'api', 'decision', 'worker', 'db'] },
      { type: 'set-role', nodes: ['denied'], role: 'exception' },
    ])

    expect(result.audit.metrics.nodeOverlaps).toBe(0)
    await saveSidecar(project)

    const restored = await loadProject(sourcePath)
    const diagram = await layoutProject(restored, { direction: restored.sidecar.direction })
    expect(diagram.nodes.find((node) => node.id === 'client')?.role).toBe('primary')
    expect(diagram.nodes.find((node) => node.id === 'denied')?.role).toBe('exception')
    expect(auditDiagram(diagram).metrics.nodeOverlaps).toBe(0)
  })

  test('renders Beautiful Mermaid routes and valid PNG output', async () => {
    const { sourcePath, project } = await fixture()
    const svg = await renderProjectOutput(project, { inputPath: sourcePath, format: 'svg', transparent: false })
    const png = await renderProjectOutput(project, { inputPath: sourcePath, format: 'png', transparent: false })

    expect(typeof svg).toBe('string')
    expect(svg).toContain('role="img"')
    expect(svg).toMatch(/<svg[^>]*>\n<title/)
    expect(svg).toContain('marker-end="url(#arrowhead')
    expect(svg).toContain('data-shape="diamond"')
    expect(svg).not.toMatch(/(?:fill|stroke)="var\(/)
    expect(png).toBeInstanceOf(Uint8Array)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  test('rejects actions that introduce overlap', async () => {
    const { project } = await fixture()
    const diagram = await layoutProject(project, { direction: 'LR' })
    const client = diagram.nodes.find((node) => node.id === 'client')!

    expect(applyActions(project, [
      { type: 'place-relative', node: 'client', relativeTo: 'api', position: 'left', gap: -client.width },
    ])).rejects.toThrow('node overlap')
  })

  test('matches ELK routes by endpoints when subgraphs reorder edges', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-edge-order-'))
    temporaryDirectories.push(directory)
    const sourcePath = join(directory, 'edge-order.mmd')
    await writeFile(sourcePath, `flowchart TB\n  outside --> finish\n  subgraph group[Group]\n    inside --> result\n  end\n  other --> last\n`)
    const project = await loadProject(sourcePath)
    const diagram = await layoutProject(project, { direction: 'TD' })

    for (const edge of diagram.edges) {
      const source = diagram.nodes.find((node) => node.id === edge.source)!
      const target = diagram.nodes.find((node) => node.id === edge.target)!
      const start = edge.points[0]!
      const end = edge.points.at(-1)!
      const onSource = start.x >= source.x - 0.01 && start.x <= source.x + source.width + 0.01
        && start.y >= source.y - 0.01 && start.y <= source.y + source.height + 0.01
      const onTarget = end.x >= target.x - 0.01 && end.x <= target.x + target.width + 0.01
        && end.y >= target.y - 0.01 && end.y <= target.y + target.height + 0.01
      expect(onSource).toBe(true)
      expect(onTarget).toBe(true)
    }
  })

  test('routes moved edges around node obstacles', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-routing-'))
    temporaryDirectories.push(directory)
    const sourcePath = join(directory, 'routing.mmd')
    await writeFile(sourcePath, `flowchart LR\n  a[A] --> c[C]\n  b[B]\n`)
    const project = await loadProject(sourcePath)
    project.sidecar.nodes = {
      a: { x: 0, y: 50 },
      b: { x: 180, y: 40 },
      c: { x: 360, y: 50 },
    }
    const diagram = await layoutProject(project, { direction: 'LR', applyOverrides: true })
    const edge = diagram.edges[0]!

    expect(edge.points.length).toBeGreaterThan(2)
    const target = diagram.nodes.find((node) => node.id === 'c')!
    const endpoint = edge.points.at(-1)!
    const approach = edge.points.at(-2)!
    const entersHorizontalSide = Math.abs(endpoint.x - target.x) < 0.01 || Math.abs(endpoint.x - (target.x + target.width)) < 0.01
    expect(entersHorizontalSide ? approach.y === endpoint.y : approach.x === endpoint.x).toBe(true)
    expect(auditDiagram(diagram).metrics.edgeNodeIntersections).toBe(0)
    expect(edge.points.some((point) => point.y < diagram.nodes.find((node) => node.id === 'b')!.y
      || point.y > diagram.nodes.find((node) => node.id === 'b')!.y + diagram.nodes.find((node) => node.id === 'b')!.height)).toBe(true)
  })

  test('detects arrows passing through unrelated nodes', () => {
    const report = auditDiagram({
      width: 400,
      height: 200,
      direction: 'LR',
      nodes: [
        { id: 'a', label: 'A', shape: 'rectangle', x: 0, y: 50, width: 80, height: 50, role: 'secondary', pinned: false },
        { id: 'middle', label: 'Middle', shape: 'rectangle', x: 150, y: 50, width: 80, height: 50, role: 'secondary', pinned: false },
        { id: 'b', label: 'B', shape: 'rectangle', x: 300, y: 50, width: 80, height: 50, role: 'secondary', pinned: false },
      ],
      edges: [{
        id: 'a->b#0', source: 'a', target: 'b', points: [{ x: 80, y: 75 }, { x: 300, y: 75 }],
        role: 'secondary', style: 'solid', hasArrowStart: false, hasArrowEnd: true,
      }],
      groups: [],
    })

    expect(report.metrics.edgeNodeIntersections).toBe(1)
    expect(report.issues[0]?.type).toBe('edge-node-intersection')
  })
})
