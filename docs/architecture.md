# Runtime internals

## Process boundary

Beautiflow intentionally contains no model client or chat loop.

```text
Pi / Claude Code / Codex
  conversation · model access · approval · image inspection
                     │
                     ▼
              Beautiflow CLI
  parse · transform · layout · audit · persist · render · preview
```

This keeps the executable deterministic and lets each agent harness use its existing credentials, sessions, and tools. Harnesses own intent and optional vision; the receipt-backed runtime enforces mutation preconditions, execution budgets, validation transitions, rollback, and terminal stop states.

## Main modules

```text
src/cli.ts
  ├─ args.ts                 command parsing
  ├─ agent.ts                capability discovery and bounded operation contract
  ├─ agent-runtime.ts        receipt state machine, hash gates, rollback, and budgets
  ├─ schemas.ts              machine-discoverable action and receipt contracts
  ├─ doctor.ts               local environment and diagram readiness checks
  ├─ diagram/project.ts      Mermaid + sidecar loading
  ├─ diagram/layout.ts       ELK candidates and constrained routing
  ├─ diagram/audit.ts        geometric metrics
  ├─ diagram/semantic.ts     flow diagnostics
  ├─ diagram/actions.ts      visual semantic actions
  ├─ diagram/transform.ts    topology transformations
  ├─ diagram/source-editor.ts minimal Mermaid source patches
  ├─ diagram/polish.ts       bounded orchestration
  ├─ diagram/pipeline.ts     family routing and output
  ├─ diagram/svg.ts          Beautiful Mermaid SVG adaptation
  ├─ diagram/specialized.ts  pie and GitGraph rendering
  ├─ diagram/architecture.ts architecture rendering entry point
  ├─ diagram/pele.ts         all-family Pele runtime, structured errors, icons, concrete colors
  ├─ diagram/architecture-analysis.ts structural diagnosis, geometry and render integrity
  ├─ diagram/architecture-transform.ts bounded source-preserving architecture edits
  ├─ vendor/pele-architecture/ additive geometry renderer with upstream SVG parity
  ├─ server.ts               live read-only preview
  └─ skill.ts                embedded Agent Skill installer
```

## Data ownership

Mermaid is the semantic source of truth:

```text
architecture.mmd
```

For flowchart and state diagrams, Beautiflow presentation state is separate (architecture diagrams do not use sidecars):

```text
architecture.beautiflow.json
```

Semantic transformations update Mermaid. Layout actions update the sidecar. Rendering combines both.

## Rendering families

Flowchart and state diagrams use the complete project pipeline. Sequence, class, ER, and XY charts route through Beautiful Mermaid’s specialized renderers. Pie and GitGraph use deterministic Beautiflow renderers. `architecture-beta` uses Pele's synchronous DOM-free parser and renderer for every size, with explicit ports and registered icons. Flowchart/state sidecars and ELK remain unchanged. All other Pele types are exposed as render-only families. Architecture additionally has structural diagnostics, positioned-geometry audit, integrity checks, and receipt-backed transformations. Its additive geometry extension is pinned and reproducible, not an upstream public API. See [Rendering](rendering.md).

## Determinism

- Layout candidate presets and tie-breaking are stable.
- Actions reference stable node IDs.
- Source transformations reparse and compare the resulting graph before writing.
- Audits reject overlaps and edge-to-node intersections.
- Preview renders saved state exactly and never invokes `polish`.

## Standalone executable

Bun compiles TypeScript, Beautiful Mermaid, Pele, ELK, resvg, Iconify assets, the browser viewer, and the Agent Skill into one host-targeted executable. PNG support includes a native resvg library, so release binaries must be built per operating system and architecture. No DOM or canvas runtime is required; JSDOM is development-only for tests and experimental site generation. CI then hides `node_modules` and verifies version output, agent inspection, and architecture rendering from the executable.
