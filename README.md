# Beautiflow

[![CI](https://github.com/mpuig/beautiflow/actions/workflows/ci.yml/badge.svg)](https://github.com/mpuig/beautiflow/actions/workflows/ci.yml)

Beautiful diagrams from imperfect flows. Beautiflow is a standalone CLI and portable agent skill for rendering, arranging, auditing, and polishing Mermaid flowcharts.

## What the magical PoC can do

- Render flowchart, state, sequence, class, ER, XY chart, pie, GitGraph, and `architecture-beta` diagrams to SVG or PNG
- Render supported textual families to Unicode or ASCII through Beautiful Mermaid
- Preserve Beautiful Mermaid’s ELK routes, clipping, labels, shapes, and arrowheads
- Route moved flowchart edges and architecture connectors around node obstacles with deterministic Manhattan routing
- Generate multiple ELK layout candidates and select the strongest
- Score overlaps, crossings, bends, alignment, and aspect ratio
- Persist node positions, roles, and pins in a sidecar
- Apply schema-validated semantic layout actions
- Transactionally add, remove, rename, insert, bypass, and reconnect flow nodes
- Create and reorganize Mermaid subgraphs
- Reject changes that introduce node overlaps or arrows through unrelated nodes
- Install a portable Agent Skills-compatible Beautiflow skill
- Let Pi, Claude Code, Codex, or another agent visually inspect and improve the result

Layout, auditing, semantic transformations, and persistent sidecars focus on Mermaid flowcharts and state diagrams. Sequence, class, ER, XY chart, pie, GitGraph, and architecture diagrams currently provide standalone SVG/PNG rendering. Architecture rendering preserves Mermaid’s native documented layout for normal diagrams and activates a deterministic compound ELK stability fallback for large multilevel diagrams. Both paths retain explicit ports and registered AWS/Lucide icon packs.

## Documentation and examples

- [`docs/README.md`](docs/README.md) — technical documentation index
- [`AGENTS.md`](AGENTS.md) — repository guidance for coding agents
- [`examples/README.md`](examples/README.md) — 19 Markdown walkthroughs, reproducible renders, and focused recipes including a six-stage AWS architecture build

To start playing immediately:

```bash
beautiflow server examples/sources/01-subscription-intake.mmd
```

## Install

Download the standalone executable from the [latest GitHub release](https://github.com/mpuig/beautiflow/releases/latest). It does not require Bun at runtime.

macOS Apple silicon:

```bash
mkdir -p "$HOME/.local/bin"
curl -fL https://github.com/mpuig/beautiflow/releases/latest/download/beautiflow-darwin-arm64 \
  -o "$HOME/.local/bin/beautiflow"
chmod +x "$HOME/.local/bin/beautiflow"
```

Linux x86-64:

```bash
mkdir -p "$HOME/.local/bin"
curl -fL https://github.com/mpuig/beautiflow/releases/latest/download/beautiflow-linux-x86_64 \
  -o "$HOME/.local/bin/beautiflow"
chmod +x "$HOME/.local/bin/beautiflow"
```

Ensure `$HOME/.local/bin` is on your `PATH`, then verify the installation:

```bash
beautiflow version
```

Checksums, the license, and third-party notices are attached to each release. Other platforms can build from source.

## Development

Requires Bun 1.3 or newer:

```bash
bun install
bun run check
bun test
# Or run every release gate and build the executable:
bun run validate
```

Build the standalone executable:

```bash
bun run build
./dist/beautiflow --help
```

The compiled executable does not require Bun at runtime.

## Live browser preview

Keep a read-only preview open beside Pi, Claude Code, or Codex:

```bash
beautiflow server architecture.mmd
```

Beautiflow opens a local browser view, watches the Mermaid source and its sidecar, and updates after every save. It renders exactly what is on disk and never runs `polish` or mutates files. If a save is temporarily invalid, the viewer keeps the last good diagram visible and shows the render error until the source recovers. Press `Ctrl+C` to stop it.

No port, host, or browser options are required. The server binds to localhost and automatically selects an available port starting at 4242.

## The simple path

For a flowchart or state diagram, one command is enough:

```bash
beautiflow polish architecture.mmd
```

It runs a bounded inspect → diagnose → layout → regression check, then writes the best valid sidecar plus SVG and PNG. Preview without writing with:

```bash
beautiflow polish architecture.mmd --dry-run
```

Beautiflow reads the nearest `FLOW.md` as optional prose context. It has no required schema or configuration keys; use it for a few durable principles that should guide diagrams in that directory tree. See the repository’s `FLOW.md` for a minimal example.

The commands below are advanced tools for precise rendering, inspection, or structural changes.

## Render

```bash
beautiflow render architecture.mmd
beautiflow render architecture.mmd --format png
beautiflow render architecture.mmd --format unicode --output -
beautiflow render architecture.mmd --theme github-dark --transparent
```

By default, output is written beside the source file.

## Arrange and audit

```bash
beautiflow inspect architecture.mmd --json
beautiflow layout architecture.mmd --candidates 5 --json
beautiflow audit architecture.mmd --json
beautiflow diagnose architecture.mmd --json
```

Layout state is stored beside the source:

```text
architecture.mmd
architecture.beautiflow.json
```

## Apply semantic actions

```bash
beautiflow apply architecture.mmd --actions actions.json --dry-run --json
beautiflow apply architecture.mmd --actions actions.json --json
```

Example:

```json
{
  "actions": [
    { "type": "set-primary-flow", "nodes": ["client", "api", "worker"] },
    { "type": "place-relative", "node": "retry", "relativeTo": "worker", "position": "below" },
    { "type": "set-role", "nodes": ["retry"], "role": "exception" }
  ]
}
```

See `skills/beautiflow/references/actions.md` for the action catalog.

## Transform graph structure

Transformations change Mermaid semantics rather than only its visual layout:

```bash
beautiflow transform architecture.mmd --actions transformations.json --dry-run --json
beautiflow transform architecture.mmd --actions transformations.json --json
```

Example:

```json
{
  "actions": [
    {
      "type": "insert-node",
      "id": "validate",
      "label": "Validate request",
      "shape": "diamond",
      "between": { "source": "gateway", "target": "auth" }
    },
    { "type": "add-edge", "source": "validate", "target": "denied", "label": "Invalid", "style": "dotted" }
  ]
}
```

A transformation is parsed, applied to a cloned graph and to a minimal source patch, reparsed, semantically diagnosed, relaid out, and audited before either the Mermaid source or sidecar is written. Use `--dry-run --json` to inspect `transformedSource`. Successful writes preserve comments and unrelated formatting, reconcile stable IDs, and preserve pinned overrides.

For safety, edge-changing transformations reject chained edge statements and numeric `linkStyle` directives that cannot yet be re-indexed without ambiguity. Expand chained edges to one edge per line or use class-based styling first.

See `skills/beautiflow/references/transformations.md` for the transformation catalog.

## Install the Beautiflow skill

Shared Agent Skills location:

```bash
beautiflow install-skill
```

Harness-specific or project-local locations:

```bash
beautiflow install-skill --target pi
beautiflow install-skill --target claude
beautiflow install-skill --target codex
beautiflow install-skill --local
```

Then ask your agent:

```text
Use the Beautiflow skill to polish architecture.mmd.
```

In Pi, you can invoke it explicitly:

```text
/skill:beautiflow architecture.mmd
```

The skill runs a bounded inspect → layout → audit → render → visually review → apply → validate loop. The agent makes design decisions while the CLI owns geometry and validation.

## Example

```bash
beautiflow layout examples/recipes/architecture/architecture.mmd --candidates 5
beautiflow apply examples/recipes/architecture/architecture.mmd --actions examples/recipes/architecture/layout-actions.json --dry-run
beautiflow transform examples/recipes/architecture/architecture.mmd --actions examples/recipes/architecture/graph-transformations.json --dry-run
beautiflow render examples/recipes/architecture/architecture.mmd --format png
```

## Example suite

`examples/` contains 19 original examples covering every supported Mermaid family. Nine flowchart/state examples exercise the complete layout and audit pipeline; ten specialized-family examples exercise render-only pipelines. Every raw source has a matching Markdown walkthrough, committed SVG or PNG, exact reproduction command, live-preview command, and agent prompt.

See `examples/README.md` for the catalog, the [six-stage AWS architecture walkthrough](examples/recipes/aws-architecture/README.md), and the [render-options comparison](examples/recipes/render-options/README.md).

## Release checklist

```bash
bun install --frozen-lockfile
bun run validate
./dist/beautiflow version
./dist/beautiflow layout examples/recipes/architecture/architecture.mmd --candidates 5
./dist/beautiflow audit examples/recipes/architecture/architecture.mmd
./dist/beautiflow diagnose examples/recipes/architecture/architecture.mmd
./dist/beautiflow render examples/recipes/architecture/architecture.mmd --format svg
./dist/beautiflow render examples/recipes/architecture/architecture.mmd --format png
```

The compiled executable is host-targeted because PNG support includes resvg’s native library. Build release binaries on each supported operating system and architecture.

## License

Beautiflow is released under the MIT License. See `LICENSE`.

## Third-party software

Beautiflow uses Beautiful Mermaid, ELK, and resvg. Vendored Beautiful Mermaid layout and rendering files retain their MIT license in `src/vendor/beautiful-mermaid/LICENSE`. See `THIRD_PARTY_NOTICES.md`.
