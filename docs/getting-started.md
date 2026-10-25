# Your first diagram

Install Beautiflow, connect your coding agent, and start with a question or an existing Mermaid file. Your agent handles the conversation. Beautiflow renders, checks and saves the result locally.

## Install

Prebuilt binaries support macOS Apple silicon and Linux x86-64. Read the [installer](/install.sh) before running it if you prefer.

```bash
curl -fsSL https://beautiflow.cc/install.sh | bash
beautiflow version
```

Other platforms can build from source; see [Development](development.md).

## Connect your agent

Run the command for your harness:

```bash
beautiflow install-skill --target claude
beautiflow install-skill --target codex
beautiflow install-skill --target pi
```

You only need the target you use. Model access and credentials remain with that agent, not Beautiflow. See [Agent integration](agent-skill.md) for local and shared installations.

## Ask for a diagram

Try this in your coding agent:

> Use Beautiflow to create an order-platform diagram in a new order-platform.mmd file. Show customers, an API, a database and a queue feeding a worker. Render it, inspect the supported checks, and explain any limitations.

The agent authors Mermaid. Beautiflow produces the rendered output. Keep the `.mmd` file: it contains the relationships and labels, not just a picture. See [diagram types](diagram-types.md) to choose a notation.

## Work with an existing file

Ask your agent to inspect the file before changing it. For flowcharts and state diagrams, a direct human workflow is also available:

```bash
beautiflow inspect diagram.mmd --agent --json
beautiflow polish diagram.mmd
beautiflow server diagram.mmd
```

Architecture supports inspection and guarded edits, but not automatic polish. Other render-only types cannot be transformed through flowchart actions.

## Export and preview

```bash
beautiflow render diagram.mmd --format svg
beautiflow render diagram.mmd --format png
beautiflow server diagram.mmd
```

The preview is read-only and follows saved changes. It never runs an agent or changes your files. Stop it with Ctrl-C.

Next: [How it works](how-it-works.md), [examples](/examples.html), or the [CLI reference](cli.md).
