import type { MermaidGraph } from 'beautiful-mermaid'

export interface Point {
  x: number
  y: number
}

export type MermaidNode = MermaidGraph['nodes'] extends Map<string, infer Node> ? Node : never
export type MermaidEdge = MermaidGraph['edges'][number]
export type MermaidDirection = MermaidGraph['direction']
export type NodeShape = MermaidNode extends { shape: infer Shape } ? Shape : never

export type NodeRole = 'primary' | 'secondary' | 'exception'
export type LayoutDirection = 'LR' | 'TD'

export interface PositionedNode {
  id: string
  label: string
  shape: NodeShape
  x: number
  y: number
  width: number
  height: number
  role: NodeRole
  pinned: boolean
  inlineStyle?: Record<string, string>
}

export interface PositionedEdge {
  id: string
  source: string
  target: string
  label?: string
  points: Point[]
  role: NodeRole
  style: 'solid' | 'dotted' | 'thick'
  hasArrowStart: boolean
  hasArrowEnd: boolean
  labelPosition?: Point
  inlineStyle?: Record<string, string>
}

export interface PositionedGroup {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  children: PositionedGroup[]
}

export interface PositionedDiagram {
  width: number
  height: number
  direction: LayoutDirection
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  groups: PositionedGroup[]
}

export interface NodeOverride {
  x: number
  y: number
  width?: number
  height?: number
  pinned?: boolean
  role?: NodeRole
}

export interface BeautiflowSidecar {
  version: 1
  sourceHash: string
  direction: LayoutDirection
  theme?: string
  nodeSpacing?: number
  layerSpacing?: number
  primaryFlow?: string[]
  nodes: Record<string, NodeOverride>
}

export interface DiagramProject {
  sourcePath: string
  source: string
  graph: MermaidGraph
  sidecarPath: string
  sidecar: BeautiflowSidecar
}

export interface AuditIssue {
  severity: 'high' | 'medium' | 'low'
  type: 'node-overlap' | 'edge-crossing' | 'edge-node-intersection' | 'excessive-bends' | 'label-collision' | 'shared-route'
  message: string
  nodes?: string[]
  edges?: string[]
  evidence?: Record<string, number | string>
  supportedFixes?: Array<'set-direction' | 'place-relative' | 'align' | 'distribute'>
}

export interface AuditReport {
  score: number
  issues: AuditIssue[]
  metrics: {
    nodeOverlaps: number
    edgeCrossings: number
    edgeNodeIntersections: number
    labelCollisions: number
    sharedRoutes: number
    totalBends: number
    alignmentScore: number
    aspectRatio: number
  }
}

export interface LayoutCandidate {
  id: string
  direction: LayoutDirection
  nodeSpacing: number
  layerSpacing: number
  diagram: PositionedDiagram
  audit: AuditReport
}

export function normalizeDirection(direction: MermaidDirection): LayoutDirection {
  return direction === 'LR' || direction === 'RL' ? 'LR' : 'TD'
}
