import type { AuditIssue, AuditReport, Point, PositionedDiagram, PositionedEdge, PositionedNode } from './model.ts'

interface Segment {
  start: Point
  end: Point
  edge: PositionedEdge
}

function overlaps(a: PositionedNode, b: PositionedNode): boolean {
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

function segmentIntersectsNode(segment: Segment, node: PositionedNode): boolean {
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
  return false
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
      labelCollisions: 0,
      totalBends,
      alignmentScore: Number(alignment.toFixed(3)),
      aspectRatio: Number(aspectRatio.toFixed(3)),
    },
  }
}
