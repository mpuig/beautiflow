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
- `architecture-beta` → Mermaid parser, icon registry, and native renderer; large multilevel diagrams then use Beautiflow's compound ELK stability fallback and orthogonal routing

YAML frontmatter is skipped during family detection and remains available to Mermaid for architecture theme and layout configuration. Unknown families fail explicitly.

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

The compound fallback measures actual icon dimensions and separately measures label boxes. ELK receives those measured footprints instead of fixed placeholder sizes. Labels wrap at word boundaries and move to an unused side when a connector needs the bottom port; this keeps labels out of terminal paths. Its label audit counts mid-word splits and labels longer than two lines. Natural two-line labels are allowed.

`architecture-beta` uses Mermaid 11 for parsing, labels, icons, boundary styling, and its native fCoSE layout on normal-sized diagrams, matching Mermaid’s documented renderer. For large diagrams with at least 14 services and multilevel groups, Beautiflow applies a bounded stability fallback: the same compound ELK engine used by Beautiful Mermaid replaces unstable fCoSE coordinates while retaining Mermaid’s architecture visuals. Generated IDs are normalized for deterministic output. The standalone renderer registers:

- `logos:` — CC0 SVG Logos, including colored AWS service marks
- `lucide:` — ISC-licensed neutral actors and infrastructure symbols
- `aws:` — AWS-logo aliases plus Lucide fallbacks for services absent from the logos collection

Architecture diagrams support SVG, PNG, transparency, frontmatter configuration, explicit `T/B/L/R` ports, nested groups, Mermaid `align row`/`align column` directives in the native path, and live preview. Native diagrams retain Mermaid’s straight and single-elbow connectors. The complex-diagram fallback uses Beautiflow’s shared visibility-grid/A* Manhattan router, preserves every explicit port including external actors, avoids icon/label/header boxes, and penalizes shared channels. It uses neutral solid relationships: neither provider names, group IDs, nor a longest-path heuristic determine request-flow meaning. AWS, GCP, Azure, built-in icons, and custom registered icon families share the same geometry code.

The fallback accepts a deliberately bounded subset: explicit service/group declarations and unlabelled service-to-service edges with ports. Junctions, group endpoints, labelled edges, alignment directives, and unrecognized syntax retain the complete native render rather than silently losing semantics. Architecture diagrams support the public `audit` command but do not currently support terminal output, sidecar layout actions, diagnose, transform, or polish.

Architecture audit reports `coverage: compound-geometry` for the fallback, including detached endpoints, port direction violations, icon overlaps, label collisions, edge/icon intersections, and header crossings. Native output reports `coverage: native-renderer-only` and `score: null`; a successful native render is not an unmeasured 100/100. Neither mode validates cloud architecture semantics or text readability at an arbitrary thumbnail size.

## SVG

The vendored Beautiful Mermaid renderer owns node shapes, clipping, labels, groups, arrowheads, and most family-specific presentation. Beautiflow materializes CSS variables into concrete colors because resvg does not implement every browser CSS fallback used by the upstream SVG. Architecture SVGs always retain Mermaid’s icon and boundary styling. Mermaid owns normal architecture placement and connectors; Beautiflow owns placement and route geometry only when the complex-diagram stability fallback is activated.

## PNG

PNG is rendered from the final SVG with `@resvg/resvg-js` at 2× scale. System fonts are enabled with Arial as the final fallback. The native resvg dependency makes compiled executables host-targeted. JSDOM is loaded only for architecture rendering; its default stylesheet is embedded and its unused synchronous-XHR worker path is removed during compilation so the executable does not depend on the build machine's `node_modules`.

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
