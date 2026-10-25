import type { BoundaryKind, RelationshipKind } from './annotations.ts'
import type { ArchitectureGeometry } from '../src/vendor/pele-architecture/index.js'
export interface Box { x: number; y: number; width: number; height: number; rx: number }
export interface DrawingScene {
  family: 'architecture'
  sourceHash: string
  title: string
  description: string
  width: number
  height: number
  geometry: ArchitectureGeometry
  nodes: Array<{ id: string; label: string; icon: string; parent?: string; transform: string; box: Box; iconSvg: string; labelSvg: string }>
  groups: Array<{ id: string; label: string; parent?: string; kind: BoundaryKind; box: Box; iconSvg: string; labelSvg: string }>
  edges: Array<{ id: string; source: string; target: string; kind: RelationshipKind; meaning: string; sourcePort: string; targetPort: string; paths: Array<{ d: string; marker: boolean }> }>
}
export type DrawingStyle = 'plain' | 'ancient' | 'disco' | 'blueprint' | 'deco' | 'pastel' | 'diner' | 'transit' | 'zine'
export const styles: readonly DrawingStyle[]
export function drawingSize(scene: DrawingScene): {width: number; height: number}
export function drawScene(scene: DrawingScene, style?: DrawingStyle): string
