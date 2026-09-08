import { createHash } from 'node:crypto'
import { extname } from 'node:path'
import { parseMermaid } from 'beautiful-mermaid'
import { CliError } from '../errors.ts'
import { readInput, writeOutput } from '../io.ts'
import {
  normalizeDirection,
  type BeautiflowSidecar,
  type DiagramProject,
  type LayoutDirection,
  type NodeOverride,
} from './model.ts'

export function sourceHash(source: string): string {
  return createHash('sha256').update(source).digest('hex').slice(0, 16)
}

export function defaultSidecarPath(sourcePath: string): string {
  const extension = extname(sourcePath)
  const stem = extension ? sourcePath.slice(0, -extension.length) : sourcePath
  return `${stem}.beautiflow.json`
}

function isDirection(value: unknown): value is LayoutDirection {
  return value === 'LR' || value === 'TD'
}

function parseSidecar(value: unknown, path: string): BeautiflowSidecar {
  if (!value || typeof value !== 'object') throw new CliError(`Invalid sidecar: ${path}`, 2)
  const input = value as Record<string, unknown>
  if (input.version !== 1 || !isDirection(input.direction)) {
    throw new CliError(`Unsupported or invalid Beautiflow sidecar: ${path}`, 2)
  }

  const rawNodes = input.nodes
  for (const field of ['nodeSpacing', 'layerSpacing']) {
    if (input[field] !== undefined && (typeof input[field] !== 'number' || !Number.isFinite(input[field]) || input[field] <= 0)) {
      throw new CliError(`Invalid ${field} in sidecar: ${path}`, 2)
    }
  }
  if (!rawNodes || typeof rawNodes !== 'object' || Array.isArray(rawNodes)) {
    throw new CliError(`Invalid nodes in sidecar: ${path}`, 2)
  }

  return {
    version: 1,
    sourceHash: typeof input.sourceHash === 'string' ? input.sourceHash : '',
    direction: input.direction,
    nodes: rawNodes as Record<string, NodeOverride>,
    ...(typeof input.nodeSpacing === 'number' ? { nodeSpacing: input.nodeSpacing } : {}),
    ...(typeof input.layerSpacing === 'number' ? { layerSpacing: input.layerSpacing } : {}),
    ...(typeof input.theme === 'string' ? { theme: input.theme } : {}),
    ...(Array.isArray(input.primaryFlow)
      ? { primaryFlow: input.primaryFlow.filter((id): id is string => typeof id === 'string') }
      : {}),
  }
}

export async function loadProject(sourcePath: string): Promise<DiagramProject> {
  const source = await readInput(sourcePath)
  let graph
  try {
    graph = parseMermaid(source)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not parse Mermaid: ${message}`, 2)
  }

  const sidecarPath = defaultSidecarPath(sourcePath)
  const sidecarFile = Bun.file(sidecarPath)
  let sidecar: BeautiflowSidecar

  if (await sidecarFile.exists()) {
    try {
      sidecar = parseSidecar(await sidecarFile.json(), sidecarPath)
    } catch (error) {
      if (error instanceof CliError) throw error
      const message = error instanceof Error ? error.message : String(error)
      throw new CliError(`Could not read ${sidecarPath}: ${message}`, 2)
    }
  } else {
    sidecar = {
      version: 1,
      sourceHash: sourceHash(source),
      direction: normalizeDirection(graph.direction),
      nodes: {},
    }
  }

  const knownNodes = new Set(graph.nodes.keys())
  sidecar.nodes = Object.fromEntries(
    Object.entries(sidecar.nodes).filter(([id]) => knownNodes.has(id)),
  )
  if (sidecar.primaryFlow) {
    sidecar.primaryFlow = sidecar.primaryFlow.filter((id) => knownNodes.has(id))
  }

  return { sourcePath, source, graph, sidecarPath, sidecar }
}

export async function saveSidecar(project: DiagramProject): Promise<void> {
  project.sidecar.sourceHash = sourceHash(project.source)
  const sortedNodes = Object.fromEntries(
    Object.entries(project.sidecar.nodes).sort(([a], [b]) => a.localeCompare(b)),
  )
  const content = `${JSON.stringify({ ...project.sidecar, nodes: sortedNodes }, null, 2)}\n`
  await writeOutput(project.sidecarPath, content)
}
