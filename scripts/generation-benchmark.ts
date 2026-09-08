import { createHash } from 'node:crypto'
import { auditDiagram } from '../src/diagram/audit.ts'
import { layoutProject } from '../src/diagram/layout.ts'
import { loadProject } from '../src/diagram/project.ts'
import { renderProjectOutput } from '../src/diagram/pipeline.ts'

export interface GenerationCase {
  id: string
  prompt: string
  nodes: Record<string, string[]>
  edges: Array<{ source: string; target: string; labels?: string[] }>
}

export interface GenerationRun {
  agent: string
  model: string
  commit: string
  skillSha256: string
  attempt: number
  visualReview?: { status: 'passed' | 'failed' | 'skipped'; reviewer: string; artifactSha256: string; defects: string[] }
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
const digest = (value: string) => createHash('sha256').update(value).digest('hex')

export async function verifyGeneration(task: GenerationCase, candidate: string, run: GenerationRun) {
  if (!run.agent?.trim() || !run.model?.trim() || !run.commit?.trim()
    || !/^[a-f0-9]{64}$/.test(run.skillSha256) || run.attempt !== 1) {
    throw new Error('Require agent, model, commit, packaged skill SHA-256, and attempt 1')
  }
  const project = await loadProject(candidate)
  const failures: string[] = []
  const bindings = new Map<string, string>()
  for (const [key, aliases] of Object.entries(task.nodes)) {
    const matches = [...project.graph.nodes.values()].filter((node) => aliases.some((alias) => normalize(alias) === normalize(node.label)))
    if (matches.length !== 1 || [...bindings.values()].includes(matches[0]!.id)) failures.push(`Expected one distinct node for ${key}`)
    else bindings.set(key, matches[0]!.id)
  }
  for (const edge of task.edges) {
    if (!project.graph.edges.some((actual) => actual.source === bindings.get(edge.source)
      && actual.target === bindings.get(edge.target)
      && (!edge.labels || edge.labels.some((label) => normalize(label) === normalize(actual.label ?? ''))))) {
      failures.push(`Missing required relationship ${edge.source} -> ${edge.target}`)
    }
  }
  const diagram = await layoutProject(project, { direction: project.sidecar.direction, applyOverrides: true })
  const audit = auditDiagram(diagram)
  const artifact = await renderProjectOutput(project, { inputPath: candidate, format: 'svg', transparent: false }) as string
  const artifactSha256 = digest(artifact)
  const review = run.visualReview
  const visualPassed = review?.status === 'passed' && Boolean(review.reviewer?.trim())
    && review.artifactSha256 === artifactSha256 && Array.isArray(review.defects) && review.defects.length === 0
  const geometryPassed = audit.metrics.nodeOverlaps === 0 && audit.metrics.edgeNodeIntersections === 0
    && audit.metrics.labelCollisions === 0 && audit.metrics.sharedRoutes === 0 && audit.metrics.edgeCrossings === 0
  return {
    case: task.id, run, sourceSha256: digest(project.source), sidecarSha256: digest(JSON.stringify(project.sidecar)), artifactSha256,
    firstPassUsable: failures.length === 0 && geometryPassed && visualPassed,
    semantic: { passed: failures.length === 0, failures }, geometry: { passed: geometryPassed, audit },
    visual: { passed: visualPassed, status: review?.status ?? 'skipped', artifactMatched: review?.artifactSha256 === artifactSha256 },
  }
}

if (import.meta.main) {
  try {
    const [caseId, candidate, runPath] = process.argv.slice(2)
    const cases = await Bun.file(new URL('../benchmarks/generation/cases.json', import.meta.url)).json() as GenerationCase[]
    const task = cases.find((entry) => entry.id === caseId)
    if (!task || !candidate || !runPath) throw new Error('Usage: bun scripts/generation-benchmark.ts <case-id> <candidate.mmd> <run.json>')
    const result = await verifyGeneration(task, candidate, await Bun.file(runPath).json())
    console.log(JSON.stringify(result, null, 2))
    process.exitCode = result.firstPassUsable ? 0 : 1
  } catch (error) {
    console.log(JSON.stringify({ firstPassUsable: false, error: error instanceof Error ? error.message : String(error) }))
    process.exitCode = 2
  }
}
