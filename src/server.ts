import { watch, type FSWatcher } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { diagramFamily, renderProjectOutput, renderStandaloneOutput } from './diagram/pipeline.ts'
import { loadProject } from './diagram/project.ts'
import { CliError } from './errors.ts'
import { readInput } from './io.ts'

interface PreviewState {
  revision: number
  status: 'ready' | 'error' | 'rendering'
  updatedAt: string
  error: string | null
  family: string
  filename: string
}

export interface PreviewServerOptions {
  port?: number
  openBrowser?: boolean
}

export interface PreviewServerHandle {
  url: string
  close: () => void
}

const encoder = new TextEncoder()

function pageHtml(filename: string): string {
  const safeFilename = JSON.stringify(filename).replaceAll('<', '\\u003c')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${filename.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')} · Beautiflow</title>
  <style>
    :root { color-scheme: light; --paper: #f7f8f5; --ink: #20231f; --muted: #70766d; --line: #dfe3dc; --good: #26845b; --bad: #bb3b32; --panel: #ffffff; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; }
    body { overflow: hidden; background: var(--paper); color: var(--ink); font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    ::selection { background: #cfe9dc; color: #173527; }
    .shell { height: 100%; display: grid; grid-template-rows: 48px minmax(0, 1fr); }
    header { display: flex; align-items: center; gap: 12px; padding: 0 18px; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--paper) 92%, white); }
    .mark { width: 18px; height: 14px; color: var(--ink); flex: 0 0 auto; }
    .name { min-width: 0; font-size: 13px; font-weight: 650; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product { color: var(--muted); font-weight: 500; }
    .status { margin-left: auto; display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--good); transition: background 180ms ease-out, transform 180ms ease-out; }
    .dot.rendering { transform: scale(.72); background: #bf7a27; }
    .dot.error { background: var(--bad); }
    main { position: relative; min-height: 0; padding: clamp(16px, 3vw, 40px); }
    #diagram { width: 100%; height: 100%; display: grid; place-items: center; overflow: auto; scrollbar-color: #c8cec5 transparent; scrollbar-width: thin; }
    #diagram svg { display: block; width: 100%; height: 100%; min-width: 280px; min-height: 180px; }
    #diagram.updating svg { animation: settle 260ms cubic-bezier(.16, 1, .3, 1); }
    .empty { max-width: 48ch; color: var(--muted); text-align: center; line-height: 1.55; }
    .error-panel { position: absolute; left: 50%; bottom: 22px; width: min(680px, calc(100% - 32px)); transform: translateX(-50%); padding: 12px 16px; border-radius: 12px; background: #fff5f3; box-shadow: 0 8px 28px rgba(74, 27, 22, .14); color: #742820; font-size: 13px; line-height: 1.45; }
    .error-panel strong { display: block; margin-bottom: 2px; }
    [hidden] { display: none !important; }
    @keyframes settle { from { opacity: .68; filter: blur(2px); } to { opacity: 1; filter: blur(0); } }
    @media (max-width: 600px) { header { padding: 0 12px; } .product { display: none; } main { padding: 12px; } .status time { display: none; } #diagram { place-items: center start; } #diagram svg { min-width: 680px; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <!--
    THESIS: The diagram is the interface; viewer chrome is only a quiet proof that the file is live.
    OWN-WORLD: Paper-white projection surface, ink-line status rail, one restrained green live signal.
    STORY: Open beside agent chat, see each saved revision arrive, keep the last good render through errors.
    FIRST VIEWPORT: Filename and live state occupy one narrow rail; the diagram owns everything below it.
    FORM: Quiet projection booth; code-led, seed key server-live-preview.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
  -->
  <div class="shell">
    <header>
      <svg class="mark" viewBox="0 0 18 14" aria-hidden="true"><circle cx="3" cy="7" r="2.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7h6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m9.5 4.5 2.5 2.5-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="4.75" width="4.5" height="4.5" rx=".75" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      <div class="name"><span id="filename"></span> <span class="product">· Beautiflow</span></div>
      <div class="status" role="status" aria-live="polite">
        <span id="dot" class="dot rendering"></span>
        <span id="statusText">Connecting</span>
        <time id="updated"></time>
      </div>
    </header>
    <main>
      <div id="diagram"><p class="empty">Waiting for the first render…</p></div>
      <div id="error" class="error-panel" role="alert" hidden><strong>Preview could not update</strong><span id="errorText"></span></div>
    </main>
  </div>
  <script>
    const filename = ${safeFilename};
    const diagram = document.querySelector('#diagram');
    const dot = document.querySelector('#dot');
    const statusText = document.querySelector('#statusText');
    const updated = document.querySelector('#updated');
    const errorPanel = document.querySelector('#error');
    const errorText = document.querySelector('#errorText');
    document.querySelector('#filename').textContent = filename;
    let revision = -1;

    function setState(state) {
      dot.className = 'dot ' + (state.status === 'ready' ? '' : state.status);
      statusText.textContent = state.status === 'ready' ? 'Live' : state.status === 'rendering' ? 'Updating' : 'Last render kept';
      updated.textContent = state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
      errorPanel.hidden = state.status !== 'error';
      errorText.textContent = state.error || '';
    }

    async function refresh(state) {
      setState(state);
      if (state.status !== 'ready' || state.revision === revision) return;
      const response = await fetch('/diagram.svg?v=' + state.revision, { cache: 'no-store' });
      if (!response.ok) return;
      diagram.innerHTML = await response.text();
      diagram.classList.remove('updating');
      void diagram.offsetWidth;
      diagram.classList.add('updating');
      revision = state.revision;
    }

    fetch('/api/state', { cache: 'no-store' }).then(response => response.json()).then(refresh);
    const events = new EventSource('/events');
    events.onmessage = event => refresh(JSON.parse(event.data));
    events.onerror = () => {
      dot.className = 'dot error';
      statusText.textContent = 'Reconnecting';
    };
  </script>
</body>
</html>`
}

function openUrl(url: string): void {
  if (process.env.BEAUTIFLOW_NO_OPEN === '1') return
  const command = process.platform === 'darwin'
    ? ['open', url]
    : process.platform === 'win32'
      ? ['cmd', '/c', 'start', '', url]
      : ['xdg-open', url]
  try { Bun.spawn(command, { stdout: 'ignore', stderr: 'ignore' }).unref() } catch { /* URL is still printed. */ }
}

export async function startPreviewServer(inputPath: string, options: PreviewServerOptions = {}): Promise<PreviewServerHandle> {
  const sourcePath = resolve(inputPath)
  if (!await Bun.file(sourcePath).exists()) throw new CliError(`Input file not found: ${sourcePath}`, 2)
  const filename = basename(sourcePath)
  const sidecarName = `${filename.replace(/\.[^.]+$/, '')}.beautiflow.json`
  let svg: string | undefined
  let state: PreviewState = { revision: 0, status: 'rendering', updatedAt: new Date().toISOString(), error: null, family: 'unknown', filename }
  const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
  const send = () => {
    const payload = encoder.encode(`data: ${JSON.stringify(state)}\n\n`)
    for (const client of clients) {
      try { client.enqueue(payload) } catch { clients.delete(client) }
    }
  }

  const render = async () => {
    state = { ...state, status: 'rendering', error: null }
    send()
    try {
      const source = await readInput(sourcePath)
      const family = diagramFamily(source)
      if (family === 'unknown') throw new CliError('Unsupported Mermaid diagram family', 2)
      const request = { inputPath: sourcePath, format: 'svg' as const, transparent: true }
      const output = family === 'graph'
        ? await renderProjectOutput(await loadProject(sourcePath), request)
        : await renderStandaloneOutput(source, request)
      svg = String(output)
      state = { revision: state.revision + 1, status: 'ready', updatedAt: new Date().toISOString(), error: null, family, filename }
    } catch (error) {
      state = { ...state, status: 'error', updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) }
    }
    send()
  }

  await render()
  const makeServer = (port: number) => Bun.serve({
    hostname: '127.0.0.1',
    port,
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === '/') return new Response(pageHtml(filename), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
      if (url.pathname === '/diagram.svg') return svg
        ? new Response(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' } })
        : new Response('No successful render yet', { status: 503 })
      if (url.pathname === '/api/state') return Response.json(state, { headers: { 'cache-control': 'no-store' } })
      if (url.pathname === '/events') {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) { clients.add(controller); controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`)) },
          cancel(controller) { clients.delete(controller) },
        })
        return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } })
      }
      return new Response('Not found', { status: 404 })
    },
  })

  let server: ReturnType<typeof makeServer> | undefined
  if (options.port !== undefined) server = makeServer(options.port)
  else {
    for (let port = 4242; port <= 4252; port += 1) {
      try { server = makeServer(port); break } catch (error) {
        if (port === 4252) throw error
      }
    }
  }
  if (!server) throw new CliError('Could not start preview server', 2)
  const url = `http://127.0.0.1:${server.port}`

  let timer: ReturnType<typeof setTimeout> | undefined
  const watcher: FSWatcher = watch(dirname(sourcePath), (_event, changed) => {
    if (changed && changed !== filename && changed !== sidecarName) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void render() }, 80)
  })
  const heartbeat = setInterval(() => {
    const message = encoder.encode(': heartbeat\n\n')
    for (const client of clients) {
      try { client.enqueue(message) } catch { clients.delete(client) }
    }
  }, 15_000)

  if (options.openBrowser !== false) openUrl(url)
  return {
    url,
    close() {
      if (timer) clearTimeout(timer)
      clearInterval(heartbeat)
      watcher.close()
      for (const client of clients) { try { client.close() } catch { /* already closed */ } }
      clients.clear()
      server.stop(true)
    },
  }
}
