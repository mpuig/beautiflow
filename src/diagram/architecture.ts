import { createCanvas } from '@napi-rs/canvas'
import fs from 'node:fs'
import type { JSDOM as JSDOMInstance } from 'jsdom'
import jsdomDefaultStylesheet from '../../node_modules/jsdom/lib/jsdom/browser/default-stylesheet.css' with { type: 'text' }
import type { DiagramColors } from 'beautiful-mermaid'
import { CliError } from '../errors.ts'
import { stabilizeComplexArchitectureSvg } from './architecture-layout.ts'

interface MermaidRuntime {
  render: (id: string, source: string) => Promise<{ svg: string }>
}

let runtimePromise: Promise<MermaidRuntime> | undefined
let activeDom: JSDOMInstance | undefined
let renderSequence = 0

async function installDom(): Promise<void> {
  if ('document' in globalThis && 'window' in globalThis) return

  // JSDOM reads its default stylesheet through fs while the module loads.
  // Intercept that one asset with the text embedded by Bun so the compiled
  // executable never depends on the build machine's node_modules directory.
  const mutableFs = fs as unknown as { readFileSync: (...args: unknown[]) => unknown }
  const originalReadFileSync = mutableFs.readFileSync
  mutableFs.readFileSync = (path: unknown, ...args: unknown[]): unknown =>
    String(path).endsWith('/jsdom/browser/default-stylesheet.css')
      ? jsdomDefaultStylesheet
      : originalReadFileSync(path, ...args)
  let JSDOM: typeof import('jsdom').JSDOM
  try {
    ;({ JSDOM } = await import('jsdom'))
  } finally {
    mutableFs.readFileSync = originalReadFileSync
  }

  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1/' })
  const { window } = dom
  activeDom = dom
  window.requestAnimationFrame = () => 0
  window.cancelAnimationFrame = () => {}
  const contexts = new WeakMap<object, unknown>()
  const canvasPrototype = window.HTMLCanvasElement.prototype as unknown as {
    getContext: (kind: string) => unknown
  }
  canvasPrototype.getContext = function getContext(kind: string): unknown {
    if (kind !== '2d') return null
    let context = contexts.get(this)
    if (!context) {
      const canvas = createCanvas(
        Number((this as unknown as { width?: number }).width) || 300,
        Number((this as unknown as { height?: number }).height) || 150,
      )
      context = canvas.getContext('2d') as never
      ;(context as { drawImage: (...args: unknown[]) => void }).drawImage = () => {}
      contexts.set(this, context)
    }
    return context
  }

  const svgPrototype = window.SVGElement.prototype as unknown as {
    getBBox?: () => { x: number; y: number; width: number; height: number }
  }
  if (!svgPrototype.getBBox) {
    svgPrototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 })
  }
  ;(window.SVGElement.prototype as unknown as { getComputedTextLength: () => number }).getComputedTextLength = function () {
    return ((this as unknown as { textContent?: string }).textContent ?? '').length * 8
  }

  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLCanvasElement: window.HTMLCanvasElement,
    SVGElement: window.SVGElement,
    Element: window.Element,
    CSSStyleSheet: window.CSSStyleSheet,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
  })
}

function disposeDom(): void {
  activeDom?.window.close()
  activeDom = undefined
  runtimePromise = undefined
  for (const key of [
    'window', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement',
    'SVGElement', 'Element', 'CSSStyleSheet', 'requestAnimationFrame', 'cancelAnimationFrame',
  ]) {
    Reflect.deleteProperty(globalThis, key)
  }
}

