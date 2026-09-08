import type { Point } from './model.ts'

export type ArchitecturePort = 'L' | 'R' | 'T' | 'B'
export interface ArchitectureBox { x: number; y: number; width: number; height: number }
export interface ArchitectureServiceGeometry { id: string; icon: ArchitectureBox; label?: ArchitectureBox }
export interface ArchitectureRouteGeometry {
  source: string
  target: string
  sourcePort: ArchitecturePort
  targetPort: ArchitecturePort
  points: Point[]
}

export function architecturePortPoint(box: ArchitectureBox, port: ArchitecturePort): Point {
  if (port === 'L') return { x: box.x, y: box.y + box.height / 2 }
  if (port === 'R') return { x: box.x + box.width, y: box.y + box.height / 2 }
  if (port === 'T') return { x: box.x + box.width / 2, y: box.y }
  return { x: box.x + box.width / 2, y: box.y + box.height }
}

function overlap(first: ArchitectureBox, second: ArchitectureBox): boolean {
  return first.x < second.x + second.width && first.x + first.width > second.x
    && first.y < second.y + second.height && first.y + first.height > second.y
}

export function architectureSegmentHitsBox(start: Point, end: Point, box: ArchitectureBox): boolean {
  if (start.x === end.x) return start.x > box.x && start.x < box.x + box.width
    && Math.max(start.y, end.y) > box.y && Math.min(start.y, end.y) < box.y + box.height
  if (start.y === end.y) return start.y > box.y && start.y < box.y + box.height
    && Math.max(start.x, end.x) > box.x && Math.min(start.x, end.x) < box.x + box.width
  return false
}

export function auditArchitectureGeometry(
  services: ArchitectureServiceGeometry[],
  routes: ArchitectureRouteGeometry[],
  headers: ArchitectureBox[] = [],
) {
  const byId = new Map(services.map((service) => [service.id, service]))
  let detachedEndpoints = 0
  let portViolations = 0
  let nodeOverlaps = 0
  let labelCollisions = 0
  let edgeNodeIntersections = 0
  let headerCrossings = 0
  let excessiveBends = 0
  let sharedSegments = 0
  const segments = routes.flatMap((route, routeIndex) => route.points.slice(1).map((end, index) => ({
    start: route.points[index]!, end, route, routeIndex,
  })))
  for (const route of routes) {
    excessiveBends += Math.max(0, route.points.length - 6)
    for (const end of ['source', 'target'] as const) {
      const service = byId.get(route[end])
      const anchor = end === 'source' ? route.points[0] : route.points.at(-1)
      const adjacent = end === 'source' ? route.points[1] : route.points.at(-2)
      const port = end === 'source' ? route.sourcePort : route.targetPort
      const expected = service ? architecturePortPoint(service.icon, port) : undefined
      if (!expected || !anchor || Math.hypot(expected.x - anchor.x, expected.y - anchor.y) > 0.1) detachedEndpoints += 1
      if (!anchor || !adjacent || (port === 'L' ? adjacent.x >= anchor.x || adjacent.y !== anchor.y
        : port === 'R' ? adjacent.x <= anchor.x || adjacent.y !== anchor.y
          : port === 'T' ? adjacent.y >= anchor.y || adjacent.x !== anchor.x
            : adjacent.y <= anchor.y || adjacent.x !== anchor.x)) portViolations += 1
    }
  }
  for (const [index, service] of services.entries()) {
    for (const other of services.slice(index + 1)) {
      if (overlap(service.icon, other.icon)) nodeOverlaps += 1
      if (service.label && other.label && overlap(service.label, other.label)) labelCollisions += 1
    }
    if (service.label) {
      for (const other of services) if (overlap(service.label, other.icon)) labelCollisions += 1
    }
    for (const route of routes) {
      const pieces = route.points.slice(1).map((end, index) => ({ start: route.points[index]!, end }))
      if (pieces.some(({ start, end }) => architectureSegmentHitsBox(start, end, service.icon))) edgeNodeIntersections += 1
      if (service.label && pieces.some(({ start, end }) => architectureSegmentHitsBox(start, end, service.label!))) labelCollisions += 1
    }
  }
  for (const route of routes) {
    for (const header of headers) {
      if (route.points.slice(1).some((end, index) => architectureSegmentHitsBox(route.points[index]!, end, header))) headerCrossings += 1
    }
  }
  for (const [index, first] of segments.entries()) {
    for (const second of segments.slice(index + 1)) {
      if (first.routeIndex === second.routeIndex) continue
      const horizontal = first.start.y === first.end.y && second.start.y === second.end.y && first.start.y === second.start.y
      const vertical = first.start.x === first.end.x && second.start.x === second.end.x && first.start.x === second.start.x
      if (!horizontal && !vertical) continue
      const axis = horizontal ? 'x' : 'y'
      const low = Math.max(Math.min(first.start[axis], first.end[axis]), Math.min(second.start[axis], second.end[axis]))
      const high = Math.min(Math.max(first.start[axis], first.end[axis]), Math.max(second.start[axis], second.end[axis]))
      if (high - low <= 8) continue
      const common = [first.route.source, first.route.target].filter((id) => id === second.route.source || id === second.route.target)
      const terminalStub = common.some((id) => {
        const firstAnchor = first.route.source === id ? first.route.points[0]! : first.route.points.at(-1)!
        const secondAnchor = second.route.source === id ? second.route.points[0]! : second.route.points.at(-1)!
        return firstAnchor.x === secondAnchor.x && firstAnchor.y === secondAnchor.y
          && Math.max(Math.abs(low - firstAnchor[axis]), Math.abs(high - firstAnchor[axis])) <= 28
      })
      if (!terminalStub) sharedSegments += 1
    }
  }
  return { detachedEndpoints, portViolations, nodeOverlaps, labelCollisions, edgeNodeIntersections, headerCrossings, excessiveBends, sharedSegments }
}
