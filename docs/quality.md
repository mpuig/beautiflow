# Auditing and diagnostics

Beautiflow separates geometric quality from semantic flow quality.

## Geometric audit

```bash
beautiflow audit diagram.mmd --json
```

Metrics:

- Node overlaps
- Edge crossings
- Edge-to-node intersections
- Edge bends
- Alignment score
- Aspect ratio
- Label-mask collisions with nodes, other labels, and unrelated routes, using the renderer's multiline text estimates and padding
- Shared orthogonal routing channels, excluding common endpoint terminal stubs
- Stacked connector attachment points with less than eight pixels of clearance
- Node and group-title text that exceeds its measured container bounds
- Nodes or connector routes crossing group-header bands

Flowchart/state readability findings include semantic element IDs, measured `evidence`, and issue-specific `supportedFixes` only when an existing action can plausibly help. These are options to validate, not automatic prescriptions or permission to author coordinates. Findings such as text overflow and stacked endpoints omit repair suggestions when no direct semantic layout action exists. Readability findings reduce the score but are not new hard mutation gates. Browser font differences still require visual review; estimated text boxes are not browser glyph measurements.

High-severity geometry findings reduce the score heavily. Layout actions and transformations are rejected when they introduce node overlaps or arrows through unrelated nodes.

Architecture audit reports `coverage: pele-positioned-geometry`. A pinned additive renderer extension supplies actual port anchors, service/junction boxes, estimated label boxes, untrimmed route points, and group-title footprints. Checks include detached endpoints, port directions, node and label collisions, connector obstruction, shared routes, excessive bends, and header crossings. A separate integrity report checks semantic element multiplicities, plain service-label presence, SVG references, duplicate IDs, and unresolved icons. The score deducts ten points per geometry finding and twenty per high-severity integrity finding, bounded at zero. Findings do not infer request traffic or provider correctness.

Geometry is based on layout estimates, before arrow trimming and corner rounding. Edge-label boxes and browser glyph ink are not measured. Other render-only families expose `coverage: svg-references-only` with null geometry score and metrics, not a fabricated 100. Inspect the final artifact for readability.

Geometry scores never certify AWS/GCP/Azure correctness or readability at a particular display size. Preserve the complete source and author separate request, network, and operations views when density obscures meaning.

## Architecture structural diagnostics

`inspect` and `diagnose` expose services, junctions, groups, explicit ports, relationships, and alignment hints. Informational findings cover isolated elements, disconnected components, empty groups, deep containment, detail load, generic/repeated labels, and highly connected services. They keep a structural score of 100 and never authorize deletion or certify provider semantics.

## Semantic diagnostics

```bash
beautiflow diagnose diagram.mmd --json
```

Checks:

- Entry and exit points
- Isolated nodes
- Nodes unreachable from any entry
- Decision nodes with fewer than two branches
- Unlabeled decision branches
- Duplicate branch labels
- Excessive decision fan-out
- Cyclic flows
- Flows with no entry or exit
- Advisory detail load based on nodes, edges, and decision count
- Overview-plus-focused-view recommendations when a large graph already has meaningful groups
- Dense or generic labels and low-information relationship labels
- High fan-in nodes that may need explicit bottleneck or focal treatment

Detail, label, fan-in, and split findings are informational: they do not lower the semantic score, authorize automatic deletion, or force a transformation. Cycles are reported rather than automatically rejected because retries and state machines may be intentionally cyclic.

## Polish regression gate

```bash
beautiflow polish diagram.mmd
```

`polish` evaluates five internal layout candidates in one bounded pass. It filters out node-overlap and edge-to-node-intersection candidates before ranking, preserves pinned nodes, and accepts an established candidate only when its geometric score improves. Readability findings participate in scoring and tie-breaking. On first use it initializes a valid sidecar only if its persisted layout meets or beats the incumbent score. Otherwise it reports `unchanged`, selects `current`, and keeps the incumbent; the CLI still writes the sidecar and rendered outputs outside dry-run mode. Semantics do not change; evaluation failures restore the original in-memory sidecar.

Candidate spacing is persisted with normalized node positions so untouched layouts retain their ELK routes, edge-label positions, and group bounds after saving and reopening. Repeating polish without edits is a fixed point. Existing degraded sidecars are not automatically discarded to reclaim a sidecar-free layout.

Polish agent receipts record `expected.baselineScore`. Verification checks both the planned score and this pre-plan baseline, retaining the baseline through targeted correction. Older receipts without this optional field retain their existing expected-score checks.

## Generation benchmark

The [installed-skill benchmark](../benchmarks/generation/README.md) checks required semantic relationships, final geometry, and hash-bound visual-review attestations separately. Its initial three cases cover flowchart/state only. External harnesses own model invocation and credentials; fixture tests are not evidence of model performance.

## Mechanical versus visual judgment

The CLI is authoritative for references, reachability, overlap, and route intersections. A vision-capable agent or human remains authoritative for hierarchy, balance, emphasis, and whether the diagram communicates the intended idea. The Agent Skill caps visual review at one inspection plus one correction pass.
