import { architectureModel, renderPeleDetailed } from './pele.ts'
import { auditArchitectureGeometry } from './architecture-geometry.ts'
import { svgIntegrity } from './integrity.ts'

const COLORS = { bg: '#ffffff', fg: '#27272a' }

export function inspectArchitecture(source: string) {
  const model = architectureModel(source)
  const nodes = [...model.nodes.values()]
  const groups = [...model.groups.values()]
  const edges = model.edges
  const issues: Array<{ severity: 'info'; type: string; message: string; nodes?: string[] }> = []
  const neighbours = new Map(nodes.map((node) => [node.id, new Set<string>()]))
  for (const edge of edges) { neighbours.get(edge.lhsId)!.add(edge.rhsId); neighbours.get(edge.rhsId)!.add(edge.lhsId) }
  const isolated = nodes.filter((node) => neighbours.get(node.id)!.size === 0).map((node) => node.id)
  if (isolated.length) issues.push({ severity: 'info', type: 'isolated-services', nodes: isolated, message: `${isolated.length} services or junctions have no relationships` })
  let components = 0
  const seen = new Set<string>()
  for (const node of nodes) {
    if (seen.has(node.id)) continue
    components++
    const pending = [node.id]
    while (pending.length) { const id = pending.pop()!; if (seen.has(id)) continue; seen.add(id); pending.push(...neighbours.get(id)!) }
  }
  if (components > 1) issues.push({ severity: 'info', type: 'disconnected-components', message: `${components} disconnected components; confirm that separate views are intentional` })
  let maxDepth = 0
  for (const group of groups) {
    let parent: string | undefined = group.id
    let depth = 0
    while (parent) { depth++; parent = model.groups.get(parent)?.in }
    maxDepth = Math.max(maxDepth, depth)
    if (!nodes.some((node) => node.in === group.id) && !groups.some((child) => child.in === group.id)) issues.push({ severity: 'info', type: 'empty-group', nodes: [group.id], message: `Group ${group.id} contains no elements` })
  }
  if (maxDepth > 3) issues.push({ severity: 'info', type: 'deep-containment', message: `${maxDepth} containment levels may be difficult to read` })
  if (nodes.length > 20) issues.push({ severity: 'info', type: 'detail-budget', message: `${nodes.length} elements; retain the full source and consider separate focused views` })
  const titles = new Map<string, string[]>()
  for (const node of nodes) {
    if (neighbours.get(node.id)!.size >= 5) issues.push({ severity: 'info', type: 'high-connectivity', nodes: [node.id], message: `${node.id} has ${neighbours.get(node.id)!.size} neighbours; inspect its visual focus` })
    if (node.type !== 'service') continue
    const label = node.title?.trim() ?? ''
    if (!label || /^(service|system|component|node|data|process)\s*\d*$/i.test(label)) issues.push({ severity: 'info', type: 'weak-label', nodes: [node.id], message: `Service ${node.id} has a missing or generic label` })
    if (label) titles.set(label.toLowerCase(), [...(titles.get(label.toLowerCase()) ?? []), node.id])
  }
  for (const ids of titles.values()) if (ids.length > 1) issues.push({ severity: 'info', type: 'repeated-label', nodes: ids, message: `Services ${ids.join(', ')} share a display label` })
  return { family: 'architecture' as const, score: 100, nodes, groups, edges, alignmentHints: model.layoutHints,
    metrics: { services: nodes.filter((node) => node.type === 'service').length, junctions: nodes.filter((node) => node.type === 'junction').length, groups: groups.length, relationships: edges.length, components, isolatedServices: isolated.length, maxDepth }, issues,
    limitations: ['Structural observations are informational and do not validate cloud-provider semantics or authorize deletion.'] }
}

function decode(value: string): string {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => String.fromCodePoint(code[0]?.toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&')
}

export function architectureIntegrity(source: string, svg: string) {
  const model = architectureModel(source)
  const issues: Array<{ severity: 'high' | 'medium'; type: string; message: string }> = []
  const expected = [
    ...[...model.nodes.keys()].map((id) => ({ kind: 'node', id })),
    ...[...model.groups.keys()].map((id) => ({ kind: 'cluster', id })),
    ...model.edges.map((edge) => ({ kind: 'edge', id: `${edge.lhsId}-${edge.rhsId}` })),
  ]
  const actual = new Map<string, number>()
  for (const [, kind, id] of svg.matchAll(/<g class="pele-(node|cluster|edge)(?: [^"]*)?" data-id="([^"]*)"/g)) {
    const key = `${kind}:${decode(id!)}`; actual.set(key, (actual.get(key) ?? 0) + 1)
  }
  for (const item of expected) {
    const key = `${item.kind}:${item.id}`
    if (!actual.get(key)) issues.push({ severity: 'high', type: 'missing-element', message: `Rendered ${item.kind} missing: ${item.id}` })
    else actual.set(key, actual.get(key)! - 1)
  }
  for (const [key, count] of actual) if (count) issues.push({ severity: 'high', type: 'unexpected-element', message: `Unexpected rendered element: ${key} (${count})` })
  issues.push(...svgIntegrity(svg).issues)
  const serviceStarts = [...svg.matchAll(/<g class="pele-node pele-service" data-id="([^"]*)"/g)]
  const labels = new Map(serviceStarts.map((match, index) => {
    const segment = svg.slice(match.index, serviceStarts[index + 1]?.index)
    const label = segment.match(/<text\b[^>]*class="pele-label"[^>]*>([\s\S]*?)<\/text>/)?.[1] ?? ''
    return [decode(match[1]!), decode(label.replace(/<[^>]*>/g, '')).replace(/\s/g, '')]
  }))
  let labelsChecked = 0
  for (const node of model.nodes.values()) {
    if (node.type !== 'service' || !node.title || /[*_~`<>$]|ﬂ°|¶ß/.test(node.title)) continue
    labelsChecked++
    if (labels.get(node.id) !== node.title.replace(/\s/g, '')) issues.push({ severity: 'high', type: 'missing-label', message: `Service label missing or altered: ${node.id}` })
  }
  return { coverage: 'architecture-elements-and-svg-references', elementsChecked: expected.length, labelsChecked, issues,
    limitations: ['Label presence checks cover plain service labels, not markdown/math or Mermaid-entity fidelity, browser glyph measurements, or provider semantics.'] }
}

export function auditArchitecture(source: string) {
  const rendered = renderPeleDetailed(source, COLORS, false)
  if (!rendered.geometry) throw new Error('Pinned Pele architecture geometry extension is unavailable')
  const metrics = auditArchitectureGeometry(rendered.geometry.services, rendered.geometry.routes, rendered.geometry.headers)
  const integrity = architectureIntegrity(source, rendered.svg)
  const issues = Object.entries(metrics).filter(([, count]) => count > 0).map(([type, count]) => ({ severity: 'high', type, message: `${count} measured architecture geometry findings: ${type}` }))
  return { score: Math.max(0, 100 - Object.values(metrics).reduce((sum, count) => sum + count * 10, 0) - integrity.issues.filter((issue) => issue.severity === 'high').length * 20),
    coverage: 'pele-positioned-geometry', metrics, integrity, issues: [...issues, ...integrity.issues],
    limitations: ['Geometry comes from a pinned additive Pele renderer extension before arrow trimming and corner rounding.', 'Edge-label boxes and browser font differences are not audited. Geometry does not validate provider semantics.'] }
}
