# Semantic composition patterns

Use these patterns only when the request clearly matches. They guide Mermaid authorship; they do not add diagram families, CLI options, or permission to bypass the receipt-backed mutation protocol. Choose one primary pattern and keep the complete meaning visible in a static render.

## Main path with exceptions

Use for workflows with one expected route plus retries, denial, or recovery. Establish one primary flow, keep exception nodes secondary, label every decision branch, and ensure each exception either rejoins deliberately or terminates explicitly.

## Fan-in bottleneck

Use when several producers converge on finite capacity. Preserve distinct arrivals, the constrained service, and admitted versus deferred or rejected outcomes. State capacity in labels when the source provides it; never imply capacity from box size alone.

## Policy decision trace

Use when the reader must understand why requests receive different outcomes. Keep rules in a stable order, label pass/fail branches in text, identify the first meaningful divergence, and distinguish skipped work from work that was never reached.

## Secure paved road

Use for architecture where trust boundaries and approved versus blocked routes carry the meaning. Label boundaries and identities, keep forbidden paths visibly stopped before entry, separate deployment from request traffic, and never use color as the only indication of permission.

## Lifecycle with recovery

Use for state diagrams where failure, retry, timeout, or cancellation matters. Preserve explicit start and terminal states, label transitions with events or guards, and keep recovery paths visible without letting them dominate the normal lifecycle.

## Split rule

When one figure mixes independent questions—commonly request traffic, delivery, identity, and telemetry—recommend an overview plus separately authored focused views. Do not silently delete required nodes, and do not claim a focused view is an automatic projection unless Beautiflow produced it through a supported transformation.
