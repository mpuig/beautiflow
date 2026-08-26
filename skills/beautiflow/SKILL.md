---
name: beautiflow
description: Creates polished, presentation-ready diagrams from Mermaid source with the Beautiflow CLI. Improves graph structure, layout, hierarchy, spacing, grouping, arrow routing, and visual styling. Use when creating, transforming, rendering, reorganizing, auditing, or beautifying Mermaid diagrams.
compatibility: Requires the beautiflow executable on PATH. Image inspection is optional.
---

# Beautiflow

Turn Mermaid source into clear, professional diagrams. The CLI owns geometry and validation; you provide semantic and visual judgment.

## Workflow

Keep the normal path simple. When the user wants a continuously updating view beside the chat, tell them to run this in a separate terminal and leave it open:

```bash
beautiflow server <diagram.mmd>
```

The server is read-only and reflects every source or sidecar save; do not start a second server or add preview tooling.

For diagram work:

1. Read the nearest `FLOW.md` when one exists.
2. Run one bounded command:

   ```bash
   beautiflow polish <diagram.mmd> --json
   ```

3. Inspect the generated PNG when image viewing is available. Stop if it is clear and valid.

`polish` inspects, diagnoses, evaluates layouts, rejects regressions, saves the best valid sidecar, and exports SVG and PNG. Do not repeat it in a loop.

Only use advanced commands when the user asks to change meaning or the polished result has a specific defect:

- For node, edge, or subgraph changes, read `references/transformations.md` and use `transform --dry-run` before applying.
- For a precise visual correction, read `references/actions.md` and use semantic layout actions.
- Use `audit` and `diagnose` to investigate a reported failure, not as mandatory ceremony after a successful polish.

## Quality gates

Never accept a result with node overlaps, arrows crossing unrelated nodes, missing nodes, disconnected arrows, or unreadable labels. Prefer one clear visual spine for the primary flow. Keep error paths secondary and preserve pinned nodes.

Do not invent pixel coordinates or rewrite Mermaid ad hoc. Use semantic layout actions and graph transformations, then let Beautiflow calculate geometry and validate the result.
