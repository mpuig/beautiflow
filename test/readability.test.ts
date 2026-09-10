import { describe, expect, test } from 'bun:test'
import { auditDiagram } from '../src/diagram/audit.ts'
import { selectValidCandidate } from '../src/diagram/polish.ts'
import { renderPositionedSvg } from '../src/diagram/svg.ts'
import type { PositionedDiagram, PositionedEdge } from '../src/diagram/model.ts'

function edge(id: string, points: PositionedEdge['points'], extra: Partial<PositionedEdge> = {}): PositionedEdge {
  return { id, source: `${id}-source`, target: `${id}-target`, points, role: 'secondary', style: 'solid', hasArrowStart: false, hasArrowEnd: true, ...extra }
}

function diagram(edges: PositionedEdge[]): PositionedDiagram {
  return { width: 400, height: 300, direction: 'LR', nodes: [], groups: [], edges }
}

describe('readability audit', () => {
  test('uses the rendered multiline label mask and ignores its own route', () => {
    const drawing = diagram([edge('first', [{ x: 0, y: 80 }, { x: 300, y: 80 }], { label: 'HTTP<br>request', labelPosition: { x: 160, y: 80 } })])
    expect(auditDiagram(drawing).metrics.labelCollisions).toBe(0)
    drawing.edges.push(edge('second', [{ x: 160, y: 0 }, { x: 160, y: 200 }]))
    const issue = auditDiagram(drawing).issues.find((issue) => issue.type === 'label-collision')!
    expect(issue.evidence?.kind).toBe('label-route')
    const bounds = issue.evidence!
    expect(renderPositionedSvg(drawing)).toContain(`<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}"`)
    expect(issue.supportedFixes).toEqual(['set-direction', 'place-relative'])
  })

  test('detects label-label and label-node overlap at fallback midpoints', () => {
    const drawing = diagram([
      edge('first', [{ x: 0, y: 80 }, { x: 300, y: 80 }], { label: 'Approved' }),
      edge('second', [{ x: 0, y: 90 }, { x: 300, y: 90 }], { label: 'Rejected' }),
    ])
    drawing.nodes.push({ id: 'obstacle', label: 'Obstacle', shape: 'rectangle', x: 140, y: 70, width: 40, height: 40, role: 'secondary', pinned: false })
    const report = auditDiagram(drawing)
    expect(report.issues.some((issue) => issue.evidence?.kind === 'label-label')).toBe(true)
    expect(report.issues.some((issue) => issue.evidence?.kind === 'label-node')).toBe(true)
    expect(report.metrics.labelCollisions).toBeGreaterThan(0)
  })

  test('detects shared internal channels but excludes common terminal stubs and touches', () => {
    const first = edge('first', [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 100 }, { x: 100, y: 100 }], { source: 'shared' })
    const second = edge('second', [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 60 }, { x: 80, y: 60 }], { source: 'shared' })
    expect(auditDiagram(diagram([first, second])).metrics.sharedRoutes).toBe(1)
    second.points = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: -60 }]
    expect(auditDiagram(diagram([first, second])).metrics.sharedRoutes).toBe(0)
    expect(auditDiagram(diagram([
      edge('left', [{ x: 0, y: 0 }, { x: 20, y: 0 }]),
      edge('right', [{ x: 20, y: 0 }, { x: 40, y: 0 }]),
    ])).metrics.sharedRoutes).toBe(0)
  })

  test('detects connectors stacked at one node attachment point', () => {
    const drawing = diagram([
      edge('first', [{ x: 40, y: 40 }, { x: 140, y: 40 }], { source: 'shared' }),
      edge('second', [{ x: 44, y: 42 }, { x: 144, y: 80 }], { source: 'shared' }),
    ])
    drawing.nodes.push({ id: 'shared', label: 'Shared', shape: 'rectangle', x: 0, y: 20, width: 40, height: 40, role: 'secondary', pinned: false })
    const report = auditDiagram(drawing)
    const issue = report.issues.find((candidate) => candidate.type === 'endpoint-overlap')!
    expect(report.metrics.endpointOverlaps).toBe(1)
    expect(issue.nodes).toEqual(['shared'])
    expect(issue.evidence?.minimumClearance).toBe(8)
  })

  test('detects diagonal arrows through nodes', () => {
    const drawing = diagram([edge('diagonal', [{ x: 0, y: 0 }, { x: 100, y: 100 }])])
    drawing.nodes.push({ id: 'obstacle', label: 'Obstacle', shape: 'rectangle', x: 40, y: 40, width: 20, height: 20, role: 'secondary', pinned: false })
    expect(auditDiagram(drawing).metrics.edgeNodeIntersections).toBe(1)
  })

  test('filters invalid candidates before ranking and handles no valid candidate', () => {
    const valid = { audit: auditDiagram(diagram([])) }
    valid.audit.score = 10
    const invalid = structuredClone(valid)
    invalid.audit.score = 90
    invalid.audit.metrics.nodeOverlaps = 1
    expect(selectValidCandidate([invalid, valid])).toBe(valid)
    expect(selectValidCandidate([invalid])).toBeUndefined()
    expect(selectValidCandidate([])).toBeUndefined()
  })
})
