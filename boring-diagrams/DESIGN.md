---
name: Boring AWS Diagrams
description: Eight fictional systems, eight drawing treatments.
colors:
  cobalt: '#253bd5'
  cool-paper: '#f2f2f9'
  ink: '#25263d'
  rule: '#c4c6de'
  index-field: '#e4e5f4'
  reading-field: '#dedff0'
  code-field: '#e3e5f1'
  secondary-ink: '#494e75'
  focus: '#b1426c'
  brief-ink: '#242da1'
  brief-paper: '#e8e6fa'
  brief-rule: '#c2bdea'
  brief-accent: '#d2c8f5'
  opening-accent: '#f3b8cb'
  footer-secondary: '#e4e7ff'
  selected-hover: '#1d2eae'
  thumbnail-field: '#e3e4ee'
  native-field: '#f4f6f2'
  navigation-hover: '#d8daf3'
  control-hover: '#dfe1f9'
  scrollbar-track: '#dfe1ef'
typography:
  display:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(48px,6.4vw,92px)'
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: '-0.035em'
  headline:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(28px,3vw,42px)'
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: '-0.025em'
  display-tablet:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(48px,7vw,72px)'
  display-mobile:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(46px,11.6vw,70px)'
  detail-title:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(36px,4vw,60px)'
  detail-title-mobile:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(30px,8vw,44px)'
  thumbnail-title:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(20px,1.8vw,28px)'
  thumbnail-title-mobile:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: '23px'
  process-heading:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: 'clamp(24px,2.2vw,32px)'
  process-heading-mobile:
    fontFamily: 'Archivo Black, sans-serif'
    fontSize: '27px'
  opening-copy:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: 'clamp(18px,1.6vw,23px)'
  opening-copy-mobile:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '19px'
  sidebar-heading:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '22px'
  compact-body:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '15px'
  micro-label:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '12px'
  thumbnail-role-mobile:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '11px'
  body:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '16px'
    lineHeight: 1.6
  story:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '16px'
    lineHeight: 1.65
  label:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '14px'
  caption:
    fontFamily: 'Public Sans, sans-serif'
    fontSize: '13px'
  diagram:
    fontFamily: 'Arial'
    fontSize: '16px'
spacing:
  gutter: 'clamp(20px,4vw,64px)'
components:
  selected-view:
    backgroundColor: '{colors.cobalt}'
    textColor: '{colors.cool-paper}'
    padding: '9px 14px'
  unselected-view:
    textColor: '{colors.cobalt}'
    padding: '9px 14px'
---

# Design System: Boring AWS Diagrams

## Overview

**Creative North Star: "The architecture print studio"**

A separately branded microsite inside the Beautiflow repository. Cobalt fields and heavy, compact lettering frame an open collection of vector architecture specimens. It deliberately replaces the parent site's paper/evergreen/Bricolage identity within this route only.

The website is the common frame; each drawing owns its own palette and ornament. Flat geometry is the medium. It does not pretend to be a photograph or a scanned historical artefact.

**Key Characteristics:**
- Saturated cobalt navigation and opening.
- Self-hosted display and reading faces.
- Open exhibit sheets, not nested cards.
- Native geometry and recognizable service glyphs.
- Inspectable source, notes and measured evidence.
- Explicit account, region, VPC, AZ, subnet and logical boundaries.
- Distinct patterns for requests, credentials, events, replication, control and recovery.

## Colors

Cobalt carries the opening, navigation, selected controls and footer. Cool lilac fields support reading without borrowing the parent site's warm paper. Ink and secondary ink remain legible against those fields. Focus uses a contrasting muted magenta.

Drawing palettes live in `draw.js`, independent of website tokens: terracotta/ink for Hermes; plum/amber/pink for disco; drafting blue/white for mission control; emerald/brass for the hotel; sea-glass/coral for the observatory; cream/cherry/mint for the diner; signal yellow/black for transit; two-colour pink/toner for the zine. Registered glyph colours are not recoloured.

**The Two Layers Rule.** Website identity frames the collection; drawing identity belongs to the individual specimen.

## Typography

Archivo Black supplies display and exhibit headings. Public Sans supplies body, navigation, controls and captions. Both are self-hosted WOFF2 with adjacent SIL OFL licences and source URLs. Monospace is restricted to code.

