# Development

## Website preview

Run `bun run preview:site` and open `http://127.0.0.1:4173/`. This assembles the homepage, examples, generated HTML documentation, and schemas together in `dist/site`, then serves them on localhost. Stop with Ctrl-C and rerun after changes. Do not use `open index.html` or serve the repository root to test documentation links: `docs/` in the checkout contains Markdown, not the generated website.

`bun run build:site` builds the same directory without starting a server. GitHub Pages deploys this exact build path so local navigation and deployed navigation use the same routes.

## Requirements

- Bun 1.3 or newer
- TypeScript 5.9
- A supported resvg native target for PNG rendering

## Setup

```bash
bun install --frozen-lockfile
bun run check
bun test
```

## Build

```bash
bun run build
./dist/beautiflow version
```

The build command first applies a narrowly checked JSDOM compile patch that disables its unused synchronous-XHR worker path, then compiles `src/cli.ts` with minification and Bun bytecode into `dist/beautiflow`. JSDOM's default stylesheet is embedded as text and supplied during dynamic module initialization. These adapters prevent the executable from referring to build-machine `node_modules` paths. The executable does not require Bun at runtime.

## Documentation site

Markdown under `docs/` is the canonical source. Build the static HTML documentation with:

```bash
bun run build:docs
```

The command writes clean-route pages, shared CSS, and copy-button JavaScript to `dist/docs/`, plus public protocol schemas to `dist/schemas/`. GitHub Pages runs the same generator against `_site/docs`; generated HTML and schemas are not committed. Internal Markdown links are rewritten to web routes, while every page links back to its source on GitHub.

For a visual release review, generate `dist/diagram-contact-sheet.html`:

```bash
bun run build:contact-sheet
```

The generator also fails when a committed SVG fixture lacks its accessible image contract. The contact sheet is review evidence, not a pixel-diff correctness gate.

## Release gate

```bash
bun run validate
```

This runs type checking, every Bun test, the standalone build, documentation generation, and the visual contact-sheet accessibility gate. CI additionally hides `node_modules` before exercising version output, agent inspection, and architecture rendering from the executable.

## Test suites

- `agent.test.ts` — capability discovery, mutation boundaries, execution budgets, and doctor checks
- `agent-runtime.test.ts` — receipt states, stale evidence, correction budgets, rollback, schemas, and JSON failures
- `args.test.ts` — public command parsing
- `diagram.test.ts` — layout, routing, actions, audits, and ELK edge association
- `docs.test.ts` — local links, public command coverage, agent protocol, release metadata, and site-version synchronization
- `examples.test.ts` — 19-file Mermaid family compatibility suite
- `polish.test.ts` — bounded candidate selection and `FLOW.md`
- `render.test.ts` — SVG, terminal, specialized families, and PNG signatures
- `server.test.ts` — save detection, last-good-render retention, and recovery
- `site.test.ts` — developer site, Pages deployment, and verified installer
- `transform.test.ts` — source-preserving topology changes and semantic regression checks

## Vendored Beautiful Mermaid files

Bun’s compiled runtime is incompatible with the normal asynchronous ELK worker entrypoint used upstream. Beautiflow vendors the narrow synchronous Beautiful Mermaid layout/render adapter under `src/vendor/beautiful-mermaid/` and retains its MIT license there.

When updating Beautiful Mermaid:

1. Compare the vendored files against the new upstream implementation.
2. Preserve the FakeWorker/synchronous ELK behavior required by compilation.
3. Retain license and third-party notices.
4. Run the example suite and visually inspect representative output.

## Adding a diagram family

Do not route a new family through flowchart semantics merely because it renders. Add explicit detection and a family-specific parser/renderer, use Beautiful Mermaid’s specialized pipeline, or use Mermaid’s native renderer when its semantics require it. Mark whether the family is render-only or supports the complete project IR. `architecture-beta` is the reference for a render-only Mermaid family with additional runtime adapters and icon assets.

## Adding a CLI option

The product deliberately keeps its common path small. Prefer deterministic defaults and environment variables for automation-only behavior. Add a public flag only when users need a recurring decision that cannot be inferred safely.

## Release artifacts

PNG support includes native code. Build and test on each release target rather than assuming Bun cross-compilation carries the correct resvg binary. Publish checksums, a Sigstore checksum-manifest bundle, an SPDX SBOM, and third-party notices with binaries. The release workflow creates these artifacts automatically; macOS notarization remains a separate credentialed release requirement.
