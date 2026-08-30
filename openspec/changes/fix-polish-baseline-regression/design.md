# Design

## Context

`polishProject` (`src/diagram/polish.ts`) audits the incumbent layout into
`before`, generates five candidates at preset spacings, writes each candidate's
positions into a cloned sidecar, re-runs `layoutProject` with overrides applied,
audits the round-tripped result, and ranks. Acceptance is
`initialized ? valid : improved` — on first use, baseline quality is never
consulted. Independently, `layoutProject`'s "unmoved node" test
(`src/diagram/layout.ts:253-265`) compares sidecar overrides against raw fresh
ELK positions plus the shift of the *overridden* set, mixing coordinate frames,
so persisted candidates re-enter layout classified as "moved" and their edges
are re-routed by the Manhattan fallback router instead of keeping ELK routes.

Constraints inherited from `AGENTS.md` / `PRODUCT.md`:

- everything deterministic; no new public flags on the common path;
- Mermaid semantics untouched — this is purely sidecar/presentation behavior;
- edge matching by semantic endpoints, never index;
- docs, embedded skill, and help stay synchronized with behavior changes.

## Goals

1. `polish` is monotonic: it never persists a layout that audits below the
   layout the user already had (including "no sidecar" as a first-class
   incumbent).
2. The sidecar round-trip is idempotent: persisting a candidate and re-running
   layout reproduces that candidate's geometry, ELK routes included.
3. The receipt runtime can prove (not assume) non-regression against the
   pre-plan baseline.
4. Zero changes to the public CLI surface, sidecar version, status enum, or
   receipt protocol version.

## Non-Goals

- Improving the Manhattan fallback router's route quality (it remains the
  correct tool for genuinely moved nodes).
- Changing candidate presets, the audit scoring function, or ranking
  tie-breakers.
- Architecture (`architecture-beta`) or any render-only family — flowchart and
  state diagrams only, matching polish's support surface.
- Automatic repair of already-committed degraded sidecars (see Open Questions).

## Decisions

### D1 — Baseline as incumbent, tie accepted on first run

On first run, accept the best valid candidate when
`best.audit.score >= before.score` (established sidecars keep today's strict
`>`). Rationale for allowing ties: materializing a sidecar at equal quality has
value (enables pinning, roles, and stable diffs) and costs nothing; requiring
strict improvement would leave most clean diagrams permanently sidecar-less
since ELK defaults are already near-optimal for them.

*Alternative rejected:* strict `>` on first run — blocks harmless
initialization for the common "already clean" case.

### D2 — On rejection, keep writing the (empty) sidecar

