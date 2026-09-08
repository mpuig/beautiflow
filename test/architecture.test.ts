import { describe, expect, test } from 'bun:test'
import { JSDOM } from 'jsdom'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { renderStandaloneOutput } from '../src/diagram/pipeline.ts'
import { stabilizeComplexArchitectureSvg } from '../src/diagram/architecture-layout.ts'
import { architecturePortPoint, auditArchitectureGeometry, type ArchitectureRouteGeometry, type ArchitectureServiceGeometry } from '../src/diagram/architecture-geometry.ts'

function fixture(rootId: string, icon: string, iconSize: number): string {
  const services = Array.from({ length: 14 }, (_, index) => `service service${index}(${icon})[Service ${index}] in workload`)
  const edges = Array.from({ length: 13 }, (_, index) => `service${index}:R --> L:service${index + 1}`)
  return `---
config:
  architecture:
    iconSize: ${iconSize}
    seed: 7
    numIter: 100
---
architecture-beta
group ${rootId}(cloud)[Platform]
group workload(cloud)[Workloads] in ${rootId}
service visitor(lucide:users)[Visitor]
${services.join('\n')}
visitor:B --> T:service0
${edges.join('\n')}
service13:B --> B:service0
service9:T --> R:service4
`
}

function geometry(svg: string) {
  const dom = new JSDOM(svg)
  const root = dom.window.document.querySelector('svg')!
  const services: ArchitectureServiceGeometry[] = [...root.querySelectorAll('[data-icon-bounds]')].map((element) => ({
    id: element.id.split('-service-')[1]!,
    icon: JSON.parse(element.getAttribute('data-icon-bounds')!),
    label: JSON.parse(element.getAttribute('data-label-bounds')!),
  }))
  const routes: ArchitectureRouteGeometry[] = [...root.querySelectorAll('[data-points]')].map((element) => ({
    source: element.getAttribute('data-source')!, target: element.getAttribute('data-target')!,
    sourcePort: element.getAttribute('data-source-port') as ArchitectureRouteGeometry['sourcePort'],
    targetPort: element.getAttribute('data-target-port') as ArchitectureRouteGeometry['targetPort'],
    points: JSON.parse(element.getAttribute('data-points')!),
  }))
  dom.window.close()
  return { services, routes }
}

describe('provider-neutral architecture geometry', () => {
  test('uses icon bounds and preserves explicit ports across providers and sizes', async () => {
    const cases = [
      ['account', 'logos:aws-eks', 32],
      ['project', 'logos:google-cloud', 52],
      ['subscription', 'logos:microsoft-azure', 80],
      ['platform', 'server', 112],
    ] as const
    for (const [rootId, icon, iconSize] of cases) {
      const source = fixture(rootId, icon, iconSize)
      const svg = await renderStandaloneOutput(source, { inputPath: 'architecture.mmd', format: 'svg', transparent: false }) as string
      expect(svg).toContain('data-beautiflow-layout="compound-elk-fallback"')
      const { services, routes } = geometry(svg)
      expect(services).toHaveLength(15)
      expect(routes).toHaveLength(16)
      for (const service of services) {
        expect(service.icon.width).toBe(iconSize)
        expect(service.icon.height).toBe(iconSize)
      }
      const report = auditArchitectureGeometry(services, routes)
      expect(report.detachedEndpoints).toBe(0)
      expect(report.portViolations).toBe(0)
      expect(report.nodeOverlaps).toBe(0)
      expect(report.labelCollisions).toBe(0)
      expect(report.edgeNodeIntersections).toBe(0)
      expect(routes[0]!.sourcePort).toBe('B')
      expect(routes[0]!.targetPort).toBe('T')
      expect(svg).not.toContain('data-flow-role="primary"')
      expect(svg).not.toContain('stroke-dasharray: 6 5')
    }
  }, 30_000)

  test('renaming cloud boundaries does not change geometry', async () => {
    const request = { inputPath: 'architecture.mmd', format: 'svg' as const, transparent: false }
    const original = geometry(await renderStandaloneOutput(fixture('account', 'server', 52), request) as string)
    const renamed = geometry(await renderStandaloneOutput(fixture('any_boundary', 'server', 52), request) as string)
    expect(renamed).toEqual(original)
    const reference = await Bun.file('examples/recipes/aws-architecture/sources/step-6-production-architecture.mmd').text()
    const referenceGeometry = geometry(await renderStandaloneOutput(reference, request) as string)
    const renamedReference = reference.replace(/\baccount\b/g, 'tenant_boundary')
    expect(geometry(await renderStandaloneOutput(renamedReference, request) as string)).toEqual(referenceGeometry)
  }, 20_000)

  test('never drops unsupported architecture constructs during fallback', () => {
    const svg = '<svg>native renderer output</svg>'
    for (const extra of ['service0:R -[HTTPS]- L:service1', 'junction join in workload', 'service0{group}:R --> L:service1', 'align row service0 service1']) {
      expect(stabilizeComplexArchitectureSvg(svg, fixture('platform', 'server', 52) + extra)).toBe(svg)
    }
  })

  test('reports native-only coverage instead of an unmeasured perfect score', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'architecture-audit-'))
    try {
      const path = join(directory, 'native.mmd')
      await Bun.write(path, 'architecture-beta\nservice api(server)[API]\n')
      const result = Bun.spawnSync([process.execPath, 'src/cli.ts', 'audit', path, '--json'])
      expect(result.exitCode).toBe(0)
      const report = JSON.parse(result.stdout.toString())
      expect(report.coverage).toBe('native-renderer-only')
      expect(report.score).toBeNull()
      expect(report.limitations.length).toBeGreaterThan(0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('reports detached endpoints, reversed ports, label intersections, and icon collisions', () => {
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
    const broken = auditArchitectureGeometry(services, [route])
    expect(broken.detachedEndpoints).toBe(1)
    expect(broken.portViolations).toBeGreaterThan(0)
  })
})
