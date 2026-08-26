# Editorial review lifecycle

Work with a reversible state machine from drafting through archival.

**Capability:** full flowchart/state pipeline.

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> InReview: submit
    InReview --> Revisions: changes requested
    Revisions --> InReview: resubmit
    InReview --> Approved: approve
    Approved --> Scheduled: choose publish date
    Scheduled --> Published: release
    Scheduled --> Draft: withdraw
    Published --> Archived: retire
    Archived --> [*]
```

## Rendered output

![Editorial review lifecycle rendered by Beautiflow](rendered/04-editorial-review-lifecycle.png)

Generated with:

```bash
beautiflow render examples/sources/04-editorial-review-lifecycle.mmd --format png --theme catppuccin-mocha --output examples/rendered/04-editorial-review-lifecycle.png
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/04-editorial-review-lifecycle.mmd
```

Run Beautiflow directly:

```bash
beautiflow polish examples/sources/04-editorial-review-lifecycle.mmd
```

Or ask an agent with the Beautiflow skill:

```text
Polish the lifecycle while keeping review revisions and withdrawal paths visually secondary.
Use examples/sources/04-editorial-review-lifecycle.mmd and show me the result.
```
