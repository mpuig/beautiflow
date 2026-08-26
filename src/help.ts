export const HELP = `Beautiflow — beautiful diagrams from imperfect flows

Usage:
  beautiflow render <file> [options]
  beautiflow server <file>
  beautiflow inspect <file> [--agent] [--json]
  beautiflow doctor [file] [--json]
  beautiflow layout <file> [--candidates 1-5] [--json]
  beautiflow polish <file> [--dry-run] [--json]
  beautiflow audit <file> [--json]
  beautiflow diagnose <file> [--json]
  beautiflow apply <file> --actions <file> [--dry-run] [--json]
  beautiflow transform <file> --actions <file> [--dry-run] [--json]
  beautiflow install-skill [--target agents|pi|claude|codex] [--local]
  beautiflow themes
  beautiflow version

Render options:
  -f, --format <format>   Output: svg, png, unicode, or ascii (default: svg)
  -o, --output <path>    Output path; use - for stdout
  -t, --theme <name>     Beautiful Mermaid theme
      --transparent      Render without a background

Examples:
  beautiflow server architecture.mmd
  beautiflow polish architecture.mmd
  beautiflow inspect architecture.mmd --agent --json
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
