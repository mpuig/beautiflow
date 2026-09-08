# Visual quality lab

Open `index.html` in a browser. It works directly from disk, without a server or external assets. Expand each original layout, compare it with the final version, and click an image for its full-size SVG. All systems here are illustrative, not claims about this repository's architecture.

| Example | Before | After | Purpose |
| --- | --- | --- | --- |
| [Release workflow](release.mmd) | 79 | 94 | An extra-wide flow becomes a vertical document diagram; one correction emphasizes the main path. |
| [Job lifecycle](job.mmd) | 97 | 97 | Preserve a valid retry layout while distinguishing completion from waiting and failure. |
| [Cache sequence](cache.mmd) | Not audited | Not audited | Choose sequence notation for request ordering; render only. |
| [Order architecture](architecture.mmd) | No comparison | Native renderer | Six services, one platform boundary, and a queued notification path. |

Release and job report zero node overlaps, edge/node intersections, crossings, estimated label collisions, and shared routes. Scores measure geometry, not aesthetic perfection. Release is still tall, and job's retry path needs deliberate reading. These are visual smoke examples, not model benchmark results.

## Visual checks

- Follow the main path without guessing an arrow's destination.
- Read all branch and retry labels. No meaningful text should disappear between versions.
- Check that label backgrounds do not obscure another relationship.
- Check normal reading size, not only fit-to-window thumbnails.
- On the lifecycle, distinguish a successful completion from an exhausted retry budget.
- On the sequence, confirm Database is queried only in the cache-miss branch.

## Live preview

From the repository root:

```bash
./dist/beautiflow server examples/recipes/visual-quality/release.mmd
```

Stop with Ctrl-C before opening another example. Substitute `job.mmd` or `cache.mmd` to see those. The preview is read-only; it never polishes. Compare the visible diagram with:

```bash
./dist/beautiflow audit examples/recipes/visual-quality/release.mmd --json
./dist/beautiflow audit examples/recipes/visual-quality/job.mmd --json
```

Sequence auditing is unsupported; do not interpret a successful render as a geometry audit.

Architecture supports `audit` and `server`, but not `polish`, `apply`, or `transform`. Its native renderer owns placement. Inspect its output visually even when the architecture audit reports no findings; that audit is not a browser measurement of every service label. The platform boundary here is illustrative, not a security assurance.

## Reproduce final fixtures

The committed release and job sidecars are deterministic output from one receipt-backed polish followed by one `apply` correction using their `*-emphasis.json` files. Source topology and labels remain untouched. PNG and SVG share the GitHub Light theme.

Use the checked-in sidecars and run from the repository root (replace `beautiflow` with `./dist/beautiflow` if it is not on PATH):

Committed PNGs also carry text metadata identifying their source and renderer. The commands below reproduce the pixels; regenerating them does not preserve that optional provenance metadata. SVG fixtures are checked byte-for-byte by the example tests.

```bash
beautiflow render examples/recipes/visual-quality/release.mmd --format svg --theme github-light --output examples/recipes/visual-quality/rendered/release-after.svg
beautiflow render examples/recipes/visual-quality/release.mmd --format png --theme github-light --output examples/recipes/visual-quality/rendered/release-after.png
beautiflow render examples/recipes/visual-quality/job.mmd --format svg --theme github-light --output examples/recipes/visual-quality/rendered/job-after.svg
beautiflow render examples/recipes/visual-quality/job.mmd --format png --theme github-light --output examples/recipes/visual-quality/rendered/job-after.png
beautiflow render examples/recipes/visual-quality/cache.mmd --format svg --theme github-light --output examples/recipes/visual-quality/rendered/cache.svg
beautiflow render examples/recipes/visual-quality/cache.mmd --format png --theme github-light --output examples/recipes/visual-quality/rendered/cache.png
beautiflow render examples/recipes/visual-quality/architecture.mmd --format svg --theme github-light --output examples/recipes/visual-quality/rendered/architecture.svg
beautiflow render examples/recipes/visual-quality/architecture.mmd --format png --theme github-light --output examples/recipes/visual-quality/rendered/architecture.png
```

To reproduce the original layouts without deleting meaningful sidecars, copy only the sources to a fresh temporary directory:

```bash
scratch=$(mktemp -d)
cp examples/recipes/visual-quality/release.mmd "$scratch/release.mmd"
cp examples/recipes/visual-quality/job.mmd "$scratch/job.mmd"
beautiflow render "$scratch/release.mmd" --format svg --theme github-light --output examples/recipes/visual-quality/rendered/release-before.svg
beautiflow render "$scratch/release.mmd" --format png --theme github-light --output examples/recipes/visual-quality/rendered/release-before.png
beautiflow render "$scratch/job.mmd" --format svg --theme github-light --output examples/recipes/visual-quality/rendered/job-before.svg
beautiflow render "$scratch/job.mmd" --format png --theme github-light --output examples/recipes/visual-quality/rendered/job-before.png
```

For a fresh agent experiment, use another copy of the source, inspect capabilities, and follow `agent plan --operation polish` through the receipt's commit and verify transitions. Inspect one image; if the primary path is too faint, use the single correction with the matching emphasis action file. Finish the receipt. Do not repeatedly polish until a preferred score appears.

## Homepage approval comparison

The homepage uses [approval.mmd](approval.mmd), a deliberately shorter four-node flow that remains readable inline. Its before/after pair demonstrates semantic emphasis only, not a geometry improvement. The sidecar comes from one receipt-backed `apply` using [approval-emphasis.json](approval-emphasis.json). All three relationships and their labels are unchanged.

```bash
beautiflow render examples/recipes/visual-quality/approval.mmd --format svg --theme github-light --output examples/recipes/visual-quality/rendered/approval-after.svg
beautiflow render examples/recipes/visual-quality/approval.mmd --format png --theme github-light --output examples/recipes/visual-quality/rendered/approval-after.png
scratch=$(mktemp -d)
cp examples/recipes/visual-quality/approval.mmd "$scratch/approval.mmd"
beautiflow render "$scratch/approval.mmd" --format svg --theme github-light --output examples/recipes/visual-quality/rendered/approval-before.svg
beautiflow render "$scratch/approval.mmd" --format png --theme github-light --output examples/recipes/visual-quality/rendered/approval-before.png
```

## Images

- [Release before](rendered/release-before.svg) / [after](rendered/release-after.svg)
- [Job before](rendered/job-before.svg) / [after](rendered/job-after.svg)
- [Cache sequence](rendered/cache.svg)
- [Order architecture](rendered/architecture.svg)
- [Approval before](rendered/approval-before.svg) / [after](rendered/approval-after.svg)
