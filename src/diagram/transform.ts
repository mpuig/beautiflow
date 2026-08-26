import { parseMermaid } from 'beautiful-mermaid'
import { CliError } from '../errors.ts'
import type {
  AuditReport,
  BeautiflowSidecar,
  DiagramProject,
  MermaidEdge,
  MermaidNode,
  NodeShape,
} from './model.ts'
import { auditDiagram } from './audit.ts'
import { generateCandidates, layoutProject } from './layout.ts'
import { sourceHash } from './project.ts'
import { diagnoseProject, type SemanticReport } from './semantic.ts'
import { applySourceTransform } from './source-editor.ts'

const SHAPES = new Set<NodeShape>([
  'rectangle', 'rounded', 'diamond', 'stadium', 'circle', 'subroutine',
  'doublecircle', 'hexagon', 'cylinder', 'asymmetric', 'trapezoid',
  'trapezoid-alt', 'state-start', 'state-end',
])

export type TransformAction =
  | { type: 'add-node'; id: string; label: string; shape?: NodeShape }
  | { type: 'remove-node'; id: string }
  | { type: 'rename-node'; id: string; newId?: string; label?: string }
  | { type: 'set-node-shape'; id: string; shape: NodeShape }
  | { type: 'add-edge'; source: string; target: string; label?: string; style?: MermaidEdge['style'] }
  | { type: 'remove-edge'; source: string; target: string; label?: string }
  | { type: 'set-edge-label'; source: string; target: string; label?: string }
  | { type: 'reverse-edge'; source: string; target: string }
  | { type: 'insert-node'; id: string; label: string; shape?: NodeShape; between: { source: string; target: string } }
  | { type: 'bypass-node'; id: string }
  | { type: 'create-subgraph'; id: string; label: string; nodes: string[] }
  | { type: 'move-to-subgraph'; subgraph: string; nodes: string[] }

export interface TransformResult {
  source: string
  sidecar: BeautiflowSidecar
  actionsApplied: number
  before: { nodes: number; edges: number }
  after: { nodes: number; edges: number }
  audit: AuditReport
  semantic: SemanticReport
}

function object(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CliError(`${context} must be an object`, 2)
  return value as Record<string, unknown>
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new CliError(`${field} must be a non-empty string`, 2)
  return value
}

function id(value: unknown, field: string): string {
  const result = text(value, field)
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(result)) {
    throw new CliError(`${field} must match [A-Za-z_][A-Za-z0-9_-]*`, 2)
  }
  return result
}

function shape(value: unknown, field: string): NodeShape {
  if (typeof value !== 'string' || !SHAPES.has(value as NodeShape)) throw new CliError(`${field} is not a supported node shape`, 2)
  return value as NodeShape
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new CliError(`${field} must be a non-empty array of node IDs`, 2)
  return value.map((item, index) => id(item, `${field}[${index}]`))
}

