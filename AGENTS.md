# AGENTS.md

Guidance for coding agents working on Beautiflow.

## Product boundary

Beautiflow is a deterministic Mermaid CLI and portable agent skill. Agent harnesses such as Pi, Claude Code, and Codex own conversation, model access, credentials, and approval. Beautiflow owns parsing, graph transformations, layout, validation, persistence, rendering, and read-only preview.

Keep the common path simple:

```bash
beautiflow server diagram.mmd
beautiflow polish diagram.mmd
```

Do not add model SDKs, provider authentication, embedded chat, visual editing, or tldraw without an explicit product decision.

## Stack

- Bun 1.3+
- TypeScript
- Beautiful Mermaid 1.1.3
- Mermaid 11 for `architecture-beta`
- ELK through the vendored synchronous Beautiful Mermaid adapter
- jsdom plus napi-rs canvas for standalone Mermaid architecture rendering
- Iconify SVG Logos and Lucide packs
- resvg-js for PNG output
- Standalone host-targeted Bun executable

## Repository map

- `src/cli.ts` — command dispatch
- `src/args.ts` — CLI parsing and public option surface
- `src/diagram/` — graph, layout, audit, transform, render, and polish pipeline
- `src/server.ts` — localhost read-only live preview
- `src/vendor/beautiful-mermaid/` — vendored MIT-licensed layout/render pieces
- `skills/beautiflow/` — portable Agent Skill and references
- `docs/` — technical documentation
- `examples/` — original runnable examples and Markdown guides
- `test/` — Bun test suite
- `FLOW.md` — durable prose principles used by the skill
- `PRODUCT.md` and `DESIGN.md` — product and preview-surface context

## Commands

```bash
bun install --frozen-lockfile
bun run check
bun test
bun run build
# All release gates:
bun run validate
```

Smoke test the compiled binary, not only `bun run dev`:

```bash
./dist/beautiflow version
./dist/beautiflow polish examples/recipes/architecture/architecture.mmd --dry-run
BEAUTIFLOW_NO_OPEN=1 ./dist/beautiflow server examples/recipes/architecture/architecture.mmd
```

## Engineering rules

1. Preserve Beautiful Mermaid routes and renderers whenever that family supports them. For `architecture-beta`, preserve Mermaid’s native documented renderer on normal diagrams; activate the compound ELK stability fallback only for large multilevel diagrams while retaining Mermaid parsing, icons, labels, and explicit ports.
2. Match positioned edges by semantic endpoints, never by array index.
3. Keep Mermaid semantics in the source and visual overrides in the sidecar.
4. Agents emit semantic actions; they do not invent pixel coordinates.
5. Transformations are transactional and source-preserving. Reject an edit that cannot be patched safely.
6. Preview mode is read-only. It must never polish or write files.
7. Keep the last good preview visible during transient parse failures.
8. Add a regression test for every parser, routing, source-editing, or rendering bug.
9. Preserve the zero-config common path. Avoid adding public flags when deterministic defaults suffice.
10. Update `docs/`, the embedded skill, and help text when a public behavior changes.

## Tests expected by change type

- CLI surface: `test/args.test.ts`
- Rendering/family support: `test/render.test.ts` and `test/examples.test.ts`
- Layout/routing/audit: `test/diagram.test.ts`
- Structural edits: `test/transform.test.ts`
- Bounded orchestration: `test/polish.test.ts`
- Live preview: `test/server.test.ts`

After changing embedded skill files, build the standalone binary and verify `install-skill` copies every reference.

## Generated and external files

- `dist/` is generated and ignored.
- Ordinary SVG/PNG output is ignored.
- `examples/rendered/` and recipe `rendered/` directories contain committed fixtures; regenerate them with the exact commands in the matching guides.
- `*.beautiflow.json` is meaningful layout state and may be committed.
- Example Mermaid sources, Markdown blocks, reproduction commands, and rendered fixtures must stay synchronized.

## Documentation entry point

Start with [`docs/README.md`](docs/README.md). Keep technical claims synchronized with the implementation rather than duplicating speculative roadmap material.
