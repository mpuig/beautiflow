import { describe, expect, test } from 'bun:test'
import { JSDOM } from 'jsdom'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { renderStandaloneOutput } from '../src/diagram/pipeline.ts'
import { architecturePortPoint, auditArchitectureGeometry, type ArchitectureRouteGeometry, type ArchitectureServiceGeometry } from '../src/diagram/architecture-geometry.ts'

const request = { inputPath: 'architecture.mmd', format: 'svg' as const, transparent: false }

describe('Pele architecture runtime', () => {
  test('renders ports, junctions, labelled edges, groups, alignment and icons without a DOM', async () => {
    const source = `architecture-beta
    group platform(cloud)[Platform]
    service api(logos:aws-eks)[API] in platform
    service db(database)[Database] in platform
    junction join in platform
    api:R -[HTTPS]-> L:db
    api:B -- T:join
    align row api db
    `
    const svg = await renderStandaloneOutput(source, request) as string
    expect(svg).toContain('pele-architecture')
    expect(svg).toContain('HTTPS')
    expect(svg).toContain('data-id="join"')
    expect(svg).toContain('viewBox="0 0 256 256"')
    expect(svg).not.toContain('var(')
    expect(await renderStandaloneOutput(source, request)).toBe(svg)
    expect(await renderStandaloneOutput(source, { ...request, inputPath: '/tmp/architecture.mmd' })).toBe(svg)
  })

  test('resolves AWS aliases and Lucide fallbacks and scopes gradient IDs', async () => {
    const source = `architecture-beta
    service api(aws:api-gateway)[API]
    service other(logos:aws-api-gateway)[Other]
    service vpn(aws:vpn)[VPN]
    service copy(aws:api-gateway)[Copy]
    api:R --> L:other
    other:B --> T:vpn`
    const svg = await renderStandaloneOutput(source, request) as string
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
    try {
      const ids = [...dom.window.document.querySelectorAll('[id]')].map((el) => el.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const icon of dom.window.document.querySelectorAll('.pele-icon')) expect(icon.children.length).toBeGreaterThan(0)
      for (const match of svg.matchAll(/url\(#([^)]*)\)/g)) expect(ids).toContain(match[1]!)
    } finally { dom.window.close() }
  })

  test('keeps theme colors, transparency, accessible metadata and PNG output', async () => {
    const source = 'architecture-beta\naccTitle: API platform\naccDescr: A single API service.\nservice api(server)[API]'
    const svg = await renderStandaloneOutput(source, { ...request, themeName: 'dracula' }) as string
    const transparent = await renderStandaloneOutput(source, { ...request, themeName: 'dracula', transparent: true }) as string
    expect(svg).toContain('>API platform</title>')
    expect(svg).toContain('>A single API service.</desc>')
    expect(svg).toContain('#282a36')
    expect(svg).toContain('#f8f8f2')
    expect(svg).toContain('<rect width="100%" height="100%"')
    expect(transparent).not.toContain('<rect width="100%" height="100%"')
    const png = await renderStandaloneOutput(source, { ...request, format: 'png' }) as Uint8Array
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  test('rejects invalid diagrams and oversized input', async () => {
    await expect(renderStandaloneOutput('architecture-beta\nservice api(server)[API]\napi:R --> L:missing', request)).rejects.toThrow('Unable to render architecture diagram')
    await expect(renderStandaloneOutput('architecture-beta\n' + ' '.repeat(50_000), request)).rejects.toThrow('limit')
  })

  test('reports unavailable geometry rather than an unmeasured perfect score', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'architecture-audit-'))
    try {
      const path = join(directory, 'native.mmd')
      await Bun.write(path, 'architecture-beta\nservice api(server)[API]\n')
      const result = Bun.spawnSync([process.execPath, 'src/cli.ts', 'audit', path, '--json'])
      expect(result.exitCode).toBe(0)
      const report = JSON.parse(result.stdout.toString())
      expect(report.coverage).toBe('pele-renderer-only')
      expect(report.score).toBeNull()
      expect(report.metrics).toBeNull()
      expect(report.limitations.length).toBeGreaterThan(0)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  test('retains independent geometry defect checks for future positioned adapters', () => {
    const services: ArchitectureServiceGeometry[] = [
      { id: 'source', icon: { x: 0, y: 0, width: 52, height: 52 } },
      { id: 'target', icon: { x: 200, y: 0, width: 52, height: 52 }, label: { x: 90, y: 16, width: 40, height: 20 } },
      { id: 'blocker', icon: { x: 140, y: 16, width: 20, height: 20 } },
    ]
    const points = [architecturePortPoint(services[0]!.icon, 'R'), architecturePortPoint(services[1]!.icon, 'L')]
    const route: ArchitectureRouteGeometry = { source: 'source', target: 'target', sourcePort: 'R', targetPort: 'L', points }
    expect(auditArchitectureGeometry(services, [route]).labelCollisions).toBe(1)
    expect(auditArchitectureGeometry(services, [route]).edgeNodeIntersections).toBe(1)
    route.points = [{ x: 80, y: 40 }, { x: 20, y: 40 }, ...points.slice(1)]
    expect(auditArchitectureGeometry(services, [route]).detachedEndpoints).toBe(1)
  })
})
