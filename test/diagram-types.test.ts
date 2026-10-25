import { describe, expect, test } from 'bun:test'
import { readdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { diagramFamily, renderStandaloneOutput } from '../src/diagram/pipeline.ts'
import { agentInspection } from '../src/agent.ts'
import { svgIntegrity } from '../src/diagram/integrity.ts'
import { parsePele, renderPeleDetailed } from '../src/diagram/pele.ts'

const root = 'examples/recipes/diagram-types'
const files = (await readdir(`${root}/sources`)).filter((name) => name.endsWith('.mmd')).sort()
describe('additional diagram types', () => {
  test('covers every newly exposed family with documented reproduction commands', async () => {
    expect(files).toHaveLength(23)
    const guide = await Bun.file(`${root}/README.md`).text()
    for (const file of files) expect(guide).toContain(`beautiflow render ${root}/sources/${file} --format svg --theme github-light --output ${root}/rendered/${file.replace('.mmd', '.svg')}`)
  })
  test('keeps illustrative energy, budget, and telemetry data internally consistent', async () => {
    const energy = parsePele(await Bun.file(`${root}/sources/sankey.mmd`).text())
    if (energy.type !== 'sankey') throw new Error('Expected Sankey model')
    const inputs = new Map<string, number>(), outputs = new Map<string, number>()
    for (const link of energy.links) {
      inputs.set(link.target.id, (inputs.get(link.target.id) ?? 0) + link.value)
      outputs.set(link.source.id, (outputs.get(link.source.id) ?? 0) + link.value)
    }
    for (const [node, value] of inputs) if (outputs.has(node)) expect(outputs.get(node)).toBe(value)
    const supplied = [...outputs].filter(([node]) => !inputs.has(node)).reduce((sum, [, value]) => sum + value, 0)
    const used = [...inputs].filter(([node]) => !outputs.has(node)).reduce((sum, [, value]) => sum + value, 0)
    expect(supplied).toBe(48)
    expect(used).toBe(supplied)
    const budget = await Bun.file(`${root}/sources/treemap.mmd`).text()
    expect([...budget.matchAll(/:\s*(\d+)\s*$/gm)].reduce((sum, match) => sum + Number(match[1]), 0)).toBe(100)
    const packet = await Bun.file(`${root}/sources/packet.mmd`).text()
    let nextBit = 0
    for (const [, start, end] of packet.matchAll(/^\s*(\d+)-(\d+):/gm)) {
      expect(Number(start)).toBe(nextBit)
      expect(Number(end)).toBeGreaterThanOrEqual(Number(start))
      nextBit = Number(end) + 1
    }
    expect(nextBit).toBe(192)
  })
  test('excludes the renderer info utility from diagram support', async () => {
    for (const source of ['info', '%% comment\ninfo', '---\ntitle: Utility\n---\ninfo']) {
      expect(diagramFamily(source)).toBe('unknown')
      expect(() => parsePele(source)).toThrow('info is not a supported diagram type')
      expect(() => renderPeleDetailed(source, { bg: '#fff', fg: '#111' }, false)).toThrow('info is not a supported diagram type')
      await expect(renderStandaloneOutput(source, { inputPath: 'info.mmd', format: 'svg', transparent: false })).rejects.toThrow('Unsupported Mermaid diagram family')
    }
  })
  for (const file of files) test(file, async () => {
    const inputPath = `${root}/sources/${file}`
    const source = await Bun.file(inputPath).text()
    const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] ?? ''
    const commentedSource = frontmatter + '%% leading comment\n' + source.slice(frontmatter.length)
    expect(String(diagramFamily(source))).toBe(file.replace('.mmd', ''))
    expect(String(diagramFamily(commentedSource))).toBe(file.replace('.mmd', ''))
    const request = { inputPath, format: 'svg' as const, themeName: 'github-light', transparent: false }
    const svg = await renderStandaloneOutput(source, request) as string
    expect(svg).toBe(await Bun.file(`${root}/rendered/${file.replace('.mmd', '.svg')}`).text())
    expect(await renderStandaloneOutput(source, request)).toBe(svg)
    expect(svg).toContain('role="img"')
    expect(svg).not.toContain('var(')
    expect(svgIntegrity(svg).issues).toEqual([])
    const png = await renderStandaloneOutput(source, { ...request, format: 'png' }) as Uint8Array
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    const contract = await agentInspection(inputPath)
    expect(contract.capabilities.transform!.supported).toBe(false)
    expect(contract.capabilities.polish!.supported).toBe(false)
    expect(contract.capabilities.audit!.reason).toContain('SVG reference integrity only')
    await expect(renderStandaloneOutput(source, { ...request, format: 'ascii' })).rejects.toThrow('terminal rendering is not supported')
  })
  test('preserves structured Pele syntax errors in the CLI JSON envelope', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pele-errors-'))
    try {
      const path = join(dir, 'bad.mmd')
      await Bun.write(path, 'radar-beta\naxis broken[\n')
      const result = Bun.spawnSync([process.execPath, 'src/cli.ts', 'inspect', path, '--json'])
      expect(result.exitCode).toBe(2)
      const report = JSON.parse(result.stdout.toString())
      expect(report.error.code).toBe('MERMAID_ERROR')
      expect(report.error.kind).toBe('syntax')
      expect(report.error.family).toBe('radar')
      expect(report.error.location.line).toBeGreaterThan(0)
      expect(report.changed).toBe(false)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
})
