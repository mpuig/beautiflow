# Changelog

## 1.0.1

- Exposed 32 diagram types supported by Pele, preserving existing family renderers and keeping new families render-only.
- Added 23 original scenario-led examples with reproducible SVGs, PNG checks, capability checks, and terminal-output boundaries. The HTML gallery gives wide diagrams a full row and portrait diagrams a taller stage; sample data is explicitly illustrative.
- Added architecture structural diagnostics, model-to-render integrity, and measured geometry via a pinned additive Pele module extension with byte-exact upstream SVG parity.
- Added source-preserving architecture rename/relabel, containment moves, directed relationships, and bounded reconnections through the receipt state machine.
- Preserved structured Pele syntax, semantic, limit, family, and source-location evidence in CLI JSON errors.

## 1.0.0

- Added accessible SVG names and descriptions with authored Mermaid metadata and deterministic fallbacks.
- Added readability diagnostics for stacked endpoints, label overflow, and group-header collisions, with issue-specific repair guidance.
- Added informational composition guidance for detail budgets, focused views, weak labels, and fan-in without authorizing semantic deletion.
- Embedded curated semantic patterns and added a 34-diagram visual contact sheet with accessibility validation.

- Migrated `architecture-beta` to pinned Pele 1.10.0 with deterministic, synchronous rendering and registered AWS/Lucide icons.
- Removed Mermaid, JSDOM, and napi-rs canvas from the executable; JSDOM remains test-only.
- Preserved themes, accessibility, transparency, and PNG exports; regenerated architecture fixtures with Pele's layout.
- Architecture audit now reports `pele-renderer-only` coverage with null score and metrics. The previous compound geometry checks are unavailable because Pele does not expose positioned routes.
- Flowchart/state ELK, sidecars, transformations, and polish remain unchanged.

## 0.9.0

- Prevented first-use polish from accepting layouts below the incumbent geometry score, including diagrams without a sidecar.
- Preserved normalized ELK geometry, routes, labels, and group bounds across candidate persistence by recording layout spacing. Older binaries can read the sidecar but may render differently.
- Added pre-plan baseline verification to polish receipts, retained through targeted correction.
- Improved provider-neutral compound architecture layout, explicit-port routing, measured label placement, and geometry audit coverage.
- Added focused architecture views, refreshed visual examples, and unified the homepage, examples, and documentation preview.
- Added regression coverage for persistence, initialization rejection, and receipt baseline checks.

## 0.8.0

### Agentic-first runtime

- Added an enforced receipt-backed agent state machine: `plan → commit → verify → finish`, with explicit terminal states.
- Added source, sidecar, and action hash preconditions that reject stale validated evidence.
- Added one mechanically enforced targeted correction and transaction rollback to the original source and sidecar snapshot.
- Added `beautiflow schema --json` with published action, transformation, and receipt JSON Schemas.
- Upgraded capability discovery to protocol 1.1 with safe `argv` arrays instead of shell command strings.
- Added structured JSON error envelopes for every `--json` failure.
- Added realistic state transition, stale receipt, correction budget, rollback, schema, and JSON error tests.

### Documentation site

- Added a responsive HTML documentation site generated from the canonical Markdown sources.
- Added clean documentation routes, chapter navigation, local tables of contents, copyable code blocks, and GitHub edit links.
- Added build and link regression coverage for generated documentation.

## 0.7.1

- Embedded JSDOM's runtime stylesheet in the standalone executable.
- Removed JSDOM's unused synchronous-XHR worker dependency from compiled builds.
- Added CI smoke tests that run version, agent inspection, and architecture rendering with `node_modules` unavailable.

## 0.7.0

### Agentic production hardening

- Added `inspect --agent --json` capability discovery across every supported Mermaid family.
- Added explicit mutation boundaries, recommended operations, execution budgets, and evidence-based stop conditions.
- Added `doctor [file] --json` for local environment, Agent Skill, permissions, context, parsing, and rendering checks.
- Added consistent `ok`, `operation`, `changed`, `warnings`, `files`, and `nextAction` fields to mutating and quality-command JSON results.
- Upgraded the portable Agent Skill to a bounded intent → discover → execute → validate → inspect → stop state machine.
- Added agent-protocol and doctor regression tests.
- Added CodeQL and dependency-review workflows.
- Added Sigstore signing and SPDX SBOM generation to tagged releases.
- Added a checksum-verifying one-command installer at `https://beautiflow.cc/install.sh`.
- Added the `beautiflow.cc` developer site and custom-domain deployment.

## 0.6.0

- Added Mermaid 11 `architecture-beta` rendering with packaged icon registries.
- Added deterministic compound ELK fallback layout for large multilevel architecture diagrams.
- Added architecture visual-quality metrics, auditing, primary-path routing, and support-path styling.
- Added the progressive AWS architecture example suite.
