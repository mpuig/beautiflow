import { createCanvas } from '@napi-rs/canvas'
import type { MermaidGraph, MermaidSubgraph, PositionedGroup } from '../vendor/beautiful-mermaid/types.ts'
import { layoutGraphSync } from '../vendor/beautiful-mermaid/layout-engine.ts'
import { routeEdge } from './layout.ts'
import type { PositionedNode as RoutedNode } from './model.ts'
import { architecturePortPoint, auditArchitectureGeometry, type ArchitectureBox as Box, type ArchitecturePort as Port, type ArchitectureRouteGeometry, type ArchitectureServiceGeometry } from './architecture-geometry.ts'

interface Service { id: string; label: string; parent?: string }
interface Group { id: string; label: string; parent?: string }
interface Endpoint { id: string; port: Port }
interface Edge { source: Endpoint; target: Endpoint; arrowStart: boolean; arrowEnd: boolean }
interface Model { services: Map<string, Service>; groups: Map<string, Group>; edges: Edge[]; depth: number }
interface MeasuredService { element: SVGGElement; icon: Box; label: Box; width: number; height: number }

const SVG_NS = 'http://www.w3.org/2000/svg'

function endpoint(token: string): Endpoint | undefined {
  const clean = token.replaceAll(/\s+/g, '')
  const prefix = clean.match(/^([LRTB]):([\w-]+)$/)
  if (prefix) return { id: prefix[2]!, port: prefix[1] as Port }
  const suffix = clean.match(/^([\w-]+):([LRTB])$/)
  if (suffix) return { id: suffix[1]!, port: suffix[2] as Port }
  return undefined
}

function parse(source: string): Model | undefined {
  const services = new Map<string, Service>()
  const groups = new Map<string, Group>()
  const edges: Edge[] = []
  const body = source.trimStart().replace(/^---\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '')
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('%%') || line === 'architecture-beta') continue
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
    match = line.match(/^(.+?)\s*(<-->|-->|<--|---|--)\s*(.+?)\s*$/)
    if (!match) return undefined
    const sourceEndpoint = endpoint(match[1]!)
    const targetEndpoint = endpoint(match[3]!)
    if (!sourceEndpoint || !targetEndpoint) return undefined
    edges.push({ source: sourceEndpoint, target: targetEndpoint, arrowStart: match[2]!.startsWith('<'), arrowEnd: match[2]!.endsWith('>') })
  }
  if (!services.size || edges.some((edge) => !services.has(edge.source.id) || !services.has(edge.target.id))) return undefined
  const groupDepth = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id) || !groups.has(id)) return Number.NaN
    const parent = groups.get(id)!.parent
    return parent ? 1 + groupDepth(parent, new Set([...seen, id])) : 1
  }
  const depth = Math.max(0, ...[...groups.keys()].map((id) => groupDepth(id)))
  if (!Number.isFinite(depth)) return undefined
  return { services, groups, edges, depth }
}

export function hasFragmentedArchitectureLabel(service: Element, label: string): boolean {
  const rows = [...service.querySelectorAll('.text-outer-tspan')].map((row) => row.textContent?.trim() ?? '')
  return rows.length > 2 || (rows.length > 1 && rows.join(' ') !== label.trim().replace(/\s+/g, ' '))
}

