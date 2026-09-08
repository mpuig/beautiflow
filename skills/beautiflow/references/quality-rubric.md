# Diagram quality rubric

## P0 — invalid

- Unreachable or isolated node without explicit intent
- Decision node without real branches
- Missing node or edge
- Node overlap
- Unreadable or clipped label
- Arrow connected to the wrong node
- Arrow passing through an unrelated node
- Detached architecture endpoint or a connector violating an explicit port

## P1 — structural

- Primary flow is unclear
- Avoidable edge crossings
- Shared routing channels that make distinct relationships ambiguous
- Relationship labels masking unrelated routes or other labels
- Exceptional path dominates the main path
- Related nodes are visually separated

## P2 — compositional

- Inconsistent alignment or spacing
- Excessive arrow bends
- Unbalanced whitespace
- Poor aspect ratio for documentation

## P3 — presentation

- Inconsistent node roles
- Weak visual hierarchy
- Secondary labels are too prominent
- Theme is inappropriate for the destination

Architecture audit declares its coverage. Only `compound-geometry` has a measured score; `native-renderer-only` reports `score: null`. Do not treat unavailable checks as passing. Inspect icon attachments, label clearance, and the actual display size, and verify provider semantics separately. The renderer never labels the longest graph path as primary traffic.

Use `beautiflow diagnose <file> --json` for semantic defects and `beautiflow audit <file> --json` for geometry. Run both only when both kinds of failure are relevant. Review multiple entries, unlabeled or duplicate decision branches, high fan-out, cycles, and flows without exits. Mechanical diagnostics check reachability, overlaps, edge/node intersections, estimated label masks, and shared routes; visual inspection remains necessary for actual text readability, balance, and hierarchy. Preserve meaningful labels and relationships when repairing geometry. Use a finding's `supportedFixes` only through the existing receipt-backed semantic action schema; a suggested action type is not a guarantee of improvement.