Diagram labels retain Pele's measured Arial fragments, wrapping and positions. This is a geometry-preservation requirement, not the site's display voice. Different lettering must be measured before layout, never substituted after it.

## Layout

The landing page is a visible two-column thumbnail collection, not a collapsed index followed by ten large viewers. Each image and its title/question form one link to a standalone `/<id>/` diagram page. Whole-drawing thumbnails use aspect-preserving containment without cropping. Mobile uses one column. The full-width cobalt opening, display typography and main-site separation remain unchanged.

Detail pages have back/previous/next links, a compact title/story, a prominent Prompt / Source / Evidence navigation strip, and one drawing. In the assembled site, a lilac brief card precedes the full-width viewer: 1 · Prompt, then 2 · Diagram. The card has a two-line excerpt, a native full-text disclosure and an always-visible enhanced copy action. The shared site prompt pass replaces the authoring template’s sidebar. Mermaid source and measured evidence are always-expanded sections below it. On narrow screens the prompt, viewer, source and evidence stack in that order; process anchors keep all three materials directly reachable.

The assembled viewer is single-column at all widths. At 760px the source/evidence columns stack; at 650px the collection becomes single-column. Fit is enabled in static HTML, including without JavaScript. Desktop fit height is `clamp(340px,48vh,680px)` and compact screens use 62vh, bounded by a 70vh scroll region. It preserves the complete drawing’s aspect ratio and trades label size for context. Turning fit off restores measured artwork width (minimum 860px, 900px below 650px) and internal two-axis panning. Source code and flow tables scroll locally; source hashes wrap. Native layout obeys the same fit rules, including a zero minimum width when fitted.

## Elevation & Depth

Flat fields, boundaries and colour inversion. No drop shadows, simulated embossing, raster texture, photographic masks or ornamental gradients. Ornament is explicit SVG paths/patterns inside the drawing, not screenshot filtering.

## Shapes

Square-edged website controls and open sections. Drawing panels follow native service/group bounds; inset frames, hatching, registration marks, drafting grids, mirrored tiles and halftones add visual treatment without moving routes or text. Source-owned boundary kinds change outline weight/dash patterns while explicit native labels name the boundary. Relationship patterns and a footer legend distinguish six authored flow kinds without inventing edge-label coordinates. SVG viewBox and outer frames provide breathing room around the native geometry.

## Components

- **Collection index:** visible thumbnail links with title, overview/focused role, treatment and architectural question. Each opens a real static page; no scene hydration or large viewers run on the index. An isolated script forwards recognized old hash URLs to their matching page; other fragments are left alone.
- **Drawing/native comparison:** pressed-state button pair; selected is inverted cobalt. It changes only the view and download target. A separate pressed-state fit control preserves zoom mode across comparisons and resets pan when toggled. Source is never mutated. Controls are hidden without JavaScript.
- **Drawing window:** saved SVG leads; trusted scene data hydrates into live SVG near the viewport. A failed fetch leaves the saved image usable and announces fallback. Both views have direct links.
- **Process material:** a preview-first authoring brief above the diagram, always-visible source/code download and always-visible evidence summary with raw JSON links. Native geometry findings, styled integrity, annotation counts, unvalidated provider configuration and full source SHA-256 are distinguished. Briefs are not claimed as recorded model conversations.
- **Supporting detail:** native disclosures retain every source-owned relationship and architecture assumption/omission. Related-view links open the hotel overview, tenant-isolation and recovery pages. Eight systems still use ten authored views and eight treatments.
- **Browser states:** coloured selection/scrollbars, visible focus, underlined text links and reduced-motion scroll behaviour. No automatic cycling or repeated entrance animation.

## Do's and Don'ts

- Do say that drafting and maintenance can be boring, not that architecture is uninteresting.
- Do preserve glyphs, measured labels, containment, explicit ports and connector paths.
- Do distinguish native geometry checks from decorative readability and cloud correctness.
- Do keep systems fictional and disclose workflow/data relationships that are not direct API calls.
- Don't inherit the parent website's identity into this microsite.
- Don't treat logical groups as VPC or security boundaries, or confuse annotated boundaries with verified deployed access policies.
- Don't add runtime models or execute visitor-supplied code.
- Don't promise illustrated worlds, automatic architecture polish or font-specific measurement that this renderer does not implement.
