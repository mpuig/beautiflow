import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { architectureIntegrity, auditArchitecture, inspectArchitecture } from '../src/diagram/architecture-analysis.ts'
import { transformArchitecture } from '../src/diagram/architecture-transform.ts'
import { renderPeleDetailed, architectureModel } from '../src/diagram/pele.ts'
import original from 'pele/diagrams/architecture'
import { planAgentMutation, commitAgentMutation, verifyAgentMutation, finishAgentMutation, rollbackAgentMutation, planAgentCorrection } from '../src/agent-runtime.ts'

const source = 'architecture-beta\n%% api is mentioned here and must stay unchanged\nservice api(server)[API]\nservice db(database)[Database]\napi:R -[SQL]-> L:db\n'

test('the additive geometry extension preserves original Pele SVG bytes', () => {
  const options = { responsive: false, autoDirection: false, idPrefix: 'parity', fontFamily: 'Arial' }
  const upstream = original.render(architectureModel(source) as Parameters<typeof original.render>[0], {}, options)
  // Render the vendored diagram directly to compare raw output before theming.
  const { architecture } = require('../src/vendor/pele-architecture/index.js')
  const extended = architecture.render(architectureModel(source), {}, options)
  expect(extended.svg).toBe(upstream.svg)
  expect(extended.geometry.services).toHaveLength(2)
  expect(extended.geometry.routes).toHaveLength(1)
  expect(extended.geometry.routes[0].sourceAnchor).toEqual(extended.geometry.routes[0].points[0])
})

test('theme materialization preserves literal CSS syntax in semantic labels', () => {
  const source = 'architecture-beta\nservice api(server)[var(--example)]\n'
  const svg = renderPeleDetailed(source, { bg: '#fff', fg: '#111' }, true).svg
  expect(svg).toContain('>var(--example)</text>')
  expect(architectureIntegrity(source, svg).issues).toEqual([])
})

test('architecture structural findings remain informational and preserve the complete model', () => {
  const report = inspectArchitecture('architecture-beta\ngroup platform(cloud)[Platform]\nservice api(server)[Service] in platform\nservice lonely(database)[Service]\n')
  expect(report.score).toBe(100)
  expect(report.metrics.components).toBe(2)
  expect(report.metrics.isolatedServices).toBe(2)
  expect(report.issues.every((issue) => issue.severity === 'info')).toBe(true)
  expect(report.issues.some((issue) => issue.type === 'repeated-label')).toBe(true)
  expect(report.nodes).toHaveLength(2)
})

test('integrity checks detect missing elements, labels, unresolved icons and broken SVG references', () => {
  const svg = renderPeleDetailed(source, { bg: '#fff', fg: '#111' }, true).svg
  expect(architectureIntegrity(source, svg).issues).toEqual([])
  expect(architectureIntegrity(source, svg.replace('data-id="api"', 'data-id="missing"')).issues.some((issue) => issue.type === 'missing-element')).toBe(true)
  expect(architectureIntegrity(source, svg.replace('>Database<', '>Wrong<')).issues.some((issue) => issue.type === 'missing-label')).toBe(true)
  expect(architectureIntegrity(source, svg.replace('</svg>', '<path fill="url(#missing)"/></svg>')).issues.some((issue) => issue.type === 'broken-svg-reference')).toBe(true)
  const unknown = source.replace('(server)', '(unknown:missing)')
  expect(auditArchitecture(unknown).integrity.issues.some((issue) => issue.type === 'unresolved-icon')).toBe(true)
  const entities = auditArchitecture('architecture-beta\nservice api(server)[A #quot;B#quot;]\n').integrity
  expect(entities.labelsChecked).toBe(0)
  expect(entities.issues).toEqual([])
})

test('architecture patches preserve comments, labels, ports and relationship semantics', () => {
  const result = transformArchitecture(source, [{ type: 'architecture-rename', id: 'api', newId: 'gateway', label: 'Gateway' }])
  expect(result.source).toContain('%% api is mentioned here and must stay unchanged')
  expect(result.source).toContain('gateway:R -[SQL]-> L:db')
  expect(result.audit.score).toBe(100)
  const moved = transformArchitecture('architecture-beta\ngroup one(cloud)[One]\ngroup two(cloud)[Two]\nservice api(server)[API] in one\n', [{ type: 'architecture-move', id: 'api', group: 'two' }])
  expect(moved.source).toContain('service api(server)[API] in two')
  const added = transformArchitecture('architecture-beta\nservice api(server)[API]\nservice db(database)[Database]\n', [{ type: 'architecture-add-edge', source: 'api', target: 'db', sourcePort: 'R', targetPort: 'L', label: 'SQL' }])
  expect(added.source).toContain('api:R -[SQL]-> L:db')
  const connected = transformArchitecture(source, [{ type: 'architecture-reconnect-edge', source: 'api', target: 'db', newSource: 'db', newTarget: 'api', sourcePort: 'R', targetPort: 'L' }])
  expect(connected.source).toContain('db:R -[SQL]-> L:api')
  expect(() => transformArchitecture(source, [{ type: 'architecture-rename', id: 'api', newId: 'db' }])).toThrow()
  expect(() => transformArchitecture(source, [{ type: 'architecture-rename', id: 'api', label: 'unsafe]\nservice surprise(server)[Oops' }])).toThrow()
  expect(() => transformArchitecture(source, [{ type: 'architecture-move', id: 'api', group: 'missing' }])).toThrow()
  expect(() => transformArchitecture(source, [{ type: 'rename-node', id: 'api', newId: 'bad' }])).toThrow()
  expect(() => transformArchitecture(source, [{ type: 'architecture-reconnect-edge', source: 'api', target: 'db', newSource: 'api', newTarget: 'missing', sourcePort: 'R', targetPort: 'L' }])).toThrow()
})

