# Transformations

`transform` changes graph semantics and Mermaid source. `apply` changes presentation in the sidecar. Do not use them interchangeably.

## Transaction

```text
load source and sidecar
  → clone graph
  → validate action schema and IDs
  → apply graph mutation in memory
  → produce a minimal Mermaid source patch
  → reparse patched source
  → compare expected and reparsed graph
  → diagnose semantic regressions
  → generate and audit layout
  → write source and sidecar or roll back
```

Agents discover the schema and perform every validation through a receipt-backed plan:

```bash
beautiflow schema --json
beautiflow agent plan flow.mmd --operation transform --actions changes.json --json
```

The receipt binds the source, sidecar, and action hashes before commit. Humans can still inspect the low-level dry-run directly:

```bash
beautiflow transform flow.mmd --actions changes.json --dry-run --json
```

The direct JSON response includes `transformedSource`.

## Actions

Node actions:

- `add-node`
- `remove-node`
- `rename-node`
- `set-node-shape`
- `insert-node`
- `bypass-node`

Edge actions:

- `add-edge`
- `remove-edge`
- `set-edge-label`
- `reverse-edge`

Organization actions:

- `create-subgraph`
- `move-to-subgraph`

The canonical schemas and examples live in `skills/beautiflow/references/transformations.md`.

## Source preservation

The source editor changes only affected declarations and edge lines. Comments and unrelated formatting survive. A transformation is rejected when Beautiflow cannot prove that the patched source represents the intended graph.

Current safety restrictions:

- Expand chained edge statements to one edge per line before an edge-changing transformation.
- Numeric `linkStyle` directives block edge-count-changing transformations because silent index drift could style the wrong edge.
- Moving a node out of a complex existing subgraph may require explicitly simplifying that source block first.

## Semantic regression protection

Transformations reject newly introduced semantic errors, including isolated nodes, unreachable nodes, and decision shapes without real branches. Existing unrelated findings do not prevent a safe edit.

## Rollback

Beautiflow keeps the original source and sidecar content in memory. If either final write fails, it restores the original files. Agent receipts additionally persist the transaction's original source and sidecar snapshot, so `beautiflow agent rollback --receipt <file> --json` can restore them after a successful commit. Crash-safe recovery from process termination between filesystem writes remains a separate filesystem-journaling concern.
