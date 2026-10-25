import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { architectureModel } from '../src/diagram/pele.ts'
import { architectureIntegrity, auditArchitecture } from '../src/diagram/architecture-analysis.ts'
import { renderStandaloneOutput } from '../src/diagram/pipeline.ts'

const recipe = resolve(import.meta.dir, '../examples/recipes/aws-reference-architectures')
const references = (await Bun.file(resolve(recipe, 'references.json')).json()).references as { id: string; url: string; imageUrl: string; pageSha256: string; imageSha256: string; adaptations: string[] }[]
const source = (id: string) => readFile(resolve(recipe, `sources/${id}.mmd`), 'utf8')
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const load = async (id: string) => architectureModel(await source(id))

test('four source-backed AWS reconstructions keep compiled fixtures and audit evidence synchronized', async () => {
  expect(references).toHaveLength(4)
  const counts = [13, 62, 22, 20]
  for (const [index, entry] of references.entries()) {
    const input = await source(entry.id)
    const evidence = await Bun.file(resolve(recipe, `evidence/${entry.id}.json`)).json()
    const svg = await readFile(resolve(recipe, `rendered/${entry.id}.svg`), 'utf8')
    const png = await readFile(resolve(recipe, `rendered/${entry.id}.png`))
    expect(entry.url).toStartWith('https://docs.aws.amazon.com/reference-architecture-diagrams/')
    expect(entry.imageUrl).toStartWith('https://docs.aws.amazon.com/images/reference-architecture-diagrams/')
    expect(entry.pageSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(entry.imageSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(entry.adaptations.length).toBeGreaterThan(0)
    expect(input).toContain(entry.url)
    expect(architectureModel(input).nodes.size).toBe(counts[index]!)
    expect(architectureIntegrity(input, svg).issues).toEqual([])
    expect(evidence.sourceSha256).toBe(hash(input))
    expect(evidence.svgSha256).toBe(hash(svg))
    expect(evidence.pngSha256).toBe(hash(png))
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(evidence.executable.version).toBe('beautiflow 1.0.1')
    expect(evidence.executable.sha256).toMatch(/^[a-f0-9]{64}$/)
    const audit = auditArchitecture(input)
    expect(evidence.audit.metrics).toEqual(audit.metrics)
    expect(evidence.audit.score).toBe(audit.score)
    expect(evidence.audit.integrity.issues).toEqual([])
    expect(evidence.geometryAcceptedAsClean).toBe(false)
    expect(evidence.visualReview.attestedByGenerator).toBe(false)
    expect(audit.metrics.detachedEndpoints).toBe(0)
    expect(audit.metrics.portViolations).toBe(0)
    expect(audit.metrics.nodeOverlaps).toBe(0)
    expect(audit.metrics.edgeNodeIntersections).toBe(0)
    const reproduced = await renderStandaloneOutput(input, { inputPath: resolve(recipe, `sources/${entry.id}.mmd`), format: 'svg', themeName: 'github-light', transparent: false })
    expect(typeof reproduced).toBe('string')
    expect(svg).toBe(reproduced as string)
  }
})

test('industrial reference retains independent time-series and asset-model paths', async () => {
  const m = await load('industrial-machine-connectivity-eot')
  const edges = m.edges.map((e) => `${e.lhsId}->${e.rhsId}`)
  for (const edge of ['twin->sitewise', 'twin->incoming', 'incoming->convert', 'convert->definitions', 'definitions->create', 'create->sitewise', 'sitewise->core', 'core->firehose', 'firehose->lake']) expect(edges).toContain(edge)
  expect(m.edges.find((e) => e.lhsId === 'definitions')?.title).toBe('DynamoDB Streams')
  expect(m.nodes.get('twin')?.in).toBe('edge')
  expect(m.groups.get('edge')?.in).toBe('industrial')
  expect(m.groups.get('amc')?.in).toBe('aws')
})

test('data platform retains all eleven account inventories without inventing deployment or Lambda order', async () => {
  const m = await load('account-security-data-platform')
  const accounts = [...m.groups.values()].filter((g) => /^\d+ - /.test(g.title ?? ''))
  expect(accounts).toHaveLength(11)
  expect(new Set(accounts.map((g) => g.title?.match(/^\d+/)?.[0])).size).toBe(11)
  for (const node of ['controlTower', 'organizations', 'iam']) expect(m.nodes.get(node)?.in).toBe('management')
  for (const node of ['hub', 'guard', 'trail', 'macie', 'kms']) expect(m.nodes.get(node)?.in).toBe('security')
  for (const node of ['transfer', 'streams', 'firehose']) expect(m.nodes.get(node)?.in).toBe('ingestion')
  for (const node of ['raw', 'modelBucket', 'reports']) expect(m.nodes.get(node)?.in).toBe('sandbox')
  const processing = m.nodes.get('checking')
  expect(processing && 'title' in processing ? processing.title : null).toBe('SageMaker Processing')
  expect(m.nodes.get('logs')?.in).toBe('audit')
  expect(m.nodes.get('lambda1')?.in).toBe('processing')
  expect(m.nodes.get('lambda2')?.in).toBe('processing')
  expect(m.edges.some((e) => e.lhsId === 'lambda1' && e.rhsId === 'lambda2')).toBe(false)
  expect(m.edges.some((e) => e.lhsId === 'monitoring' && e.rhsId === 'logs')).toBe(false)
  expect(m.edges.some((e) => e.lhsId === 'batch' && e.rhsId === 'parquet')).toBe(false)
  expect(m.edges.some((e) => ['deploy', 'build', 'commit', 'pipeline'].includes(e.lhsId))).toBe(false)
})

test('Magento retains both AZ fleets, shared managed services, writer/read paths and both EFS tiers', async () => {
  const m = await load('magento-ecommerce-on-aws')
  const edges = m.edges.map((e) => `${e.lhsId}->${e.rhsId}`)
  for (const zone of [1, 2]) {
    for (const node of ['varnish', 'magento', 'mount']) expect(m.nodes.get(`${node}${zone}`)?.in).toBe(`private${zone}`)
    expect(m.nodes.get(`nat${zone}`)?.in).toBe(`public${zone}`)
    expect(m.groups.get(`private${zone}`)?.in).toBe(`az${zone}`)
    for (const edge of [`externalAlb->varnish${zone}`, `varnish${zone}->internalAlb`, `internalAlb->magento${zone}`, `magento${zone}->writer`, `magento${zone}->reader`, `varnish${zone}->mount${zone}`, `magento${zone}->mount${zone}`, `mount${zone}->efs`]) expect(edges).toContain(edge)
  }
  expect(m.nodes.get('writer')?.in).toBe('auroraCluster')
  expect(m.nodes.get('reader')?.in).toBe('auroraCluster')
  expect(m.nodes.get('efs')?.in).toBe('aws')
  expect([...m.nodes.values()].filter((n) => n.id === 'efs')).toHaveLength(1)
  expect(m.edges.find((e) => e.lhsId === 'writer')?.title).toBe('Replica relationship')
  expect(m.edges.find((e) => e.lhsId === 'redis1')?.title).toBe('Async replication')
})

test('Outposts keeps physical sites outside the Region and local gateways distinct from service links', async () => {
  const m = await load('advanced-distribution-management-system')
  const edges = m.edges.map((e) => `${e.lhsId}->${e.rhsId}`)
  expect(m.groups.get('dc1')?.in).toBeUndefined()
  expect(m.groups.get('dc2')?.in).toBeUndefined()
  for (const site of [1, 2]) {
    expect(m.groups.get(`rack${site}`)?.in).toBe(`dc${site}`)
    expect(m.groups.get(`az${site}`)?.in).toBe('region')
    expect(m.nodes.get(`lgw${site}`)?.in).toBe(`rack${site}`)
    expect(m.nodes.get(`link${site}`)?.in).toBe(`rack${site}`)
    expect(m.nodes.get(`derms${site}`)?.in).toBe(`regional${site}`)
    expect(edges).toContain(`field->lgw${site}`)
    expect(edges).toContain(`compute${site}->link${site}`)
    expect(edges).toContain(`link${site}->derms${site}`)
    expect(edges).not.toContain(`lgw${site}->wan`)
  }
  expect(m.edges.some((e) => e.lhsId === 'db1' || e.lhsId === 'db2')).toBe(false)
  for (const node of ['s3', 'athena', 'quick', 'sagemaker']) expect(m.nodes.get(node)?.in).toBe('analytics')
})

test('guide links real references, reproducible commands, limitations and every generated artifact', async () => {
  const guide = await readFile(resolve(recipe, 'README.md'), 'utf8')
  expect(guide).toContain('None is presented as having a completely clean geometry audit')
  expect(guide).toContain('not edge-for-edge complete')
  expect(guide).toContain('Route 53 is DNS')
  expect(guide).toContain('not four different VPCs')
  expect(guide).toContain('CodeCommit')
  for (const entry of references) {
    expect(guide).toContain(entry.url)
    expect(guide).toContain(entry.imageUrl)
    expect(guide).toContain(`--output examples/recipes/aws-reference-architectures/rendered/${entry.id}.svg`)
    for (const path of [`sources/${entry.id}.mmd`, `rendered/${entry.id}.svg`, `rendered/${entry.id}.png`, `evidence/${entry.id}.json`]) expect(guide).toContain(path)
  }
})
