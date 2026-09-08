# Design

<!-- impeccable:design-schema 1 -->

## Direction

Beautiflow’s browser preview is a quiet projection booth. The diagram is the interface. A single narrow status rail proves that the saved file is live while every remaining pixel belongs to the artifact.

## Surface

`beautiflow server <file>` serves one read-only page from localhost. The first viewport contains a 48px status rail and a full remaining diagram stage. There are no controls, cards, navigation, settings, editing affordances, or promotional content.

## Color

The viewer uses tinted paper neutrals rather than pure black and white:

- Paper: `#f7f8f5`
- Ink: `#20231f`
- Muted ink: `#70766d`
- Rule: `#dfe3dc`
- Live: `#26845b`
- Error: `#bb3b32`

Diagram themes remain independent and retain their semantic colors.

## Typography

Viewer chrome uses the platform UI sans stack at 12–13px because it is operational metadata, not display content. Filenames use a compact semibold treatment. Time values use tabular numerals. The diagram renderer owns all artifact typography.

## Geometry and Spacing

- Status rail: 48px high
- Rail horizontal inset: 18px desktop, 12px narrow
- Diagram stage inset: fluid 16–40px desktop, 12px narrow
- Error notice: maximum 680px, 12px radius, soft offset shadow
- The authored node-to-arrow mark is the only product symbol

## States

- Rendering: amber, reduced-size status dot, “Updating”
- Ready: green status dot, “Live,” latest successful timestamp
- Error: red status dot, “Last render kept,” actionable error notice
- Initial: centered waiting copy until the first successful render
- Reconnecting: status text changes without removing the latest diagram

The last good diagram always remains visible through transient source errors.

## Motion

A successful revision settles with a single 260ms opacity-and-blur transition using an exponential ease-out curve. Reduced-motion users receive an immediate replacement. Status changes use short color and scale transitions only.

## Responsive Behavior

Desktop fits the complete SVG to the available stage. Below 600px, the diagram keeps a 680px minimum width and becomes horizontally scrollable instead of shrinking labels into illegibility. Secondary product text and timestamps recede, while filename and live state remain visible.

## Accessibility

Status uses a polite live region, render failures use `role="alert"`, text contrast meets operational UI requirements, the page has no keyboard traps, and reduced motion is respected.

## Developer Website

Both marketing pages load `site.css`: one source for palette, typography, shell widths, navigation, buttons, diagram frames, section spacing, footer, and responsive breakpoints. The examples page uses the same paper introduction and dark-green install section as the homepage, with consistent text-left / diagram-right rows instead of alternating layouts. All four original gallery entries, source snippets, and walkthrough links remain available. Diagrams fit their frames without hidden internal scrolling; portrait flowcharts get a taller stage and every figure has an explicit full-size SVG link.

The marketing site is separate from the read-only preview. `index.html` uses the established Bricolage Grotesque / Source Sans 3 typography, pale paper, and evergreen palette. Its opening pairs a plain-language benefit and one primary “Install Beautiflow” action with real, linked diagram artifacts. Architecture, sequence, and lifecycle tabs support arrow-key and Home/End navigation with a single tab stop, showing family-specific capabilities without simulated agent execution.

A four-node approval comparison shows real before/after outputs from one semantic action pass: emphasis changes presentation while preserving nodes, relationships, and labels. It makes no layout-score uplift claim and links to the Mermaid source and full-size outputs. Comparison stages are 560px tall, reducing to 530px in the stacked layout at widths up to 480px, so the short flow stays readable rather than shrinking a long workflow into a thumbnail.

A dark-green installation section contains three steps and copy controls with visible success/failure feedback. Technical protocol details follow the product demonstration rather than preceding it. Mobile stacks the hero, preserves the install CTA, and keeps source/download links available. At widths up to 360px, the header hides its Examples link to keep the brand and install CTA within the viewport; examples remain accessible from the hero and footer. `examples.html` remains the fuller gallery; generated artifacts retain their renderer-owned styling.
