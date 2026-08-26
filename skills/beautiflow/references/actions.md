# Beautiflow actions

Pass an object with an `actions` array to `beautiflow apply --actions <file>`.

```json
{
  "actions": [
    { "type": "set-primary-flow", "nodes": ["client", "api", "worker"] },
    { "type": "place-relative", "node": "retry", "relativeTo": "worker", "position": "below" },
    { "type": "align", "nodes": ["client", "api", "worker"], "axis": "center-y" },
    { "type": "set-role", "nodes": ["retry"], "role": "exception" }
  ]
}
```

## Available actions

- `set-direction`: `{ "direction": "LR" | "TD" }`
- `set-primary-flow`: `{ "nodes": [id, ...] }`
- `place-relative`: `{ "node": id, "relativeTo": id, "position": "above" | "below" | "left" | "right", "gap"?: number }`
- `align`: `{ "nodes": [id, ...], "axis": "left" | "center-x" | "center-y" | "top" }`
- `distribute`: `{ "nodes": [id, ...], "direction": "horizontal" | "vertical" }`
- `set-role`: `{ "nodes": [id, ...], "role": "primary" | "secondary" | "exception" }`
- `pin`: `{ "nodes": [id, ...], "pinned"?: boolean }`

Use IDs returned by `beautiflow inspect`; never use display labels as IDs. Test risky changes with `--dry-run` first. Beautiflow rejects actions that introduce node overlaps or route arrows through unrelated nodes. Layout actions do not change Mermaid topology; use `beautiflow transform` and read `transformations.md` for node, edge, and subgraph changes.
