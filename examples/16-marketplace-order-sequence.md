# Marketplace order sequence

Exercise nested alternatives plus parallel fulfillment and receipt work.

**Capability:** render-only specialized family.

```mermaid
sequenceDiagram
    participant Shopper
    participant Market
    participant Inventory
    participant Payment
    participant Seller

    Shopper->>+Market: Place order
    Market->>Inventory: Reserve items
    alt Items unavailable
        Inventory-->>Market: Reservation rejected
        Market-->>Shopper: Suggest alternatives
    else Items reserved
        Inventory-->>Market: Reservation confirmed
        Market->>Payment: Authorize total
        alt Authorization declined
            Payment-->>Market: Declined
            Market->>Inventory: Release reservation
            Market-->>Shopper: Request another payment method
        else Authorization approved
            Payment-->>Market: Approved
            par Fulfillment
                Market--)Seller: Send packing request
            and Receipt
                Market-->>Shopper: Confirm order
            end
        end
    end
```

## Rendered output

![Marketplace order sequence rendered by Beautiflow](rendered/16-marketplace-order-sequence.png)

Generated with:

```bash
beautiflow render examples/sources/16-marketplace-order-sequence.mmd --format png --theme github-light --transparent --output examples/rendered/16-marketplace-order-sequence.png
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/16-marketplace-order-sequence.mmd
```

Run Beautiflow directly:

```bash
beautiflow render examples/sources/16-marketplace-order-sequence.mmd --format svg
```

Or ask an agent with the Beautiflow skill:

```text
Render the order sequence and identify the two recovery paths.
Use examples/sources/16-marketplace-order-sequence.mmd and show me the result.
```
