# Diagram quality rubric

## P0 — invalid

- Unreachable or isolated node without explicit intent
- Decision node without real branches
- Missing node or edge
- Node overlap
- Unreadable or clipped label
- Arrow connected to the wrong node
- Arrow passing through an unrelated node

## P1 — structural

- Primary flow is unclear
- Avoidable edge crossings
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

Run both `beautiflow diagnose <file> --json` and `beautiflow audit <file> --json`. Review multiple entries, unlabeled or duplicate decision branches, high fan-out, cycles, and flows without exits. Mechanical diagnostics are authoritative for reachability, overlaps, and edge/node intersections; visual inspection is authoritative for balance and hierarchy.
