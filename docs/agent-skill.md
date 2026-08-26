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

## Simple workflow

The skill prefers:

```bash
beautiflow polish diagram.mmd --json
```

When continuous preview is wanted, the user leaves this running in a separate terminal:

```bash
beautiflow server diagram.mmd
```

The agent uses advanced `transform` or `apply` actions only for a specific semantic or visual change.

## `FLOW.md`

The nearest `FLOW.md` is durable prose context for diagrams below it. It intentionally has no schema, mandatory headings, or tuning keys. The agent reads it for principles and terminology; the deterministic CLI reports its path and content through `inspect` but does not attempt to interpret prose as geometry.

## Semantic contracts

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
