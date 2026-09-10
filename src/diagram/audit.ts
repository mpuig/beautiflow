import type { AuditIssue, AuditReport, Point, PositionedDiagram, PositionedEdge, PositionedNode } from './model.ts'
import { edgeMidpoint } from '../vendor/beautiful-mermaid/renderer.ts'
import { measureMultilineText } from '../vendor/beautiful-mermaid/text-metrics.ts'
import { FONT_SIZES, FONT_WEIGHTS } from '../vendor/beautiful-mermaid/styles.ts'

type Box = Pick<PositionedNode, 'x' | 'y' | 'width' | 'height'>

interface Segment {
  start: Point
  end: Point
  edge: PositionedEdge
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
}

function edgeSegments(edge: PositionedEdge): Segment[] {
  const segments: Segment[] = []
  for (let index = 0; index < edge.points.length - 1; index += 1) {
    const start = edge.points[index]!
    const end = edge.points[index + 1]!
    if (start.x === end.x && start.y === end.y) continue
    segments.push({ start, end, edge })
  }
  return segments
}

function orientation(a: Point, b: Point, c: Point): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
  if (Math.abs(value) < 0.001) return 0
  return value > 0 ? 1 : 2
}

function strictIntersection(a: Segment, b: Segment): boolean {
  const o1 = orientation(a.start, a.end, b.start)
  const o2 = orientation(a.start, a.end, b.end)
  const o3 = orientation(b.start, b.end, a.start)
  const o4 = orientation(b.start, b.end, a.end)
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4
}

function segmentIntersectsNode(segment: Segment, node: Box): boolean {
  const left = node.x + 1
  const right = node.x + node.width - 1
  const top = node.y + 1
  const bottom = node.y + node.height - 1
  if (segment.start.x === segment.end.x) {
    const minY = Math.min(segment.start.y, segment.end.y)
    const maxY = Math.max(segment.start.y, segment.end.y)
    return segment.start.x > left && segment.start.x < right && maxY > top && minY < bottom
  }
  if (segment.start.y === segment.end.y) {
    const minX = Math.min(segment.start.x, segment.end.x)
    const maxX = Math.max(segment.start.x, segment.end.x)
    return segment.start.y > top && segment.start.y < bottom && maxX > left && minX < right
  }
  let minimum = 0
  let maximum = 1
  for (const [start, delta, lower, upper] of [
    [segment.start.x, segment.end.x - segment.start.x, left, right],
    [segment.start.y, segment.end.y - segment.start.y, top, bottom],
  ] as const) {
    if (delta === 0) {
      if (start <= lower || start >= upper) return false
      continue
    }
    const first = (lower - start) / delta
    const second = (upper - start) / delta
    minimum = Math.max(minimum, Math.min(first, second))
    maximum = Math.min(maximum, Math.max(first, second))
  }
  return minimum < maximum
}

function sharedLength(first: Segment, second: Segment): number {
  if (first.start.y === first.end.y && second.start.y === second.end.y && first.start.y === second.start.y) {
    return Math.max(0, Math.min(Math.max(first.start.x, first.end.x), Math.max(second.start.x, second.end.x))
      - Math.max(Math.min(first.start.x, first.end.x), Math.min(second.start.x, second.end.x)))
  }
  if (first.start.x === first.end.x && second.start.x === second.end.x && first.start.x === second.start.x) {
    return Math.max(0, Math.min(Math.max(first.start.y, first.end.y), Math.max(second.start.y, second.end.y))
      - Math.max(Math.min(first.start.y, first.end.y), Math.min(second.start.y, second.end.y)))
  }
  return 0
}

function sharedTerminal(first: Segment, second: Segment): boolean {
  for (const endpoint of ['source', 'target'] as const) {
    for (const otherEndpoint of ['source', 'target'] as const) {
      if (first.edge[endpoint] !== second.edge[otherEndpoint]) continue
      const terminal = endpoint === 'source' ? first.edge.points[0] : first.edge.points.at(-1)
      const otherTerminal = otherEndpoint === 'source' ? second.edge.points[0] : second.edge.points.at(-1)
      const point = endpoint === 'source' ? first.start : first.end
      const otherPoint = otherEndpoint === 'source' ? second.start : second.end
      if (point === terminal && otherPoint === otherTerminal) return true
    }
  }
  return false
}