`runPolish` (`src/cli.ts`) always saves the sidecar and exports SVG/PNG on a
non-dry run; an empty-`nodes` sidecar renders identically to no sidecar. Keeping
that behavior preserves the documented file contract ("writes the sidecar plus
SVG and PNG") and keeps the change surface minimal.

*Alternative rejected:* skipping the sidecar write on rejection — smaller disk
footprint but a public behavior change with no quality benefit.

### D3 — Report rejection through existing vocabulary

Rejected initialization reports `status: unchanged`, `selected: current`,
`after == before` — the exact vocabulary already emitted when an established
sidecar sees no improvement. Agents and tests already handle these values; no
new enum member, no new JSON field required. The receipt's `evidence` block
keeps the full candidate audit so the "why" stays inspectable.

*Alternative considered:* a distinct `baseline-kept` status — clearer telemetry
but widens the public enum; deferred unless the maintainer prefers it.

### D4 — Verify against the recorded baseline, not only the plan

`agent plan --operation polish` stores `expected.baselineScore` (additive field
inside the existing `expected` object; receipt stays `receiptVersion: 1`,
protocol `1.1`). `agent verify` adds one regression clause: final audit score
below `baselineScore` ⇒ `needs-correction`, same as the existing expected-score
clause. This closes the structural blind spot where a regression baked into the
plan itself becomes the yardstick it is measured against — for polish now, and
for any future operation that records a baseline.

### D5 — Phase 2: compare frames like-for-like, persist the winning spacing

Two small, independent fixes make the round-trip lossless:

1. **Frame fix (no format change).** In `layoutProject`, normalize the fresh
   ELK layout first (its own `normalizeCanvas` shift, computed from the pure
   ELK node set), then compare overrides against normalized-fresh positions
   directly. Both sides then live in the normalized frame, so a node whose
   override equals its deterministic re-layout position classifies as unmoved
   and its edges keep ELK routes. Today's code compares
   `override` vs `rawFresh + shiftOfOverriddenSet`, which is only coincidentally
   correct when the candidate run's shift was zero (subgraph-free diagrams).
2. **Spacing provenance (optional sidecar fields).** Persist the winning
   preset's `nodeSpacing`/`layerSpacing` in the sidecar and honor them in
   `layoutProject`'s re-apply pass. Without this, candidates 1, 2, 3, and 5 can
   never round-trip: their raw ELK coordinates are computed at different
   spacing than the re-apply pass uses. `parseSidecar`
   (`src/diagram/project.ts`) rebuilds only known fields, so old binaries
   reading new sidecars simply drop the extras (safe), and new binaries treat
   missing fields as today's defaults (safe).

*Alternatives rejected:*

- **Store raw-frame coordinates in the sidecar** — cleaner in theory, but
  silently changes the meaning of every existing sidecar file and needs a
  migration/detection story; the frame fix achieves the same result without
  touching persisted semantics.
- **Provenance fingerprint (hash of graph + preset) instead of positional
  comparison** — avoids float comparisons entirely but adds a second source of
  truth about "moved vs unmoved" that can drift from the actual coordinates
  (e.g. hand-edited sidecars); positional comparison in a consistent frame
  keeps one truth.
- **Evaluate/accept candidates on their own pre-round-trip audits** — hides the
  loss instead of fixing it; the persisted artifact would still render the
  degraded routes.

### D6 — Test fixtures pin the failure modes, not the scores

Regression tests assert *relations* (`after >= before`, `finalScore ==
candidateScore`, `secondPolish == fixedPoint`, `elk routes preserved for
untouched diagrams`) rather than absolute scores, so future tuning of the audit
scoring function does not invalidate them. The two reproduction topologies
(subgraph-bearing; one that degrades score, one that only degrades bends) enter
`test/` as fixtures.

## Risks / Trade-offs

- **Committed example artifacts may change** once Phase 2 lands: diagrams whose
  sidecars silently re-routed will regain ELK routes, so `examples/rendered/`
  fixtures need regeneration with the exact commands in their guides
  (`CONTRIBUTING.md` rule). Bounded and mechanical, but touches many files —
  worth a dedicated commit.
- **Behavioral expectation shift:** users who ran polish once on a fresh clean
  diagram previously always got a populated sidecar; after Phase 1 they may get
  an empty one (baseline kept). The JSON report makes this explicit
  (`unchanged`, `selected: current`), and the rendered output is strictly
  better or equal — but release notes should call it out.
- **Verify strictness:** adding the baseline clause to `agent verify` can move
  a transaction to `needs-correction` in cases 0.8.0 silently passed. That is
  the intended behavior change; the correction budget and rollback path already
  exist for exactly this outcome.
- **Float comparison tolerance** (`< 0.01`) is retained; determinism of the
  vendored synchronous ELK makes exact reproduction reliable in practice, and
  the tolerance absorbs serialization rounding.

## Migration Plan

1. Phase 1 ships alone (gate + verify clause + tests + docs). No file format
   changes; degraded-initialization simply stops happening.
2. Phase 2 ships second (frame fix, spacing fields, fixture regeneration).
   Sidecars remain `version: 1`; old ↔ new binaries interoperate in both
   directions.
3. No user action required at any point. `CHANGELOG.md` documents both phases.

## Open Questions

1. **Baseline reclaim for existing degraded sidecars:** when a sidecar exists,
   every node is unpinned, and the sidecar-free baseline outscores the current
   layout, should polish be allowed to discard the overrides and return to the
   baseline? It is the natural extension of "baseline as incumbent", but it
   makes polish able to *remove* state, which today it never does. Proposed
   default: out of scope here; worth its own change if wanted.
2. **`layout` command consistency:** `layout --candidates` ranks by
   pre-round-trip candidate audits but persists a post-round-trip result (97 vs
   81 in the reproduction). After Phase 2 the two converge and the question
   dissolves; should Phase 1 add an interim warning when they diverge?
3. **Status vocabulary:** is `unchanged`/`current` acceptable for the rejected
   first run (D3), or is a distinct status preferred for telemetry?
4. **OpenSpec placement:** this PR introduces `openspec/` scaffolding alongside
   the change; happy to relocate or fold into `docs/` if the project prefers
   another convention.
