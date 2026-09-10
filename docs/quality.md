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

`audit` also evaluates supported large multilevel architecture renders. The provider-neutral compound pass measures detached endpoints, explicit-port direction violations, icon overlaps, label/icon/route collisions, shared channels, group-title crossings, excessive bends, fragmented labels, and detail beyond the single-slide budget. Only short common terminal stubs are excluded from shared-channel counts; a shared endpoint does not excuse an entire shared route. The renderer does not infer a primary semantic path from graph length or provider names.

The JSON report identifies coverage. `compound-geometry` includes measured geometry and a score, including a real zero when defects warrant it. `native-renderer-only` means those checks were not run and reports `score: null`, not 100. Geometry scores never certify AWS/GCP/Azure correctness or readability at a particular display size. Preserve the complete source and author separate request, network, and operations views when density obscures meaning.

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
