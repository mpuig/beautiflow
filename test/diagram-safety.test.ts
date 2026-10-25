import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { JSDOM } from 'jsdom'
import { buildDiagramSafety } from '../scripts/build-diagram-safety.ts'
import { safetyPage, sourceDiff } from '../dont-break-the-diagram/page.ts'
import type { SafetyRecording } from '../scripts/record-diagram-safety.ts'
import { architectureIntegrity } from '../src/diagram/architecture-analysis.ts'

const root = resolve(import.meta.dir, '../dont-break-the-diagram')
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const recording = await Bun.file(join(root, 'recording/recording.json')).json() as SafetyRecording

test('real recorded CLI traces preserve hashes, refusal boundaries and exact rollback', async () => {
  expect(recording.version).toBe('beautiflow 1.0.1')
  expect(recording.executableSha256).toMatch(/^[a-f0-9]{64}$/)
  expect(recording.cases.map((item) => item.id)).toEqual(['safe', 'unsafe', 'stale', 'rollback'])
  const initial = await readFile(join(root, 'source.mmd'), 'utf8')
  for (const item of recording.cases) {
    expect(item.steps[0]!.source).toBe(initial)
    expect(await readFile(join(root, 'recording', item.id, 'original.mmd'), 'utf8')).toBe(initial)
    for (const [index, step] of item.steps.entries()) {
      expect(step.hash).toBe(hash(step.source))
      expect(await readFile(join(root, 'recording', item.id, `step-${index}.mmd`), 'utf8')).toBe(step.source)
      expect(await Bun.file(join(root, 'recording', item.id, `step-${index}.json`)).json()).toEqual(step)
      const svg = await readFile(join(root, 'recording', step.diagram), 'utf8')
      expect(architectureIntegrity(step.source, svg).issues).toEqual([])
      if (step.exitCode === 0) {
        expect(step.output?.ok).toBe(true)
        expect(step.output?.state).toBe(step.receipt?.state)
        expect(step.receipt?.hashes.sourceCurrent).toBe(step.hash)
      }
      expect(step.source).toContain('%% api in this comment is documentation, not a rename target.')
    }
  }
  const [safe, unsafe, stale, rollback] = recording.cases
  expect(safe!.steps.map((step) => step.receipt?.state ?? null)).toEqual([null, 'validated', 'applied', 'verified', 'complete'])
  expect(safe!.steps[1]!.source).toBe(initial)
  expect(safe!.steps.at(-1)!.receipt?.evidence.visualInspected).toBe(false)
  expect(safe!.steps.at(-1)!.source).toContain('staff:R --> L:gateway')
  expect(safe!.steps.at(-1)!.source).toContain('gateway:R --> L:membership')
  expect(safe!.steps.at(-1)!.source).toContain('service gateway(aws:api-gateway)[Tenant API] in cell')
  expect(Object.values(safe!.steps[3]!.receipt?.evidence.audit.metrics)).toEqual(Array(8).fill(0))
  expect(unsafe!.steps.at(-1)!.exitCode).toBe(2)
  expect(unsafe!.steps.at(-1)!.receipt).toBeNull()
  expect(unsafe!.steps.at(-1)!.source).toBe(initial)
  expect(unsafe!.steps.at(-1)!.output?.error.code).toBe('INVALID_INPUT')
  expect(stale!.steps.at(-1)!.output?.error.code).toBe('STALE_RECEIPT')
  expect(stale!.steps.at(-1)!.receipt?.state).toBe('stale')
  expect(stale!.steps.at(-1)!.source).toBe(stale!.steps.at(-2)!.source)
  expect(stale!.steps.at(-1)!.source).toContain('%% Collaborator: review tenant policy before release.')
  expect(stale!.steps.at(-1)!.hash).not.toBe(stale!.steps.at(-1)!.receipt?.hashes.sourceCurrent)
  expect(rollback!.steps[2]!.source).not.toBe(initial)
  expect(rollback!.steps.at(-1)!.source).toBe(initial)
  expect(rollback!.steps.at(-1)!.hash).toBe(rollback!.steps[0]!.hash)
  expect(rollback!.steps.at(-1)!.receipt?.state).toBe('rolled-back')
})