function parseAction(value: unknown, index: number): TransformAction {
  const input = object(value, `Transformation ${index + 1}`)
  const type = text(input.type, `Transformation ${index + 1}.type`)
  switch (type) {
    case 'add-node':
      return { type, id: id(input.id, 'add-node.id'), label: text(input.label, 'add-node.label'), ...(input.shape ? { shape: shape(input.shape, 'add-node.shape') } : {}) }
    case 'remove-node':
      return { type, id: id(input.id, 'remove-node.id') }
    case 'rename-node': {
      const newId = input.newId === undefined ? undefined : id(input.newId, 'rename-node.newId')
      const label = input.label === undefined ? undefined : text(input.label, 'rename-node.label')
      if (!newId && !label) throw new CliError('rename-node expects newId and/or label', 2)
      return { type, id: id(input.id, 'rename-node.id'), ...(newId ? { newId } : {}), ...(label ? { label } : {}) }
    }
    case 'set-node-shape':
      return { type, id: id(input.id, 'set-node-shape.id'), shape: shape(input.shape, 'set-node-shape.shape') }
    case 'add-edge': {
      const style = input.style
      if (style !== undefined && style !== 'solid' && style !== 'dotted' && style !== 'thick') throw new CliError('add-edge.style must be solid, dotted, or thick', 2)
      return { type, source: id(input.source, 'add-edge.source'), target: id(input.target, 'add-edge.target'), ...(input.label === undefined ? {} : { label: text(input.label, 'add-edge.label') }), ...(style ? { style } : {}) }
    }
    case 'remove-edge':
      return { type, source: id(input.source, 'remove-edge.source'), target: id(input.target, 'remove-edge.target'), ...(input.label === undefined ? {} : { label: text(input.label, 'remove-edge.label') }) }
    case 'set-edge-label':
      return { type, source: id(input.source, 'set-edge-label.source'), target: id(input.target, 'set-edge-label.target'), ...(input.label === undefined || input.label === null ? {} : { label: text(input.label, 'set-edge-label.label') }) }
    case 'reverse-edge':
      return { type, source: id(input.source, 'reverse-edge.source'), target: id(input.target, 'reverse-edge.target') }
    case 'insert-node': {
      const between = object(input.between, 'insert-node.between')
      return { type, id: id(input.id, 'insert-node.id'), label: text(input.label, 'insert-node.label'), ...(input.shape ? { shape: shape(input.shape, 'insert-node.shape') } : {}), between: { source: id(between.source, 'insert-node.between.source'), target: id(between.target, 'insert-node.between.target') } }
    }
    case 'bypass-node':
      return { type, id: id(input.id, 'bypass-node.id') }
    case 'create-subgraph':
      return { type, id: id(input.id, 'create-subgraph.id'), label: text(input.label, 'create-subgraph.label'), nodes: stringArray(input.nodes, 'create-subgraph.nodes') }
    case 'move-to-subgraph':
      return { type, subgraph: id(input.subgraph, 'move-to-subgraph.subgraph'), nodes: stringArray(input.nodes, 'move-to-subgraph.nodes') }
    default:
      throw new CliError(`Unknown transformation type at index ${index}: ${type}`, 2)
  }
}

export function parseTransformActions(value: unknown): TransformAction[] {
  const input = object(value, 'Transformations file')
  const actions = input.actions
  if (!Array.isArray(actions) || actions.length === 0) throw new CliError('Transformations file must contain a non-empty actions array', 2)
  return actions.map(parseAction)
}

type Graph = DiagramProject['graph']
type Subgraph = Graph['subgraphs'][number]

function requireNode(graph: Graph, nodeId: string): MermaidNode {
  const node = graph.nodes.get(nodeId)
  if (!node) throw new CliError(`Unknown node ID in transformation: ${nodeId}`, 2)
  return node
}

function requireNewNodeId(graph: Graph, nodeId: string): void {
  if (graph.nodes.has(nodeId)) throw new CliError(`Node already exists: ${nodeId}`, 2)
}

function edgeIndex(graph: Graph, source: string, target: string, label?: string): number {
  return graph.edges.findIndex((edge) => edge.source === source && edge.target === target && (label === undefined || edge.label === label))
}

function removeNodeFromGroups(groups: Subgraph[], nodeId: string): void {
  for (const group of groups) {
    group.nodeIds = group.nodeIds.filter((id) => id !== nodeId)
    removeNodeFromGroups(group.children, nodeId)
  }
}

function renameNodeInGroups(groups: Subgraph[], oldId: string, newId: string): void {
  for (const group of groups) {
    group.nodeIds = group.nodeIds.map((id) => id === oldId ? newId : id)
    renameNodeInGroups(group.children, oldId, newId)
  }
}

function findGroup(groups: Subgraph[], groupId: string): Subgraph | undefined {
  for (const group of groups) {
    if (group.id === groupId) return group
    const nested = findGroup(group.children, groupId)
    if (nested) return nested
  }
  return undefined
}

