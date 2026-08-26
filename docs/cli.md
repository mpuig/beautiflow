# CLI reference

## Simple commands

### `server`

```bash
beautiflow server diagram.mmd
```

Starts a localhost read-only preview, opens the browser, and watches the Mermaid source and sidecar. It has no public tuning flags. See [Server mode](server.md).

### `polish`

```bash
beautiflow polish diagram.mmd
beautiflow polish diagram.mmd --dry-run
beautiflow polish diagram.mmd --json
```

Runs one bounded inspect → diagnose → candidate layout → regression check. A successful non-dry run writes the sidecar and exports SVG and PNG beside the source.

## Rendering

```bash
beautiflow render diagram.mmd
beautiflow render diagram.mmd --format svg
beautiflow render diagram.mmd --format png
beautiflow render diagram.mmd --format unicode --output -
beautiflow render diagram.mmd --theme github-dark --transparent
```

Options:

- `-f, --format`: `svg`, `png`, `unicode`, or `ascii`
- `-o, --output`: destination path; `-` means stdout
- `-t, --theme`: a Beautiful Mermaid theme
- `--transparent`: omit the background

Pie, GitGraph, and `architecture-beta` currently support SVG and PNG, not terminal formats. Architecture sources may reference the registered `logos:`, `lucide:`, and `aws:` icon packs.

## Inspection and quality

```bash
beautiflow inspect diagram.mmd --json
beautiflow inspect diagram.mmd --agent --json
beautiflow doctor diagram.mmd --json
beautiflow audit diagram.mmd --json
beautiflow diagnose diagram.mmd --json
```

- `inspect` reports graph IDs, edges, sidecar state, and the nearest `FLOW.md`.
- `inspect --agent` works across supported families and returns capabilities, mutation boundaries, recommended commands, execution budgets, and evidence-based stop conditions.
- `doctor` validates the local platform, skill installation, file access, family detection, output directory, `FLOW.md`, and parse/render pipeline. It accepts an optional diagram path.
- `audit` checks flowchart geometry. For large multilevel architecture renders it reports shared route segments, group-header crossings, excessive bends, and over-wrapped labels.
- `diagnose` checks flow semantics.

## Layout

```bash
beautiflow layout diagram.mmd --candidates 5 --json
```

Generates one to five deterministic LR/TD candidates, chooses the highest-ranked result, and saves positions to the sidecar.

## Visual actions

```bash
beautiflow apply diagram.mmd --actions layout-actions.json --dry-run --json
beautiflow apply diagram.mmd --actions layout-actions.json --json
```

Visual actions alter sidecar presentation, not topology. See the embedded skill reference at `skills/beautiflow/references/actions.md`.

## Semantic transformations

```bash
beautiflow transform diagram.mmd --actions transformations.json --dry-run --json
beautiflow transform diagram.mmd --actions transformations.json --json
```

Transformations add, remove, rename, reconnect, group, insert, or bypass graph elements. See [Transformations](transformations.md).

## Skill installation

```bash
beautiflow install-skill
beautiflow install-skill --target pi
beautiflow install-skill --target claude
beautiflow install-skill --target codex
beautiflow install-skill --local
```

## Metadata

```bash
beautiflow themes
beautiflow version
beautiflow --help
```

## Exit behavior

- `0`: success
- `2`: invalid command input, missing files, parse failures, unsafe transformations, or rejected geometry
- `1`: failed `doctor` checks or an unexpected internal failure

Human progress messages go to stderr where needed so rendered stdout remains pipe-safe.