test('static assembly copies recorded evidence without executing mutations or shipping authoring files', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'safety-site-'))
  try {
    await buildDiagramSafety(destination)
    const html = await readFile(join(destination, 'index.html'), 'utf8')
    expect(html).toBe(safetyPage(recording))
    expect(html).toBe(await readFile(join(root, 'index.html'), 'utf8'))
    for (const excluded of ['page.ts', 'DESIGN.md', '.impeccable']) expect(await Bun.file(join(destination, excluded)).exists()).toBe(false)
    const dom = new JSDOM(html)
    expect(dom.window.document.querySelectorAll('h1')).toHaveLength(1)
    expect(dom.window.document.querySelectorAll('.case')).toHaveLength(4)
    expect(dom.window.document.querySelectorAll('.stage:not([hidden])')).toHaveLength(4)
    for (const link of dom.window.document.querySelectorAll<HTMLAnchorElement>('[href^="recording/"]')) expect(await Bun.file(join(destination, link.getAttribute('href')!)).exists()).toBe(true)
    for (const image of dom.window.document.querySelectorAll('img')) expect(image.alt.length).toBeGreaterThan(25)
    expect(html).toContain('visualInspected: false')
    expect(html).toContain('not signed security attestations')
    expect(html).toContain('not a merge')
    expect(html).not.toContain('direction seed')
    dom.window.close()
  } finally { await rm(destination, { recursive: true, force: true }) }
})

test('replay navigates actual snapshots, updates all evidence together and respects deep links', async () => {
  const dom = new JSDOM(safetyPage(recording), { url: 'https://beautiflow.cc/dont-break-the-diagram/#stale', runScripts: 'outside-only' })
  try {
    const { document } = dom.window
    new Function('document', await readFile(join(root, 'app.js'), 'utf8'))(document)
    // Filter reflected hidden properties: jsdom may cache :not([hidden]) selector results.
    const visible = () => [...document.querySelectorAll<HTMLElement>('.case')].find((panel) => !panel.hidden)!
    expect(visible().id).toBe('stale')
    expect(document.querySelector('[aria-current]')?.getAttribute('href')).toBe('#stale')
    const panel = visible()
    expect(panel.querySelectorAll('.stage:not([hidden])')).toHaveLength(1)
    panel.querySelector<HTMLButtonElement>('[data-previous]')!.click()
    expect(panel.querySelector('.stage:not([hidden]) h3')!.textContent).toBe('Collaborator edits source')
    panel.querySelector<HTMLButtonElement>('[data-step="0"]')!.click()
    expect(panel.querySelector<HTMLButtonElement>('[data-previous]')!.disabled).toBe(true)
    expect(panel.querySelector('.stage:not([hidden])')!.textContent).toContain('Source matches original bytes.')
    panel.querySelector<HTMLButtonElement>('[data-next]')!.click()
    expect(panel.querySelector('.stage:not([hidden]) .state')!.textContent).toContain('validated')
    expect(panel.querySelector('.step-status')!.textContent).toBe('Step 2 of 4')
    dom.reconfigure({ url: 'https://beautiflow.cc/dont-break-the-diagram/#rollback' })
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'))
    expect(visible().id).toBe('rollback')
    expect(visible().querySelector('.stage:not([hidden]) .state')!.textContent).toContain('rolled-back')
    expect(visible().querySelector<HTMLButtonElement>('[data-next]')!.disabled).toBe(true)
    expect(document.querySelectorAll('[data-step][aria-pressed=true]')).toHaveLength(4)
    dom.reconfigure({ url: 'https://beautiflow.cc/dont-break-the-diagram/#stale' })
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'))
    expect(visible().querySelector('.step-status')!.textContent).toBe('Step 2 of 4')
    expect(await readFile(join(root, 'app.js'), 'utf8')).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|eval\(/)
  } finally { dom.window.close() }
})

test('diffs and HTML escape source-owned content instead of interpreting it', () => {
  const lines = sourceDiff('a\nb\n', 'a\nc\n')
  expect(lines).toEqual([{ kind: 'context', text: ' a' }, { kind: 'removed', text: '-b' }, { kind: 'added', text: '+c' }])
  expect(sourceDiff('a\n', 'a\n')[0]!.text).toContain('No source changes')
  const malicious = structuredClone(recording)
  malicious.cases[0]!.steps[0]!.source = '<script>alert(1)</script>'
  expect(safetyPage(malicious)).not.toContain('<script>alert(1)</script>')
})

test('downloadable reproduction scripts are syntactically valid and guard expected refusal exits', async () => {
  for (const item of recording.cases) {
    const script = join(root, 'recording', item.id, 'reproduce.sh')
    expect(Bun.spawnSync(['sh', '-n', script]).exitCode).toBe(0)
    const text = await readFile(script, 'utf8')
    expect(text).toContain('cp original.mmd source.mmd')
    if (['unsafe', 'stale'].includes(item.id)) expect(text).toContain('[ "$status" -eq 2 ] || exit 1')
  }
})
