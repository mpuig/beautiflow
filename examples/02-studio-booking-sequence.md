# Studio booking sequence

Exercise a five-party booking exchange with authorization and host notification.

**Capability:** render-only specialized family.

```mermaid
sequenceDiagram
    participant Guest
    participant Booking
    participant Calendar
    participant Billing
    participant Host

    Guest->>Booking: Request studio slot
    Booking->>Calendar: Hold requested time
    Calendar-->>Booking: Hold confirmed
    Booking->>Billing: Authorize deposit
    Billing-->>Booking: Deposit authorized
    Booking-->>Guest: Booking confirmed
    Booking->>Host: Send preparation brief
    Host-->>Booking: Brief acknowledged
```

## Rendered output

![Studio booking sequence rendered by Beautiflow](rendered/02-studio-booking-sequence.png)

Generated with:

```bash
beautiflow render examples/sources/02-studio-booking-sequence.mmd --format png --theme github-dark --output examples/rendered/02-studio-booking-sequence.png
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/02-studio-booking-sequence.mmd
```

Run Beautiflow directly:

```bash
beautiflow render examples/sources/02-studio-booking-sequence.mmd --format svg
```

Or ask an agent with the Beautiflow skill:

```text
Review the booking exchange for readability and render a polished preview.
Use examples/sources/02-studio-booking-sequence.mmd and show me the result.
```
