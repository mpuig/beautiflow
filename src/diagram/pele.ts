import { register, render } from 'pele/core'
import architecture from 'pele/diagrams/architecture'
import { icons as logos } from '@iconify-json/logos'
import { icons as lucide } from '@iconify-json/lucide'
import type { DiagramColors } from 'beautiful-mermaid'
import { createHash } from 'node:crypto'
import { CliError } from '../errors.ts'

register(architecture)

const AWS_FALLBACKS: Record<string, string> = {
  bedrock: 'blocks', ecr: 'container', 'nat-gateway': 'router',
  sagemaker: 'brain-circuit', vpn: 'shield-check',
}

function iconMarkup(name: string, instance: number): string | undefined {
  const [pack, key] = name.split(':')
  if (!key) return undefined // Pele owns the built-in architecture icons.
  let collection = pack === 'lucide' ? lucide : pack === 'logos' || pack === 'aws' ? logos : undefined
  let icon = collection?.icons[pack === 'aws' ? `aws-${key}` : key]
  if (!icon && pack === 'aws' && AWS_FALLBACKS[key]) {
    collection = lucide
    icon = lucide.icons[AWS_FALLBACKS[key]!]
  }
  if (!icon) return undefined
  const width = icon.width ?? collection?.width ?? 24
  const height = icon.height ?? collection?.height ?? 24
  const outline = collection === lucide
  // Iconify packs contain gradient IDs. Scope them by icon name so different
  // icons cannot capture one another's paint servers in a single diagram.
  const prefix = `${createHash('sha256').update(name).digest('hex').slice(0, 12)}-${instance}`
  let body = icon.body
  for (const match of [...body.matchAll(/\bid="([^"]+)"/g)]) {
    body = body.replaceAll(match[1]!, `beautiflow-icon-${prefix}-${match[1]}`)
  }
  return `<svg viewBox="0 0 ${width} ${height}" width="24" height="24" fill="${outline ? 'none' : 'currentColor'}" stroke="${outline ? 'currentColor' : 'none'}">${body}</svg>`
}

// Resolve Pele's private aliases and public fallbacks for resvg, which does not
// implement CSS custom properties. Preview and exported PNG use identical colors.
function materialize(svg: string, colors: DiagramColors): string {
  const variables = new Map<string, string>(Object.entries({
    '--pele-bg': colors.bg ?? '#ffffff', '--pele-fg': colors.fg ?? '#27272a',
    '--pele-muted': colors.muted ?? '#78716c', '--pele-line': colors.line ?? '#71717a',
    '--pele-surface': colors.surface ?? '#ffffff', '--pele-surface-alt': colors.surface ?? '#f3f3f3',
    '--pele-border': colors.border ?? '#d4d4d8', '--pele-accent': colors.accent ?? '#2563eb',
  }))
  for (const [, key, value] of svg.matchAll(/(--_[\w-]+):([^;"<>]+)/g)) variables.set(key!, value!)
  let output = svg
  for (let pass = 0; pass < 8 && output.includes('var('); pass++) {
    output = output.replace(/var\((--[\w-]+)(?:,([^()]*))?\)/g, (_match, key: string, fallback?: string) => variables.get(key) ?? fallback ?? '')
  }
  return output
}

export function renderPeleArchitecture(source: string, colors: DiagramColors, transparent: boolean): string {
  try {
    const idPrefix = `beautiflow-pele-${createHash('sha256').update(source).digest('hex').slice(0, 16)}`
    let iconSequence = 0
    const result = render(source, { responsive: false, autoDirection: false, idPrefix, fontFamily: 'Arial', icons: (name) => iconMarkup(name, ++iconSequence) })
    const svg = materialize(result.svg, colors)
    return transparent ? svg : svg.replace(/(<svg[^>]*>)/, `$1\n<rect width="100%" height="100%" fill="${colors.bg ?? '#ffffff'}" />`)
  } catch (error) {
    throw new CliError(`Unable to render architecture diagram: ${error instanceof Error ? error.message : String(error)}`, 2)
  }
}
