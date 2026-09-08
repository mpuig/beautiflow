import type { Point } from './model.ts'
import type {
  DiagramProject,
  LayoutCandidate,
  LayoutDirection,
  NodeRole,
  PositionedDiagram,
  PositionedEdge,
  PositionedGroup,
  PositionedNode,
} from './model.ts'
import { auditDiagram } from './audit.ts'
import { layoutGraphSync } from '../vendor/beautiful-mermaid/layout-engine.ts'
import type { MermaidGraph as VendorMermaidGraph, PositionedNode as VendorPositionedNode } from '../vendor/beautiful-mermaid/types.ts'
import { clipEdgeToShape } from '../vendor/beautiful-mermaid/shape-clipping.ts'

const PADDING = 48

export interface LayoutOptions {
  direction: LayoutDirection
  nodeSpacing?: number
  layerSpacing?: number
  applyOverrides?: boolean
}

function roleForNode(project: DiagramProject, id: string): NodeRole {
  const override = project.sidecar.nodes[id]
  if (override?.role) return override.role
  if (project.sidecar.primaryFlow?.includes(id)) return 'primary'
  return 'secondary'
}

interface RoutingRect { left: number; right: number; top: number; bottom: number }

function edgePorts(source: PositionedNode, target: PositionedNode, direction: LayoutDirection): [Point, Point] {
  const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 }
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  const horizontal = Math.abs(dx) > Math.abs(dy) * 1.2 || (Math.abs(dx) === Math.abs(dy) && direction === 'LR')
  if (horizontal) {
    const forwards = dx >= 0
    return [
      { x: forwards ? source.x + source.width : source.x, y: sourceCenter.y },
      { x: forwards ? target.x : target.x + target.width, y: targetCenter.y },
    ]
  }
  const forwards = dy >= 0
  return [
    { x: sourceCenter.x, y: forwards ? source.y + source.height : source.y },
    { x: targetCenter.x, y: forwards ? target.y : target.y + target.height },
  ]
}

function insideObstacle(point: Point, obstacles: RoutingRect[]): boolean {
  return obstacles.some((rect) => point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom)
}

function clearSegment(a: Point, b: Point, obstacles: RoutingRect[]): boolean {
  return !obstacles.some((rect) => {
    if (a.x === b.x) {
      const min = Math.min(a.y, b.y); const max = Math.max(a.y, b.y)
      return a.x > rect.left && a.x < rect.right && max > rect.top && min < rect.bottom
    }
    const min = Math.min(a.x, b.x); const max = Math.max(a.x, b.x)
    return a.y > rect.top && a.y < rect.bottom && max > rect.left && min < rect.right
  })
}

function simplifyRoute(points: Point[]): Point[] {
  const result: Point[] = []
  for (const point of points) {
    const previous = result[result.length - 1]
    const before = result[result.length - 2]
    if (previous && previous.x === point.x && previous.y === point.y) continue
    if (before && previous && ((before.x === previous.x && previous.x === point.x) || (before.y === previous.y && previous.y === point.y))) result.pop()
    result.push(point)
  }
  return result
}

