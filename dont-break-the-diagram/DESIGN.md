# Don’t Break the Diagram — evidence bench

This route extends the Boring AWS Diagrams print-studio identity. It does not alter the parent website or introduce a replacement brand. The visitor inspects a real deterministic transaction rather than watching a simulated terminal animation.

## Visual system

- Cool paper `#f3f4ff`, white diagram/data sheets, ink `#17214e`, cobalt `#253bd5`, lilac `#ded8ff`, structural line `#b6bee2` and secondary ink `#48577c`.
- Outcome roles use green `#15553c` on `#e1f4e9`, and refusal red `#9c243d` on `#ffebef`. Textual receipt states and CLI exits carry meaning independently of color.
- Archivo Black for the large title and case headings; Public Sans for reading and controls. Both fonts are self-hosted in the sibling route, with existing SIL OFL licences. System monospace is reserved for commands, source, hashes and JSON.
- Flat, open sheets and square controls; rules divide evidence, not nested cards. Circular step numerals indicate ordered transitions. No decorative shadows, textures or gradients.
- Native SVG service glyphs, routes, groups and measured Arial diagram labels remain untouched. The microsite does not redraw the artwork or replace its font metrics.

## Structure and state

The compact title and premise precede a four-case index. Each case offers an ordered receipt-step rail, previous/next controls, original versus selected diagrams, source diff, complete SHA-256 values, raw response/receipt disclosures and local reproduction downloads. A single selected snapshot governs all evidence at once.

Every case has a URL fragment. Initial views show terminal results, making the evidence visible immediately; selecting earlier steps exposes planning and mutation boundaries. Case switches retain each case's selected step. Native anchors support history and direct links. Ordinary buttons retain keyboard activation and clear focus rings. Step status is announced in a polite live region.

## Responsive behavior

At desktop widths, native diagrams and original/current comparison sit side-by-side. The diff and hashes form a second two-column region. Below 800px the case index becomes two columns and evidence stacks. At 540px and below, diagrams stack, retain 540px internal artwork width, and pan inside focusable windows instead of shrinking labels. The pan instruction and full-size SVG links explain the trade-off. Code/JSON scroll locally; hashes wrap. The 320px viewport has no document overflow.

## Loading, fallback and motion

There is no data fetch: snapshots are rendered into static HTML. JavaScript only selects already-present evidence. Without it, all four terminal snapshots and downloads remain visible, while unavailable step controls remain hidden. Font-display swap preserves content during font loading. Smooth anchor scrolling is the only authored navigation motion and is disabled for reduced motion; there is no fake progress or typing animation.

## Truth and reproduction

The site identifies recordings, illustrative architecture, simulated collaborator edits, unmodified response/receipt data, temporary absolute receipt paths, and executable checksum. It distinguishes CLI error envelope `blocked` from persisted receipt `stale`. Mechanical verification is not visual attestation or AWS configuration validation. Rollback restores the original snapshot and is explicitly not a merge.

## Review

Sequential in-thread review, not independent design/security review. Final full-page desktop, stale, unsafe, 390px and 320px captures were opened. Verdict and detector interpretations: `.impeccable/review/diagram-safety/verdict.md`. No raster artwork ships. Generated native SVGs derive from the canonical fixture and real compiled-CLI recordings; inputs, evidence and reproduction scripts live beside them.
