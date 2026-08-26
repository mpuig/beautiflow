# Data release pipeline

Work with two gates, quarantine handling, and a promotion loop.

**Capability:** full flowchart/state pipeline.

```mermaid
flowchart LR
    source[Source snapshot] --> validate[Validate schema]
    validate --> quality[Run data quality checks]
    quality --> passed{Checks passed?}
    passed -->|No| quarantine[Quarantine snapshot]
    quarantine --> notify[Notify data owner]
    passed -->|Yes| stage[Load staging tables]
    stage --> sample[Compare sample metrics]
    sample --> promote{Promote release?}
    promote -->|Hold| stage
    promote -->|Promote| publish[Publish dataset]
    publish --> catalog[Update catalog]
```

## Rendered output

![Data release pipeline rendered by Beautiflow](rendered/08-data-release-pipeline.png)

Generated with:

```bash
beautiflow render examples/sources/08-data-release-pipeline.mmd --format png --theme solarized-dark --output examples/rendered/08-data-release-pipeline.png
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/08-data-release-pipeline.mmd
```

Run Beautiflow directly:

```bash
beautiflow polish examples/sources/08-data-release-pipeline.mmd
```

Or ask an agent with the Beautiflow skill:

```text
Emphasize the publish path, then make quarantine and hold behavior clearly exceptional.
Use examples/sources/08-data-release-pipeline.mmd and show me the result.
```
