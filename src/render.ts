import {
  renderMermaidASCII,
  renderMermaidSVG,
  THEMES,
  type DiagramColors,
} from 'beautiful-mermaid'
import { CliError } from './errors.ts'
import type { RenderRequest, RenderResult } from './types.ts'
import { makeSvgAccessible } from './diagram/svg.ts'

export function resolveTheme(name: string | undefined): DiagramColors | undefined {
  if (!name) return undefined

  const theme = THEMES[name]
  if (!theme) {
    throw new CliError(
      `Unknown theme "${name}". Run "beautiflow themes" to list available themes.`,
      2,
    )
  }

  return theme
}

export function renderSource(source: string, request: RenderRequest): RenderResult {
  if (!source.trim()) throw new CliError('The Mermaid input is empty', 2)

  const theme = resolveTheme(request.themeName)

  try {
    if (request.format === 'png') {
      throw new CliError('PNG rendering requires a loaded Beautiflow project', 2)
    }

    if (request.format === 'svg') {
      return {
        content: makeSvgAccessible(renderMermaidSVG(source, {
          ...(theme ?? {}),
          transparent: request.transparent,
        }), source, request.inputPath, 'Mermaid'),
        format: request.format,
        ...(theme ? { theme } : {}),
      }
    }

    return {
      content: renderMermaidASCII(source, {
        useAscii: request.format === 'ascii',
        colorMode: 'none',
      }),
      format: request.format,
      ...(theme ? { theme } : {}),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not render Mermaid: ${message}`, 2)
  }
}

export function themeNames(): string[] {
  return Object.keys(THEMES).sort((a, b) => a.localeCompare(b))
}