function applyTransform(
  graph: Graph,
  action: TransformAction,
  renames: Map<string, string>,
  edgeStyles: WeakMap<MermaidEdge, Record<string, string>>,
): void {
  switch (action.type) {
    case 'add-node':
      requireNewNodeId(graph, action.id)
      graph.nodes.set(action.id, { id: action.id, label: action.label, shape: action.shape ?? 'rectangle' })
      return
    case 'remove-node':
      requireNode(graph, action.id)
      graph.nodes.delete(action.id)
      graph.edges = graph.edges.filter((edge) => edge.source !== action.id && edge.target !== action.id)
      removeNodeFromGroups(graph.subgraphs, action.id)
      graph.classAssignments.delete(action.id)
      graph.nodeStyles.delete(action.id)
      return
    case 'rename-node': { // ID and/or display label
      const node = requireNode(graph, action.id)
      const newId = action.newId ?? action.id
      if (newId !== action.id) {
        requireNewNodeId(graph, newId)
        graph.nodes.delete(action.id)
        graph.nodes.set(newId, { ...node, id: newId, ...(action.label ? { label: action.label } : {}) })
        for (const edge of graph.edges) {
          if (edge.source === action.id) edge.source = newId
          if (edge.target === action.id) edge.target = newId
        }
        renameNodeInGroups(graph.subgraphs, action.id, newId)
        const assignment = graph.classAssignments.get(action.id)
        if (assignment) { graph.classAssignments.delete(action.id); graph.classAssignments.set(newId, assignment) }
        const style = graph.nodeStyles.get(action.id)
        if (style) { graph.nodeStyles.delete(action.id); graph.nodeStyles.set(newId, style) }
        renames.set(action.id, newId)
      } else if (action.label) node.label = action.label
      return
    }
    case 'set-node-shape':
      requireNode(graph, action.id).shape = action.shape
      return
    case 'add-edge':
      requireNode(graph, action.source); requireNode(graph, action.target)
      graph.edges.push({ source: action.source, target: action.target, ...(action.label ? { label: action.label } : {}), style: action.style ?? 'solid', hasArrowStart: false, hasArrowEnd: true })
      return
    case 'remove-edge': {
      const index = edgeIndex(graph, action.source, action.target, action.label)
      if (index < 0) throw new CliError(`Edge not found: ${action.source} -> ${action.target}`, 2)
      graph.edges.splice(index, 1)
      return
    }
    case 'set-edge-label': {
      const index = edgeIndex(graph, action.source, action.target)
      if (index < 0) throw new CliError(`Edge not found: ${action.source} -> ${action.target}`, 2)
      const edge = graph.edges[index]!
      if (action.label) edge.label = action.label
      else delete edge.label
      return
    }
    case 'reverse-edge': {
      const index = edgeIndex(graph, action.source, action.target)
      if (index < 0) throw new CliError(`Edge not found: ${action.source} -> ${action.target}`, 2)
      const edge = graph.edges[index]!
      edge.source = action.target
      edge.target = action.source
      return
    }
    case 'insert-node': {
      requireNewNodeId(graph, action.id)
      const index = edgeIndex(graph, action.between.source, action.between.target)
      if (index < 0) throw new CliError(`Edge not found: ${action.between.source} -> ${action.between.target}`, 2)
      const edge = graph.edges[index]!
      const first: MermaidEdge = { ...edge, target: action.id, ...(edge.label ? { label: edge.label } : {}) }
      const second: MermaidEdge = { source: action.id, target: action.between.target, style: edge.style, hasArrowStart: false, hasArrowEnd: edge.hasArrowEnd }
      const linkStyle = edgeStyles.get(edge)
      if (linkStyle) { edgeStyles.set(first, linkStyle); edgeStyles.set(second, linkStyle) }
      graph.nodes.set(action.id, { id: action.id, label: action.label, shape: action.shape ?? 'rectangle' })
      graph.edges.splice(index, 1, first, second)
      return
    }
    case 'bypass-node': {
      requireNode(graph, action.id)
      const incoming = graph.edges.filter((edge) => edge.target === action.id)
      const outgoing = graph.edges.filter((edge) => edge.source === action.id)
      if (!incoming.length || !outgoing.length) throw new CliError(`Cannot bypass ${action.id}: node needs incoming and outgoing edges`, 2)
      graph.edges = graph.edges.filter((edge) => edge.source !== action.id && edge.target !== action.id)
      for (const before of incoming) for (const after of outgoing) {
        if (before.source === after.target) continue
        if (!graph.edges.some((edge) => edge.source === before.source && edge.target === after.target)) {
          const replacement: MermaidEdge = { source: before.source, target: after.target, ...(after.label ? { label: after.label } : {}), style: after.style, hasArrowStart: false, hasArrowEnd: true }
          graph.edges.push(replacement)
          const linkStyle = edgeStyles.get(after)
          if (linkStyle) edgeStyles.set(replacement, linkStyle)
        }
      }
      graph.nodes.delete(action.id)
      removeNodeFromGroups(graph.subgraphs, action.id)
      graph.classAssignments.delete(action.id)
      graph.nodeStyles.delete(action.id)
      return
    }
    case 'create-subgraph':
      if (findGroup(graph.subgraphs, action.id)) throw new CliError(`Subgraph already exists: ${action.id}`, 2)
      for (const nodeId of action.nodes) requireNode(graph, nodeId)
      for (const nodeId of action.nodes) removeNodeFromGroups(graph.subgraphs, nodeId)
      graph.subgraphs.push({ id: action.id, label: action.label, nodeIds: [...action.nodes], children: [] })
      return
    case 'move-to-subgraph': {
      const group = findGroup(graph.subgraphs, action.subgraph)
      if (!group) throw new CliError(`Unknown subgraph: ${action.subgraph}`, 2)
      for (const nodeId of action.nodes) requireNode(graph, nodeId)
      for (const nodeId of action.nodes) removeNodeFromGroups(graph.subgraphs, nodeId)
      group.nodeIds.push(...action.nodes.filter((nodeId) => !group.nodeIds.includes(nodeId)))
    }
  }
}

