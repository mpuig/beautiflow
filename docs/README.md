# Beautiflow technical documentation

Beautiflow is a standalone CLI that turns Mermaid source into deterministic, polished diagram output. It also ships a portable Agent Skill and a read-only live browser preview.

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

## Common workflow

In one terminal:

```bash
beautiflow server architecture.mmd
```

In another terminal, run the simple path directly:

```bash
beautiflow polish architecture.mmd
```

An agent harness discovers capabilities and schemas, then enters the enforced receipt state machine before any mutation:

```bash
beautiflow inspect architecture.mmd --agent --json
beautiflow schema --json
beautiflow agent plan architecture.mmd --operation polish --json
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
