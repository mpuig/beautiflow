# Device sync sequence

Explore a loop with conflict handling and an optional battery pause.

**Capability:** render-only specialized family.

```mermaid
sequenceDiagram
    participant Device
    participant Sync
    participant Cloud

    loop While local changes remain
        Device->>Sync: Submit next change set
        Sync->>Cloud: Compare revision vector
        alt Conflict detected
            Cloud-->>Sync: Return conflicting fields
            Sync-->>Device: Request user resolution
        else Revisions compatible
            Cloud-->>Sync: Commit accepted
            Sync-->>Device: Advance local cursor
        end
        opt Battery is low
            Device->>Device: Pause background sync
        end
    end
```

## Rendered output

![Device sync sequence rendered by Beautiflow](rendered/17-device-sync-sequence.svg)

Generated with:

```bash
beautiflow render examples/sources/17-device-sync-sequence.mmd --format svg --theme nord-light --transparent --output examples/rendered/17-device-sync-sequence.svg
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/17-device-sync-sequence.mmd
```

Run Beautiflow directly:

```bash
beautiflow render examples/sources/17-device-sync-sequence.mmd --format svg
```

Or ask an agent with the Beautiflow skill:

```text
Render the sync protocol and explain the conflict branch.
Use examples/sources/17-device-sync-sequence.mmd and show me the result.
```