function quoted(value: string): string {
  return JSON.stringify(value)
}

function nodeDeclaration(node: MermaidNode): string {
  const label = quoted(node.label)
  const wrappers: Record<NodeShape, [string, string]> = {
    rectangle: ['[', ']'], rounded: ['(', ')'], diamond: ['{', '}'], stadium: ['([', '])'],
    circle: ['((', '))'], subroutine: ['[[', ']]'], doublecircle: ['(((', ')))'], hexagon: ['{{', '}}'],
    cylinder: ['[(', ')]'], asymmetric: ['>', ']'], trapezoid: ['[/', '\\]'], 'trapezoid-alt': ['[\\', '/]'],
    'state-start': ['((', '))'], 'state-end': ['(((', ')))'],
  }
  const [open, close] = wrappers[node.shape]
  return `${node.id}${open}${label}${close}`
}

function edgeOperator(edge: MermaidEdge): string {
  const arrows = `${edge.hasArrowStart ? '<' : ''}${edge.hasArrowEnd ? '>' : ''}`
  if (edge.style === 'dotted') return arrows === '<>' ? '<-.->' : arrows === '<' ? '<-.-' : arrows === '>' ? '-.->' : '-.-'
  if (edge.style === 'thick') return arrows === '<>' ? '<==>' : arrows === '<' ? '<==' : arrows === '>' ? '==>' : '==='
  return arrows === '<>' ? '<-->' : arrows === '<' ? '<--' : arrows === '>' ? '-->' : '---'
}

