# Layout sidecar

Beautiflow stores visual state beside Mermaid source:

```text
architecture.mmd
architecture.beautiflow.json
```

## Version 1 shape

```json
{
  "version": 1,
  "sourceHash": "cfecc8f17f4d3a26",
  "direction": "TD",
  "theme": "github-light",
  "primaryFlow": ["client", "gateway", "worker"],
  "nodes": {
    "client": {
      "x": 120,
      "y": 48,
      "width": 90,
      "height": 40,
      "pinned": false,
      "role": "primary"
    }
  }
}
```

Only `version`, `sourceHash`, `direction`, and `nodes` are required. Theme and primary flow are optional.

## Node roles

- `primary` — the main visual flow
- `secondary` — supporting or neutral content
- `exception` — failure or exceptional paths

Roles influence both node and connected-edge presentation.

## Pins

Pinned nodes preserve their coordinates when layout candidates or transformations are applied. Unpinned nodes may be globally relaid out.

## Reconciliation

When source changes:

- Overrides for deleted IDs are discarded.
- Primary-flow entries for deleted IDs are discarded.
- Renamed IDs migrate their override during a structured transformation.
- New nodes receive generated positions.
- A successful save updates `sourceHash`.

## Why semantics stay out

The sidecar does not own labels, node existence, edge existence, or graph topology. Those belong in Mermaid so source review remains meaningful and diagrams still work in other Mermaid-aware tools.

## Agent receipts

`*.beautiflow-agent.json` files are temporary execution receipts, not presentation state. They contain hash preconditions, validation evidence, execution budgets, and original source/sidecar snapshots for rollback. They are ignored by Git and must not be treated as durable project configuration.

## Commit policy

Sidecars are deterministic project state and may be committed. SVG and PNG are output artifacts unless a repository explicitly tracks them.
