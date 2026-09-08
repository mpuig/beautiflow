# Installed-skill generation benchmark

This initial suite covers flowchart/state, the families with Beautiflow's full layout pipeline. It does not claim coverage of specialized renderers or measure model intelligence. It checks required labelled relationships, geometry, and separately attested visual review. Additional relationships and equivalent diagram decompositions are not evaluated by this initial verifier.

## Fair runs

Build the standalone binary, install its skill into an isolated workspace, and give an external agent only one `prompt` from `cases.json`. Keep this benchmark, its requirements, and test fixtures outside the agent-visible workspace. The external harness owns model access and credentials. Use the same commit, packaged skill, tool access, and time budget across configurations.

One complete agent invocation is attempt 1, including only Beautiflow's existing bounded corrections. Freeze the resulting Mermaid source, sidecar, outputs, and transcript before evaluation. Never replace attempt 1 with a later human repair. Record timeouts, provider errors, and missing candidates as operational failures in the external run log; never omit them from reported totals.

## Verify

Create `run.json` with `agent`, `model`, `commit`, `skillSha256` (64-character SHA-256 of the packaged skill archive), and `attempt: 1`. Optionally include:

```json
{
  "visualReview": {
    "status": "passed",
    "reviewer": "reviewer identity",
    "artifactSha256": "SHA-256 of the exact reviewed SVG bytes",
    "defects": []
  }
}
```

Render the frozen candidate as opaque SVG with the compiled binary and no theme override. Review that artifact in a browser or as a raster generated from it; retain the image and its SVG hash. Then run from the development checkout:

```bash
bun scripts/generation-benchmark.ts approval-workflow /tmp/run/diagram.mmd /tmp/run/run.json
```

The verifier does not mutate the candidate or launch a model. It rerenders with the current checkout, checks required nodes and directed labelled edges, audits final geometry, and checks the visual attestation against the resulting SVG hash. Use the same checkout as the binary's build. Exit 0 means all gates passed, 1 means a gate failed or visual review is absent, and 2 means an input/operational error. Browser interaction tests are not included; visual review is an attestation, not proof that a reviewer actually inspected the artifact.

Report semantic, geometry, visual, and operational failures separately, with every case/configuration represented. Compare first-pass usability and correction usage, not just aggregate scores. Unit fixtures verify the verifier only; no model benchmark results are claimed until actual external runs are retained.
