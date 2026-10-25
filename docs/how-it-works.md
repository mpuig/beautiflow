# How it works

Your coding agent turns your intent into Mermaid. Beautiflow supplies deterministic operations for rendering, inspecting and safely changing supported diagrams. There is no hosted model, embedded chat or separate model subscription.

## Describe, render, inspect

Start with the question the diagram should answer. The agent chooses a notation and authors a new source, or inspects an existing file. Beautiflow reports what that diagram type supports before the agent chooses an operation.

All 32 types render and preview. Flowcharts and state diagrams support layout and polish. Architecture supports measured audit and bounded source edits. Other types have more limited checks. The [type reference](diagram-types.md) makes these distinctions explicit.

## Keep the right files

- **Mermaid (`.mmd`)** owns nodes, labels, relationships and boundaries.
- **Layout sidecars (`.beautiflow.json`)** hold presentation state for flowcharts and state diagrams. Architecture does not use them.
- **SVG and PNG** are rendered outputs, not the editable semantic source.
- **Agent receipts (`.beautiflow-agent.json`)** record a bounded operation and snapshots for rollback. They are not durable layout configuration and may contain source content.

## Check before changing

For supported mutations, the agent requests a plan, commits it, verifies the result and explicitly finishes. Hash checks reject stale inputs. A single targeted correction is allowed; repeated trial-and-error loops are not.

The harness owns conversation, approval and visual judgment. Beautiflow owns parsing, mutation preconditions, measured checks, persistence and stopping. Advice about readability does not grant permission to remove semantic content.

[Replay the actual safe-edit and refusal recordings](/dont-break-the-diagram/), or read the [agent protocol](agent-skill.md).

## Understand what a check proves

A successful render does not prove that a diagram is readable or that an AWS deployment is correct. SVG integrity, measured geometry, visual judgment and provider correctness are separate concerns. Some checks are unavailable for some types; unavailable does not mean passed.

[Quality checks and limitations](quality.md) explains the evidence. [Before & after](/examples/recipes/visual-quality/) shows bounded improvements with original artifacts retained.

## Preview without editing

`beautiflow server diagram.mmd` opens a localhost, read-only viewer. It follows saved changes and keeps the last good render visible during transient parse errors. The website examples and microsite are separate static reading surfaces, not hosted editing environments.

## Explore the artistic collection

[Boring AWS Diagrams](/boring-diagrams/) applies artistic treatments after native architecture layout. It preserves positioned labels, glyphs and relationships. These fictional systems are illustrations, not deployable infrastructure or AWS validation. Its drawing process is separate from the normal CLI workflow.
