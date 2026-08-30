# Delta: diagram-polish

## ADDED Requirements

### Requirement: Polish never persists a geometric regression

The polish operation SHALL compare the best valid layout candidate against the
incumbent layout using the same audit function, where the incumbent is the
existing sidecar layout when node overrides exist and the sidecar-free baseline
(pure ELK positions and routes) otherwise. Polish SHALL NOT persist candidate
node positions whose round-tripped audit score is lower than the incumbent's
score. On first use, a candidate whose score equals the baseline MAY be
persisted; for an established sidecar, strict improvement SHALL remain
required.

#### Scenario: First run where every candidate audits below the baseline

- **GIVEN** a flowchart with no sidecar whose baseline layout audits at score S
- **WHEN** `beautiflow polish <file>` runs and the best valid candidate audits
  below S after the sidecar round-trip
- **THEN** no candidate node positions are persisted
- **AND** the report shows `status: unchanged`, `selected: current`, and an
  after-score equal to S
- **AND** a subsequent render is geometrically identical to the pre-polish
  render

#### Scenario: First run where a candidate meets or beats the baseline

- **GIVEN** a flowchart with no sidecar whose baseline layout audits at score S
- **WHEN** the best valid candidate audits at S or higher after the round-trip
- **THEN** polish persists that candidate with `status: initialized`
- **AND** the reported after-score is greater than or equal to S

#### Scenario: Established sidecar keeps requiring strict improvement

- **GIVEN** a flowchart whose sidecar already contains node overrides scoring S
- **WHEN** the best valid candidate audits at S or below
- **THEN** the sidecar is left untouched and `status` is `unchanged`

### Requirement: Polish reports are monotonic

Every polish result — dry-run or write, CLI JSON or receipt evidence — SHALL
satisfy `after.score >= before.score`, and validity metrics
(`nodeOverlaps`, `edgeNodeIntersections`) SHALL never increase relative to the
incumbent in an accepted result.

#### Scenario: Dry run on a regressing topology

- **GIVEN** a diagram where all candidates round-trip below the baseline
- **WHEN** `beautiflow polish <file> --dry-run --json` runs
- **THEN** the JSON report shows `after.score` equal to `before.score` and
  status `dry-run-unchanged`

### Requirement: Sidecar round-trip preserves untouched layouts

Persisting a layout candidate's node positions to the sidecar and re-running
layout SHALL classify nodes that were not moved afterwards as unmoved, SHALL
preserve their edges' ELK routes, and SHALL reproduce the candidate's audited
geometry. Polish SHALL be a fixed point: running it twice in succession
produces identical geometry on the second run.

#### Scenario: Selected candidate score survives persistence

- **GIVEN** a flowchart where `beautiflow layout --candidates 5` selects a
  candidate whose own audit score is S
- **WHEN** the selection is saved to the sidecar and layout is re-applied
- **THEN** the final audited score equals S and the edge routes match the
  candidate's ELK routes

#### Scenario: Re-polish immediately after initialization

- **GIVEN** a diagram that polish just initialized
- **WHEN** polish runs again without any intervening edit
- **THEN** the result is `unchanged` with crossings, bends, and routes
  identical to the first run's output

### Requirement: Receipt verification guards the pre-plan baseline

When planning a polish operation, the agent runtime SHALL record the incumbent
(pre-plan) audit score in the receipt, and `agent verify` SHALL report a
regression — transitioning to `needs-correction` — when the final audited score
falls below that recorded baseline, independently of the plan's expected score.

#### Scenario: Regression baked into the plan is still caught

- **GIVEN** a receipt whose plan evidence recorded baseline score B and
  expected score E with E < B
- **WHEN** `agent verify` runs after commit and the final audit equals E
- **THEN** verify reports a regression naming B and does not transition to
  `verified`