function readabilityIssues(diagram: PositionedDiagram, segments: Segment[]): AuditIssue[] {
  const issues: AuditIssue[] = []
  const labels = diagram.edges.filter((edge) => edge.label).map((edge) => {
    const center = edge.labelPosition ?? edgeMidpoint(edge.points)
    const measured = measureMultilineText(edge.label!, FONT_SIZES.edgeLabel, FONT_WEIGHTS.edgeLabel)
    const width = measured.width + 16
    const height = measured.height + 16
    return { edge, x: center.x - width / 2, y: center.y - height / 2, width, height }
  })
  for (const [index, label] of labels.entries()) {
    const evidence = { x: label.x, y: label.y, width: label.width, height: label.height }
    for (const node of diagram.nodes) {
      if (!overlaps(label, node)) continue
      issues.push({ severity: 'medium', type: 'label-collision', message: `${label.edge.id} label overlaps ${node.id}`,
        edges: [label.edge.id], nodes: [node.id], evidence: { ...evidence, kind: 'label-node' } })
    }
    for (const other of labels.slice(index + 1)) {
      if (!overlaps(label, other)) continue
      issues.push({ severity: 'medium', type: 'label-collision', message: `${label.edge.id} label overlaps ${other.edge.id} label`,
        edges: [label.edge.id, other.edge.id], evidence: { ...evidence, kind: 'label-label' } })
    }
    for (const edge of diagram.edges) {
      if (edge.id === label.edge.id || !segments.some((segment) => segment.edge === edge && segmentIntersectsNode(segment, label))) continue
      issues.push({ severity: 'medium', type: 'label-collision', message: `${label.edge.id} label masks ${edge.id}`,
        edges: [label.edge.id, edge.id], evidence: { ...evidence, kind: 'label-route' } })
    }
  }
  const shared = new Set<string>()
  for (const [index, first] of segments.entries()) {
    for (const second of segments.slice(index + 1)) {
      if (first.edge.id === second.edge.id || sharedTerminal(first, second)) continue
      const length = sharedLength(first, second)
      const key = JSON.stringify([first.edge.id, second.edge.id].sort())
      if (length <= 1 || shared.has(key)) continue
      shared.add(key)
      issues.push({ severity: 'medium', type: 'shared-route', message: `${first.edge.id} shares a routing channel with ${second.edge.id}`,
        edges: [first.edge.id, second.edge.id], evidence: { sharedLength: length } })
    }
  }
  return issues
}

function endpointIssues(diagram: PositionedDiagram): AuditIssue[] {
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]))
  const side = (nodeId: string, point: Point): string | undefined => {
    const node = nodes.get(nodeId)
    if (!node) return undefined
    const sides: Array<[string, number]> = [
      ['left', Math.abs(point.x - node.x)],
      ['right', Math.abs(point.x - (node.x + node.width))],
      ['top', Math.abs(point.y - node.y)],
      ['bottom', Math.abs(point.y - (node.y + node.height))],
    ]
    return sides.sort((first, second) => first[1] - second[1])[0]?.[0]
  }
  const endpoints = diagram.edges.flatMap((edge) => [
    { edge, node: edge.source, point: edge.points[0] },
    { edge, node: edge.target, point: edge.points.at(-1) },
  ]).filter((endpoint): endpoint is { edge: PositionedEdge; node: string; point: Point } => Boolean(endpoint.point))
  const issues: AuditIssue[] = []
  const seen = new Set<string>()
  for (const [index, first] of endpoints.entries()) {
    for (const second of endpoints.slice(index + 1)) {
      if (first.node !== second.node || first.edge.id === second.edge.id || side(first.node, first.point) !== side(second.node, second.point)) continue
      const distance = Math.hypot(first.point.x - second.point.x, first.point.y - second.point.y)
      if (distance >= 8) continue
      const key = [first.edge.id, second.edge.id].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      issues.push({
        severity: 'medium',
        type: 'endpoint-overlap',
        message: `${first.edge.id} and ${second.edge.id} stack at ${first.node}`,
        nodes: [first.node],
        edges: [first.edge.id, second.edge.id],
        evidence: { distance: Number(distance.toFixed(3)), minimumClearance: 8 },
      })
    }
  }
  return issues
}

function bendCount(edge: PositionedEdge): number {
  let bends = 0
  for (let index = 1; index < edge.points.length - 1; index += 1) {
    const before = edge.points[index - 1]!
    const point = edge.points[index]!
    const after = edge.points[index + 1]!
    const incomingHorizontal = before.y === point.y
    const outgoingHorizontal = point.y === after.y
    if (incomingHorizontal !== outgoingHorizontal) bends += 1
  }
  return bends
}

