import type { MermaidEdge, MermaidGraph, MermaidSubgraph, Point, PositionedGroup, PositionedNode } from '../vendor/beautiful-mermaid/types.ts'
import { layoutGraphSync } from '../vendor/beautiful-mermaid/layout-engine.ts'
import { routeEdge as routeAroundNodes } from './layout.ts'
import type { PositionedNode as RoutedNode } from './model.ts'

type Port = 'L' | 'R' | 'T' | 'B'

interface Service { id: string; label: string; parent?: string }
interface Group { id: string; label: string; parent?: string }
interface Endpoint { id: string; port?: Port }
interface Edge { source: Endpoint; target: Endpoint; arrowStart: boolean; arrowEnd: boolean }
interface Model { services: Map<string, Service>; groups: Map<string, Group>; edges: Edge[]; depth: number }
interface Box { x: number; y: number; width: number; height: number }

const SVG_NS = 'http://www.w3.org/2000/svg'
const SERVICE_WIDTH = 80
const SERVICE_HEIGHT = 118

function endpoint(token: string): Endpoint | undefined {
  const clean = token.replaceAll('{group}', '').replaceAll(/\s+/g, '')
  const prefix = clean.match(/^([LRTB]):([\w-]+)$/)
  if (prefix) return { id: prefix[2]!, port: prefix[1] as Port }
  const suffix = clean.match(/^([\w-]+):([LRTB])$/)
  if (suffix) return { id: suffix[1]!, port: suffix[2] as Port }
  if (/^[\w-]+$/.test(clean)) return { id: clean }
  return undefined
}

function parse(source: string): Model | undefined {
  const services = new Map<string, Service>()
  const groups = new Map<string, Group>()
  const edges: Edge[] = []
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim()
    let match = line.match(/^service\s+([\w-]+)\([^)]*\)\[([^\]]*)\](?:\s+in\s+([\w-]+))?\s*$/)
    if (match) {
      services.set(match[1]!, { id: match[1]!, label: match[2]!, parent: match[3] })
      continue
    }
    match = line.match(/^group\s+([\w-]+)\([^)]*\)\[([^\]]*)\](?:\s+in\s+([\w-]+))?\s*$/)
    if (match) {
      groups.set(match[1]!, { id: match[1]!, label: match[2]!, parent: match[3] })
      continue
    }
    if (/^junction\s+/.test(line)) return undefined
    match = line.match(/^(.+?)\s*(<-->|-->|<--|---)\s*(.+?)\s*$/)
    if (!match) continue
    const sourceEndpoint = endpoint(match[1]!)
    const targetEndpoint = endpoint(match[3]!)
    if (!sourceEndpoint || !targetEndpoint) continue
    edges.push({
      source: sourceEndpoint,
      target: targetEndpoint,
      arrowStart: match[2] === '<--' || match[2] === '<-->',
      arrowEnd: match[2] === '-->' || match[2] === '<-->',
    })
  }
  if (services.size === 0) return undefined
  const groupDepth = (id: string): number => {
    const parent = groups.get(id)?.parent
    return parent ? 1 + groupDepth(parent) : 1
  }
  const depth = Math.max(0, ...groups.keys().map(groupDepth))
  return { services, groups, edges, depth }
}

function subgraphs(model: Model): MermaidSubgraph[] {
  const mapped = new Map<string, MermaidSubgraph>()
  for (const group of model.groups.values()) {
    mapped.set(group.id, { id: group.id, label: group.label, nodeIds: [], children: [], direction: 'LR' })
  }
  for (const service of model.services.values()) {
    if (service.parent) mapped.get(service.parent)?.nodeIds.push(service.id)
  }
  const roots: MermaidSubgraph[] = []
  for (const group of model.groups.values()) {
    const item = mapped.get(group.id)!
    if (group.parent && mapped.has(group.parent)) mapped.get(group.parent)!.children.push(item)
    else roots.push(item)
  }
  return roots
}