function measureServices(root: SVGSVGElement, model: Model): Map<string, MeasuredService> | undefined {
  const result = new Map<string, MeasuredService>()
  const context = createCanvas(1, 1).getContext('2d')
  const rootStyle = root.ownerDocument.defaultView?.getComputedStyle(root)
  const fontSize = Number.parseFloat(rootStyle?.fontSize ?? '') || 16
  const fontFamily = rootStyle?.fontFamily || 'Arial'
  context.font = `${fontSize}px ${fontFamily}`
  for (const service of model.services.values()) {
    const element = root.querySelector<SVGGElement>(`[id$="-service-${service.id}"]`)
    const icon = element?.querySelector('svg')
    const width = Number.parseFloat(icon?.getAttribute('width') ?? '')
    const height = Number.parseFloat(icon?.getAttribute('height') ?? '')
    const labelElement = element?.children[0]
    if (!element || !labelElement || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined
    const originalText = labelElement.querySelector('text')?.textContent?.replace(/\s+/g, '')
    if (originalText !== service.label.replace(/\s+/g, '')) return undefined
    const words = service.label.trim().split(/\s+/)
    const maxWidth = Math.max(width * 1.5, 144, ...words.map((word) => context.measureText(word).width))
    const lines: string[] = []
    for (const word of words) {
      const candidate = lines.length ? `${lines.at(-1)} ${word}` : word
      if (!lines.length || context.measureText(candidate).width > maxWidth) lines.push(word)
      else lines[lines.length - 1] = candidate
    }
    const labelWidth = Math.max(1, ...lines.map((line) => context.measureText(line).width)) + 8
    const labelHeight = lines.length * fontSize * 1.2
    const used = new Set(model.edges.flatMap((edge) => [
      ...(edge.source.id === service.id ? [edge.source.port] : []),
      ...(edge.target.id === service.id ? [edge.target.port] : []),
    ]))
    const label: Box = { x: (width - labelWidth) / 2, y: height + 24, width: labelWidth, height: labelHeight }
    if (used.has('B')) {
      if (!used.has('T')) label.y = -labelHeight - 24
      else if (!used.has('L')) { label.x = -labelWidth - 24; label.y = (height - labelHeight) / 2 }
      else if (!used.has('R')) { label.x = width + 24; label.y = (height - labelHeight) / 2 }
      else { label.x = width + 24; label.y = height + 24 }
    }
    const text = root.ownerDocument.createElementNS(SVG_NS, 'text')
    text.setAttribute('font-size', String(fontSize))
    text.setAttribute('font-family', fontFamily)
    text.setAttribute('text-anchor', 'middle')
    lines.forEach((line, index) => {
      const row = root.ownerDocument.createElementNS(SVG_NS, 'tspan')
      row.setAttribute('class', 'text-outer-tspan')
      row.setAttribute('x', String(label.x + label.width / 2))
      row.setAttribute('y', String(label.y + fontSize + index * fontSize * 1.2))
      row.textContent = line
      text.append(row)
    })
    labelElement.removeAttribute('transform')
    labelElement.removeAttribute('dy')
    labelElement.removeAttribute('alignment-baseline')
    labelElement.removeAttribute('dominant-baseline')
    labelElement.replaceChildren(text)
    const left = Math.min(0, label.x)
    const top = Math.min(0, label.y)
    result.set(service.id, {
      element, icon: { x: -left, y: -top, width, height }, label,
      width: Math.max(width, label.x + label.width) - left,
      height: Math.max(height, label.y + label.height) - top,
    })
  }
  return result
}

function position(model: Model, measured: Map<string, MeasuredService>) {
  const nodes: MermaidGraph['nodes'] = new Map()
  for (const service of model.services.values()) {
    const size = measured.get(service.id)!
    nodes.set(service.id, { id: service.id, label: service.label, shape: 'rectangle', layoutSize: { width: size.width, height: size.height } })
  }
  const mapped = new Map<string, MermaidSubgraph>()
  for (const group of model.groups.values()) mapped.set(group.id, { id: group.id, label: group.label, nodeIds: [], children: [] })
  for (const service of model.services.values()) if (service.parent) mapped.get(service.parent)?.nodeIds.push(service.id)
  const subgraphs: MermaidSubgraph[] = []
  for (const group of model.groups.values()) {
    if (group.parent) mapped.get(group.parent)?.children.push(mapped.get(group.id)!)
    else subgraphs.push(mapped.get(group.id)!)
  }
  const graph: MermaidGraph = {
    direction: 'LR', nodes, subgraphs,
    edges: model.edges.map((edge) => ({ source: edge.source.id, target: edge.target.id, style: 'solid', hasArrowStart: edge.arrowStart, hasArrowEnd: edge.arrowEnd })),
    classDefs: new Map(), classAssignments: new Map(), nodeStyles: new Map(), linkStyles: new Map(),
  }
  return layoutGraphSync(graph, { padding: 48, nodeSpacing: 64, layerSpacing: 80, font: 'Inter' })
}

function flatten(groups: PositionedGroup[]): PositionedGroup[] {
  return groups.flatMap((group) => [group, ...flatten(group.children)])
}

function arrangeContainers(model: Model, positioned: ReturnType<typeof position>): void {
  if (positioned.groups.length !== 1) return
  const nodeMap = new Map(positioned.nodes.map((node) => [node.id, node]))
  const shift = (group: PositionedGroup, deltaX: number, deltaY: number): void => {
    group.x += deltaX
    group.y += deltaY
    for (const service of model.services.values()) {
      if (service.parent !== group.id) continue
      const node = nodeMap.get(service.id)!
      node.x += deltaX
      node.y += deltaY
    }
    for (const child of group.children) shift(child, deltaX, deltaY)
  }
  for (const root of positioned.groups) {
    if (root.children.length < 3 || [...model.services.values()].some((service) => service.parent === root.id)) continue
    const ordered = [...root.children].sort((first, second) => second.width * second.height - first.width * first.height)
    const dominant = ordered[0]!
    if (dominant.width * dominant.height < ordered.slice(1).reduce((area, group) => area + group.width * group.height, 0)) continue
    const siblings = root.children.filter((group) => group !== dominant)
    const packedWidth = Math.max(dominant.width + 64, siblings.reduce((width, group) => width + group.width + 40, 24))
    const packedHeight = 64 + Math.max(...siblings.map((group) => group.height)) + 40 + dominant.height + 32
    if (packedWidth * packedHeight >= root.width * root.height) continue
    let nextX = root.x + 32
    const top = root.y + 64
    const siblingHeight = Math.max(...siblings.map((group) => group.height))
    for (const sibling of siblings) {
      shift(sibling, nextX - sibling.x, top - sibling.y)
      nextX += sibling.width + 40
    }
    shift(dominant, root.x + 32 - dominant.x, top + siblingHeight + 40 - dominant.y)
    root.width = Math.max(dominant.width + 64, nextX - root.x - 8)
    root.height = 64 + siblingHeight + 40 + dominant.height + 32
  }
  const roots = positioned.groups
  const occupied: Box[] = []
  for (const service of model.services.values()) {
    if (service.parent) continue
    const connection = model.edges.find((edge) => edge.source.id === service.id || edge.target.id === service.id)
    if (!connection) continue
    const external = connection.source.id === service.id ? connection.source : connection.target
    const internal = connection.source.id === service.id ? connection.target : connection.source
    let parent = model.services.get(internal.id)?.parent
    while (parent && model.groups.get(parent)?.parent) parent = model.groups.get(parent)!.parent
    const boundary = roots.find((group) => group.id === parent)
    const node = nodeMap.get(service.id)!
    const neighbor = nodeMap.get(internal.id)
    if (!boundary || !neighbor) continue
    node.x = external.port === 'R' ? boundary.x - node.width - 64
      : external.port === 'L' ? boundary.x + boundary.width + 64 : neighbor.x
    node.y = external.port === 'B' ? boundary.y - node.height - 64
      : external.port === 'T' ? boundary.y + boundary.height + 64 : neighbor.y
    while (occupied.some((box) => node.x < box.x + box.width + 32 && node.x + node.width + 32 > box.x
      && node.y < box.y + box.height + 32 && node.y + node.height + 32 > box.y)) {
      if (external.port === 'T' || external.port === 'B') node.x += node.width + 40
      else node.y += node.height + 40
    }
    occupied.push(node)
  }
}

function obstacle(id: string, box: Box): RoutedNode {
  return { id, ...box, label: '', shape: 'rectangle', role: 'secondary', pinned: false }
}

function updateGroup(root: SVGSVGElement, group: PositionedGroup): Box {
  const rect = root.querySelector<SVGRectElement>(`[id$="-group-${group.id}"]`)!
  for (const [name, value] of Object.entries({ x: group.x, y: group.y, width: group.width, height: group.height })) rect.setAttribute(name, String(value))
  const decoration = rect.nextElementSibling
  decoration?.children[0]?.setAttribute('transform', `translate(${group.x + 1}, ${group.y + 1})`)
  decoration?.children[1]?.setAttribute('transform', `translate(${group.x + 34}, ${group.y + 7})`)
  const context = createCanvas(1, 1).getContext('2d')
  context.font = '16px Arial'
  return { x: group.x, y: group.y, width: Math.min(group.width, context.measureText(group.label).width + 48), height: 32 }
}

function arrowMarker(root: SVGSVGElement, color: string): string {
  let defs = root.querySelector<SVGDefsElement>(':scope > defs')
  if (!defs) { defs = root.ownerDocument.createElementNS(SVG_NS, 'defs'); root.prepend(defs) }
  const marker = root.ownerDocument.createElementNS(SVG_NS, 'marker')
  const id = `${root.id}-arrowhead`
  for (const [name, value] of Object.entries({ id, viewBox: '0 0 9 8', refX: '9', refY: '4', markerWidth: '9', markerHeight: '8', markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' })) marker.setAttribute(name, value)
  const triangle = root.ownerDocument.createElementNS(SVG_NS, 'path')
  triangle.setAttribute('d', 'M 0 0 L 9 4 L 0 8 Z')
  triangle.setAttribute('fill', color)
  marker.append(triangle)
  defs.append(marker)
  return id
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

export function stabilizeComplexArchitectureSvg(svg: string, source: string): string {
  const model = parse(source)
  if (!model || model.services.size < 14 || model.depth < 2) return svg
  const host = document.createElement('div')
  host.innerHTML = svg
  const root = host.querySelector<SVGSVGElement>('svg')
  if (!root) return svg
  document.body.append(host)
  const measured = measureServices(root, model)
  if (!measured) { host.remove(); return svg }
  const positioned = position(model, measured)
  arrangeContainers(model, positioned)
  const services: ArchitectureServiceGeometry[] = positioned.nodes.map((node) => {
    const item = measured.get(node.id)!
    const icon = { ...item.icon, x: node.x + item.icon.x, y: node.y + item.icon.y }
    const label = { ...item.label, x: icon.x + item.label.x, y: icon.y + item.label.y }
    item.element.setAttribute('transform', `translate(${icon.x},${icon.y})`)
    item.element.setAttribute('data-icon-bounds', JSON.stringify(icon))
    item.element.setAttribute('data-label-bounds', JSON.stringify(label))
    return { id: node.id, icon, label }
  })
  const groups = flatten(positioned.groups)
  const headers = groups.map((group) => updateGroup(root, group))
  const byId = new Map(services.map((service) => [service.id, service]))
  const obstacles = [
    ...services.flatMap((service) => [obstacle(`icon:${service.id}`, service.icon), obstacle(`label:${service.id}`, service.label!)]),
    ...headers.map((header, index) => obstacle(`header:${index}`, header)),
  ]
  const color = svg.match(/\.edge\{[^}]*stroke:([^;}]+)/)?.[1]?.trim() ?? '#334155'
  const markerId = arrowMarker(root, color)
  const layer = root.querySelector<SVGGElement>('.architecture-edges')
  if (!layer) { host.remove(); return svg }
  layer.replaceChildren()
  const routes: ArchitectureRouteGeometry[] = []
  for (const [index, edge] of model.edges.entries()) {
    const sourceService = byId.get(edge.source.id)!
    const targetService = byId.get(edge.target.id)!
    const points = routeEdge(
      obstacle(edge.source.id, sourceService.icon), obstacle(edge.target.id, targetService.icon), 'LR', obstacles,
      [architecturePortPoint(sourceService.icon, edge.source.port), architecturePortPoint(targetService.icon, edge.target.port)],
      routes.map((route) => route.points),
    )
    routes.push({ source: edge.source.id, target: edge.target.id, sourcePort: edge.source.port, targetPort: edge.target.port, points })
    const path = root.ownerDocument.createElementNS(SVG_NS, 'path')
    path.setAttribute('class', 'edge')
    path.setAttribute('id', `${root.id}-stabilized-edge-${index + 1}`)
    path.setAttribute('data-source', edge.source.id)
    path.setAttribute('data-target', edge.target.id)
    path.setAttribute('data-source-port', edge.source.port)
    path.setAttribute('data-target-port', edge.target.port)
    path.setAttribute('data-points', JSON.stringify(points))
    path.setAttribute('d', points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '))
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke-linejoin', 'round')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('data-flow-role', 'relationship')
    path.setAttribute('style', 'stroke-width: 1.8px')
    if (edge.arrowStart) path.setAttribute('marker-start', `url(#${markerId})`)
    if (edge.arrowEnd) path.setAttribute('marker-end', `url(#${markerId})`)
    layer.append(path)
  }
  const metrics = {
    ...auditArchitectureGeometry(services, routes, headers),
    wrappedLabels: [...model.services.values()].filter((service) => hasFragmentedArchitectureLabel(measured.get(service.id)!.element, service.label)).length,
    complexityLoad: Math.max(0, model.services.size - 18),
  }
  const hardDefects = metrics.detachedEndpoints + metrics.portViolations + metrics.nodeOverlaps + metrics.edgeNodeIntersections + metrics.labelCollisions
  const score = Math.max(0, Math.round(100 - hardDefects * 12 - metrics.sharedSegments * 5 - metrics.headerCrossings * 8 - metrics.excessiveBends * 2 - metrics.wrappedLabels * 3 - metrics.complexityLoad))
  root.setAttribute('data-beautiflow-quality-score', String(score))
  for (const [name, value] of Object.entries(metrics)) root.setAttribute(`data-beautiflow-${kebab(name)}`, String(value))
  const bounds = [...services.flatMap((service) => [service.icon, service.label!]), ...groups, ...routes.flatMap((route) => route.points.map((point) => ({ ...point, width: 0, height: 0 })))]
  const minX = Math.min(...bounds.map((box) => box.x)) - 40
  const minY = Math.min(...bounds.map((box) => box.y)) - 40
  const width = Math.max(...bounds.map((box) => box.x + box.width)) - minX + 40
  const height = Math.max(...bounds.map((box) => box.y + box.height)) - minY + 40
  root.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`)
  root.style.maxWidth = `${width}px`
  root.setAttribute('data-beautiflow-layout', 'compound-elk-fallback')
  const output = root.outerHTML
  host.remove()
  return output
}
