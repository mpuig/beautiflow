# Release branch flow

Practice a horizontal workflow with a review loop and preview release.

**Capability:** full flowchart/state pipeline.

```mermaid
flowchart LR
    main[Stable branch] --> topic[Open topic branch]
    topic --> changes[Implement change]
    changes --> review[Open review]
    review --> checks[Run quality gates]
    checks --> ready{Ready to merge?}
    ready -->|Needs work| revise[Revise implementation]
    revise --> review
    ready -->|Ready| merge[Merge with squash]
    merge --> preview[Publish preview build]
```

## Rendered output

![Release branch flow rendered by Beautiflow](rendered/06-release-branch-flow.png)

Generated with:

```bash
beautiflow render examples/sources/06-release-branch-flow.mmd --format png --theme nord --output examples/rendered/06-release-branch-flow.png
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/06-release-branch-flow.mmd
```

Run Beautiflow directly:

```bash
beautiflow polish examples/sources/06-release-branch-flow.mmd
```

Or ask an agent with the Beautiflow skill:

```text
Make the successful merge path primary and the revision loop secondary.
Use examples/sources/06-release-branch-flow.mmd and show me the result.
```
