import { describe, expect, test } from 'bun:test'
import { renderSource, resolveTheme } from '../src/render.ts'
import { diagramFamily, renderStandaloneOutput } from '../src/diagram/pipeline.ts'
import { JSDOM } from 'jsdom'
import { hasFragmentedArchitectureLabel } from '../src/diagram/architecture-layout.ts'

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
    expect(result.content).toContain('role="img"')
    expect(result.content).toMatch(/aria-labelledby="beautiflow-diagram-[a-f0-9]+-title beautiflow-diagram-[a-f0-9]+-desc"/)
    expect(result.content).toMatch(/<svg[^>]*>\n<title/)
    expect(result.content).toContain('>diagram</title>')
    const absolute = renderSource(source, { inputPath: '/tmp/diagram.mmd', format: 'svg', transparent: false })
    expect(absolute.content.match(/aria-labelledby="([^"]+)"/)?.[1]).toBe(result.content.match(/aria-labelledby="([^"]+)"/)?.[1])
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

  test('uses authored accessible metadata for specialized families', async () => {
    const source = `sequenceDiagram\n  accTitle: Support handoff\n  accDescr: Customer and support exchange a greeting.\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi\n`
    expect(diagramFamily(source)).toBe('sequence')
    const svg = await renderStandaloneOutput(source, { inputPath: 'sequence.mmd', format: 'svg', transparent: false })
    const png = await renderStandaloneOutput(source, { inputPath: 'sequence.mmd', format: 'png', transparent: false })
    expect(svg).toContain('class="actor"')
    expect(svg).toContain('>Support handoff</title>')
    expect(svg).toContain('>Customer and support exchange a greeting.</desc>')
    expect(png).toBeInstanceOf(Uint8Array)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  }, 15_000)

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
  }, 15_000)

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

  test('keeps sequence message text at foreground contrast without changing connector colors', async () => {
    const svg = await renderStandaloneOutput('sequenceDiagram\n  Customer->>Support: Report failure\n  Support-->>Customer: Confirm recovery', {
      inputPath: 'support.mmd', format: 'svg', transparent: false, themeName: 'dracula',
    }) as string
    const dom = new JSDOM(svg)
    try {
      const labels = [...dom.window.document.querySelectorAll('text')].filter((element) => /Report failure|Confirm recovery/.test(element.textContent ?? ''))
      expect(labels).toHaveLength(2)
      for (const label of labels) expect(label.getAttribute('fill')).toBe('#f8f8f2')
      expect(svg).toContain('#6272a4')
      expect(svg).toContain('#282a36')
    } finally {
      dom.window.close()
    }
  })

  test('detects split words but allows natural two-line architecture labels', () => {
    const dom = new JSDOM('<svg><g id="label"><text><tspan class="text-outer-tspan">CloudFron</tspan><tspan class="text-outer-tspan">t</tspan></text></g></svg>')
    try {
      const service = dom.window.document.querySelector('#label')!
      expect(hasFragmentedArchitectureLabel(service, 'CloudFront')).toBe(true)
      service.querySelectorAll('tspan')[0]!.textContent = 'Public'
      service.querySelectorAll('tspan')[1]!.textContent = 'users'
      expect(hasFragmentedArchitectureLabel(service, 'Public users')).toBe(false)
    } finally {
      dom.window.close()
    }
  })

  test('fits short architecture service names within the compound fallback label width', async () => {
    const source = await Bun.file('examples/recipes/aws-architecture/sources/step-6-production-architecture.mmd').text()
    const svg = await renderStandaloneOutput(source, { inputPath: 'aws.mmd', format: 'svg', transparent: false, themeName: 'github-light' }) as string
    const dom = new JSDOM(svg)
    try {
      for (const [id, label] of [['cloudfront', 'CloudFront'], ['cloudwatch', 'CloudWatch'], ['controller', 'Controller']] as const) {
        const service = dom.window.document.querySelector(`[id$="-service-${id}"]`)!
        expect([...service.querySelectorAll('.text-outer-tspan')].map((row) => row.textContent)).toEqual([label])
      }
      expect(svg).toContain('data-beautiflow-layout="compound-elk-fallback"')
      expect(svg).toContain('data-beautiflow-wrapped-labels="0"')
    } finally {
      dom.window.close()
    }
  }, 20_000)
})
