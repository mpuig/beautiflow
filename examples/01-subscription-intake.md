# Subscription intake

Practice emphasizing a primary path while keeping payment recovery readable.

**Capability:** full flowchart/state pipeline.

```mermaid
flowchart TD
    signup([Trial signup]) --> profile[Create workspace profile]
    profile --> plan{Select a plan?}
    plan -->|Not yet| nurture[Start onboarding tips]
    plan -->|Plan selected| payment[Verify payment method]
    payment --> accepted{Payment accepted?}
    accepted -->|No| retry[Request another method]
    retry --> payment
    accepted -->|Yes| provision[Provision workspace]
    provision --> invite[Invite teammates]
    invite --> active([Workspace active])
```

## Rendered output

![Subscription intake rendered by Beautiflow](rendered/01-subscription-intake.svg)

Generated with:

```bash
beautiflow render examples/sources/01-subscription-intake.mmd --format svg --theme github-light --output examples/rendered/01-subscription-intake.svg
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/01-subscription-intake.mmd
```

Run Beautiflow directly:

```bash
beautiflow polish examples/sources/01-subscription-intake.mmd
```

Or ask an agent with the Beautiflow skill:

```text
Make the activation path primary and style payment retries as an exception without changing the topology.
Use examples/sources/01-subscription-intake.mmd and show me the result.
```
