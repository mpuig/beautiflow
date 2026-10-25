# Boring AWS Diagrams

The diagrams are not boring. Creating and maintaining them can be. Eight fictional AWS systems, ten authored views, and eight post-layout drawing treatments. The separately branded cobalt microsite does not change the main Beautiflow site's styling or navigation.

## Collection

| Source | System / view | Treatment |
| --- | --- | --- |
| [aurora.mmd](sources/aurora.mmd) | Hotel SaaS: control plane, pooled and dedicated production cells, central security account | Art Deco |
| [hermes.mmd](sources/hermes.mmd) | Cross-account publishers, tenant routing, multi-AZ pooled workers and dedicated delivery account | Ancient terracotta & ink |
| [disco.mmd](sources/disco.mmd) | Authenticated flash sales, authoritative writer, asynchronous consumers and recovery copy | 1970s disco |
| [moonshot.mmd](sources/moonshot.mmd) | Device identity, ingestion/research/audit accounts, cross-account lake and scoped research access | Blueprint |
| [reef.mmd](sources/reef.mmd) | Research/production separation, model promotion, private multi-AZ review, human acceptance | Pastel field guide |
| [diner.mmd](sources/diner.mmd) | Store identity, offline replay, reconciliation, supervisor approval and backup account | Mid-century order pad |
| [rail.mmd](sources/rail.mmd) | Operational/passenger account separation, regional projections and explicit reconnection/snapshot recovery | Transport signage |
| [mixtape.mmd](sources/mixtape.mmd) | Ingestion/processing/publication/archive accounts, scoped uploads, release gate, private CDN origin | Music zine |
| [aurora-identity.mmd](sources/aurora-identity.mmd) | Focused hotel view: verified identity, same-account private API integrations, membership and data isolation | Art Deco |
| [aurora-recovery.mmd](sources/aurora-recovery.mmd) | Focused hotel view: private AZ/subnet placements, writer/readers/shared storage, standby region and backups | Art Deco |

Open the [thumbnail collection](index.html), or share a diagram’s own URL, for example `/boring-diagrams/aurora/`, `/boring-diagrams/hermes/` or `/boring-diagrams/aurora-recovery/`. Every detail page starts in **Fit whole diagram** mode, including its saved-image fallback. Turn fit off for native-size reading and internal panning. Previous/next and related-view links navigate between real static pages; older `#aurora`-style collection links redirect to the matching page when JavaScript is enabled.

On the assembled website, the authoring prompt sits above the full-width viewer as a compact lilac brief card: **1 · Prompt → 2 · Diagram**. A two-line excerpt is visible by default; a native disclosure expands the full text. Copy works without expanding first. The shared site prompt pass applies this presentation after the underlying gallery template is generated. Prominent process links lead to the always-visible Mermaid source and measured evidence sections. The evidence summarizes native geometry, styled integrity, annotation coverage, unvalidated AWS configuration and the source hash; raw JSON, capabilities, positioned scene and source downloads remain available. Prompts are authored design briefs, not transcripts of model runs.

These are original illustrative designs, not historical architectures, deployed infrastructure, security reviews or AWS-endorsed reference architectures. AZ and region labels are symbolic. The two hotel companions expand overview aggregates; they are authored focused views, not automatic graph projections. Per-entry notes state assumptions and omitted infrastructure.

## Run and reproduce

```bash
bun scripts/build-boring-diagrams.ts
bun test test/boring-diagrams.test.ts
bun run preview:site
# http://127.0.0.1:4173/boring-diagrams/

./dist/beautiflow inspect boring-diagrams/sources/aurora.mmd --agent --json
./dist/beautiflow audit boring-diagrams/sources/aurora-recovery.mmd --json
```

If preview is running, `bun run build:site` refreshes assembled files. No external model is called by builder or browser; the coding agent authors source and code. There is no new CLI styling flag. Nothing in a local build implies publication.

## Source-owned boundary and flow annotations

Each Mermaid source carries gallery-only comments alongside its native groups/edges:

```mermaid
%% @boundary primary region
%% @edge writer volume replication | Aurora writes its distributed cluster volume.
```

