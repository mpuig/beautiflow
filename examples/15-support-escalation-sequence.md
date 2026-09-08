# Support escalation sequence

Trace evidence collection and a specialist handoff through recovery.

**Capability:** render-only specialized family.

Message labels use the theme foreground for legibility; lifelines, connectors, and arrowheads retain the Dracula palette.

```mermaid
sequenceDiagram
    participant Customer
    participant Support
    participant Diagnostics
    participant Specialist

    Customer->>Support: Report intermittent failure
    Support->>Diagnostics: Collect recent traces
    Diagnostics-->>Support: Return correlated events
    Support->>Specialist: Share evidence bundle
    Specialist->>Specialist: Reproduce in sandbox
    Specialist-->>Support: Recommend configuration fix
    Support-->>Customer: Explain and apply fix
    Customer-->>Support: Confirm recovery
```

## Rendered output

![Support escalation sequence rendered by Beautiflow](rendered/15-support-escalation-sequence.svg)

Generated with:

```bash
beautiflow render examples/sources/15-support-escalation-sequence.mmd --format svg --theme dracula --output examples/rendered/15-support-escalation-sequence.svg
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/15-support-escalation-sequence.mmd
```

Run Beautiflow directly:

```bash
beautiflow render examples/sources/15-support-escalation-sequence.mmd --format svg
```

Or ask an agent with the Beautiflow skill:

```text
Render the support exchange and check whether request and response direction is immediately clear.
Use examples/sources/15-support-escalation-sequence.mmd and show me the result.
```
