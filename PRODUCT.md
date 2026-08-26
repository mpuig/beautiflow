# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers working on Mermaid diagrams through conversational coding agents such as Pi, Claude Code, and Codex. They keep a browser preview visible beside the chat while the agent edits files.

## Product Purpose

Beautiflow turns Mermaid source into polished, validated diagrams. Its server mode provides a continuously updating, read-only browser view of the latest saved diagram while a separate agent session changes the source or layout.

## Positioning

Beautiflow keeps model access and conversation in the agent harness while owning deterministic parsing, transformation, layout, validation, persistence, rendering, and live preview.

## Operating Context

The user runs `beautiflow server <diagram.mmd>` in parallel with an agent chat. The server watches the Mermaid source and Beautiflow sidecar, renders exactly what is saved, and updates the browser without requiring refreshes or mutating project files.

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