test('a saturated architecture score cannot hide increased geometry defect counts', async () => {
  const source = await Bun.file('examples/recipes/aws-architecture/sources/step-6-production-architecture.mmd').text()
  expect(auditArchitecture(source).score).toBe(0)
  expect(() => transformArchitecture(source, [{ type: 'architecture-add-edge', source: 'users', target: 'oncall', sourcePort: 'R', targetPort: 'L' }])).toThrow('regressed')
})

test('architecture rename never edits frontmatter or accessibility prose that resembles statements', () => {
  const source = '---\nconfig:\n  note: |\n    architecture-beta\n    service api(server)[Metadata]\n---\narchitecture-beta\naccDescr {\nservice api(server)[Prose]\n}\nservice api(server)[API]\n'
  const result = transformArchitecture(source, [{ type: 'architecture-rename', id: 'api', newId: 'gateway' }])
  expect(result.source).toContain('service api(server)[Metadata]')
  expect(result.source).toContain('service api(server)[Prose]')
  expect(result.source).toContain('service gateway(server)[API]')
})

test('architecture corrections share the single receipt budget and preserve the original rollback snapshot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'architecture-correction-'))
  try {
    const path = join(dir, 'diagram.mmd'), actions = join(dir, 'actions.json'), receipt = join(dir, 'receipt.json')
    await Bun.write(path, source)
    await Bun.write(actions, JSON.stringify({ actions: [{ type: 'architecture-rename', id: 'api', newId: 'gateway' }] }))
    await planAgentMutation(path, 'transform', actions, receipt)
    await commitAgentMutation(receipt)
    await verifyAgentMutation(receipt)
    const correction = join(dir, 'correction.json')
    await Bun.write(correction, JSON.stringify({ actions: [{ type: 'architecture-rename', id: 'db', newId: 'store' }] }))
    await planAgentCorrection(receipt, 'transform', correction)
    await commitAgentMutation(receipt)
    expect((await verifyAgentMutation(receipt)).state).toBe('verified')
    await expect(planAgentCorrection(receipt, 'transform', correction)).rejects.toThrow('exhausted')
    await rollbackAgentMutation(receipt)
    expect(await Bun.file(path).text()).toBe(source)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('architecture receipts enforce commit, verification, completion, rollback and stale evidence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'architecture-agent-'))
  try {
    const path = join(dir, 'diagram.mmd')
    const actions = join(dir, 'actions.json')
    const receipt = join(dir, 'receipt.json')
    await Bun.write(path, source)
    await Bun.write(actions, JSON.stringify({ actions: [{ type: 'architecture-rename', id: 'api', newId: 'gateway' }] }))
    await planAgentMutation(path, 'transform', actions, receipt)
    expect(await Bun.file(path).text()).toBe(source)
    expect((await commitAgentMutation(receipt)).state).toBe('applied')
    expect((await verifyAgentMutation(receipt)).state).toBe('verified')
    expect((await finishAgentMutation(receipt, true)).state).toBe('complete')
    expect(await Bun.file(join(dir, 'diagram.beautiflow.json')).exists()).toBe(false)
    await rollbackAgentMutation(receipt)
    expect(await Bun.file(path).text()).toBe(source)
    await planAgentMutation(path, 'transform', actions, receipt)
    await Bun.write(actions, JSON.stringify({ actions: [{ type: 'architecture-rename', id: 'db', newId: 'store' }] }))
    await expect(commitAgentMutation(receipt)).rejects.toThrow('stale')
    expect(await Bun.file(path).text()).toBe(source)
    await expect(planAgentMutation(path, 'polish', undefined, receipt)).rejects.toThrow('mutations support')
  } finally { await rm(dir, { recursive: true, force: true }) }
})
