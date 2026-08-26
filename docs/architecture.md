# Architecture

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

This keeps the executable deterministic and lets each agent harness use its existing credentials, sessions, and tools.

## Main modules

```text
src/cli.ts
  ├─ args.ts                 command parsing
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
  ├─ diagram/architecture.ts Mermaid architecture, icons, DOM/canvas adapter
  ├─ diagram/architecture-layout.ts compound ELK placement and orthogonal routing
  ├─ server.ts               live read-only preview
  └─ skill.ts                embedded Agent Skill installer
```

## Data ownership

Mermaid is the semantic source of truth:

```text
architecture.mmd
```

Beautiflow presentation state is separate:

```text
architecture.beautiflow.json
```

Semantic transformations update Mermaid. Layout actions update the sidecar. Rendering combines both.

## Rendering families

Flowchart and state diagrams use the complete project pipeline. Sequence, class, ER, and XY charts route through Beautiful Mermaid’s specialized renderers. Pie and GitGraph use deterministic Beautiflow renderers. `architecture-beta` uses Mermaid’s native renderer by default and adds a compound ELK stability fallback for large multilevel diagrams. See [Rendering](rendering.md).

## Determinism

- Layout candidate presets and tie-breaking are stable.
- Actions reference stable node IDs.
- Source transformations reparse and compare the resulting graph before writing.
- Audits reject overlaps and edge-to-node intersections.
- Preview renders saved state exactly and never invokes `polish`.

## Standalone executable

Bun compiles TypeScript, Beautiful Mermaid, ELK, resvg, the browser viewer, and the Agent Skill into one host-targeted executable. PNG support includes a native resvg library, so release binaries must be built per operating system and architecture.
