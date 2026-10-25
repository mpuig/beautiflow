import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startPreviewServer, type PreviewServerHandle } from '../src/server.ts'

const directories: string[] = []
const servers: PreviewServerHandle[] = []
afterEach(async () => {
  servers.splice(0).forEach((server) => server.close())
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function waitFor(url: string, predicate: (state: any) => boolean): Promise<any> {
  const deadline = Date.now() + 4_000
  while (Date.now() < deadline) {
    const state = await fetch(`${url}/api/state`).then((response) => response.json())
    if (predicate(state)) return state
    await Bun.sleep(40)
  }
  throw new Error('Preview state did not update')
}

describe('read-only preview server', () => {
  test('previews Pele architecture read-only and retains the last good SVG', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-pele-server-'))
    directories.push(directory)
    const sourcePath = join(directory, 'architecture.mmd')
    const source = 'architecture-beta\nservice api(lucide:box)[API]\n'
    await writeFile(sourcePath, source)
    const server = await startPreviewServer(sourcePath, { port: 0, openBrowser: false })
    servers.push(server)
    const svg = await fetch(`${server.url}/diagram.svg`).then((response) => response.text())
    expect(svg).toContain('pele-architecture')
    expect(await Bun.file(sourcePath).text()).toBe(source)
    expect(await Bun.file(join(directory, 'architecture.beautiflow.json')).exists()).toBe(false)
    await writeFile(sourcePath, 'architecture-beta\nservice api(server)[API]\napi:R --> L:missing')
    await waitFor(server.url, (state) => state.status === 'error')
    expect(await fetch(`${server.url}/diagram.svg`).then((response) => response.text())).toBe(svg)
    await writeFile(sourcePath, 'architecture-beta\nservice db(database)[Recovered]\n')
    await waitFor(server.url, (state) => state.status === 'ready')
    expect(await fetch(`${server.url}/diagram.svg`).then((response) => response.text())).toContain('Recovered')
    expect(await Bun.file(join(directory, 'architecture.beautiflow.json')).exists()).toBe(false)
  })

  test('updates on save and keeps the last good render through errors', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'beautiflow-server-'))
    directories.push(directory)
    const sourcePath = join(directory, 'flow.mmd')
    await writeFile(sourcePath, 'flowchart LR\n  A[Start] --> B[Done]\n')
    const server = await startPreviewServer(sourcePath, { port: 0, openBrowser: false })
    servers.push(server)

    const first = await fetch(`${server.url}/api/state`).then((response) => response.json()) as any
    expect(first.status).toBe('ready')
    const firstSvg = await fetch(`${server.url}/diagram.svg`).then((response) => response.text())
    expect(firstSvg).toContain('data-id="B"')

    await writeFile(sourcePath, 'notMermaid\n  A -->\n')
    const failed = await waitFor(server.url, (state) => state.status === 'error')
    expect(failed.error).toBeTruthy()
    expect(await fetch(`${server.url}/diagram.svg`).then((response) => response.text())).toBe(firstSvg)

    await writeFile(sourcePath, 'flowchart LR\n  A[Start] --> C[Latest]\n')
    const recovered = await waitFor(server.url, (state) => state.status === 'ready' && state.revision > first.revision)
    expect(recovered.error).toBeNull()
    expect(await fetch(`${server.url}/diagram.svg`).then((response) => response.text())).toContain('data-id="C"')
  })
})