Supported boundary kinds: **account, region, vpc, az, subnet, logical**. Supported relationship kinds: **request, identity, event, replication, control, recovery**. Every group and directed endpoint pair must have exactly one annotation. Duplicate/stale/unknown references fail the build. Parent checks and selected service-placement conventions keep accounts, regions, VPCs and AZs distinct and reject regional services drawn as zonal instances. These small authoring guards do not validate an AWS deployment.

Styled SVGs preserve the native routes, use distinct line patterns, attach an accessible meaning to each connector, and include a legend. The page has a complete source-derived flow table. Native exports intentionally lack the gallery's typed line styles. Native `L/R/T/B` ports are graphical attachment ports, not TCP ports or security-group rules.

These comments are not a Mermaid extension or part of the CLI mutation contract. If an agent renames IDs with a source-preserving transform, it must also synchronize gallery annotations. The gallery build rejects stale references; CLI audit/receipt verification alone does not attest these comments.

## Files and runtime

- `catalogue.ts`: stories, prompts, view relationships and architecture assumptions/limits.
- `sources/*.mmd`: canonical diagrams and authored annotations.
- `annotations.ts`: build-time coverage, containment and selected placement guards.
- `draw.js` / `draw.d.ts`: deterministic scene adapter, boundary treatments and relationship legend.
- `page.ts`: semantic HTML generator for the thumbnail index and ten detail pages; all generated HTML is synchronization-tested.
- `index.js`: redirects recognized legacy collection fragments to the corresponding detail URL without intercepting other fragments.
- `<id>/index.html`: generated standalone diagram page; all assets resolve correctly on direct visits, refresh and static hosting.
- `entries/<id>/`: generated source copy, scene, evidence, capabilities, native SVG and selected artistic SVG.
- `app.js`: detail-page lazy redraw, native comparison and fit/read mode. Fit is enabled in static HTML by default and fits both axes, trading label size for context. Turning it off enables native-size panning inside the height-bounded viewer. Fit state is independent of drawing/native selection. Saved images, visible process material and downloads remain usable without JavaScript or after a failed scene fetch.
- `site.css`, `fonts/`, `favicon.svg`: independent website identity; adjacent font licences and source URLs.

The builder uses Beautiflow's registered icons, Pele architecture rendering, local positioned geometry, inspection, native geometry audit, styled integrity and family capability discovery. jsdom is development/build-only; neither executable nor browser renderer depends on it.

## Fidelity and evidence

Preserved: service glyph paths/gradients, measured Arial labels/wrapping, service transforms and parents, group bounds and parents, explicit graphical ports, connector paths and arrowheads. Paint IDs include style and source hash. Metadata is escaped. Icon/text fragments are trusted build-produced markup, not visitor input. Browser controls do not mutate source or evaluate generated code.

The builder requires native geometry audits to have no findings and requires styled element/plain-label/ID/reference integrity. `evidence.json` separately identifies annotation coverage and records `configurationValidated: false`. Decorative ink, browser glyph differences, edge-label boxes and general provider semantics remain outside measured coverage.

Authentication does not prove tenant isolation. A replica is not a backup. Asynchronous replication is not zero-loss failover. Private network boxes do not establish firewall/IAM permissions. The sources do not implement policies, RLS, database constraints, fencing, approval services, restore procedures, global-table mode/stream configuration or deployment settings. No RTO/RPO or production-readiness claim is made. Architecture supports guarded source transformations, not automatic polish.

## Art and attribution

Original vector treatments, not screenshot filters, richly illustrated worlds, historical facsimiles or Hershey-lettering reproductions. Changing label fonts requires pre-layout measurement. The adapter rejects junctions and edge-label fragments rather than silently omitting them.

Inspired by the post-layout method at https://pele-art-diagrams.vercel.app/. Glyphs use SVG Logos (CC0), Lucide (ISC), and Pele built-ins. Neutral Lucide symbols identify services without available pack glyphs, including IoT Core, Data Firehose, MediaConvert and SageMaker fallback. These are not the official AWS Architecture Icon Package. AWS marks belong to Amazon. No raster artwork ships.
