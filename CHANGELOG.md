# Changelog

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
