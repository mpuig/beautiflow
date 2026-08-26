# Agent Skill

Beautiflow ships a portable skill under:

```text
skills/beautiflow/
```

The standalone executable embeds these files so installation does not require the source repository.

## Installation

```bash
beautiflow install-skill --target pi
beautiflow install-skill --target claude
beautiflow install-skill --target codex
beautiflow install-skill --local
```

A shared Agent Skills installation is also available with:

```bash
beautiflow install-skill
```

## Responsibility split

The harness provides conversation, model access, authentication, sessions, tools, approval, and optional image inspection. The skill teaches the harness to call Beautiflow. The CLI remains deterministic and model-independent.

## Bounded agent workflow

The skill discovers family-specific capabilities before acting:

```bash
beautiflow inspect diagram.mmd --agent --json
```

It classifies the request as render, preview, polish, diagnose, apply, or transform; selects the smallest supported operation; validates machine schemas; visually inspects once when vision is available; and allows at most one evidence-based correction. The complete contract is embedded at `skills/beautiflow/references/agent-protocol.md`.

Every mutation runs through the receipt-backed state machine:

```bash
beautiflow schema --json
beautiflow agent plan diagram.mmd --operation polish --json
beautiflow agent commit --receipt diagram.mmd.beautiflow-agent.json --json
beautiflow agent verify --receipt diagram.mmd.beautiflow-agent.json --json
beautiflow agent finish --receipt diagram.mmd.beautiflow-agent.json --visual-inspected --json
```

The runtime enforces `validated → applied → verified → complete`, rejects stale source, sidecar, or action hashes, permits one targeted correction, and can restore the original files with `agent rollback`. Returned commands are `argv` arrays and must never be evaluated through a shell.

When continuous preview is wanted, the user leaves this running in a separate terminal:

```bash
beautiflow server diagram.mmd
```

The skill never loops on `polish`, invents coordinates, bypasses a receipt, or mutates a render-only diagram through flowchart semantics. A task cannot report completion before the receipt reaches `complete`.

## `FLOW.md`

The nearest `FLOW.md` is durable prose context for diagrams below it. It intentionally has no schema, mandatory headings, or tuning keys. The agent reads it for principles and terminology; the deterministic CLI reports its path and content through `inspect` but does not attempt to interpret prose as geometry.

## Semantic contracts

- Agent capability discovery and stop conditions are documented in `skills/beautiflow/references/agent-protocol.md`.
- Layout actions are documented in `skills/beautiflow/references/actions.md`.
- Topology transformations are documented in `skills/beautiflow/references/transformations.md`.
- Quality review is documented in `skills/beautiflow/references/quality-rubric.md`.

Agents should emit these actions rather than raw coordinates or ad hoc source rewrites.

## Updating the embedded skill

When skill files change:

1. Update the canonical files under `skills/beautiflow/`.
2. Ensure `src/skill.ts` imports and writes every reference.
3. Run `bun run validate`.
4. Build the standalone executable.
5. Install into a temporary local target and verify file contents.