function position(model: Model) {
  const nodes: MermaidGraph['nodes'] = new Map()
  const placeholder = 'MMMMMMMM\nMMMMMMMM\nMMMMMMMM\nMMMMMMMM'
  for (const service of model.services.values()) nodes.set(service.id, { id: service.id, label: placeholder, shape: 'rectangle' })
  const edges: MermaidEdge[] = model.edges.map((edge) => ({
    source: edge.source.id,
    target: edge.target.id,
    style: 'solid',
    hasArrowStart: edge.arrowStart,
    hasArrowEnd: edge.arrowEnd,
  }))
  const graph: MermaidGraph = {
    direction: 'LR',
    nodes,
    edges,
    subgraphs: subgraphs(model),
    classDefs: new Map(),
    classAssignments: new Map(),
    nodeStyles: new Map(),
    linkStyles: new Map(),
  }
  return layoutGraphSync(graph, { padding: 36, nodeSpacing: 42, layerSpacing: 76, font: 'Inter' })
}

function flatten(groups: PositionedGroup[]): PositionedGroup[] {
  return groups.flatMap((group) => [group, ...flatten(group.children)])
}

function primaryPath(model: Model): { nodes: Set<string>; edges: Set<number> } {
  const outgoing = new Map<string, Array<{ edge: Edge; index: number }>>()
  model.edges.forEach((edge, index) => outgoing.set(edge.source.id, [...(outgoing.get(edge.source.id) ?? []), { edge, index }]))
  const walk = (id: string, seen: Set<string>): number[] => {
    if (seen.has(id)) return []
    let best: number[] = []
    for (const candidate of outgoing.get(id) ?? []) {
      const tail = walk(candidate.edge.target.id, new Set([...seen, id]))
      const path = [candidate.index, ...tail]
      if (path.length > best.length) best = path
    }
    return best
  }
  let best: number[] = []
  for (const id of model.services.keys()) {
    const candidate = walk(id, new Set())
    if (candidate.length > best.length) best = candidate
  }
  const nodes = new Set<string>()
  for (const index of best) {
    nodes.add(model.edges[index]!.source.id)
    nodes.add(model.edges[index]!.target.id)
  }
  return { nodes, edges: new Set(best) }
}

function arrangeTopLevelGroups(
  model: Model,
  positionedGroups: PositionedGroup[],
  positionedNodes: PositionedNode[],
  primaryNodes: Set<string>,
): void {
  const account = flatten(positionedGroups).find((group) => group.id === 'account')
  if (!account || account.children.length < 3) return
  const nodeMap = new Map(positionedNodes.map((node) => [node.id, node]))
  const groupMap = new Map(flatten(positionedGroups).map((group) => [group.id, group]))
  const directServices = new Map<string, string[]>()
  for (const service of model.services.values()) {
    if (service.parent) directServices.set(service.parent, [...(directServices.get(service.parent) ?? []), service.id])
  }
  const descendants = (group: PositionedGroup): string[] => [
    ...(directServices.get(group.id) ?? []),
    ...group.children.flatMap(descendants),
  ]
  const shift = (group: PositionedGroup, deltaX: number, deltaY: number): void => {
    group.x += deltaX
    group.y += deltaY
    for (const id of directServices.get(group.id) ?? []) {
      const node = nodeMap.get(id)
      if (node) { node.x += deltaX; node.y += deltaY }
    }
    for (const child of group.children) shift(child, deltaX, deltaY)
  }
  const structural = [...account.children].sort((a, b) => b.width * b.height - a.width * a.height)[0]
  const top = account.children
    .filter((group) => group.id !== structural?.id)
    .sort((a, b) => {
      const aPrimary = descendants(a).some((id) => primaryNodes.has(id))
      const bPrimary = descendants(b).some((id) => primaryNodes.has(id))
      if (aPrimary !== bPrimary) return Number(bPrimary) - Number(aPrimary)
      return [...model.groups.keys()].indexOf(a.id) - [...model.groups.keys()].indexOf(b.id)
    })
  let x = account.x + 16
  const y = Math.min(...top.map((group) => group.y))
  for (const group of top) {
    shift(groupMap.get(group.id)!, x - group.x, y - group.y)
    x += group.width + 20
  }
}

