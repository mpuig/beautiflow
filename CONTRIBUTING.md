# Contributing

Thanks for helping improve Beautiflow.

## Development setup

Requirements: Bun 1.3 or newer and a platform supported by the native resvg dependency.

```bash
git clone https://github.com/mpuig/beautiflow.git
cd beautiflow
bun install --frozen-lockfile
bun run validate
```

## Pull requests

- Keep rendering, layout, and transformations deterministic.
- Add regression coverage for behavior changes.
- Regenerate committed example artifacts when their source or renderer changes.
- Update the relevant document under `docs/` for public behavior changes.
- Run `bun run validate` before opening the pull request.

Architecture and design constraints are documented in [`AGENTS.md`](AGENTS.md), [`PRODUCT.md`](PRODUCT.md), and [`DESIGN.md`](DESIGN.md).
