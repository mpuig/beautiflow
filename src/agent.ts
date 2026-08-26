import { existsSync } from 'node:fs'
import { diagramFamily, type DiagramFamily } from './diagram/pipeline.ts'
import { loadProject } from './diagram/project.ts'
import { diagnoseProject } from './diagram/semantic.ts'
import { CliError } from './errors.ts'
import { findFlowContext } from './flow-context.ts'
import { readInput } from './io.ts'

interface Capability {
  supported: boolean
  mutates: boolean
  reason?: string
}

function capabilitiesFor(family: DiagramFamily): Record<string, Capability> {
  const graph = family === 'graph'
  const architecture = family === 'architecture'
  return {
    render: { supported: family !== 'unknown', mutates: false },
    preview: { supported: family !== 'unknown', mutates: false },
    audit: {
      supported: graph || architecture,
      mutates: false,
      ...(!graph && !architecture ? { reason: 'Geometric audit is available for flowchart, state, and architecture diagrams' } : {}),
    },
    diagnose: {
      supported: graph,
      mutates: false,
      ...(!graph ? { reason: 'Semantic diagnosis requires the complete flowchart/state graph model' } : {}),
    },
    polish: {
      supported: graph,
      mutates: graph,
      ...(!graph ? { reason: 'Automatic polishing currently requires the complete flowchart/state graph model' } : {}),
    },
    apply: {
      supported: graph,
      mutates: graph,
      ...(!graph ? { reason: 'Semantic layout actions currently require a flowchart or state diagram' } : {}),
    },
    transform: {
      supported: graph,
      mutates: graph,
      ...(!graph ? { reason: 'Graph transformations currently require a flowchart or state diagram' } : {}),
    },
  }
}

export async function agentInspection(inputPath: string) {
  const source = await readInput(inputPath)
  const family = diagramFamily(source)
  if (family === 'unknown') throw new CliError('Could not identify a supported Mermaid diagram family', 2)

  const flowContext = await findFlowContext(inputPath)
  const capabilities = capabilitiesFor(family)
  const constraints: string[] = []
  let sidecar: string | null = null
  let sidecarExists = false
  let semantic: ReturnType<typeof diagnoseProject> | null = null

  if (family === 'graph') {
    const project = await loadProject(inputPath)
    sidecar = project.sidecarPath
    sidecarExists = existsSync(project.sidecarPath)
    semantic = diagnoseProject(project)
    constraints.push('Use semantic actions or transformations; never write node coordinates by hand')
    constraints.push('Preview layout and topology changes with --dry-run before applying them')
  } else if (family === 'architecture') {
    constraints.push('Architecture diagrams support rendering and visual audit but not semantic polish or transformations')
  } else {
    constraints.push(`${family} diagrams are render-only in the current project model`)
  }

  const recommendedOperations = family === 'graph'
    ? [
        {
          operation: 'polish',
          when: 'The user asks to improve layout, hierarchy, spacing, or routing without changing meaning',
          command: `beautiflow polish ${inputPath} --json`,
          mutates: true,
        },
        {
          operation: 'diagnose',
          when: 'The user reports unclear meaning, disconnected paths, incomplete decisions, or unreachable nodes',
          command: `beautiflow diagnose ${inputPath} --json`,
          mutates: false,
        },
        {
          operation: 'apply',
          when: 'The user requests a precise presentation change using roles, alignment, direction, or relative placement',
          command: `beautiflow apply ${inputPath} --actions <actions.json> --dry-run --json`,
          mutates: false,
        },
        {
          operation: 'transform',
          when: 'The user asks to add, remove, rename, reconnect, or regroup graph elements',
          command: `beautiflow transform ${inputPath} --actions <transformations.json> --dry-run --json`,
          mutates: false,
        },
      ]
    : family === 'architecture'
      ? [
          {
            operation: 'audit',
            when: 'Evaluate final rendered architecture quality before accepting the result',
            command: `beautiflow audit ${inputPath} --json`,
            mutates: false,
          },
          {
            operation: 'render',
            when: 'Produce the saved architecture exactly as authored',
            command: `beautiflow render ${inputPath} --format svg`,
            mutates: false,
          },
        ]
      : [
          {
            operation: 'render',
            when: `Render this ${family} diagram with its family-specific pipeline`,
            command: `beautiflow render ${inputPath} --format svg`,
            mutates: false,
          },
        ]

  return {
    protocolVersion: '1.0',
    ok: true,
    operation: 'inspect',
    family,
    source: inputPath,
    capabilities,
    context: {
      flowFile: flowContext?.path ?? null,
      sidecar,
      sidecarExists,
    },
    diagnostics: semantic
      ? {
          score: semantic.score,
          issueCount: semantic.issues.length,
          issues: semantic.issues,
        }
      : null,
    recommendedOperations,
    constraints,
    budget: {
      automaticPolishRuns: 1,
      targetedCorrectionRuns: 1,
      visualInspectionRuns: 1,
    },
    stopWhen: [
      'The requested change is present',
      'Semantic and geometry checks pass',
      'No quality metric regresses',
      'One final render has been inspected when vision is available',
    ],
  }
}