async function mermaidRuntime(): Promise<MermaidRuntime> {
  runtimePromise ??= (async () => {
    await installDom()
    const [{ default: mermaid }, { icons: logos }, { icons: lucide }] = await Promise.all([
      import('mermaid'),
      import('@iconify-json/logos'),
      import('@iconify-json/lucide'),
    ])
    const awsAliases: Record<string, (typeof logos.icons)[string]> = {}
    for (const [name, icon] of Object.entries(logos.icons)) {
      if (name.startsWith('aws-')) awsAliases[name.slice(4)] = icon
    }
    const lucideFallbacks: Record<string, string> = {
      bedrock: 'blocks',
      ecr: 'container',
      'nat-gateway': 'router',
      sagemaker: 'brain-circuit',
      vpn: 'shield-check',
    }
    for (const [name, fallback] of Object.entries(lucideFallbacks)) {
      const icon = lucide.icons[fallback]
      if (icon) {
        awsAliases[name] = {
          ...icon,
          width: lucide.width ?? 24,
          height: lucide.height ?? 24,
        }
      }
    }
    const aws = {
      prefix: 'aws',
      width: logos.width,
      height: logos.height,
      icons: awsAliases,
    }
    mermaid.registerIconPacks([
      { name: 'logos', loader: async () => logos },
      { name: 'lucide', loader: async () => lucide },
      { name: 'aws', loader: async () => aws },
    ])
    mermaid.initialize({
      startOnLoad: false,
      // Strict mode renders through a sandboxed iframe that is unavailable in the
      // standalone DOM shim. Architecture labels are still sanitized by Mermaid.
      securityLevel: 'loose',
      theme: 'base',
      architecture: {
        useMaxWidth: true,
        padding: 40,
      },
    })
    return mermaid as MermaidRuntime
  })()
  return runtimePromise
}

function repairArchitectureViewBox(svg: string): string {
  const bounds: Array<[number, number, number, number]> = []
  for (const match of svg.matchAll(/<rect[^>]*\bx="([\d.-]+)"\s+y="([\d.-]+)"\s+width="([\d.-]+)"\s+height="([\d.-]+)"[^>]*class="node-bkg"/g)) {
    bounds.push([Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])])
  }
  for (const match of svg.matchAll(/<rect[^>]*class="node-bkg"[^>]*\bx="([\d.-]+)"\s+y="([\d.-]+)"\s+width="([\d.-]+)"\s+height="([\d.-]+)"/g)) {
    bounds.push([Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])])
  }
  for (const match of svg.matchAll(/class="architecture-service"\s+transform="translate\(([\d.-]+),\s*([\d.-]+)\)"/g)) {
    bounds.push([Number(match[1]), Number(match[2]), 80, 118])
  }
  for (const match of svg.matchAll(/class="architecture-junction"\s+transform="translate\(([\d.-]+),\s*([\d.-]+)\)"/g)) {
    bounds.push([Number(match[1]) - 8, Number(match[2]) - 8, 16, 16])
  }

  if (bounds.length === 0) return svg
  const padding = 40
  const minX = Math.min(...bounds.map(([x]) => x)) - padding
  const minY = Math.min(...bounds.map(([, y]) => y)) - padding
  const maxX = Math.max(...bounds.map(([x, , width]) => x + width)) + padding
  const maxY = Math.max(...bounds.map(([, y, , height]) => y + height)) + padding
  const width = Math.max(80, maxX - minX)
  const height = Math.max(80, maxY - minY)

  return svg
    .replace(/viewBox="[^"]*"/, `viewBox="${minX} ${minY} ${width} ${height}"`)
    .replace(/max-width:\s*[\d.]+px/, `max-width: ${width}px`)
}

function sanitizeArchitectureSvg(svg: string): string {
  return svg
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\s+(?:href|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, '')
}

function normalizeArchitectureIds(svg: string): string {
  let output = svg.replaceAll(/beautiflow-architecture-\d+/g, 'beautiflow-architecture')
  const iconIds = [...output.matchAll(/\bid="(SVG[A-Za-z0-9]+)"/g)].map((match) => match[1]!)
  iconIds.forEach((id, index) => {
    output = output.replaceAll(id, `beautiflow-icon-${index + 1}`)
  })
  return output
}

function addBackground(svg: string, color: string): string {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number)
  if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) return svg
  const [x, y, width, height] = viewBox
  return svg.replace(
    /(<svg[^>]*>)/,
    `$1\n<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" />`,
  )
}

export async function renderArchitectureSvg(
  source: string,
  colors: DiagramColors,
  transparent: boolean,
): Promise<string> {
  try {
    const mermaid = await mermaidRuntime()
    const id = `beautiflow-architecture-${++renderSequence}`
    const rendered = await mermaid.render(id, source)
    const stabilized = stabilizeComplexArchitectureSvg(rendered.svg, source)
    const repaired = normalizeArchitectureIds(repairArchitectureViewBox(sanitizeArchitectureSvg(stabilized)))
    const output = transparent ? repaired : addBackground(repaired, colors.bg ?? '#ffffff')
    return output
  } catch (error) {
    disposeDom()
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Unable to render architecture diagram: ${message}`, 2)
  }
}