function placeExternalActors(
  model: Model,
  boxes: Map<string, Box>,
  groups: PositionedGroup[],
  primaryNodes: Set<string>,
): void {
  const account = flatten(groups).find((group) => group.id === 'account') ?? groups[0]
  if (!account) return
  const aboveY = account.y - SERVICE_HEIGHT - 46
  for (const service of model.services.values()) {
    if (service.parent) continue
    const box = boxes.get(service.id)
    if (!box) continue
    const outgoing = model.edges.find((edge) => edge.source.id === service.id)
    const incoming = model.edges.find((edge) => edge.target.id === service.id)
    if (outgoing) {
      const target = boxes.get(outgoing.target.id)
      if (!target) continue
      if (primaryNodes.has(service.id) || target.y < account.y + account.height * 0.55) {
        box.x = target.x
        box.y = aboveY
      } else {
        box.x = account.x - SERVICE_WIDTH - 46
        box.y = target.y
      }
    } else if (incoming) {
      const source = boxes.get(incoming.source.id)
      if (!source) continue
      if (source.y < account.y + account.height * 0.55) {
        box.x = source.x
        box.y = aboveY
      } else {
        box.x = account.x + account.width + 46
        box.y = source.y
      }
    }
  }
}

function visualBox(node: PositionedNode): Box {
  return {
    x: node.x + (node.width - SERVICE_WIDTH) / 2,
    y: node.y + (node.height - SERVICE_HEIGHT) / 2,
    width: SERVICE_WIDTH,
    height: SERVICE_HEIGHT,
  }
}

function inferredPort(from: Box, to: Box): Port {
  const dx = to.x + to.width / 2 - from.x - from.width / 2
  const dy = to.y + to.height / 2 - from.y - from.height / 2
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'R' : 'L'
  return dy >= 0 ? 'B' : 'T'
}

function portPoint(box: Box, port: Port): Point {
  if (port === 'L') return { x: box.x, y: box.y + 40 }
  if (port === 'R') return { x: box.x + SERVICE_WIDTH, y: box.y + 40 }
  if (port === 'T') return { x: box.x + SERVICE_WIDTH / 2, y: box.y }
  return { x: box.x + SERVICE_WIDTH / 2, y: box.y + SERVICE_HEIGHT }
}

function modelServicePort(endpoint: Endpoint, from: Box, to: Box, model?: Model): Port {
  const service = model?.services.get(endpoint.id)
  return service && !service.parent ? inferredPort(from, to) : endpoint.port ?? inferredPort(from, to)
}

function route(
  edge: Edge,
  boxes: Map<string, Box>,
  routingNodes: Map<string, RoutedNode>,
  routeObstacles: RoutedNode[],
  model: Model,
): Point[] {
  const source = boxes.get(edge.source.id)!
  const target = boxes.get(edge.target.id)!
  const sourcePort = modelServicePort(edge.source, source, target, model)
  const targetPort = modelServicePort(edge.target, target, source, model)
  return routeAroundNodes(
    routingNodes.get(edge.source.id)!,
    routingNodes.get(edge.target.id)!,
    'LR',
    [...routingNodes.values(), ...routeObstacles],
    [portPoint(source, sourcePort), portPoint(target, targetPort)],
  )
}

function roundedPath(points: Point[]): string {
  if (!points.length) return ''
  let result = `M ${points[0]!.x} ${points[0]!.y}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]!
    const current = points[index]!
    const next = points[index + 1]!
    const incoming = Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y)
    const outgoing = Math.abs(next.x - current.x) + Math.abs(next.y - current.y)
    const radius = Math.min(7, incoming / 2, outgoing / 2)
    const before = { x: current.x + Math.sign(previous.x - current.x) * radius, y: current.y + Math.sign(previous.y - current.y) * radius }
    const after = { x: current.x + Math.sign(next.x - current.x) * radius, y: current.y + Math.sign(next.y - current.y) * radius }
    result += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`
  }
  const end = points.at(-1)!
  return `${result} L ${end.x} ${end.y}`
}

function updateGroup(root: SVGSVGElement, group: PositionedGroup): void {
  const rect = root.querySelector<SVGRectElement>(`[id$="-group-${group.id}"]`)
  if (!rect) return
  for (const [name, value] of Object.entries({ x: group.x, y: group.y, width: group.width, height: group.height })) rect.setAttribute(name, String(value))
  const decoration = rect.nextElementSibling
  decoration?.children[0]?.setAttribute('transform', `translate(${group.x + 1}, ${group.y + 1})`)
  decoration?.children[1]?.setAttribute('transform', `translate(${group.x + 34}, ${group.y + 7})`)
}

