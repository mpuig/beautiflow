import type { DiagramColors } from 'beautiful-mermaid'
import type { PositionedDiagram } from './model.ts'
import { renderSvg } from '../vendor/beautiful-mermaid/renderer.ts'
import { MIX } from '../vendor/beautiful-mermaid/theme.ts'
import type { PositionedGraph as VendorPositionedGraph } from '../vendor/beautiful-mermaid/types.ts'

export interface SvgOptions {
  theme?: DiagramColors
  transparent?: boolean
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function stableId(inputPath: string, identity: string): string {
  let hash = 2166136261
  for (const character of identity) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  const slug = inputPath.split(/[\\/]/).at(-1)?.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram'
  return `beautiflow-${slug}-${(hash >>> 0).toString(16)}`
}

function authoredMetadata(source: string): { title?: string; description?: string } {
  const oneLine = (name: string) => source.match(new RegExp(`^\\s*${name}\\s*:\\s*["']?(.+?)["']?\\s*$`, 'im'))?.[1]?.trim()
  const frontmatter = source.trimStart().startsWith('---') ? source.trimStart().match(/^---\s*\n([\s\S]*?)\n---/)?.[1] : undefined
  const frontmatterTitle = frontmatter?.match(/^title\s*:\s*["']?(.+?)["']?\s*$/im)?.[1]?.trim()
  const inlineTitle = source.match(/^\s*(?:pie\b.*?)\btitle\s+(.+)$/im)?.[1]?.trim()
  return {
    title: oneLine('accTitle') ?? frontmatterTitle ?? inlineTitle,
    description: oneLine('accDescr'),
  }
}

export function makeSvgAccessible(
  svg: string,
  source: string,
  inputPath: string,
  family: string,
  fallbackDescription?: string,
): string {
  const metadata = authoredMetadata(source)
  const fallbackTitle = inputPath.split(/[\\/]/).at(-1)?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Diagram'
  const title = metadata.title ?? fallbackTitle
  const graphFamily = /^\s*stateDiagram/im.test(source) ? 'state' : 'flowchart'
  const familyLabel = family === 'graph' ? graphFamily : family
  const description = metadata.description ?? fallbackDescription ?? `${title}, rendered as a ${familyLabel} diagram.`
  const id = stableId(inputPath, `${source}\u0000${svg}`)
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attributes: string) => {
    const clean = attributes
      .replace(/\srole=(?:"[^"]*"|'[^']*')/gi, '')
      .replace(/\saria-labelledby=(?:"[^"]*"|'[^']*')/gi, '')
    return `<svg${clean} role="img" aria-labelledby="${id}-title ${id}-desc">\n<title id="${id}-title">${escapeXml(title)}</title>\n<desc id="${id}-desc">${escapeXml(description)}</desc>`
  })
}

function mixColors(background: string, foreground: string, ratio: number, fallback: string): string {
  const normalize = (value: string): string | undefined => {
    const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    if (!match) return undefined
    const hex = match[1]!
    return hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex
  }
  const bg = normalize(background)
  const fg = normalize(foreground)
  if (!bg || !fg) return fallback
  const channel = (index: number) => Math.round(
    Number.parseInt(bg.slice(index, index + 2), 16) * (1 - ratio)
      + Number.parseInt(fg.slice(index, index + 2), 16) * ratio,
  ).toString(16).padStart(2, '0')
  return `#${channel(0)}${channel(2)}${channel(4)}`
}

export function materializeColors(svg: string, colors: DiagramColors, transparent: boolean): string {
  const bg = colors.bg ?? '#ffffff'
  const fg = colors.fg ?? '#27272a'
  const muted = colors.muted ?? mixColors(bg, fg, MIX.textMuted / 100, fg)
  const replacements: Array<[string, string]> = [
    ['var(--_text-sec)', colors.muted ?? mixColors(bg, fg, MIX.textSec / 100, fg)],
    ['var(--_text-muted)', muted],
    ['var(--_text-faint)', mixColors(bg, fg, MIX.textFaint / 100, fg)],
    ['var(--_text)', fg],
    ['var(--_line)', colors.line ?? mixColors(bg, fg, MIX.line / 100, fg)],
    ['var(--_arrow)', colors.accent ?? mixColors(bg, fg, MIX.arrow / 100, fg)],
    ['var(--_node-fill)', colors.surface ?? mixColors(bg, fg, MIX.nodeFill / 100, bg)],
    ['var(--_node-stroke)', colors.border ?? mixColors(bg, fg, MIX.nodeStroke / 100, fg)],
    ['var(--_group-fill)', bg],
    ['var(--_group-hdr)', mixColors(bg, fg, MIX.groupHeader / 100, bg)],
    ['var(--_inner-stroke)', mixColors(bg, fg, MIX.innerStroke / 100, fg)],
    ['var(--_key-badge)', mixColors(bg, fg, MIX.keyBadge / 100, bg)],
    ['var(--muted)', muted],
    ['var(--accent)', colors.accent ?? fg],
    ['var(--surface)', colors.surface ?? bg],
    ['var(--border)', colors.border ?? fg],
    ['var(--line)', colors.line ?? fg],
    ['var(--fg)', fg],
    ['var(--bg)', bg],
  ]
  let output = svg
  for (const [variable, color] of replacements) output = output.replaceAll(variable, color)
  if (!transparent) {
    output = output.replace(/(<svg[^>]*>)/, `$1\n<rect width="100%" height="100%" fill="${bg}" />`)
  }
  return output
}

export function renderPositionedSvg(
  diagram: PositionedDiagram,
  options: SvgOptions = {},
): string {
  const colors: DiagramColors = options.theme ?? {
    bg: '#ffffff',
    fg: '#27272a',
    accent: '#2563eb',
    line: '#71717a',
    muted: '#78716c',
    surface: '#ffffff',
    border: '#d4d4d8',
  }
  const bg = colors.bg ?? '#ffffff'
  const accent = colors.accent ?? '#2563eb'
  const line = colors.line ?? '#71717a'
  const surface = colors.surface ?? bg

  const graph: VendorPositionedGraph = {
    width: diagram.width,
    height: diagram.height,
    nodes: diagram.nodes.map((node) => {
      const roleStyle = node.role === 'primary'
        ? {
            fill: mixColors(bg, accent, 0.09, surface),
            stroke: accent,
            'stroke-width': '2',
          }
        : node.role === 'exception'
          ? {
              fill: mixColors(bg, '#dc2626', 0.07, surface),
              stroke: '#dc2626',
              'stroke-width': '2',
            }
          : undefined
      return {
        id: node.id,
        label: node.label,
        shape: node.shape,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        ...(node.inlineStyle || roleStyle
          ? { inlineStyle: { ...(node.inlineStyle ?? {}), ...(roleStyle ?? {}) } }
          : {}),
      }
    }),
    edges: diagram.edges.map((edge) => {
      const roleStyle: Record<string, string> = edge.role === 'primary'
        ? { stroke: accent, 'stroke-width': '2' }
        : edge.role === 'exception'
          ? { stroke: '#dc2626', 'stroke-width': '2' }
          : { stroke: line }
      return {
        source: edge.source,
        target: edge.target,
        ...(edge.label ? { label: edge.label } : {}),
        style: edge.style,
        hasArrowStart: edge.hasArrowStart,
        hasArrowEnd: edge.hasArrowEnd,
        points: edge.points,
        ...(edge.labelPosition ? { labelPosition: edge.labelPosition } : {}),
        inlineStyle: { ...(edge.inlineStyle ?? {}), ...roleStyle },
      }
    }),
    groups: diagram.groups,
  }

  const transparent = options.transparent ?? false
  return materializeColors(renderSvg(graph, colors, 'Inter', transparent), colors, transparent)
}
