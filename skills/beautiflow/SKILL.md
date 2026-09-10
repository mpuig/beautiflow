---
name: beautiflow
description: Creates polished, presentation-ready diagrams from Mermaid source with the deterministic Beautiflow CLI. Use when creating, transforming, rendering, reorganizing, auditing, diagnosing, or beautifying Mermaid diagrams.
compatibility: Requires the beautiflow executable on PATH. Image inspection is optional.
---

# Beautiflow

Use model judgment for intent and visual critique. Give all parsing, geometry, routing, mutation, validation, persistence, and rendering work to the Beautiflow CLI.

## Agent protocol

For a new diagram, first read [creation.md](references/creation.md). It may route a clearly matching behavioral request to the small, family-neutral patterns in [semantic-patterns.md](references/semantic-patterns.md). Existing diagrams always use the receipt-backed mutation protocol below; creation guidance never authorizes rewriting an existing file.

Work autonomously inside a strict budget. Do not ask for details that can be discovered from the source, `FLOW.md`, or the agent inspection contract.

1. Read the nearest `FLOW.md` when one exists.
2. Discover capabilities before choosing a command:

   ```bash
   beautiflow inspect <diagram.mmd> --agent --json
   ```

3. Read the machine schemas before authoring an action file:

   ```bash
   beautiflow schema --json
   ```

4. Classify the request into exactly one initial operation:
   - **render** — produce an output without changing source or layout;
   - **preview** — tell the user to keep `beautiflow server <diagram.mmd>` open in a separate terminal;
   - **polish** — improve hierarchy, spacing, layout, or routing without changing meaning;
   - **diagnose** — explain semantic or geometric problems without changing files;
   - **apply** — make a precise semantic presentation change;
   - **transform** — change nodes, edges, labels, shapes, or groups.
5. For every mutation, use the receipt-backed `beautiflow agent` runtime. Execute `nextAction.argv` as an argument array without passing it through a shell.
6. Continue only through the state transitions returned by the receipt: `validated → applied → verified → complete`.
7. When image viewing is available, inspect one final PNG after `verified`. If and only if it reveals a named defect, spend the one targeted correction before finishing.
8. Stop at `complete`, `stale`, `blocked`, `rolled-back`, or an exhausted correction budget. Never continue because the result could be subjectively different.

## Command routing

### Routine visual improvement

```bash
beautiflow agent plan <diagram.mmd> --operation polish --json
beautiflow agent commit --receipt <receipt.json> --json
beautiflow agent verify --receipt <receipt.json> --json
beautiflow agent finish --receipt <receipt.json> --visual-inspected --json
```

Omit `--visual-inspected` only when image viewing is unavailable. The receipt enforces one initial operation, source and sidecar hashes, validation gates, and terminal state.

### Diagnose without mutation

```bash
beautiflow diagnose <diagram.mmd> --json
beautiflow audit <diagram.mmd> --json
```

Use `diagnose` for meaning and reachability. Use `audit` for final geometry or architecture rendering quality. Do not run both unless the user reports both kinds of failure.

### Precise presentation correction

Use the `actions` schema returned by `beautiflow schema --json`, create the smallest valid action file, and begin a receipt-backed transaction:

```bash
beautiflow agent plan <diagram.mmd> --operation apply --actions <actions.json> --json
```

Follow the returned `agent commit`, `agent verify`, and `agent finish` argument arrays. Never bypass the receipt with a direct write.

### Structural change

Use the `transformations` schema, then begin the same validated transaction:

```bash
beautiflow agent plan <diagram.mmd> --operation transform --actions <transformations.json> --json
```

Never rewrite Mermaid ad hoc when a supported transformation exists. If verification or visual inspection names one remaining defect, use exactly one correction:

```bash
beautiflow agent correct --receipt <receipt.json> --operation <apply|transform> --actions <correction.json> --json
```

Then commit, verify, and finish. If any mutation must be abandoned, run `beautiflow agent rollback --receipt <receipt.json> --json`.

## Authority boundaries

- Never invent or edit pixel coordinates.
- Never run `polish` in a loop.
- Never change topology for a visual-only request.
- Never bypass a failed dry-run, semantic diagnostic, or geometry audit.
- Never start a second preview server.
- Never mutate architecture, sequence, class, ER, XY, pie, or GitGraph diagrams through the flowchart model.
- Preserve pinned nodes, roles, comments, unrelated formatting, and the user's Mermaid semantics.
- A successful render is not proof of visual quality when `audit` is supported.

## Recovery budget

The receipt permits one initial operation and at most one targeted correction. A correction must name evidence such as an overlap, blocked arrow, crossing, unreadable label, weak primary path, or failed quality metric. Stale source, sidecar, or action hashes block commits. If the correction fails, roll back, report the blocker, and stop.

Run this only when the executable, skill installation, parsing, or file permissions appear broken:

```bash
beautiflow doctor <diagram.mmd> --json
```

## Completion report

Return:

- the operation selected and why;
- files changed and outputs produced;
- before/after scores when available;
- semantic or geometry warnings;
- whether visual inspection was available;
- any remaining limitation;
- the exact command to reopen the live preview when useful.

A task is complete when the requested change is present, validation passes, metrics do not regress, and the final render has been inspected once when vision is available.
