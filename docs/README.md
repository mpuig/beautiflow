# Beautiflow agent runtime documentation

Beautiflow is the deterministic diagram runtime for coding agents. The harness owns intent and optional visual judgment; Beautiflow discovers mutation authority, validates a receipt-backed plan, commits exact evidence, verifies the result, and enforces correction and stop budgets. The CLI is intended for agents and exposes machine-first contracts. Humans can still invoke it directly when useful, and the read-only browser preview remains available alongside either workflow.

## Start here

- [Architecture](architecture.md): process boundaries and source tree
- [CLI reference](cli.md): commands, output, and exit behavior
- [Rendering pipeline](rendering.md): family detection, Beautiful Mermaid, SVG, and PNG
- [Layout sidecar](sidecar.md): persisted presentation state and reconciliation
- [Transformations](transformations.md): semantic graph editing and source-preserving writes
- [Auditing and diagnostics](quality.md): geometric and semantic checks
- [Live preview server](server.md): file watching, SSE, recovery, and security boundary
- [Agent Skill](agent-skill.md): Pi, Claude Code, Codex, `FLOW.md`, and action contracts
- [Development](development.md): building, testing, vendoring, and releases

## Agent-first workflow

The harness discovers capabilities and schemas, then enters the enforced receipt state machine before any mutation:

```bash
beautiflow inspect diagram.mmd --agent --json
beautiflow schema --json
beautiflow agent plan diagram.mmd --operation polish --json
```

It follows the returned `nextAction.argv` through `commit`, `verify`, optional visual inspection or one targeted correction, and `finish`. The task is complete only when the receipt reaches `complete`.

Direct human operation is supported, although it is not the primary interface:

```bash
beautiflow polish diagram.mmd
beautiflow server diagram.mmd
```

The server reflects saved source and sidecar changes without mutating either file.

## Current capability levels

| Diagram family | SVG/PNG render | Layout/audit | Diagnose/transform/polish |
| --- | --- | --- | --- |
| Flowchart | Yes | Yes | Yes |
| State diagram | Yes | Yes | Yes |
| Sequence | Yes | Render only | No |
| Class | Yes | Render only | No |
| ER | Yes | Render only | No |
| XY chart | Yes | Render only | No |
| Pie | Yes | Render only | No |
| GitGraph | Yes | Render only | No |
| Architecture (`architecture-beta`) | Yes | Audit only | No |

The distinction is intentional: each non-flowchart family needs its own meaningful intermediate representation and quality metrics rather than flowchart heuristics applied under a different name.
