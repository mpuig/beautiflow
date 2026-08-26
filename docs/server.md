# Live preview server

Server mode keeps the latest saved diagram visible beside an agent chat:

```bash
beautiflow server architecture.mmd
```

It is deliberately read-only and zero-configuration.

## Lifecycle

1. Resolve and render the input file.
2. Bind to `127.0.0.1`, starting at port 4242.
3. Try subsequent ports through 4252 when occupied.
4. Open the local URL in the default browser.
5. Watch the source directory for changes to the Mermaid file or sidecar.
6. Debounce writes for 80ms and re-render.
7. Push state through Server-Sent Events.
8. Stop on `Ctrl+C` or `SIGTERM`.

## HTTP endpoints

- `/` — read-only viewer HTML
- `/diagram.svg` — latest successful SVG
- `/api/state` — current revision, status, family, timestamp, and error
- `/events` — Server-Sent Events stream

All responses disable caching where appropriate.

## Last-good-render behavior

Agent edits are often written in multiple steps. A transient parse failure must not blank the viewer:

```text
valid revision N
  → invalid save
  → status becomes error
  → revision N remains visible
  → valid save
  → revision N+1 replaces it
```

The page reports “Last render kept” with the parse error and automatically recovers.

## File watching

Beautiflow watches the containing directory rather than only an open file descriptor. This catches editors that save by writing a temporary file and atomically renaming it over the original. Only the source basename and expected sidecar basename trigger a render.

## Browser update protocol

The page opens one SSE connection. A successful revision causes it to fetch `/diagram.svg?v=<revision>` with caching disabled and replace the inline SVG. A 15-second heartbeat keeps intermediaries from considering the stream idle.

## Security boundary

- The server binds to localhost only.
- It exposes no write endpoints.
- It executes no Mermaid-provided JavaScript.
- It does not invoke an agent or model.
- It never runs `polish`, `apply`, or `transform`.

The undocumented `BEAUTIFLOW_NO_OPEN=1` environment variable is used by automated tests and headless environments to suppress browser launching.

## Viewer behavior

The diagram owns the viewport below a 48px status rail. Desktop fits the complete SVG. Narrow screens keep a readable minimum diagram width and allow horizontal scrolling. The viewer respects reduced motion and uses semantic live/error regions.
