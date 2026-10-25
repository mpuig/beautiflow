# Don’t Break the Diagram

A local, read-only microsite replaying actual compiled Beautiflow transactions. It uses the Boring AWS Diagrams print-studio identity without changing the parent website.

## View

```bash
bun run preview:site
# http://127.0.0.1:4173/dont-break-the-diagram/
```

The four recorded cases demonstrate:

- Supported architecture rename: `validated → applied → verified → complete`.
- Unsafe injected label: plan refuses with exit 2, no source edit and no receipt.
- Source changed after planning: commit refuses with `STALE_RECEIPT`, preserving the collaborator’s source. CLI error envelope says `blocked`; the persisted receipt state is `stale`.
- Explicit rollback: `validated → applied → verified → rolled-back`, restoring original source bytes.

The fixture is a deliberately small, separately authored hotel request path, not an automatic projection of the AWS gallery. It has no gallery-only boundary/relationship annotations to become stale during identifier renaming. Four services and three relationships remain throughout the supported edit.

## Record real evidence

```bash
bun run build
bun scripts/record-diagram-safety.ts
bun scripts/build-diagram-safety.ts
bun test test/diagram-safety.test.ts
bun run build:site
```

Recording is an explicit developer action. The recorder launches `dist/beautiflow` in disposable directories, captures actual JSON responses, source bytes, SHA-256 hashes, receipt snapshots and native SVGs. It checks expected rejection exits and terminal states, exact rollback, and preservation of collaborator changes before writing `recording/recording.json`. It records the compiled executable checksum and timestamp. Rerunning intentionally changes provenance paths/timestamps. Review generated artifacts before committing them.

The normal site build only copies the saved recording and generates HTML. It does not launch an agent or execute mutations. The browser selects static snapshots; it has no network mutation APIs, model calls, credentials or writable filesystem. JSON/source escaping protects page generation. Build-only TypeScript and design notes are not copied into this route.

## Download and reproduce

Each case offers `original.mmd`, `actions.json` and `reproduce.sh`. Download into a **new directory** with Beautiflow 1.0.1 on PATH, inspect the script, then run `sh reproduce.sh`. It copies the original to `source.mmd` and runs the recorded commands, checking exit 2 for expected refusals. For rollback, `cmp original.mmd source.mmd` checks exact restoration.

Receipt downloads are raw snapshots with temporary absolute recording paths. They are evidence, not portable resumable receipts. Run the script to create fresh receipts locally. The complete recording contains all source/output/receipt snapshots and links to separately downloadable SVGs; it is not an asset archive or signed attestation.

## Limits

- No visual attestation: the successful finish explicitly records `visualInspected: false`.
- Mechanical verification covers the runtime’s architecture geometry/integrity/structural checks; it does not prove browser glyph ink, visual quality, working tenant controls or AWS deployment correctness.
- Architecture has guarded transforms, not automatic polish.
- The concurrent edit is deliberately simulated by adding a comment between CLI plan and commit. This is a deterministic stale-evidence demonstration, not a timing-race stress test.
- Rollback explicitly restores a saved snapshot. It is not a merge and can overwrite newer work; inspect current files first.
- No changes to CLI authority, command surface, receipts or core runtime behavior are introduced by the microsite.

## Files

- `source.mmd`: canonical fixture.
- `recording/`: actual CLI snapshots, rendering evidence and reproduction scripts.
- `page.ts`: server/build-time HTML generation and source diff.
- `app.js`: local snapshot navigation, case deep links and step controls.
- `site.css`: responsive evidence-bench layout; shared self-hosted fonts under `../boring-diagrams/fonts/` retain their SIL OFL licences.
- `../scripts/{record,build}-diagram-safety.ts`: explicit recording and static assembly.

Default HTML shows the final snapshots of all four cases if JavaScript is disabled. Large JSON and source panes have internal scrolling; small-screen diagrams preserve readable native-scale labels with horizontal pan and full-size SVG links. Native service symbols come through Beautiflow/Pele’s registered icon packs; see the repository’s `THIRD_PARTY_NOTICES.md` and the sibling gallery’s attribution. They are not an official AWS Architecture Icon Package or AWS endorsement.

This work remains local and unpublished until explicitly released.
