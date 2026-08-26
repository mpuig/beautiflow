# Agent protocol

`beautiflow inspect <file> --agent --json` is the capability-discovery contract for coding agents.

## Contract fields

- `protocolVersion` — schema version for agent integrations.
- `family` — detected Mermaid family.
- `capabilities` — supported operations, mutation status, and unsupported reasons.
- `context` — nearest `FLOW.md`, sidecar path, and sidecar existence.
- `diagnostics` — semantic score and issues when the complete graph model is available.
- `recommendedOperations` — deterministic routing as safe `argv` arrays with the condition for each operation.
- `schemas` — discoverable action, transformation, and receipt schemas.
- `constraints` — family-specific authority boundaries.
- `budget` — maximum automatic polish, correction, and visual-inspection runs.
- `stopWhen` — evidence-based completion conditions.

## Intent classification

Choose one initial operation:

| Intent | Operation | Mutation |
|---|---|---:|
| Export the saved diagram | `render` | No |
| Keep a browser view open | `server` | No |
| Improve layout without changing meaning | `polish` | Sidecar only |
| Explain semantic defects | `diagnose` | No |
| Explain visual defects | `audit` | No |
| Change presentation precisely | `apply` | Sidecar |
| Change graph meaning or structure | `transform` | Mermaid and sidecar |

Do not select an unsupported operation. Specialized render-only families must not be passed through flowchart semantics.

## Mutation discipline

All mutations use the receipt-backed state machine:

```text
validated → applied → verified → complete
```

`agent plan` performs the dry-run and records source, sidecar, and action hashes. `agent commit` rejects stale evidence. `agent verify` compares final geometry and semantics with the validated plan. `agent finish` records whether visual inspection was available. A single `agent correct` transition is available from `verified` or `needs-correction`; a second correction is rejected. `agent rollback` restores the original source and sidecar snapshot.

Execute returned `nextAction.argv` values directly as process arguments. Never concatenate them into a shell command, bypass a receipt with direct mutation, or repair a rejected transaction by editing generated coordinates.

## Stop conditions

Stop when all applicable conditions hold:

1. The requested semantic or visual change is present.
2. The receipt reaches `complete` rather than merely reporting a successful write.
3. Semantic diagnostics contain no newly introduced error.
4. Geometry and quality metrics do not regress.
5. One final render has been inspected when image viewing is available.

A subjective preference without a named defect is not permission for another iteration.
