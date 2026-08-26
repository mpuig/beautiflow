# Release train history

Render branches, merges, tags, highlighted work, and a hotfix.

**Capability:** render-only specialized family.

```mermaid
gitGraph:
    commit id: "baseline"
    branch accessibility
    checkout accessibility
    commit id: "contrast"
    commit id: "keyboard" tag: "review"
    checkout main
    commit id: "telemetry" type: HIGHLIGHT
    merge accessibility id: "merge-a11y"
    branch hotfix
    checkout hotfix
    commit id: "cache-fix" type: REVERSE
    checkout main
    merge hotfix id: "release-2.4"
```

## Rendered output

![Release train history rendered by Beautiflow](rendered/11-release-train-history.svg)

Generated with:

```bash
beautiflow render examples/sources/11-release-train-history.mmd --format svg --theme tokyo-night-storm --output examples/rendered/11-release-train-history.svg
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/11-release-train-history.mmd
```

Run Beautiflow directly:

```bash
beautiflow render examples/sources/11-release-train-history.mmd --format svg
```

Or ask an agent with the Beautiflow skill:

```text
Render the release history and summarize its branch story in one sentence.
Use examples/sources/11-release-train-history.mmd and show me the result.
```
