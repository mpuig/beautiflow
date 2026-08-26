# Beautiflow graph transformations

Use `beautiflow transform <diagram.mmd> --actions <file> --dry-run --json` to validate semantic changes before rewriting Mermaid. Transformations are transactional: invalid Mermaid, dangling references, overlaps, and arrows through unrelated nodes are rejected.

```json
{
  "actions": [
    {
      "type": "insert-node",
      "id": "validate",
      "label": "Validate request",
      "shape": "diamond",
      "between": { "source": "gateway", "target": "worker" }
    },
    { "type": "add-edge", "source": "validate", "target": "denied", "label": "No", "style": "dotted" }
  ]
}
```

## Node transformations

- `add-node`: `{ "id": id, "label": text, "shape"?: shape }`
- `remove-node`: `{ "id": id }` — removes incident edges too
- `rename-node`: `{ "id": id, "newId"?: id, "label"?: text }`
- `set-node-shape`: `{ "id": id, "shape": shape }`
- `insert-node`: `{ "id": id, "label": text, "shape"?: shape, "between": { "source": id, "target": id } }`
- `bypass-node`: `{ "id": id }` — reconnects every predecessor to every successor

Supported shapes: `rectangle`, `rounded`, `diamond`, `stadium`, `circle`, `subroutine`, `doublecircle`, `hexagon`, `cylinder`, `asymmetric`, `trapezoid`, and `trapezoid-alt`.

## Edge transformations

- `add-edge`: `{ "source": id, "target": id, "label"?: text, "style"?: "solid" | "dotted" | "thick" }`
- `remove-edge`: `{ "source": id, "target": id, "label"?: text }`
- `set-edge-label`: `{ "source": id, "target": id, "label"?: text }` — omit `label` to clear it
- `reverse-edge`: `{ "source": id, "target": id }`

## Organization

- `create-subgraph`: `{ "id": id, "label": text, "nodes": [id, ...] }`
- `move-to-subgraph`: `{ "subgraph": id, "nodes": [id, ...] }`

## Safe workflow

1. Use `beautiflow inspect <file> --json` to obtain stable IDs.
2. Write the smallest semantic transformation plan.
3. Run `transform --dry-run --json` and inspect `transformedSource` plus metrics.
4. Apply without `--dry-run` only after validation.
5. Run `beautiflow diagnose <file> --json` to check reachability, entries, exits, decisions, and branches.
6. Render PNG, inspect visually, and run `audit`.

The transform command applies minimal source patches so comments and unrelated formatting survive. For safety it rejects chained edge statements and ambiguous numeric `linkStyle` edits. Mermaid is the semantic source of truth; the sidecar is reconciled and relaid out after a successful transformation.
