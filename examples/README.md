# Beautiflow examples

This directory contains 19 original, runnable Mermaid examples covering every diagram family currently rendered by Beautiflow. Each example has:

- A Markdown walkthrough with an inline Mermaid preview
- A matching raw `.mmd` file under [`sources/`](sources/)
- A committed SVG or PNG under [`rendered/`](rendered/)
- The exact command used to reproduce that artifact
- A command for live preview
- A suggested prompt for Pi, Claude Code, or Codex

## Start here

```bash
beautiflow server examples/sources/01-subscription-intake.mmd
```

Then ask your agent:

```text
Use the Beautiflow skill to improve examples/sources/01-subscription-intake.mmd. Show structural changes before applying them.
```

## Full flowchart and state pipeline

These support layout, audit, diagnose, transformations, sidecars, and polish:

1. [Subscription intake](01-subscription-intake.md)
2. [Editorial review lifecycle](04-editorial-review-lifecycle.md)
3. [Release branch flow](06-release-branch-flow.md)
4. [Edge platform architecture](07-edge-platform-architecture.md)
5. [Data release pipeline](08-data-release-pipeline.md)
6. [Storage selection guide](09-storage-selection.md)
7. [Product launch handoffs](10-product-launch-handoffs.md)
8. [Shape language](12-shape-language.md)
9. [Observability routing](19-observability-routing.md)

## Specialized renderers

These support SVG/PNG rendering and live preview:

- Sequence diagrams:
  - [Studio booking](02-studio-booking-sequence.md)
  - [Support escalation](15-support-escalation-sequence.md)
  - [Marketplace order](16-marketplace-order-sequence.md)
  - [Device sync](17-device-sync-sequence.md)
  - [Cache refresh](18-cache-refresh-sequence.md)
- [Plugin class model](03-plugin-class-model.md)
- [Community library ERD](05-community-library-erd.md)
- [Release train GitGraph](11-release-train-history.md)
- Pie charts:
  - [Team capacity](13-team-capacity.md)
  - [Research synthesis](14-research-synthesis.md)

## Recipes

- [Build an AWS architecture from scratch](recipes/aws-architecture/README.md) grows six prompt-driven `architecture-beta` snapshots into a horizontal, icon-rich production diagram for presentation slides.
- [One diagram, multiple render options](recipes/render-options/README.md) compares LR/TD layouts, SVG, PNG, light and dark themes, transparency, Unicode, and ASCII using the same source.
- [Architecture actions](recipes/architecture/README.md) demonstrates the difference between sidecar-only `apply` actions and source-changing `transform` actions with ready-to-run JSON files.

## Render variety

The gallery intentionally varies SVG and PNG output, all 15 built-in themes, and opaque or transparent backgrounds. This makes the examples both a learning surface and a broad visual regression set.

## Safe experimentation

The examples are intentionally small enough to reset with source control. `polish`, `layout`, and `apply` may create adjacent `*.beautiflow.json` files; `polish` also exports SVG and PNG. `server` is read-only and never changes files.
