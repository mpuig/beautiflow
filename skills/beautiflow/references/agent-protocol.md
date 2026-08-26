# Agent protocol

`beautiflow inspect <file> --agent --json` is the capability-discovery contract for coding agents.

## Contract fields

- `protocolVersion` — schema version for agent integrations.
- `family` — detected Mermaid family.
- `capabilities` — supported operations, mutation status, and unsupported reasons.
- `context` — nearest `FLOW.md`, sidecar path, and sidecar existence.
- `diagnostics` — semantic score and issues when the complete graph model is available.
- `recommendedOperations` — deterministic command routing with the condition for each command.
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

`apply` and `transform` always start with `--dry-run --json`. Apply the same action file without `--dry-run` only after semantic and geometric validation succeeds. Never repair a rejected transaction by editing generated coordinates.

## Stop conditions

Stop when all applicable conditions hold:

1. The requested semantic or visual change is present.
2. The command reports success.
3. Semantic diagnostics contain no newly introduced error.
4. Geometry and quality metrics do not regress.
5. One final render has been inspected when image viewing is available.

A subjective preference without a named defect is not permission for another iteration.
