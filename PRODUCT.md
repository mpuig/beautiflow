# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers working on Mermaid diagrams through conversational coding agents such as Pi, Claude Code, and Codex. They keep a browser preview visible beside the chat while the agent edits files.

## Product Purpose

Beautiflow gives coding agents bounded authority to improve Mermaid diagrams. It turns intent into a capability-aware plan, a receipt-backed mutation, deterministic verification, optional visual correction, and an explicit terminal state.

## Positioning

Beautiflow is the deterministic diagram runtime for coding agents. Its CLI is a machine-first agent protocol, not primarily a human workflow, although every primitive remains directly invocable. Model access, conversation, intent, and vision stay in the harness; Beautiflow owns mutation authority, schemas, preconditions, parsing, transformation, layout, validation, rollback, persistence, rendering, and stopping.

## Operating Context

A coding agent starts with `beautiflow inspect <diagram.mmd> --agent --json`, selects one supported operation, and follows safe `argv` transitions through plan, commit, verify, optional correction, and finish. The user may keep `beautiflow server <diagram.mmd>` open as a read-only view of saved source and sidecar state.

## Capabilities and Constraints

- Bun and TypeScript compiled into a standalone host-targeted executable.
- Server mode is local, read-only, and zero-configuration by default.
- It does not run polish automatically.
- It has no visual editing, tldraw, embedded chat, or model integration.
- Flowchart and state diagrams use the complete layout pipeline; specialized Mermaid families use render-only pipelines.
- `architecture-beta` preserves Mermaid’s native renderer for normal diagrams and uses a deterministic compound ELK stability fallback for large multilevel diagrams, with explicit ports and registered AWS/Lucide icon packs.
- The normal interface must remain simple and avoid exposing unnecessary options.
- Agent integrations discover family-specific capabilities, mutation boundaries, JSON Schemas, safe argument arrays, execution budgets, and stop conditions through a versioned JSON contract.
- Every agent mutation uses a receipt-backed state machine with stale-input rejection, validated evidence, rollback, and explicit terminal states.
- Agent autonomy is mechanically bounded to one initial operation, one evidence-based correction, and one visual inspection; failed validation always stops mutation.

## Brand Commitments

The product is named Beautiflow. The tone is clear, calm, direct, and technically trustworthy. The diagram remains the visual focus.

## Evidence on Hand

The repository includes a 19-file original Mermaid example suite spanning every supported family under `examples/`.

## Product Principles

- Keep the common path to one obvious command.
- Make agents proactive about discovery and conservative about mutation.
- Preview never mutates source files.
- The artifact leads; viewer chrome stays secondary.
- Failures remain visible and actionable without replacing the last good render.
- Conversation belongs to the agent harness; deterministic work belongs to Beautiflow.

## Accessibility & Inclusion

The preview must be keyboard-readable, use semantic status text, maintain strong contrast, respect reduced motion, and remain usable at narrow and wide browser sizes.
