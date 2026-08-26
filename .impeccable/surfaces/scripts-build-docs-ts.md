---
version: 1
slug: "scripts-build-docs-ts"
primary_target: "scripts/build-docs.ts"
related_targets: ["docs",".github/workflows/pages.yml","index.html"]
---

## Scope and mode

Generated technical documentation under `/docs/`; Read mode. Canonical content remains in `docs/*.md`, while `scripts/build-docs.ts` owns the static presentation.

## Audience, job, and action

Developers integrating Beautiflow need to find the relevant contract quickly, understand commands and boundaries, copy working examples, and move between related topics without returning to the repository tree.

## Proof and constraints

Only canonical repository Markdown may supply technical claims. Output must be static, accessible, responsive from 320px, dependency-free at runtime beyond web fonts, and generated rather than committed. Internal links use clean web routes; every page links back to its GitHub source.

## Chosen direction

A technical field manual extends the landing page's drafting paper, evergreen machinery, lime state signals, coral focus, Bricolage display type, and Source Sans reading face. A connected chapter rail makes documentation feel like following a validated route.

## Memorable moment

The desktop chapter rail traces a live route through the documentation; on narrow screens it collapses into a compact, sticky chapter switcher while wide tables become explicitly swipeable.
