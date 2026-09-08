# Creating a diagram

## Compose before rendering

1. Read the nearest `FLOW.md`. Identify the audience and the single question the diagram should answer. Infer these from the request where possible.
2. When describing a repository, read the relevant implementation. Distinguish observed relationships from proposed architecture; never infer calls from folder names alone.
3. Choose the family by the question: flowchart for branching work, state for lifecycle, sequence for ordered interactions, architecture for services and boundaries, ER for data relationships.
4. Choose one primary path. Include the unchanged neighbours necessary to explain it. Group by responsibility, runtime, or trust boundary rather than directory structure.
5. Aim for a readable overview, roughly 8–12 primary nodes when appropriate, not a mandatory limit. If essential detail overwhelms it, create a separately scoped detail view rather than deleting meaning. Do not duplicate essentially the same diagram across views.
6. Use stable domain IDs, short active labels, and explicit branch conditions. Keep retries and failure paths visible but secondary. Preserve protocols, directions, and synchronous/asynchronous distinctions.

## First artifact and validation

For architecture, separate request traffic from control, identity, delivery, and telemetry relationships. Verify provider semantics using authoritative documentation; an icon or service name does not establish where it belongs or how it connects. Use the same composition principles for AWS, GCP, Azure, on-premises, and mixed systems. Do not infer a primary path from the longest chain. Keep complete references and separately authored focused views distinct; never imply a focused example is an automatic projection when it is not.

The harness owns initial authorship: write Mermaid only to a new, user-authorized path, never overwrite an existing source or sidecar. Beautiflow has no receipt-backed create operation. If the destination exists, inspect it and use supported transformations instead.

Inspect the new file with `beautiflow inspect <file> --agent --json`. Follow the returned family capabilities. For flowchart/state layout improvement, enter the normal receipt-backed polish workflow. For render-only families, render and report that geometric auditing is unavailable; do not pass them through the flowchart model. Architecture supports its own audit, not polish.

Inspect one final rendered image when vision is available. Spend at most the existing one targeted correction on a named defect. For geometry findings, use only supported semantic actions from the schema and the finding's `supportedFixes`; these are repair options, not guaranteed fixes. Never invent coordinates or remove a required node, edge, or meaningful label to pass validation.

Keep semantic validation, deterministic geometry checks, and perceptual review distinct. A successful render is not proof of correctness or readability. Report unavailable checks as unavailable. Review the exact current output, not a stale last-good preview after a failed render.