function alignmentScore(nodes: PositionedNode[]): number {
  if (nodes.length < 2) return 1
  let aligned = 0
  let pairs = 0
  for (let a = 0; a < nodes.length; a += 1) {
    for (let b = a + 1; b < nodes.length; b += 1) {
      const first = nodes[a]!
      const second = nodes[b]!
      pairs += 1
      const centerXDifference = Math.abs((first.x + first.width / 2) - (second.x + second.width / 2))
      const centerYDifference = Math.abs((first.y + first.height / 2) - (second.y + second.height / 2))
      if (centerXDifference < 2 || centerYDifference < 2) aligned += 1
    }
  }
  return pairs === 0 ? 1 : aligned / pairs
}

export function auditDiagram(diagram: PositionedDiagram): AuditReport {
  const issues: AuditIssue[] = []
  let nodeOverlaps = 0

  for (let a = 0; a < diagram.nodes.length; a += 1) {
    for (let b = a + 1; b < diagram.nodes.length; b += 1) {
      const first = diagram.nodes[a]!
      const second = diagram.nodes[b]!
      if (!overlaps(first, second)) continue
      nodeOverlaps += 1
      issues.push({
        severity: 'high',
        type: 'node-overlap',
        message: `${first.id} overlaps ${second.id}`,
        nodes: [first.id, second.id],
      })
    }
  }

  const allSegments = diagram.edges.flatMap(edgeSegments)
  let edgeCrossings = 0
  const crossingPairs = new Set<string>()
  for (let a = 0; a < allSegments.length; a += 1) {
    for (let b = a + 1; b < allSegments.length; b += 1) {
      const first = allSegments[a]!
      const second = allSegments[b]!
      if (first.edge.id === second.edge.id) continue
      if (
        first.edge.source === second.edge.source
        || first.edge.source === second.edge.target
        || first.edge.target === second.edge.source
        || first.edge.target === second.edge.target
      ) continue
      if (!strictIntersection(first, second)) continue
      const key = [first.edge.id, second.edge.id].sort().join('|')
      if (crossingPairs.has(key)) continue
      crossingPairs.add(key)
      edgeCrossings += 1
      issues.push({
        severity: 'medium',
        type: 'edge-crossing',
        message: `${first.edge.id} crosses ${second.edge.id}`,
        edges: [first.edge.id, second.edge.id],
      })
    }
  }

  let edgeNodeIntersections = 0
  for (const edge of diagram.edges) {
    const segments = edgeSegments(edge)
    for (const node of diagram.nodes) {
      if (node.id === edge.source || node.id === edge.target) continue
      if (!segments.some((segment) => segmentIntersectsNode(segment, node))) continue
      edgeNodeIntersections += 1
      issues.push({
        severity: 'high',
        type: 'edge-node-intersection',
        message: `${edge.id} passes through ${node.id}`,
        nodes: [node.id],
        edges: [edge.id],
      })
    }
  }

  const totalBends = diagram.edges.reduce((total, edge) => total + bendCount(edge), 0)
  if (totalBends > diagram.edges.length * 2) {
    issues.push({
      severity: 'low',
      type: 'excessive-bends',
      message: `The diagram has ${totalBends} arrow bends`,
    })
  }

  const alignment = alignmentScore(diagram.nodes)
  issues.push(...readabilityIssues(diagram, allSegments), ...endpointIssues(diagram))
  for (const issue of issues) issue.supportedFixes = ['set-direction', 'place-relative']
  const labelCollisions = issues.filter((issue) => issue.type === 'label-collision').length
  const sharedRoutes = issues.filter((issue) => issue.type === 'shared-route').length
  const endpointOverlaps = issues.filter((issue) => issue.type === 'endpoint-overlap').length
  const aspectRatio = diagram.height === 0 ? 1 : diagram.width / diagram.height
  const aspectPenalty = aspectRatio > 2.4
    ? Math.min(18, (aspectRatio - 2.4) * 8)
    : aspectRatio < 0.5
      ? Math.min(18, (0.5 - aspectRatio) * 20)
      : 0
  const score = Math.max(0, Math.min(100, Math.round(
    96
      - nodeOverlaps * 30
      - edgeCrossings * 8
      - edgeNodeIntersections * 20
      - labelCollisions * 8
      - sharedRoutes * 8
      - endpointOverlaps * 6
      - Math.max(0, totalBends - diagram.edges.length * 2) * 2
      - aspectPenalty
      + alignment * 4,
  )))

  return {
    score,
    issues,
    metrics: {
      nodeOverlaps,
      edgeCrossings,
      edgeNodeIntersections,
      labelCollisions,
      sharedRoutes,
      endpointOverlaps,
      totalBends,
      alignmentScore: Number(alignment.toFixed(3)),
      aspectRatio: Number(aspectRatio.toFixed(3)),
    },
  }
}
