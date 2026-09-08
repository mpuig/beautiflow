import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { diagramFamily, renderProjectOutput, renderStandaloneOutput } from '../src/diagram/pipeline.ts'
import { loadProject } from '../src/diagram/project.ts'
import { expectArchitectureSnapshot } from './helpers/architecture-snapshot.ts'

describe('example Mermaid compatibility suite', () => {
  test('keeps focused architecture views reproducible and separately scoped', async () => {
    const root = 'examples/recipes/architecture-views'
    const guide = await Bun.file(`${root}/README.md`).text()
    for (const name of ['request', 'network', 'operations']) {
      const inputPath = `${root}/${name}.mmd`
      const project = await loadProject(inputPath)
      const svg = await renderProjectOutput(project, { inputPath, format: 'svg', themeName: 'github-light', transparent: false })
      expect(svg).toBe(await Bun.file(`${root}/rendered/${name}.svg`).text())
      expect(guide).toContain(`beautiflow render ${inputPath} --format svg --theme github-light --output ${root}/rendered/${name}.svg`)
    }
    expect(guide).toContain('not automatic projections')
  })

  test('keeps subscription emphasis reproducible without changing topology', async () => {
    const inputPath = 'examples/sources/01-subscription-intake.mmd'
    const project = await loadProject(inputPath)
    expect(project.sidecar.primaryFlow).toEqual(['signup', 'profile', 'plan', 'payment', 'accepted', 'provision', 'invite', 'active'])
    expect(project.sidecar.nodes.retry?.role).toBe('exception')
    expect(project.graph.nodes.size).toBe(10)
    expect(project.graph.edges).toHaveLength(10)
    const svg = await renderProjectOutput(project, { inputPath, format: 'svg', transparent: false, themeName: 'github-light' })
    expect(svg).toBe(await Bun.file('examples/rendered/01-subscription-intake.svg').text())
  })

  test('keeps the visual-quality lab fixtures reproducible and collision-free', async () => {
    const root = 'examples/recipes/visual-quality'
    const guide = await Bun.file(`${root}/README.md`).text()
    for (const name of ['release', 'job', 'approval', 'cache', 'architecture']) {
      const inputPath = `${root}/${name}.mmd`
      const source = await Bun.file(inputPath).text()
      const graph = name === 'release' || name === 'job' || name === 'approval'
      const stem = graph ? `${name}-after` : name
      const request = { inputPath, format: 'svg' as const, transparent: false, themeName: 'github-light' }
      const project = graph ? await loadProject(inputPath) : undefined
      const output = project ? await renderProjectOutput(project, request) : await renderStandaloneOutput(source, request)
      const committed = await Bun.file(`${root}/rendered/${stem}.svg`).text()
      if (name === 'architecture') {
        expectArchitectureSnapshot(String(output), committed)
        expect(await renderStandaloneOutput(source, request)).toBe(output)
      } else {
        expect(output).toBe(committed)
      }
      expect(guide).toContain(`beautiflow render ${inputPath} --format svg --theme github-light --output ${root}/rendered/${stem}.svg`)
      expect(Bun.file(`${root}/rendered/${stem}.png`).size).toBeGreaterThan(100)
      if (project) {
        const { auditDiagram } = await import('../src/diagram/audit.ts')
        const { layoutProject } = await import('../src/diagram/layout.ts')
        const audit = auditDiagram(await layoutProject(project, { direction: project.sidecar.direction, applyOverrides: true }))
        expect(audit.issues).toEqual([])
        project.sidecar.nodes = {}
        project.sidecar.primaryFlow = undefined
        project.sidecar.direction = name === 'release' ? 'LR' : 'TD'
        expect(await renderProjectOutput(project, request)).toBe(await Bun.file(`${root}/rendered/${name}-before.svg`).text())
      }
    }
  }, 20_000)

  test('renders every bundled example and keeps its guide reproducible', async () => {
    const sourceRoot = 'examples/sources'
    const renderedRoot = 'examples/rendered'
    const files = (await readdir(sourceRoot))
      .filter((name) => name.endsWith('.mmd'))
      .map((name) => join(sourceRoot, name))
      .sort()
    const renderedFiles = (await readdir(renderedRoot))
      .filter((name) => name.endsWith('.svg') || name.endsWith('.png'))
      .sort()

    expect(files).toHaveLength(19)
    expect(renderedFiles).toHaveLength(19)

    for (const inputPath of files) {
      const source = await Bun.file(inputPath).text()
      const stem = basename(inputPath, '.mmd')
      const guidePath = `examples/${stem}.md`
      const guide = await Bun.file(guidePath).text()
      const imageMatch = guide.match(new RegExp(`\\(rendered/${stem}\\.(svg|png)\\)`))

      expect(guide).toContain(`\`\`\`mermaid\n${source.trim()}\n\`\`\``)
      expect(imageMatch).not.toBeNull()

      const format = imageMatch![1] as 'svg' | 'png'
      const outputPath = `${renderedRoot}/${stem}.${format}`
      const command = guide.split('\n').find((line) =>
        line.startsWith(`beautiflow render ${inputPath} --format ${format} --theme `),
      )
      expect(command).toBeDefined()
      expect(command).toEndWith(`--output ${outputPath}`)
      expect(await Bun.file(outputPath).exists()).toBe(true)
      expect(Bun.file(outputPath).size).toBeGreaterThan(100)

      const family = diagramFamily(source)
      expect(family).not.toBe('unknown')
      const request = { inputPath, format: 'svg' as const, transparent: false }
      const output = family === 'graph'
        ? await renderProjectOutput(await loadProject(inputPath), request)
        : await renderStandaloneOutput(source, request)
      expect(typeof output).toBe('string')
      expect(output).toContain('<svg')
      expect(output).toContain('</svg>')
    }
  })

  test('keeps the AWS architecture walkthrough complete and reproducible', async () => {
    const root = 'examples/recipes/aws-architecture'
    const guide = await Bun.file(`${root}/README.md`).text()
    const sources = (await readdir(`${root}/sources`)).filter((name) => name.endsWith('.mmd')).sort()
    const renders = (await readdir(`${root}/rendered`)).filter((name) => name.endsWith('.svg')).sort()

    expect(sources).toHaveLength(6)
    expect(renders).toHaveLength(6)
    for (const filename of sources) {
      const stem = basename(filename, '.mmd')
      const inputPath = `${root}/sources/${filename}`
      const outputPath = `${root}/rendered/${stem}.svg`
      const source = await Bun.file(inputPath).text()
      expect(diagramFamily(source)).toBe('architecture')
      expect(guide).toContain(`beautiflow render ${inputPath} --format svg --theme github-light --output ${outputPath}`)
      expect(guide).toContain(`](rendered/${stem}.svg)`)
      expect(await Bun.file(outputPath).exists()).toBe(true)
      expect(Bun.file(outputPath).size).toBeGreaterThan(1_000)

      const svg = await Bun.file(outputPath).text()
      expect(svg).toContain('aria-roledescription="architecture"')
      expect(svg).toContain('class="architecture-edges"')
      if (stem === 'step-6-production-architecture') {
        expect(svg).toContain('data-beautiflow-layout="compound-elk-fallback"')
        expect(Number(svg.match(/data-beautiflow-quality-score="([\d.]+)"/)?.[1])).toBeGreaterThanOrEqual(85)
        expect(svg).toContain('data-beautiflow-wrapped-labels="0"')
        expect(svg).toContain('data-flow-role="relationship"')
        for (const metric of ['detached-endpoints', 'port-violations', 'node-overlaps', 'label-collisions', 'edge-node-intersections', 'header-crossings']) {
          expect(svg).toContain(`data-beautiflow-${metric}="0"`)
        }
      }
      const viewBox = svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/)
      expect(Number(viewBox?.[1])).toBeGreaterThan(Number(viewBox?.[2]))
    }
  })

  test('keeps the render-options recipe complete and reproducible', async () => {
    const root = 'examples/recipes/render-options'
    const sourcePath = `${root}/diagram.mmd`
    const guide = await Bun.file(`${root}/README.md`).text()
    const variants = [
      ['svg', 'github-light', false, 'layout-left-to-right.svg'],
      ['svg', 'github-light', false, 'layout-top-to-bottom.svg'],
      ['svg', 'github-light', false, 'github-light.svg'],
      ['svg', 'dracula', false, 'dracula.svg'],
      ['png', 'github-dark', false, 'github-dark.png'],
      ['png', 'nord-light', true, 'nord-light-transparent.png'],
      ['unicode', null, false, 'diagram-unicode.txt'],
      ['ascii', null, false, 'diagram-ascii.txt'],
    ] as const

    for (const [format, theme, transparent, filename] of variants) {
      const outputPath = `${root}/rendered/${filename}`
      let command = `beautiflow render ${sourcePath} --format ${format}`
      if (theme) command += ` --theme ${theme}`
      if (transparent) command += ' --transparent'
      command += ` --output ${outputPath}`

      expect(guide).toContain(command)
      expect(await Bun.file(outputPath).exists()).toBe(true)
      expect(Bun.file(outputPath).size).toBeGreaterThan(100)
    }

    expect(guide).toContain(`beautiflow apply ${sourcePath} --actions ${root}/layout-left-to-right.json --json`)
    expect(guide).toContain(`beautiflow apply ${sourcePath} --actions ${root}/layout-top-to-bottom.json --json`)

    const horizontal = await Bun.file(`${root}/rendered/layout-left-to-right.svg`).text()
    const vertical = await Bun.file(`${root}/rendered/layout-top-to-bottom.svg`).text()
    const horizontalBox = horizontal.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
    const verticalBox = vertical.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
    expect(Number(horizontalBox?.[1])).toBeGreaterThan(Number(horizontalBox?.[2]))
    expect(Number(verticalBox?.[2])).toBeGreaterThan(Number(verticalBox?.[1]))
  })
})