function arrowMarker(root: SVGSVGElement, id: string, color: string): void {
  let defs = root.querySelector<SVGDefsElement>(':scope > defs')
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs')
    root.prepend(defs)
  }
  const marker = document.createElementNS(SVG_NS, 'marker')
  for (const [name, value] of Object.entries({ id, viewBox: '0 0 9 8', refX: '8', refY: '4', markerWidth: '9', markerHeight: '8', markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' })) marker.setAttribute(name, value)
  const triangle = document.createElementNS(SVG_NS, 'path')
  triangle.setAttribute('d', 'M 0 0 L 9 4 L 0 8 Z')
  triangle.setAttribute('fill', color)
  marker.append(triangle)
  defs.append(marker)
}

function routeQuality(
  routes: Map<number, Point[]>,
  groups: PositionedGroup[],
  root: SVGSVGElement,
  model: Model,
): { score: number; sharedSegments: number; headerCrossings: number; excessiveBends: number; wrappedLabels: number; complexityLoad: number } {
  const segments: Array<{ edge: number; a: Point; b: Point }> = []
  let excessiveBends = 0
  for (const [edge, points] of routes) {
    excessiveBends += Math.max(0, points.length - 6)
    for (let index = 1; index < points.length; index += 1) segments.push({ edge, a: points[index - 1]!, b: points[index]! })
  }
  let sharedSegments = 0
  for (let index = 0; index < segments.length; index += 1) {
    const first = segments[index]!
    for (const second of segments.slice(index + 1)) {
      if (first.edge === second.edge) continue
      const firstEdge = model.edges[first.edge]!
      const secondEdge = model.edges[second.edge]!
      const sharedEndpoint = firstEdge.source.id === secondEdge.source.id
        || firstEdge.source.id === secondEdge.target.id
        || firstEdge.target.id === secondEdge.source.id
        || firstEdge.target.id === secondEdge.target.id
      if (sharedEndpoint) continue
      const horizontal = first.a.y === first.b.y && second.a.y === second.b.y
      const vertical = first.a.x === first.b.x && second.a.x === second.b.x
      if (horizontal && first.a.y === second.a.y) {
        const overlap = Math.min(Math.max(first.a.x, first.b.x), Math.max(second.a.x, second.b.x)) - Math.max(Math.min(first.a.x, first.b.x), Math.min(second.a.x, second.b.x))
        if (overlap > 8) sharedSegments += 1
      } else if (vertical && first.a.x === second.a.x) {
        const overlap = Math.min(Math.max(first.a.y, first.b.y), Math.max(second.a.y, second.b.y)) - Math.max(Math.min(first.a.y, first.b.y), Math.min(second.a.y, second.b.y))
        if (overlap > 8) sharedSegments += 1
      }
    }
  }
  const belongsToGroup = (serviceId: string, groupId: string): boolean => {
    let parent = model.services.get(serviceId)?.parent
    while (parent) {
      if (parent === groupId) return true
      parent = model.groups.get(parent)?.parent
    }
    return false
  }
  let headerCrossings = 0
  for (const segment of segments) {
    const edge = model.edges[segment.edge]!
    for (const group of flatten(groups)) {
      if (belongsToGroup(edge.source.id, group.id) || belongsToGroup(edge.target.id, group.id)) continue
      if (segment.a.y === segment.b.y && segment.a.y > group.y && segment.a.y < group.y + 38) {
        const overlap = Math.min(Math.max(segment.a.x, segment.b.x), group.x + group.width) - Math.max(Math.min(segment.a.x, segment.b.x), group.x)
        if (overlap > 12) headerCrossings += 1
      }
    }
  }
  let wrappedLabels = 0
  for (const service of root.querySelectorAll<SVGGElement>('.architecture-service')) {
    if (service.querySelectorAll('.text-inner-tspan').length > 2) wrappedLabels += 1
  }
  const complexityLoad = Math.max(0, model.services.size - 18)
  // Shared fan-in/fan-out terminal stubs and intentional boundary ingress are
  // excluded above; the remaining findings represent avoidable visual noise.
  const score = Math.max(0, Math.round(100 - sharedSegments * 5 - headerCrossings * 8 - excessiveBends * 2 - wrappedLabels * 3 - complexityLoad))
  return { score, sharedSegments, headerCrossings, excessiveBends, wrappedLabels, complexityLoad }
}

/** Keep Mermaid's native architecture layout for normal diagrams. Complex,
 * deeply nested diagrams use the same compound ELK engine as Beautiful Mermaid
 * while retaining Mermaid's architecture icons, labels, and boundaries. */
export function stabilizeComplexArchitectureSvg(svg: string, source: string): string {
  const model = parse(source)
  if (!model || model.services.size < 14 || model.depth < 2) return svg
  const positioned = position(model)
  const primary = primaryPath(model)
  arrangeTopLevelGroups(model, positioned.groups, positioned.nodes, primary.nodes)
  const host = document.createElement('div')
  host.innerHTML = svg
  const root = host.querySelector<SVGSVGElement>('svg')
  if (!root) return svg
  const nodes = new Map(positioned.nodes.map((node) => [node.id, visualBox(node)]))
  placeExternalActors(model, nodes, positioned.groups, primary.nodes)
  const routingNodes = new Map([...nodes].map(([id, box]) => [id, {
    id,
    label: model.services.get(id)?.label ?? id,
    shape: 'rectangle' as const,
    ...box,
    role: 'secondary' as const,
    pinned: false,
  }]))
  for (const [id, box] of nodes) root.querySelector<SVGGElement>(`[id$="-service-${id}"]`)?.setAttribute('transform', `translate(${box.x},${box.y})`)
  for (const group of flatten(positioned.groups)) updateGroup(root, group)

  const color = svg.match(/\.edge\{[^}]*stroke:([^;}]+)/)?.[1]?.trim() ?? '#232f3e'
  const markerId = `${root.id || 'beautiflow-architecture'}-arrowhead`
  arrowMarker(root, markerId, color)
  const layer = root.querySelector<SVGGElement>('.architecture-edges')
  if (layer) {
    layer.replaceChildren()
    const routeObstacles: RoutedNode[] = []
    const routedPoints = new Map<number, Point[]>()
    const routeOrder = model.edges.map((_, index) => index).sort((a, b) => Number(primary.edges.has(b)) - Number(primary.edges.has(a)) || a - b)
    routeOrder.forEach((index) => {
      const edge = model.edges[index]!
      if (!nodes.has(edge.source.id) || !nodes.has(edge.target.id)) return
      const isPrimary = primary.edges.has(index)
      const points = route(edge, nodes, routingNodes, routeObstacles, model)
      routedPoints.set(index, points)
      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        const a = points[pointIndex - 1]!
        const b = points[pointIndex]!
        const horizontal = a.y === b.y
        const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y)
        if (length < 36) continue
        routeObstacles.push({
          id: `routed-segment-${index}-${pointIndex}`,
          label: '',
          shape: 'rectangle',
          x: horizontal ? Math.min(a.x, b.x) + 12 : a.x - 3,
          y: horizontal ? a.y - 3 : Math.min(a.y, b.y) + 12,
          width: horizontal ? Math.max(1, length - 24) : 6,
          height: horizontal ? 6 : Math.max(1, length - 24),
          role: 'secondary',
          pinned: false,
        })
      }
      const path = document.createElementNS(SVG_NS, 'path')
      path.setAttribute('class', 'edge')
      path.setAttribute('id', `${root.id}-stabilized-edge-${index + 1}`)
      path.setAttribute('data-source', edge.source.id)
      path.setAttribute('data-target', edge.target.id)
      path.setAttribute('d', roundedPath(points))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      path.setAttribute('data-flow-role', isPrimary ? 'primary' : 'support')
      path.setAttribute('style', isPrimary
        ? 'stroke-width: 2.5px'
        : 'stroke-width: 1.4px; stroke-dasharray: 6 5; opacity: 0.72')
      if (edge.arrowStart) path.setAttribute('marker-start', `url(#${markerId})`)
      if (edge.arrowEnd) path.setAttribute('marker-end', `url(#${markerId})`)
      layer.append(path)
    })
    const quality = routeQuality(routedPoints, positioned.groups, root, model)
    root.setAttribute('data-beautiflow-quality-score', String(quality.score))
    root.setAttribute('data-beautiflow-shared-segments', String(quality.sharedSegments))
    root.setAttribute('data-beautiflow-header-crossings', String(quality.headerCrossings))
    root.setAttribute('data-beautiflow-excessive-bends', String(quality.excessiveBends))
    root.setAttribute('data-beautiflow-wrapped-labels', String(quality.wrappedLabels))
    root.setAttribute('data-beautiflow-complexity-load', String(quality.complexityLoad))
  }
  root.setAttribute('data-beautiflow-layout', 'compound-elk-fallback')
  return root.outerHTML
}
