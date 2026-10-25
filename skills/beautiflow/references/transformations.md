# Beautiflow graph and architecture transformations

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

The flowchart/state transform command applies minimal source patches so comments and unrelated formatting survive. For safety it rejects chained edge statements and ambiguous numeric `linkStyle` edits. Mermaid is the semantic source of truth; the sidecar is reconciled and relaid out after a successful flowchart/state transformation.

## Architecture actions

Architecture uses its own model and actions, never the flowchart editor:

- `architecture-rename`: `{ "id": id, "newId"?: id, "label"?: text }` — rename a service, junction, or group and update references; junctions have no label.
- `architecture-move`: `{ "id": id, "group": id }` — move an existing service, junction, or group into an existing group.
- `architecture-add-edge`: `{ "source": id, "target": id, "sourcePort": "L|R|T|B", "targetPort": "L|R|T|B", "label"?: text }` — add a directed relationship.
- `architecture-reconnect-edge`: `{ "source": id, "target": id, "newSource": id, "newTarget": id, "sourcePort": "L|R|T|B", "targetPort": "L|R|T|B" }` — reconnect exactly one unambiguous relationship, preserving its label and arrow semantics.

Each port value is one letter, not the literal pipe-separated string above. Labels must be nonempty single-line plain text without brackets, angle brackets, double quotes, or braces. Source patches retain comments and unrelated formatting, reparse after every action, and compare the full intended architecture model (including ports, containment, alignment hints, labels, and metadata). Unsupported or ambiguous syntax is rejected rather than rewritten. Reconnect currently accepts simple `source:R ... L:target` statements, not group-boundary relationships.

The final render must not lower the pre-edit geometry score, increase any measured geometry defect count (including at a saturated zero score), or contain high-severity integrity failures. Unchanged pre-existing geometry findings remain visible without blocking an unrelated safe edit. Architecture writes are atomic and require a regular source file (symbolic source-file paths are rejected); no sidecar is created. Agent mutations use the same plan/commit/verify/finish, stale-hash rejection, single correction budget, and rollback protocol. Use `diagnose` for informational structure findings and `audit` for measured geometry and render integrity. Architecture does not support automatic polish or layout actions.
