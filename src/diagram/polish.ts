import { auditDiagram } from './audit.ts'
import { diagnoseProject, type SemanticReport } from './semantic.ts'
import { generateCandidates, layoutProject } from './layout.ts'
import type { AuditReport, BeautiflowSidecar, DiagramProject } from './model.ts'

export interface PolishResult {
  status: 'initialized' | 'improved' | 'unchanged'
  before: AuditReport
  after: AuditReport
  semantic: SemanticReport
  selected: string
  direction: 'LR' | 'TD'
  sidecar: BeautiflowSidecar
}

export function selectValidCandidate<Candidate extends { audit: AuditReport }>(candidates: Candidate[]): Candidate | undefined {
  return candidates.filter(({ audit }) => audit.metrics.nodeOverlaps === 0 && audit.metrics.edgeNodeIntersections === 0)
    .sort((first, second) => second.audit.score - first.audit.score
      || first.audit.metrics.labelCollisions - second.audit.metrics.labelCollisions
      || first.audit.metrics.sharedRoutes - second.audit.metrics.sharedRoutes
      || first.audit.metrics.edgeCrossings - second.audit.metrics.edgeCrossings
      || first.audit.metrics.totalBends - second.audit.metrics.totalBends)[0]
}

export async function polishProject(project: DiagramProject): Promise<PolishResult> {
  const originalSidecar = structuredClone(project.sidecar)
  const beforeDiagram = await layoutProject(project, {
    direction: project.sidecar.direction,
    applyOverrides: true,
  })
  const before = auditDiagram(beforeDiagram)
  const semantic = diagnoseProject(project)
  const candidates = await generateCandidates(project, 5)
  const evaluated = []

  try {
    for (const candidate of candidates) {
      const sidecar = structuredClone(originalSidecar)
      sidecar.direction = candidate.direction
      sidecar.nodeSpacing = candidate.nodeSpacing
      sidecar.layerSpacing = candidate.layerSpacing
      for (const node of candidate.diagram.nodes) {
        const existing = sidecar.nodes[node.id]
        if (existing?.pinned) continue
        sidecar.nodes[node.id] = {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          pinned: false,
          role: existing?.role ?? node.role,
        }
      }
      project.sidecar = sidecar
      const diagram = await layoutProject(project, { direction: sidecar.direction, applyOverrides: true })
      evaluated.push({ candidate, sidecar, audit: auditDiagram(diagram) })
    }
  } finally {
    project.sidecar = originalSidecar
  }

  const best = selectValidCandidate(evaluated)
  const initialized = Object.keys(originalSidecar.nodes).length === 0
  const improved = best !== undefined && best.audit.score > before.score
  const accepted = best !== undefined && (initialized ? best.audit.score >= before.score : improved)

  project.sidecar = accepted ? best.sidecar : originalSidecar
  return {
    status: initialized && accepted ? 'initialized' : improved ? 'improved' : 'unchanged',
    before,
    after: accepted ? best.audit : before,
    semantic,
    selected: accepted ? best.candidate.id : 'current',
    direction: project.sidecar.direction,
    sidecar: project.sidecar,
  }
}
