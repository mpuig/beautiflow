# Rendering pipeline

## Family detection

`diagramFamily()` inspects the Mermaid header before choosing a renderer:

- `graph`, `flowchart`, `stateDiagram-v2` → project graph pipeline
- `sequenceDiagram` → Beautiful Mermaid sequence renderer
- `classDiagram` → Beautiful Mermaid class renderer
- `erDiagram` → Beautiful Mermaid ER renderer
- `xychart` → Beautiful Mermaid XY renderer
- `pie` → Beautiflow pie renderer
- `gitGraph` → Beautiflow GitGraph renderer
- `architecture-beta` → pinned Pele parser and renderer with Beautiflow's Iconify adapter

YAML frontmatter is skipped during family detection and remains available to the selected renderer. Pele reads supported architecture configuration (such as icon size and padding); Mermaid-specific fCoSE settings are no longer used. Beautiflow theme names remain authoritative for exported colors. Unknown families fail explicitly.

Sequence output uses the theme foreground for message labels rather than the muted secondary color. This keeps essential request and response text readable in dark palettes while preserving connector and arrow colors.

Every SVG output receives an accessible name automatically. Beautiflow emits `role="img"`, stable `aria-labelledby` IDs, a first-child `<title>`, and a `<desc>`. Authored Mermaid `accTitle` and `accDescr` values take precedence; frontmatter or diagram titles and then the input filename provide deterministic fallbacks. Flowchart and state fallbacks summarize node and relationship counts plus visible entry labels. IDs derive from source and rendered content, so absolute and relative paths produce the same SVG while genuinely different variants remain collision-resistant. The same annotated SVG is used for PNG rasterization.

## Full graph pipeline

```text
Mermaid source
  → Beautiful Mermaid parse
  → ELK positioned graph
  → sidecar overrides
  → edge route selection
  → Beautiful Mermaid SVG renderer
  → explicit color materialization
  → optional resvg PNG
```

Untouched edges retain ELK routes. Edges connected to manually moved nodes use Beautiflow’s deterministic Manhattan router, which builds a visibility grid around expanded node obstacles and runs A* with bend penalties. Fixed port stubs ensure arrows enter and leave node boundaries perpendicularly.

Positioned ELK edges are matched to semantic edges by source/target endpoint queues. Array-index matching is unsafe because ELK may reorder edges around subgraphs or disconnected components.

## Architecture diagrams

`architecture-beta` uses Pele 1.10.0 for synchronous, deterministic parsing, placement, and SVG rendering without DOM, canvas, or randomness. Pele targets Mermaid 12.1 syntax but owns its layout and visual style; it does not promise pixel parity with Mermaid.js. The same renderer handles small and large diagrams, eliminating the previous native/fallback split. The standalone adapter resolves:

- `logos:` — CC0 SVG Logos, including colored AWS service marks
- `lucide:` — ISC-licensed neutral actors and infrastructure symbols
- `aws:` — AWS-logo aliases plus Lucide fallbacks for services absent from the logos collection

Architecture supports SVG, PNG, transparency, supported frontmatter configuration, explicit `T/B/L/R` ports, nested groups, junctions, labelled edges, `align row`/`align column` directives, and live preview. Iconify viewBoxes are retained and gradient IDs are scoped deterministically per icon occurrence. Pele's source/output limits remain enforced. Beautiflow does not infer primary traffic from provider names or graph length.

Architecture does not support terminal output, sidecar layout actions, diagnose, transform, or polish. The public `audit` command validates rendering and reports `coverage: pele-renderer-only`, `score: null`, and `metrics: null`. Pele does not expose positioned route geometry through its public API; the previous compound-geometry audit is unavailable. A successful render is not an unmeasured 100/100. Review attachment points, overlaps, labels, cloud semantics, and readability in the final artifact.

## SVG

The vendored Beautiful Mermaid renderer owns node shapes, clipping, labels, groups, arrowheads, and most family-specific presentation. Beautiflow materializes CSS variables into concrete colors because resvg does not implement every browser CSS fallback used by the upstream SVG. Pele owns architecture placement, labels, boundaries, and connectors. Beautiflow adapts Iconify assets, resolves Pele CSS variables to concrete values for export, adds an explicit background unless transparent, and applies accessibility fallbacks. Rendering defaults never depend on preview container width.

## PNG

PNG is rendered from the final SVG with `@resvg/resvg-js` at 2× scale. System fonts are enabled with Arial as the final fallback. The native resvg dependency makes compiled executables host-targeted. Architecture rendering requires no DOM runtime or canvas native library. JSDOM is test-only; the executable does not depend on the build machine's `node_modules`.

## Themes

Theme names come from Beautiful Mermaid. List them with:

```bash
beautiflow themes
```

Sidecars may persist a theme. A render command’s explicit `--theme` wins over the sidecar.

## Transparency

`--transparent` omits the background rectangle. Non-transparent rendering inserts an explicit background so browser SVG and resvg PNG output remain consistent.

## Example compatibility suite

`examples/sources/` contains 19 original diagrams spanning the original supported families. The six-stage AWS recipe under `examples/recipes/aws-architecture/` exercises `architecture-beta`, icon packs, explicit ports, group boundaries, and horizontal presentation layouts. Each source has a matching Markdown walkthrough and a committed SVG or PNG generated by the exact command in that guide. The gallery varies format, theme, and transparency. The `examples/recipes/render-options/` recipe renders one additional source with LR/TD sidecar layouts, themed SVG, opaque and transparent PNG, Unicode, and ASCII for direct comparison. `test/examples.test.ts` verifies source/guide equivalence, reproduction metadata, artifacts, and rendering.
