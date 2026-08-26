---
name: beautiflow
description: Creates polished, presentation-ready diagrams from Mermaid source with the deterministic Beautiflow CLI. Use when creating, transforming, rendering, reorganizing, auditing, diagnosing, or beautifying Mermaid diagrams.
compatibility: Requires the beautiflow executable on PATH. Image inspection is optional.
---

# Beautiflow

Use model judgment for intent and visual critique. Give all parsing, geometry, routing, mutation, validation, persistence, and rendering work to the Beautiflow CLI.

## Agent protocol

Work autonomously inside a strict budget. Do not ask for details that can be discovered from the source, `FLOW.md`, or the agent inspection contract.

1. Read the nearest `FLOW.md` when one exists.
2. Discover capabilities before choosing a command:

   ```bash
   beautiflow inspect <diagram.mmd> --agent --json
   ```

3. Classify the request into exactly one initial operation:
   - **render** — produce an output without changing source or layout;
   - **preview** — tell the user to keep `beautiflow server <diagram.mmd>` open in a separate terminal;
   - **polish** — improve hierarchy, spacing, layout, or routing without changing meaning;
   - **diagnose** — explain semantic or geometric problems without changing files;
   - **apply** — make a precise semantic presentation change;
   - **transform** — change nodes, edges, labels, shapes, or groups.
4. Run the smallest supported operation. Honor the capability flags and constraints returned by inspection.
5. Validate the result from the command's JSON evidence.
6. When image viewing is available, inspect one final PNG. If and only if it reveals a specific remaining defect, make one targeted correction and validate once more.
7. Stop and report the evidence. Never continue because the result could be subjectively different.

## Command routing

### Routine visual improvement

```bash
beautiflow polish <diagram.mmd> --json
```

Run `polish` at most once. It generates bounded candidates, rejects regressions, saves the strongest valid sidecar, and writes SVG and PNG outputs.

### Diagnose without mutation

```bash
beautiflow diagnose <diagram.mmd> --json
beautiflow audit <diagram.mmd> --json
```

Use `diagnose` for meaning and reachability. Use `audit` for final geometry or architecture rendering quality. Do not run both unless the user reports both kinds of failure.

### Precise presentation correction

Read `references/actions.md`, create the smallest valid action file, and preview it:

```bash
beautiflow apply <diagram.mmd> --actions <actions.json> --dry-run --json
```

Apply only when the dry-run passes and does not regress quality:

```bash
beautiflow apply <diagram.mmd> --actions <actions.json> --json
```

### Structural change

Read `references/transformations.md`, then use the same preview-before-write discipline:

```bash
beautiflow transform <diagram.mmd> --actions <transformations.json> --dry-run --json
beautiflow transform <diagram.mmd> --actions <transformations.json> --json
```

Never rewrite Mermaid ad hoc when a supported transformation exists.

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

One initial operation and at most one targeted correction are allowed. A correction must name evidence such as an overlap, blocked arrow, crossing, unreadable label, weak primary path, or failed quality metric. If the correction fails, roll back or leave the dry-run unapplied, report the blocker, and stop.

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
