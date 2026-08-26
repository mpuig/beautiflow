import { describe, expect, test } from 'bun:test'
import { renderSource, resolveTheme } from '../src/render.ts'
import { diagramFamily, renderStandaloneOutput } from '../src/diagram/pipeline.ts'

const source = `flowchart LR
  A[Start] --> B{Ready?}
  B -->|Yes| C[Ship]
`

describe('renderSource', () => {
  test('renders SVG', () => {
    const result = renderSource(source, {
      inputPath: 'diagram.mmd',
      format: 'svg',
      transparent: false,
    })

    expect(result.content).toStartWith('<svg')
    expect(result.content).toContain('Start')
    expect(result.content).toContain('Ready?')
  })

  test('renders pure ASCII', () => {
    const result = renderSource(source, {
      inputPath: 'diagram.mmd',
      format: 'ascii',
      transparent: false,
    })

    expect(result.content).toContain('+')
    expect(result.content).not.toContain('┌')
  })

  test('renders specialized Beautiful Mermaid families without the flowchart project parser', async () => {
    const source = `sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi\n`
    expect(diagramFamily(source)).toBe('sequence')
    const svg = await renderStandaloneOutput(source, { inputPath: 'sequence.mmd', format: 'svg', transparent: false })
    const png = await renderStandaloneOutput(source, { inputPath: 'sequence.mmd', format: 'png', transparent: false })
    expect(svg).toContain('class="actor"')
    expect(png).toBeInstanceOf(Uint8Array)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  test('renders architecture-beta with registered AWS and Lucide icons', async () => {
    const architecture = `---
config:
  architecture:
    seed: 7
    numIter: 200
---
architecture-beta
service users(lucide:users)[Users]
group account(cloud)[AWS account]
group ingress(cloud)[Public ingress] in account
group runtime(cloud)[Private runtime] in account
service waf(logos:aws-waf)[AWS WAF] in ingress
service eks(logos:aws-eks)[Amazon EKS] in runtime
users:R --> L:waf
waf:B --> T:eks
`
    expect(diagramFamily(architecture)).toBe('architecture')
    const svg = await renderStandaloneOutput(architecture, { inputPath: 'architecture.mmd', format: 'svg', transparent: false }) as string
    const repeatedSvg = await renderStandaloneOutput(architecture, { inputPath: 'architecture.mmd', format: 'svg', transparent: false }) as string
    const png = await renderStandaloneOutput(architecture, { inputPath: 'architecture.mmd', format: 'png', transparent: false })
    expect(svg).toContain('aria-roledescription="architecture"')
    expect(repeatedSvg).toBe(svg)
    expect(svg).toContain('service-waf')
    expect(svg).toContain('viewBox="0 0 256 256"')
    expect(svg).toContain('class="architecture-edges"')
    expect(svg).toContain('class="arrow"')
    expect(svg).not.toContain('data-beautiflow-layout="compound-elk-fallback"')
    expect(png).toBeInstanceOf(Uint8Array)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  test('renders pie and gitGraph families in the standalone binary pipeline', async () => {
    const pie = await renderStandaloneOutput(`pie title Work\n  "Build" : 70\n  "Review" : 30\n`, { inputPath: 'pie.mmd', format: 'svg', transparent: false })
    const git = await renderStandaloneOutput(`gitGraph:\n  commit "first"\n  branch feature\n  commit id:"work"\n  checkout main\n  merge feature\n`, { inputPath: 'git.mmd', format: 'svg', transparent: false })
    expect(pie).toContain('Work')
    expect(pie).toContain('<path')
    expect(git).toContain('feature')
    expect(git).toContain('merge feature')
  })

  test('resolves a built-in theme', () => {
    expect(resolveTheme('github-dark')).toBeDefined()
  })
})
