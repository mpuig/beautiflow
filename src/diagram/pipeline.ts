import { Resvg } from '@resvg/resvg-js'
import { renderMermaidASCII, renderMermaidSVG } from 'beautiful-mermaid'
import { layoutProject } from './layout.ts'
import type { DiagramProject } from './model.ts'
import { materializeColors, renderPositionedSvg } from './svg.ts'
import { resolveTheme } from '../render.ts'
import type { RenderRequest } from '../types.ts'
import { CliError } from '../errors.ts'
import { renderGitGraphSvg, renderPieSvg } from './specialized.ts'
import { renderArchitectureSvg } from './architecture.ts'

const DEFAULT_COLORS = {
  bg: '#ffffff', fg: '#27272a', accent: '#2563eb', line: '#71717a',
  muted: '#78716c', surface: '#ffffff', border: '#d4d4d8',
}

export type DiagramFamily = 'graph' | 'sequence' | 'class' | 'er' | 'xychart' | 'pie' | 'gitgraph' | 'architecture' | 'unknown'

function mermaidBody(source: string): string {
  const trimmed = source.trimStart()
  if (!trimmed.startsWith('---')) return trimmed
  const end = trimmed.indexOf('\n---', 3)
  return end >= 0 ? trimmed.slice(end + 4).trimStart() : trimmed
}

export function diagramFamily(source: string): DiagramFamily {
  const header = mermaidBody(source).split(/[\n;]/)[0]?.trim().toLowerCase() ?? ''
  if (/^(?:graph|flowchart)\s+|^statediagram(?:-v2)?\b/.test(header)) return 'graph'
  if (header === 'sequencediagram') return 'sequence'
  if (header === 'classdiagram') return 'class'
  if (header === 'erdiagram') return 'er'
  if (/^xychart(?:-beta)?\b/.test(header)) return 'xychart'
  if (/^pie\b/.test(header)) return 'pie'
  if (/^gitgraph\b/.test(header)) return 'gitgraph'
  if (/^architecture-beta\b/.test(header)) return 'architecture'
  return 'unknown'
}

export async function renderStandaloneOutput(source: string, request: RenderRequest): Promise<string | Uint8Array> {
  const family = diagramFamily(source)
  if (request.format === 'ascii' || request.format === 'unicode') {
    if (family === 'pie' || family === 'gitgraph' || family === 'architecture') {
      throw new CliError(`${family} terminal rendering is not supported`, 2)
    }
    return renderMermaidASCII(source, { useAscii: request.format === 'ascii', colorMode: 'none' })
  }
  const theme = resolveTheme(request.themeName) ?? DEFAULT_COLORS
  const transparent = request.transparent
  const rendered = family === 'pie'
    ? renderPieSvg(source, theme, transparent)
    : family === 'gitgraph'
      ? renderGitGraphSvg(source, theme, transparent)
      : family === 'architecture'
        ? await renderArchitectureSvg(source, theme, transparent)
        : renderMermaidSVG(source, { ...theme, transparent })
  const svg = family === 'pie' || family === 'gitgraph' || family === 'architecture'
    ? rendered
    : materializeColors(rendered, theme, transparent)
  if (request.format === 'svg') return svg
  return new Resvg(svg, {
    fitTo: { mode: 'zoom', value: 2 },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  }).render().asPng()
}

export async function renderProjectOutput(
  project: DiagramProject,
  request: RenderRequest,
): Promise<string | Uint8Array> {
  if (request.format === 'ascii' || request.format === 'unicode') {
    return renderMermaidASCII(project.source, {
      useAscii: request.format === 'ascii',
      colorMode: 'none',
    })
  }

  const themeName = request.themeName ?? project.sidecar.theme
  const theme = resolveTheme(themeName)
  const diagram = await layoutProject(project, {
    direction: project.sidecar.direction,
    applyOverrides: true,
  })
  const svg = renderPositionedSvg(diagram, {
    ...(theme ? { theme } : {}),
    transparent: request.transparent,
  })

  if (request.format === 'svg') return svg

  return new Resvg(svg, {
    fitTo: { mode: 'zoom', value: 2 },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  }).render().asPng()
}
