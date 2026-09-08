export const HELP = `Beautiflow — beautiful diagrams from imperfect flows

Usage:
  beautiflow render <file> [options]
  beautiflow server <file>
  beautiflow inspect <file> [--agent] [--json]
  beautiflow doctor [file] [--json]
  beautiflow schema [--json]
  beautiflow agent plan <file> --operation <polish|apply|transform> [--actions <file>] [--receipt <file>] [--json]
  beautiflow agent commit --receipt <file> [--json]
  beautiflow agent verify --receipt <file> [--json]
  beautiflow agent correct --receipt <file> --operation <apply|transform> --actions <file> [--json]
  beautiflow agent finish --receipt <file> [--visual-inspected] [--json]
  beautiflow agent rollback --receipt <file> [--json]
  beautiflow layout <file> [--candidates 1-5] [--json]
  beautiflow polish <file> [--dry-run] [--json]
  beautiflow audit <file> [--json]
  beautiflow diagnose <file> [--json]
  beautiflow apply <file> --actions <file> [--dry-run] [--json]
  beautiflow transform <file> --actions <file> [--dry-run] [--json]
  beautiflow install-skill [--target agents|pi|claude|codex] [--local]
  beautiflow themes
  beautiflow version

Quality:
  audit reports geometry, estimated label collisions, and shared routes.
  JSON findings name supported semantic repairs; agents never author coordinates.
  polish ranks valid candidates in one bounded pass without changing semantics.
  First-use polish keeps the incumbent unless a valid candidate meets its score.
  Architecture audit declares coverage; native-only renders have no geometry score.
  Compound architecture layout preserves explicit ports without cloud-specific rules.

Render options:
  -f, --format <format>   Output: svg, png, unicode, or ascii (default: svg)
  -o, --output <path>    Output path; use - for stdout
  -t, --theme <name>     Beautiful Mermaid theme
      --transparent      Render without a background

Examples:
  beautiflow server architecture.mmd
  beautiflow polish architecture.mmd
  beautiflow inspect architecture.mmd --agent --json
  beautiflow schema --json
  beautiflow agent plan architecture.mmd --operation polish --json
  beautiflow doctor architecture.mmd --json
  beautiflow polish architecture.mmd --dry-run --json
  beautiflow layout architecture.mmd --candidates 5 --json
  beautiflow audit architecture.mmd --json
  beautiflow diagnose architecture.mmd --json
  beautiflow apply architecture.mmd --actions layout-actions.json
  beautiflow transform architecture.mmd --actions transformations.json --dry-run
  beautiflow render architecture.mmd --format png
  beautiflow install-skill --target pi
`
