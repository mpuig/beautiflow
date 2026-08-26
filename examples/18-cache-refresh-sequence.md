# Cache refresh sequence

Show a self-message and fresh-versus-stale cache behavior.

**Capability:** render-only specialized family.

```mermaid
sequenceDiagram
    participant Browser
    participant Gateway
    participant Cache
    participant Origin

    Browser->>Gateway: Request dashboard
    Gateway->>Cache: Read cached response
    alt Entry is fresh
        Cache-->>Gateway: Return cached response
    else Entry is stale
        Cache->>Cache: Acquire refresh lease
        Cache->>Origin: Fetch current dashboard
        Origin-->>Cache: Return current data
        Cache-->>Gateway: Return refreshed response
    end
    Gateway-->>Browser: Render dashboard
```

## Rendered output

![Cache refresh sequence rendered by Beautiflow](rendered/18-cache-refresh-sequence.png)

Generated with:

```bash
beautiflow render examples/sources/18-cache-refresh-sequence.mmd --format png --theme catppuccin-latte --transparent --output examples/rendered/18-cache-refresh-sequence.png
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/18-cache-refresh-sequence.mmd
```

Run Beautiflow directly:

```bash
beautiflow render examples/sources/18-cache-refresh-sequence.mmd --format svg
```

Or ask an agent with the Beautiflow skill:

```text
Render the cache exchange and make sure the refresh lease is visible.
Use examples/sources/18-cache-refresh-sequence.mmd and show me the result.
```