export function routeEdge(
  source: PositionedNode,
  target: PositionedNode,
  direction: LayoutDirection,
  allNodes: PositionedNode[],
  explicitPorts?: [Point, Point],
  occupiedRoutes: Point[][] = [],
): Point[] {
  const [sourcePort, targetPort] = explicitPorts ?? edgePorts(source, target, direction)
  const margin = 14
  const outward = (port: Point, node: PositionedNode): Point => {
    if (Math.abs(port.x - node.x) < 0.01) return { x: port.x - margin, y: port.y }
    if (Math.abs(port.x - (node.x + node.width)) < 0.01) return { x: port.x + margin, y: port.y }
    if (Math.abs(port.y - node.y) < 0.01) return { x: port.x, y: port.y - margin }
    return { x: port.x, y: port.y + margin }
  }
  const start = outward(sourcePort, source)
  const end = outward(targetPort, target)
  const obstacles = allNodes
    .filter((node) => node.id !== source.id && node.id !== target.id)
    .map((node) => ({ left: node.x - margin, right: node.x + node.width + margin, top: node.y - margin, bottom: node.y + node.height + margin }))
  const xValues = [...new Set([start.x, end.x, ...obstacles.flatMap((rect) => [rect.left, rect.right])])].sort((a, b) => a - b)
  const yValues = [...new Set([start.y, end.y, ...obstacles.flatMap((rect) => [rect.top, rect.bottom])])].sort((a, b) => a - b)
  const points: Point[] = []
  const byCoordinate = new Map<string, number>()
  for (const x of xValues) for (const y of yValues) {
    const point = { x, y }
    if (insideObstacle(point, obstacles)) continue
    byCoordinate.set(`${x},${y}`, points.length)
    points.push(point)
  }
  const fallback = (): Point[] => simplifyRoute(direction === 'LR'
    ? [sourcePort, start, { x: (start.x + end.x) / 2, y: start.y }, { x: (start.x + end.x) / 2, y: end.y }, end, targetPort]
    : [sourcePort, start, { x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }, end, targetPort])
  const startIndex = byCoordinate.get(`${start.x},${start.y}`)
  const endIndex = byCoordinate.get(`${end.x},${end.y}`)
  if (startIndex === undefined || endIndex === undefined) return fallback()

  const neighbors = new Map<number, Array<{ index: number; direction: 'H' | 'V'; distance: number }>>()
  const connectLine = (indices: number[], axis: 'H' | 'V') => {
    indices.sort((a, b) => axis === 'H' ? points[a]!.x - points[b]!.x : points[a]!.y - points[b]!.y)
    for (let index = 1; index < indices.length; index += 1) {
      const a = indices[index - 1]!; const b = indices[index]!
      if (!clearSegment(points[a]!, points[b]!, obstacles)) continue
      const distance = Math.abs(points[a]!.x - points[b]!.x) + Math.abs(points[a]!.y - points[b]!.y)
      neighbors.set(a, [...(neighbors.get(a) ?? []), { index: b, direction: axis, distance }])
      neighbors.set(b, [...(neighbors.get(b) ?? []), { index: a, direction: axis, distance }])
    }
  }
  for (const y of yValues) connectLine(points.map((point, index) => ({ point, index })).filter(({ point }) => point.y === y).map(({ index }) => index), 'H')
  for (const x of xValues) connectLine(points.map((point, index) => ({ point, index })).filter(({ point }) => point.x === x).map(({ index }) => index), 'V')

  type State = { point: number; direction: 'H' | 'V' | 'S'; cost: number; estimate: number; key: string }
  const queue: State[] = [{ point: startIndex, direction: 'S', cost: 0, estimate: 0, key: `${startIndex}:S` }]
  const best = new Map<string, number>([[`${startIndex}:S`, 0]])
  const previous = new Map<string, string>()
  let finalKey: string | undefined
  while (queue.length) {
    queue.sort((a, b) => a.estimate - b.estimate || a.cost - b.cost)
    const current = queue.shift()!
    if (current.cost !== best.get(current.key)) continue
    if (current.point === endIndex) { finalKey = current.key; break }
    for (const next of neighbors.get(current.point) ?? []) {
      const bend = current.direction !== 'S' && current.direction !== next.direction ? 28 : 0
      const from = points[current.point]!
      const to = points[next.index]!
      let congestion = 0
      for (const occupied of occupiedRoutes) {
        for (let index = 1; index < occupied.length; index += 1) {
          const start = occupied[index - 1]!
          const end = occupied[index]!
          const horizontal = from.y === to.y && start.y === end.y && from.y === start.y
          const vertical = from.x === to.x && start.x === end.x && from.x === start.x
          if (!horizontal && !vertical) continue
          const axis = horizontal ? 'x' : 'y'
          const overlap = Math.min(Math.max(from[axis], to[axis]), Math.max(start[axis], end[axis]))
            - Math.max(Math.min(from[axis], to[axis]), Math.min(start[axis], end[axis]))
          congestion += Math.max(0, overlap) * 3
        }
      }
      const cost = current.cost + next.distance + bend + congestion
      const key = `${next.index}:${next.direction}`
      if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) continue
      best.set(key, cost); previous.set(key, current.key)
      const point = points[next.index]!
      const heuristic = Math.abs(point.x - end.x) + Math.abs(point.y - end.y)
      queue.push({ point: next.index, direction: next.direction, cost, estimate: cost + heuristic, key })
    }
  }
  if (!finalKey) return fallback()
  const route: Point[] = []
  let key: string | undefined = finalKey
  while (key) {
    route.push(points[Number(key.split(':')[0])]!)
    key = previous.get(key)
  }
  route.reverse()
  let clipped = simplifyRoute([sourcePort, ...route, targetPort])
  if (explicitPorts) return clipped
  clipped = clipEdgeToShape(clipped, source as VendorPositionedNode, true)
  clipped = clipEdgeToShape(clipped, target as VendorPositionedNode, false)
  return clipped
}

function normalizeCanvas(nodes: Array<Pick<PositionedNode, 'x' | 'y' | 'width' | 'height'>>): {
  width: number
  height: number
  shiftX: number
  shiftY: number
} {
  if (nodes.length === 0) {
    return { width: PADDING * 2, height: PADDING * 2, shiftX: 0, shiftY: 0 }
  }
  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const shiftX = PADDING - minX
  const shiftY = PADDING - minY
  for (const node of nodes) {
    node.x += shiftX
    node.y += shiftY
  }
  return {
    width: Math.max(...nodes.map((node) => node.x + node.width)) + PADDING,
    height: Math.max(...nodes.map((node) => node.y + node.height)) + PADDING,
    shiftX,
    shiftY,
  }
}

function shiftGroups(
  groups: PositionedGroup[],
  shiftX: number,
  shiftY: number,
): PositionedGroup[] {
  return groups.map((group) => ({
    ...group,
    x: group.x + shiftX,
    y: group.y + shiftY,
    children: shiftGroups(group.children, shiftX, shiftY),
  }))
}

