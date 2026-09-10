import type { DiagramProject } from './model.ts'

export type SemanticSeverity = 'error' | 'warning' | 'info'

export interface SemanticIssue {
  severity: SemanticSeverity
  type:
    | 'unreachable-node'
    | 'isolated-node'
    | 'multiple-entry-points'
    | 'no-entry-point'
    | 'no-exit-point'
    | 'decision-without-branches'
    | 'unlabeled-decision-branch'
    | 'duplicate-branch-label'
    | 'high-fan-out'
    | 'detail-budget'
    | 'view-split-recommended'
  message: string
  nodes: string[]
  edges?: string[]
}

export interface SemanticReport {
  score: number
  issues: SemanticIssue[]
  metrics: {
    nodes: number
    edges: number
    entryPoints: number
    exitPoints: number
    unreachableNodes: number
    isolatedNodes: number
    decisions: number
    groups: number
    cycles: number
  }
  entryPoints: string[]
  exitPoints: string[]
}

function countCycles(nodes: string[], outgoing: Map<string, string[]>): number {
  const state = new Map<string, 0 | 1 | 2>()
  let cycles = 0
  const visit = (node: string) => {
    state.set(node, 1)
    for (const target of outgoing.get(node) ?? []) {
      if (state.get(target) === 1) cycles += 1
      else if (!state.get(target)) visit(target)
    }
    state.set(node, 2)
  }
  for (const node of nodes) if (!state.get(node)) visit(node)
  return cycles
}

export function diagnoseProject(project: DiagramProject): SemanticReport {
  const nodeIds = [...project.graph.nodes.keys()]
  const incoming = new Map(nodeIds.map((id) => [id, [] as number[]]))
  const outgoing = new Map(nodeIds.map((id) => [id, [] as number[]]))
  project.graph.edges.forEach((edge, index) => {
    incoming.get(edge.target)?.push(index)
    outgoing.get(edge.source)?.push(index)
  })
  const entryPoints = nodeIds.filter((id) => incoming.get(id)?.length === 0 && (outgoing.get(id)?.length ?? 0) > 0)
  const exitPoints = nodeIds.filter((id) => outgoing.get(id)?.length === 0 && (incoming.get(id)?.length ?? 0) > 0)
  const isolated = nodeIds.filter((id) => incoming.get(id)?.length === 0 && outgoing.get(id)?.length === 0)
  const issues: SemanticIssue[] = []

  for (const node of isolated) issues.push({ severity: 'error', type: 'isolated-node', message: `${node} is disconnected from the flow`, nodes: [node] })
  if (entryPoints.length > 1) issues.push({ severity: 'warning', type: 'multiple-entry-points', message: `Flow has ${entryPoints.length} entry points: ${entryPoints.join(', ')}`, nodes: entryPoints })
  if (!entryPoints.length && nodeIds.length > 0 && isolated.length !== nodeIds.length) issues.push({ severity: 'info', type: 'no-entry-point', message: 'Flow has no acyclic entry point; it may be intentionally cyclic', nodes: [] })
  if (!exitPoints.length && nodeIds.length > 0 && isolated.length !== nodeIds.length) issues.push({ severity: 'info', type: 'no-exit-point', message: 'Flow has no exit point; it may contain an intentional loop', nodes: [] })

  const reachable = new Set<string>()
  const stack = [...entryPoints]
  while (stack.length) {
    const current = stack.pop()!
    if (reachable.has(current)) continue
    reachable.add(current)
    for (const edgeIndex of outgoing.get(current) ?? []) stack.push(project.graph.edges[edgeIndex]!.target)
  }
  const unreachable = entryPoints.length
    ? nodeIds.filter((id) => !reachable.has(id) && !isolated.includes(id))
    : []
  for (const node of unreachable) issues.push({ severity: 'error', type: 'unreachable-node', message: `${node} cannot be reached from any entry point`, nodes: [node] })

  let decisions = 0
  for (const [nodeId, node] of project.graph.nodes) {
    if (node.shape !== 'diamond') continue
    decisions += 1
    const edgeIndices = outgoing.get(nodeId) ?? []
    if (edgeIndices.length < 2) {
      issues.push({ severity: 'error', type: 'decision-without-branches', message: `${nodeId} is a decision but has ${edgeIndices.length} outgoing branch(es)`, nodes: [nodeId], edges: edgeIndices.map((index) => `${project.graph.edges[index]!.source}->${project.graph.edges[index]!.target}#${index}`) })
      continue
    }
    const labels = edgeIndices.map((index) => project.graph.edges[index]!.label?.trim()).filter((label): label is string => Boolean(label))
    if (labels.length !== edgeIndices.length) issues.push({ severity: 'warning', type: 'unlabeled-decision-branch', message: `${nodeId} has unlabeled outgoing branches`, nodes: [nodeId] })
    const duplicate = labels.find((label, index) => labels.findIndex((candidate) => candidate.toLocaleLowerCase() === label.toLocaleLowerCase()) !== index)
    if (duplicate) issues.push({ severity: 'warning', type: 'duplicate-branch-label', message: `${nodeId} repeats branch label “${duplicate}”`, nodes: [nodeId] })
    if (edgeIndices.length > 5) issues.push({ severity: 'warning', type: 'high-fan-out', message: `${nodeId} has ${edgeIndices.length} outgoing branches`, nodes: [nodeId] })
  }

  const collectGroups = (groups: typeof project.graph.subgraphs): Array<{ id: string; label: string }> => groups.flatMap((group) => [
    { id: group.id, label: group.label },
    ...collectGroups(group.children),
  ])
  const groups = collectGroups(project.graph.subgraphs)
  if (nodeIds.length > 12 || project.graph.edges.length > 16 || decisions > 5) {
    issues.push({
      severity: 'info',
      type: 'detail-budget',
      message: `Flow carries ${nodeIds.length} nodes, ${project.graph.edges.length} edges, and ${decisions} decisions; keep one question and primary path in focus`,
      nodes: [],
    })
  }
  if (nodeIds.length > 12 && groups.length >= 2) {
    issues.push({
      severity: 'info',
      type: 'view-split-recommended',
      message: `Consider an overview plus focused views for ${groups.slice(0, 3).map((group) => group.label).join(', ')}`,
      nodes: [],
    })
  }

  const outgoingTargets = new Map(nodeIds.map((id) => [id, (outgoing.get(id) ?? []).map((index) => project.graph.edges[index]!.target)]))
  const cycles = countCycles(nodeIds, outgoingTargets)
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  return {
    score: Math.max(0, 100 - errors * 20 - warnings * 5),
    issues,
    metrics: {
      nodes: nodeIds.length,
      edges: project.graph.edges.length,
      entryPoints: entryPoints.length,
      exitPoints: exitPoints.length,
      unreachableNodes: unreachable.length,
      isolatedNodes: isolated.length,
      decisions,
      groups: groups.length,
      cycles,
    },
    entryPoints,
    exitPoints,
  }
}
