# Observability routing

Work with multiple sources, custom classes, aggregation, and alerting.

**Capability:** full flowchart/state pipeline.

```mermaid
flowchart TB
    traces[Trace events] --> sampler{Sample event?}
    metrics[Metric points] --> aggregate[Aggregate windows]
    logs[Structured logs] --> redact[Redact secrets]

    sampler -->|Keep| enrich[Add service context]
    sampler -->|Drop| discard[Record drop count]
    redact --> enrich
    aggregate --> warehouse[(Analytics store)]
    enrich --> warehouse
    warehouse --> explore[Explore signals]
    explore --> alert{Threshold crossed?}
    alert -->|Yes| page[Page responder]
    alert -->|No| retain[Retain baseline]

    classDef source fill:#e7f0ff,stroke:#5376a6,stroke-width:2px
    classDef action fill:#eef7ec,stroke:#557f54,stroke-width:2px
    class traces,metrics,logs source
    class enrich,aggregate,redact action
```

## Rendered output

![Observability routing rendered by Beautiflow](rendered/19-observability-routing.svg)

Generated with:

```bash
beautiflow render examples/sources/19-observability-routing.mmd --format svg --theme tokyo-night-light --transparent --output examples/rendered/19-observability-routing.svg
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/19-observability-routing.mmd
```

Run Beautiflow directly:

```bash
beautiflow polish examples/sources/19-observability-routing.mmd
```

Or ask an agent with the Beautiflow skill:

```text
Polish the observability flow while retaining its source and action styling.
Use examples/sources/19-observability-routing.mmd and show me the result.
```
