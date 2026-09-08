# Project Context

> This scaffolding was added together with the first OpenSpec change proposal
> (`changes/fix-polish-baseline-regression/`). If the project prefers a different
> location or convention for spec-driven proposals, everything under `openspec/`
> can be relocated or trimmed without affecting code.

## Purpose

Beautiflow is the deterministic diagram runtime for coding agents. It gives
agent harnesses (Pi, Claude Code, Codex) bounded authority to improve Mermaid
diagrams: capability discovery, receipt-backed mutation, deterministic
verification, rollback, and rendering. The CLI owns geometry, transactions, and
validation; the harness owns intent and visual judgment.

## Tech Stack

- Bun 1.3+ and TypeScript, compiled to a standalone host-targeted executable
- Beautiful Mermaid 1.1.3 (vendored synchronous ELK layout/render adapter under `src/vendor/beautiful-mermaid/`)
- Mermaid 11 for `architecture-beta` (JSDOM + napi-rs canvas shim)
- elkjs for layout, resvg-js for PNG, Iconify packs for architecture icons

## Project Conventions

### Code Style

Two-space indentation, no semicolons, descriptive full-word identifiers, small
files with a single responsibility. Match the surrounding code.

### Architecture

Canonical constraints live in `AGENTS.md`, `PRODUCT.md`, and `DESIGN.md`.
Non-negotiables relevant to spec work:

- Mermaid source owns semantics; the `*.beautiflow.json` sidecar owns presentation.
- Layout, routing, and scoring are deterministic; no model SDKs in the CLI.
- Agents mutate only through the receipt state machine (`validated → applied → verified → complete`).
- Preserve Beautiful Mermaid ELK routes whenever the family supports them; match positioned edges by semantic endpoints, never array index.
- Keep the zero-config common path (`polish`, `render`, `server`) free of new flags.

### Testing

`bun test` with suites mapped one-to-one to modules (see `AGENTS.md` for the
change-type → suite table). Every parser, routing, source-editing, or rendering
bug gets a regression test. `bun run validate` is the release gate.

### Git

PRs follow `CONTRIBUTING.md`: deterministic behavior, regression coverage for
behavior changes, docs under `docs/` updated for public behavior changes,
`bun run validate` before opening.

## Domain Context

- **Sidecar** — `<stem>.beautiflow.json`, persisted node positions/sizes, pins, roles, direction, theme.
- **Baseline** — the layout a diagram gets with no sidecar overrides: pure ELK positions and ELK edge routes.
- **Candidate** — one of five deterministic LR/TD spacing presets evaluated by `layout`/`polish`.
- **Polish** — bounded inspect → diagnose → candidate layout → regression check; the advertised one-command path.
- **Receipt** — `*.beautiflow-agent.json`, hash-gated transaction record for agent mutations.
- **Audit score** — geometric quality 0–100 from `auditDiagram` (overlaps, crossings, edge/node intersections, bends, alignment, aspect ratio).

## Important Constraints

- Determinism end to end: same inputs must produce identical bytes.
- The compiled binary must not depend on the build machine's `node_modules`.
- Documented behavior, embedded skill text, and help output must stay synchronized with implementation (AGENTS.md rule 10).

## External Dependencies

`beautiful-mermaid`, `elkjs`, `mermaid`, `@resvg/resvg-js`, `jsdom`,
`@napi-rs/canvas`, `@iconify-json/logos`, `@iconify-json/lucide`.
