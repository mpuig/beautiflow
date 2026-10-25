import type { Diagram, ArchitectureModel } from 'pele'
import type { ArchitectureServiceGeometry, ArchitectureRouteGeometry, ArchitectureBox } from '../../diagram/architecture-geometry.ts'
export interface ArchitectureGeometry {
  services: ArchitectureServiceGeometry[]
  routes: ArchitectureRouteGeometry[]
  headers: ArchitectureBox[]
  offset: { x: number; y: number }
}
export const architecture: Diagram<ArchitectureModel>
