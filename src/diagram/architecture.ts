import type { DiagramColors } from 'beautiful-mermaid'
import { renderPeleArchitecture } from './pele.ts'

export function renderArchitectureSvg(source: string, colors: DiagramColors, transparent: boolean): string {
  return renderPeleArchitecture(source, colors, transparent)
}