function serializeSubgraph(group: Subgraph, graph: Graph, indent: string, emitted: Set<string>): string[] {
  const lines = [`${indent}subgraph ${group.id}[${quoted(group.label)}]`]
  if (group.direction) lines.push(`${indent}  direction ${group.direction}`)
  for (const nodeId of group.nodeIds) {
    const node = graph.nodes.get(nodeId)
    if (node && !emitted.has(nodeId)) { lines.push(`${indent}  ${nodeDeclaration(node)}`); emitted.add(nodeId) }
  }
  for (const child of group.children) lines.push(...serializeSubgraph(child, graph, `${indent}  `, emitted))
  lines.push(`${indent}end`)
  return lines
}

export function serializeMermaid(graph: Graph): string {
  const lines = [`flowchart ${graph.direction}`]
  const emitted = new Set<string>()
  for (const group of graph.subgraphs) lines.push(...serializeSubgraph(group, graph, '  ', emitted))
  for (const node of graph.nodes.values()) {
    if (!emitted.has(node.id)) lines.push(`  ${nodeDeclaration(node)}`)
  }
  graph.edges.forEach((edge) => {
    const label = edge.label ? `|${edge.label.replaceAll('|', '\\|')}|` : ''
    lines.push(`  ${edge.source} ${edgeOperator(edge)}${label} ${edge.target}`)
  })
  for (const [name, declarations] of graph.classDefs) {
    lines.push(`  classDef ${name} ${Object.entries(declarations).map(([key, value]) => `${key}:${value}`).join(',')}`)
  }
  for (const [nodeId, className] of graph.classAssignments) lines.push(`  class ${nodeId} ${className}`)
  for (const [nodeId, declarations] of graph.nodeStyles) {
    lines.push(`  style ${nodeId} ${Object.entries(declarations).map(([key, value]) => `${key}:${value}`).join(',')}`)
  }
  for (const [edgeIndex, declarations] of graph.linkStyles) {
    lines.push(`  linkStyle ${edgeIndex} ${Object.entries(declarations).map(([key, value]) => `${key}:${value}`).join(',')}`)
  }
  return `${lines.join('\n')}\n`
}

function reconcileSidecar(project: DiagramProject, graph: Graph, renames: Map<string, string>): BeautiflowSidecar {
  const sidecar = structuredClone(project.sidecar)
  for (const [oldId, newId] of renames) {
    if (sidecar.nodes[oldId]) { sidecar.nodes[newId] = sidecar.nodes[oldId]; delete sidecar.nodes[oldId] }
    if (sidecar.primaryFlow) sidecar.primaryFlow = sidecar.primaryFlow.map((id) => id === oldId ? newId : id)
  }
  const known = new Set(graph.nodes.keys())
  sidecar.nodes = Object.fromEntries(Object.entries(sidecar.nodes).filter(([id]) => known.has(id) && sidecar.nodes[id]?.pinned))
  if (sidecar.primaryFlow) sidecar.primaryFlow = sidecar.primaryFlow.filter((id) => known.has(id))
  return sidecar
}