export async function layoutProject(
  project: DiagramProject,
  options: LayoutOptions,
): Promise<PositionedDiagram> {
  const graph = {
    ...project.graph,
    direction: options.direction === 'LR' ? 'LR' : 'TD',
  } as VendorMermaidGraph
  const positioned = layoutGraphSync(graph, {
    nodeSpacing: options.nodeSpacing ?? project.sidecar.nodeSpacing ?? 48,
    layerSpacing: options.layerSpacing ?? project.sidecar.layerSpacing ?? 88,
    componentSpacing: options.nodeSpacing ?? project.sidecar.nodeSpacing ?? 48,
    padding: PADDING,
  })

  const freshCanvas = normalizeCanvas(positioned.nodes)
  const nodes: PositionedNode[] = positioned.nodes.map((node) => {
    const override = options.applyOverrides === false ? undefined : project.sidecar.nodes[node.id]
    return {
      id: node.id,
      label: node.label,
      shape: node.shape,
      x: override?.x ?? node.x,
      y: override?.y ?? node.y,
      width: override?.width ?? node.width,
      height: override?.height ?? node.height,
      role: roleForNode(project, node.id),
      pinned: override?.pinned ?? false,
      ...(node.inlineStyle ? { inlineStyle: node.inlineStyle } : {}),
    }
  })

  const canvas = normalizeCanvas(nodes)
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const positionedEdges = new Map<string, typeof positioned.edges>()
  for (const edge of positioned.edges) {
    const key = `${edge.source}\u0000${edge.target}`
    positionedEdges.set(key, [...(positionedEdges.get(key) ?? []), edge])
  }
  const edges: PositionedEdge[] = project.graph.edges.flatMap((edge, index) => {
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (!source || !target) return []
    const role: NodeRole = target.role === 'exception'
      ? 'exception'
      : source.role === 'primary' && target.role === 'primary'
        ? 'primary'
        : 'secondary'
    const originalNodeSource = positioned.nodes.find((node) => node.id === source.id)
    const originalNodeTarget = positioned.nodes.find((node) => node.id === target.id)
    const sourceUnmoved = originalNodeSource
      && Math.abs(source.x - (originalNodeSource.x + canvas.shiftX)) < 0.01
      && Math.abs(source.y - (originalNodeSource.y + canvas.shiftY)) < 0.01
      && source.width === originalNodeSource.width && source.height === originalNodeSource.height
    const targetUnmoved = originalNodeTarget
      && Math.abs(target.x - (originalNodeTarget.x + canvas.shiftX)) < 0.01
      && Math.abs(target.y - (originalNodeTarget.y + canvas.shiftY)) < 0.01
      && target.width === originalNodeTarget.width && target.height === originalNodeTarget.height
    const originalEdge = positionedEdges.get(`${edge.source}\u0000${edge.target}`)?.shift()
    const useElkRoute = sourceUnmoved && targetUnmoved && originalEdge
    const points = useElkRoute
      ? originalEdge.points.map((point) => ({ x: point.x + freshCanvas.shiftX + canvas.shiftX, y: point.y + freshCanvas.shiftY + canvas.shiftY }))
      : routeEdge(source, target, options.direction, nodes)
    const labelPosition = useElkRoute && originalEdge.labelPosition
      ? { x: originalEdge.labelPosition.x + freshCanvas.shiftX + canvas.shiftX, y: originalEdge.labelPosition.y + freshCanvas.shiftY + canvas.shiftY }
      : undefined
    return [{
      id: `${edge.source}->${edge.target}#${index}`,
      source: edge.source,
      target: edge.target,
      ...(edge.label ? { label: edge.label } : {}),
      points,
      role,
      style: edge.style,
      hasArrowStart: edge.hasArrowStart,
      hasArrowEnd: edge.hasArrowEnd,
      ...(labelPosition ? { labelPosition } : {}),
      ...(originalEdge?.inlineStyle ? { inlineStyle: originalEdge.inlineStyle } : {}),
    }]
  })

  return {
    width: canvas.width,
    height: canvas.height,
    direction: options.direction,
    nodes,
    edges,
    groups: shiftGroups(positioned.groups, freshCanvas.shiftX + canvas.shiftX, freshCanvas.shiftY + canvas.shiftY),
  }
}

const CANDIDATE_PRESETS = [
  { direction: 'LR' as const, nodeSpacing: 40, layerSpacing: 80 },
  { direction: 'LR' as const, nodeSpacing: 64, layerSpacing: 104 },
  { direction: 'LR' as const, nodeSpacing: 88, layerSpacing: 128 },
  { direction: 'TD' as const, nodeSpacing: 48, layerSpacing: 88 },
  { direction: 'TD' as const, nodeSpacing: 72, layerSpacing: 112 },
]

export async function generateCandidates(project: DiagramProject, count = 5): Promise<LayoutCandidate[]> {
  const presets = CANDIDATE_PRESETS.slice(0, Math.max(1, Math.min(count, CANDIDATE_PRESETS.length)))
  return Promise.all(presets.map(async (preset, index) => {
    const diagram = await layoutProject(project, { ...preset, applyOverrides: false })
    return {
      id: `candidate-${index + 1}`,
      ...preset,
      diagram,
      audit: auditDiagram(diagram),
    }
  }))
}
