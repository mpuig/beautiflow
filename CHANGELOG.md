# Changelog

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
