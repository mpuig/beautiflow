# CLI reference

## Agent-first execution

```bash
beautiflow inspect diagram.mmd --agent --json
beautiflow schema --json
beautiflow agent plan diagram.mmd --operation polish --json
beautiflow agent commit --receipt diagram.mmd.beautiflow-agent.json --json
beautiflow agent verify --receipt diagram.mmd.beautiflow-agent.json --json
beautiflow agent finish --receipt diagram.mmd.beautiflow-agent.json --visual-inspected --json
```

`beautiflow schema --json` embeds the complete contracts; the same versioned schemas are published at `/schemas/actions-v1.json`, `/schemas/transformations-v1.json`, and `/schemas/agent-receipt-v1.json`.

`agent plan` performs a non-mutating dry-run and writes a receipt. `agent commit` verifies source, sidecar, and action hashes before changing diagram files. `agent verify` compares final geometry and semantics with the validated evidence. After optional visual inspection, `agent finish` records the terminal `complete` state.

A named remaining defect may spend the single correction budget:

```bash
beautiflow agent correct --receipt diagram.mmd.beautiflow-agent.json \
  --operation apply --actions correction.json --json
```

`agent rollback` restores the original source and sidecar snapshot. Receipts are ignored by Git because they can contain source content. Direct mutation commands remain available for humans and compatibility, but agents use this state machine.

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
beautiflow doctor --json
beautiflow doctor diagram.mmd --json
beautiflow audit diagram.mmd --json
beautiflow diagnose diagram.mmd --json
```

- `inspect` reports graph IDs, edges, sidecar state, and the nearest `FLOW.md`.
- `inspect --agent` works across supported families and returns capabilities, mutation boundaries, recommended commands, execution budgets, and evidence-based stop conditions.
- `doctor` validates the local platform, skill installation, file access, family detection, output directory, `FLOW.md`, and parse/render pipeline. It accepts an optional diagram path.
- `audit` checks flowchart/state geometry, including estimated label-mask collisions and shared routing channels. Readability findings include evidence and supported semantic repair action types. For large multilevel architecture renders it reports shared route segments, group-header crossings, excessive bends, and over-wrapped labels.
- `diagnose` checks flow semantics.

## Agent JSON envelopes

Agent-facing JSON commands expose a common evidence layer while preserving command-specific fields:

- `ok` — whether the operation completed successfully;
- `operation` — selected CLI operation;
- `changed` — whether files were written;
- `files` — affected source, sidecar, and output paths when applicable;
- `warnings` — semantic or geometric findings;
- `nextAction` — a structured operation, `argv` array, reason, and confirmation boundary, or `null` when the agent must stop.

`inspect --agent` returns protocol version `1.1`, family capabilities, constraints, schema locations, safe argument arrays, a one-operation/one-correction budget, and stop conditions. Every `--json` failure also returns a machine-readable blocked envelope with a stable error code. Receipt transitions return `nextAction: null` only at terminal states.

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
