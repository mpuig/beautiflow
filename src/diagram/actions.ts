import { CliError } from '../errors.ts'
import { auditDiagram } from './audit.ts'
import { layoutProject } from './layout.ts'
import type {
  AuditReport,
  DiagramProject,
  LayoutDirection,
  NodeRole,
  PositionedDiagram,
  PositionedNode,
} from './model.ts'

export type DiagramAction =
  | { type: 'set-direction'; direction: LayoutDirection }
  | { type: 'set-primary-flow'; nodes: string[] }
  | { type: 'place-relative'; node: string; relativeTo: string; position: 'above' | 'below' | 'left' | 'right'; gap?: number }
  | { type: 'align'; nodes: string[]; axis: 'left' | 'center-x' | 'center-y' | 'top' }
  | { type: 'distribute'; nodes: string[]; direction: 'horizontal' | 'vertical' }
  | { type: 'set-role'; nodes: string[]; role: NodeRole }
  | { type: 'pin'; nodes: string[]; pinned?: boolean }

export interface ApplyResult {
  diagram: PositionedDiagram
  audit: AuditReport
  actionsApplied: number
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new CliError(`${field} must be an array of node IDs`, 2)
  }
  return value
}

function parseAction(value: unknown, index: number): DiagramAction {
  if (!value || typeof value !== 'object') throw new CliError(`Action ${index + 1} must be an object`, 2)
  const input = value as Record<string, unknown>
  const type = input.type

  switch (type) {
    case 'set-direction':
      if (input.direction !== 'LR' && input.direction !== 'TD') throw new CliError('set-direction expects LR or TD', 2)
      return { type, direction: input.direction }
    case 'set-primary-flow':
      return { type, nodes: stringArray(input.nodes, 'set-primary-flow.nodes') }
    case 'place-relative': {
      if (typeof input.node !== 'string' || typeof input.relativeTo !== 'string') {
        throw new CliError('place-relative expects node and relativeTo IDs', 2)
      }
      if (!['above', 'below', 'left', 'right'].includes(String(input.position))) {
        throw new CliError('place-relative position must be above, below, left, or right', 2)
      }
      return {
        type,
        node: input.node,
        relativeTo: input.relativeTo,
        position: input.position as 'above' | 'below' | 'left' | 'right',
        ...(typeof input.gap === 'number' ? { gap: input.gap } : {}),
      }
    }
    case 'align':
      if (!['left', 'center-x', 'center-y', 'top'].includes(String(input.axis))) {
        throw new CliError('align axis must be left, center-x, center-y, or top', 2)
      }
      return {
        type,
        nodes: stringArray(input.nodes, 'align.nodes'),
        axis: input.axis as 'left' | 'center-x' | 'center-y' | 'top',
      }
    case 'distribute':
      if (input.direction !== 'horizontal' && input.direction !== 'vertical') {
        throw new CliError('distribute direction must be horizontal or vertical', 2)
      }
      return { type, nodes: stringArray(input.nodes, 'distribute.nodes'), direction: input.direction }
    case 'set-role':
      if (!['primary', 'secondary', 'exception'].includes(String(input.role))) {
        throw new CliError('set-role role must be primary, secondary, or exception', 2)
      }
      return { type, nodes: stringArray(input.nodes, 'set-role.nodes'), role: input.role as NodeRole }
    case 'pin':
      return {
        type,
        nodes: stringArray(input.nodes, 'pin.nodes'),
        ...(typeof input.pinned === 'boolean' ? { pinned: input.pinned } : {}),
      }
    default:
      throw new CliError(`Unknown action type at index ${index}: ${String(type)}`, 2)
  }
}

export function parseActions(value: unknown): DiagramAction[] {
  if (!value || typeof value !== 'object') throw new CliError('Actions file must contain an object', 2)
  const actions = (value as Record<string, unknown>).actions
  if (!Array.isArray(actions)) throw new CliError('Actions file must contain an actions array', 2)
  return actions.map(parseAction)
}

function requireNode(nodes: Map<string, PositionedNode>, id: string): PositionedNode {
  const node = nodes.get(id)
  if (!node) throw new CliError(`Unknown node ID in action: ${id}`, 2)
  return node
}

