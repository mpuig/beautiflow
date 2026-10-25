# Documentation

Create and maintain Mermaid diagrams with your coding agent. Start with a working diagram, then use the references when you need precise commands or capability boundaries.

## Getting started

- [Your first diagram](getting-started.md): install the runtime, connect your agent and export a result.
- [How it works](how-it-works.md): responsibilities, source files, checks and safe changes.
- [Diagram types](diagram-types.md): all 32 notations and their capabilities.
- [Examples](/examples.html): sources, walkthroughs and recorded demonstrations.

## Guides

- [Agent integration](agent-skill.md): Pi, Claude Code, Codex and the bounded workflow.
- [Rendering and export](rendering.md): SVG, PNG, themes and renderer limitations.
- [Live preview](server.md): follow saved changes in a read-only viewer.
- [Quality checks](quality.md): audits, diagnostics and flowchart/state polish.

## Reference

- [CLI reference](cli.md): commands, options, JSON output and exit behavior.
- [Transformations](transformations.md): source-preserving edits and architecture actions.
- [Layout sidecars](sidecar.md): flowchart/state presentation and reconciliation.

## Contributing

- [Runtime internals](architecture.md): process boundaries, modules and data ownership.
- [Development](development.md): build, test, vendor and release.

## Capability boundaries

All types support SVG/PNG, inspection and read-only preview. Flowcharts and state diagrams support measured geometry, source transformations, layout sidecars and polish. Architecture supports measured audit and bounded transforms, but no sidecar layout or automatic polish. Other types have SVG-reference checks, not geometry scores or source-editing authority.

See the [complete type reference](diagram-types.md) and [coverage limitations](quality.md). Rendering, geometry, visual quality and deployed-system correctness are different claims.
