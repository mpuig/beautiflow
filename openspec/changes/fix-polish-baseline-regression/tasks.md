# Tasks

## 1. Regression coverage first (both fixtures fail before the fix)

- [ ] 1.1 Add the two reproduction fixtures to `test/` (subgraph-bearing
      flowcharts: one whose round-trip drops the score 97→81, one whose
      round-trip only inflates bends 18→26 under the penalty threshold).
- [ ] 1.2 `test/polish.test.ts`: fresh diagram where every candidate
      round-trips below baseline → assert `status === 'unchanged'`,
      `selected === 'current'`, `after.score === before.score`, and no node
      overrides persisted.
- [ ] 1.3 `test/polish.test.ts`: polish is monotonic — for both fixtures and
      the existing test diagrams, assert `after.score >= before.score` in
      dry-run and write modes.
- [ ] 1.4 `test/diagram.test.ts`: round-trip route preservation — run
      `layoutProject`, persist positions, re-run `layoutProject`, assert every
      edge of the untouched diagram keeps its ELK route points (Phase 2; marked
      failing until 3.x lands).
- [ ] 1.5 `test/agent-runtime.test.ts`: a polish plan whose dry-run evidence
      shows `after < before` must not reach `verified` without a regression
      warning once the baseline clause exists (Phase 1 behavior: such plans no
      longer occur for polish; keep the guard generic against the recorded
      `baselineScore`).

## 2. Phase 1 — baseline acceptance gate

- [ ] 2.1 `src/diagram/polish.ts`: change acceptance to
      `initialized ? (valid && best.audit.score >= before.score) : improved`;
      on rejection return `status 'unchanged'`, `selected 'current'`,
      `after = before`, original sidecar untouched.
- [ ] 2.2 `src/agent-runtime.ts`: record `expected.baselineScore` (the `before`
      audit) when planning a polish operation.
- [ ] 2.3 `src/agent-runtime.ts` (`verifyAgentMutation`): add regression clause
      `audit.score < expected.baselineScore` → `needs-correction`, message
      naming both scores.
- [ ] 2.4 Confirm `runPolish` JSON output needs no shape change (it already
      emits `before`/`after`/`status`/`selected`); update only if 2.1 reveals
      an inconsistency.

## 3. Phase 2 — sidecar round-trip stability

- [ ] 3.1 `src/diagram/layout.ts`: compute the fresh ELK layout's own
      normalization shift from the pure ELK node set and classify "unmoved" by
      comparing overrides against normalized-fresh positions (same frame on
      both sides).
- [ ] 3.2 `src/diagram/model.ts` + `src/diagram/project.ts`: optional
      `nodeSpacing`/`layerSpacing` sidecar fields (parse, type, default to
      current 48/88 when absent); `saveSidecar` writes them when set.
- [ ] 3.3 `src/diagram/polish.ts` + `src/cli.ts` (`runLayout`): persist the
      winning candidate's spacing; `layoutProject` re-apply passes honor
      persisted spacing.
- [ ] 3.4 Fixed-point test: polish → polish yields `unchanged` with identical
      geometry (crossings and bends equal, routes byte-identical).
- [ ] 3.5 Consistency test: `layout --candidates` final score equals the
      selected candidate's own audit score.

## 4. Docs and metadata sync (AGENTS.md rule 10)

- [ ] 4.1 `docs/quality.md`: replace "On first use it initializes the best
      valid sidecar" with the baseline-incumbent contract; document the
      fixed-point guarantee once Phase 2 lands.
- [ ] 4.2 `docs/sidecar.md`: document optional spacing fields (Phase 2).
- [ ] 4.3 `CHANGELOG.md`: entries for both phases, calling out the
      empty-sidecar-on-clean-diagrams expectation shift.
- [ ] 4.4 Regenerate committed example artifacts whose geometry changes, using
      the exact commands in their guides (`examples/README.md`).
- [ ] 4.5 Check `skills/beautiflow/` references: no protocol change expected;
      confirm no wording depends on "initializes on first use".

## 5. Verification

- [ ] 5.1 `bun run validate` (typecheck, full test suite, build, docs build).
- [ ] 5.2 Compiled-binary smoke per `AGENTS.md` (version, inspect --agent,
      schema, agent plan polish, doctor, polish --dry-run).
- [ ] 5.3 Re-run the proposal's reproduction end to end: baseline 97 →
      `polish` reports `unchanged` at 97 (Phase 1) and, after Phase 2,
      initialization at 97 with a fixed-point second run.