export async function transformProject(project: DiagramProject, actions: TransformAction[]): Promise<TransformResult> {
  const before = { nodes: project.graph.nodes.size, edges: project.graph.edges.length }
  const graph = structuredClone(project.graph)
  let transformedSource = project.source
  const renames = new Map<string, string>()
  const edgeStyles = new WeakMap<MermaidEdge, Record<string, string>>()
  graph.edges.forEach((edge, index) => {
    const style = graph.linkStyles.get(index)
    if (style) edgeStyles.set(edge, style)
  })
  const defaultLinkStyle = graph.linkStyles.get('default')
  for (const action of actions) {
    transformedSource = applySourceTransform(transformedSource, graph, action)
    applyTransform(graph, action, renames, edgeStyles)
  }
  graph.linkStyles.clear()
  if (defaultLinkStyle) graph.linkStyles.set('default', defaultLinkStyle)
  graph.edges.forEach((edge, index) => {
    const style = edgeStyles.get(edge)
    if (style) graph.linkStyles.set(index, style)
  })
  if (graph.nodes.size === 0) throw new CliError('Transformation rejected: graph cannot be empty', 2)
  for (const edge of graph.edges) { requireNode(graph, edge.source); requireNode(graph, edge.target) }

  const source = transformedSource
  let parsed: Graph
  try { parsed = parseMermaid(source) }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Transformation produced invalid Mermaid: ${message}`, 2)
  }
  const nodeSignature = (candidate: Graph) => [...candidate.nodes.values()]
    .map((node) => `${node.id}:${node.label}:${node.shape}`).sort().join('|')
  const edgeSignature = (candidate: Graph) => candidate.edges
    .map((edge) => `${edge.source}>${edge.target}:${edge.label ?? ''}:${edge.style}:${edge.hasArrowStart}:${edge.hasArrowEnd}`).sort().join('|')
  const groupSignature = (groups: Graph['subgraphs']): string => groups
    .map((group) => `${group.id}[${[...group.nodeIds].sort().join(',')}](${groupSignature(group.children)})`).sort().join('|')
  if (nodeSignature(parsed) !== nodeSignature(graph)
    || edgeSignature(parsed) !== edgeSignature(graph)
    || groupSignature(parsed.subgraphs) !== groupSignature(graph.subgraphs)) {
    throw new CliError('Transformation could not be represented as a safe minimal source patch; no files were changed', 2)
  }

  const sidecar = reconcileSidecar(project, parsed, renames)
  const transformed: DiagramProject = { ...project, source, graph: parsed, sidecar }
  const semantic = diagnoseProject(transformed)
  const previousSemantic = diagnoseProject(project)
  const semanticErrors = semantic.issues.filter((issue) => issue.severity === 'error')
  const resolveRename = (id: string): string => {
    let current = id
    const visited = new Set<string>()
    while (renames.has(current) && !visited.has(current)) { visited.add(current); current = renames.get(current)! }
    return current
  }
  const previousErrorKeys = new Set(previousSemantic.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `${issue.type}:${issue.nodes.map(resolveRename).filter((id) => parsed.nodes.has(id)).sort().join(',')}`))
  const introducedErrors = semanticErrors.filter((issue) => !previousErrorKeys.has(`${issue.type}:${[...issue.nodes].sort().join(',')}`))
  if (introducedErrors.length) {
    throw new CliError(`Transformation rejected: ${introducedErrors.map((issue) => issue.message).join('; ')}`, 2)
  }
  const candidates = await generateCandidates(transformed, 5)
  candidates.sort((a, b) => b.audit.score - a.audit.score || a.audit.metrics.edgeCrossings - b.audit.metrics.edgeCrossings)
  const best = candidates[0]!
  sidecar.direction = best.direction
  for (const node of best.diagram.nodes) {
    const pinned = sidecar.nodes[node.id]
    if (pinned?.pinned) continue
    sidecar.nodes[node.id] = { x: node.x, y: node.y, width: node.width, height: node.height, pinned: false, role: pinned?.role ?? node.role }
  }
  sidecar.sourceHash = sourceHash(source)
  const diagram = await layoutProject(transformed, { direction: sidecar.direction, applyOverrides: true })
  const audit = auditDiagram(diagram)
  if (audit.metrics.nodeOverlaps || audit.metrics.edgeNodeIntersections) {
    throw new CliError(`Transformation rejected: invalid resulting geometry (${audit.metrics.nodeOverlaps} overlaps, ${audit.metrics.edgeNodeIntersections} edge/node intersections)`, 2)
  }

  return { source, sidecar, actionsApplied: actions.length, before, after: { nodes: parsed.nodes.size, edges: parsed.edges.length }, audit, semantic }
}