function selectedNodes(nodes: Map<string, PositionedNode>, ids: string[]): PositionedNode[] {
  if (ids.length === 0) throw new CliError('Action requires at least one node', 2)
  return ids.map((id) => requireNode(nodes, id))
}

function applyAction(
  action: DiagramAction,
  diagram: PositionedDiagram,
  project: DiagramProject,
): void {
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]))

  switch (action.type) {
    case 'set-direction':
      project.sidecar.direction = action.direction
      diagram.direction = action.direction
      return
    case 'set-primary-flow': {
      selectedNodes(nodes, action.nodes)
      project.sidecar.primaryFlow = [...action.nodes]
      for (const node of diagram.nodes) {
        if (action.nodes.includes(node.id)) node.role = 'primary'
        else if (node.role === 'primary') node.role = 'secondary'
      }
      return
    }
    case 'place-relative': {
      const node = requireNode(nodes, action.node)
      const relative = requireNode(nodes, action.relativeTo)
      const gap = action.gap ?? 72
      if (action.position === 'above') {
        node.x = relative.x + (relative.width - node.width) / 2
        node.y = relative.y - node.height - gap
      } else if (action.position === 'below') {
        node.x = relative.x + (relative.width - node.width) / 2
        node.y = relative.y + relative.height + gap
      } else if (action.position === 'left') {
        node.x = relative.x - node.width - gap
        node.y = relative.y + (relative.height - node.height) / 2
      } else {
        node.x = relative.x + relative.width + gap
        node.y = relative.y + (relative.height - node.height) / 2
      }
      return
    }
    case 'align': {
      const selected = selectedNodes(nodes, action.nodes)
      const anchor = selected[0]!
      for (const node of selected.slice(1)) {
        if (action.axis === 'left') node.x = anchor.x
        if (action.axis === 'top') node.y = anchor.y
        if (action.axis === 'center-x') node.x = anchor.x + anchor.width / 2 - node.width / 2
        if (action.axis === 'center-y') node.y = anchor.y + anchor.height / 2 - node.height / 2
      }
      return
    }
    case 'distribute': {
      const selected = selectedNodes(nodes, action.nodes)
      if (selected.length < 3) return
      const horizontal = action.direction === 'horizontal'
      selected.sort((a, b) => horizontal ? a.x - b.x : a.y - b.y)
      const first = selected[0]!
      const last = selected[selected.length - 1]!
      const start = horizontal ? first.x : first.y
      const end = horizontal ? last.x : last.y
      const step = (end - start) / (selected.length - 1)
      selected.forEach((node, index) => {
        if (horizontal) node.x = start + index * step
        else node.y = start + index * step
      })
      return
    }
    case 'set-role':
      for (const node of selectedNodes(nodes, action.nodes)) node.role = action.role
      return
    case 'pin':
      for (const node of selectedNodes(nodes, action.nodes)) node.pinned = action.pinned ?? true
  }
}

export async function applyActions(
  project: DiagramProject,
  actions: DiagramAction[],
): Promise<ApplyResult> {
  const directionAction = actions.find((action) => action.type === 'set-direction')
  if (directionAction?.type === 'set-direction') {
    project.sidecar.direction = directionAction.direction
    project.sidecar.nodes = Object.fromEntries(
      Object.entries(project.sidecar.nodes).filter(([, node]) => node.pinned),
    )
  }

  let diagram = await layoutProject(project, {
    direction: project.sidecar.direction,
    applyOverrides: true,
  })

  for (const action of actions) applyAction(action, diagram, project)

  for (const node of diagram.nodes) {
    project.sidecar.nodes[node.id] = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      pinned: node.pinned,
      role: node.role,
    }
  }

  // Re-run layout to refresh edge routes while retaining node overrides.
  diagram = await layoutProject(project, {
    direction: project.sidecar.direction,
    applyOverrides: true,
  })
  const audit = auditDiagram(diagram)
  if (audit.metrics.nodeOverlaps > 0) {
    throw new CliError(`Actions rejected: ${audit.metrics.nodeOverlaps} node overlap(s) introduced`, 2)
  }
  if (audit.metrics.edgeNodeIntersections > 0) {
    throw new CliError(
      `Actions rejected: ${audit.metrics.edgeNodeIntersections} edge-to-node intersection(s) introduced`,
      2,
    )
  }

  return { diagram, audit, actionsApplied: actions.length }
}
