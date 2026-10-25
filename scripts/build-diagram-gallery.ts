import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const repository = resolve(import.meta.dir, '..')
const recipe = 'examples/recipes/diagram-types'
const sourceDirectory = resolve(repository, recipe)

const descriptions: Record<string, [string, string, string]> = {
  agentflow: ['Agent flow', 'A weekend hike, planned with review', 'A trail-planning assistant gathers route and weather evidence, drafts an itinerary, and revises it when review raises a concern. An illustrative workflow, not a safety guarantee.'],
  block: ['Block diagram', 'A greenhouse that responds to its surroundings', 'Three sensors feed one controller, which operates irrigation, shade, and ventilation. Blue reads the environment, green decides, and orange acts.'],
  c4: ['C4', 'The neighborhood library, in context', 'Members and librarians share a lending service, while book supply and message delivery stay outside its boundary.'],
  cynefin: ['Cynefin', 'Which kind of festival problem is this?', 'A water refill needs a checklist; a storm needs immediate action. Different situations call for different ways of deciding.'],
  eventmodeling: ['Event modeling', 'From a coffee order to a fresh roast', 'Follow one order through a blend picker, commands, recorded events, a roast queue, and a dispatch board.'],
  gantt: ['Gantt', 'Launch a neighborhood coffee club', 'Tastings, packaging, checkout, and roasting overlap on an authored June 2027 schedule, ending with the first shipment.'],
  ishikawa: ['Ishikawa', 'Why did dinner arrive late?', 'Investigate possible causes across the kitchen, ordering, delivery, and staffing. These are hypotheses to check, not proven causes.'],
  journey: ['User journey', 'The highs and lows of a first overnight hike', 'The ridge view scores better than packing a heavy bag or drying wet gear. Shared tasks show where a guide can help.'],
  kanban: ['Kanban', 'Get a community garden ready for visitors', 'Herb spirals and shady benches start as ideas; irrigation is underway, while paths and plant labels are ready for visitors.'],
  mindmap: ['Mindmap', 'Make room for a weekend outside', 'A compact planning map connects places, a light packing list, leave-no-trace habits, and things worth recording.'],
  packet: ['Packet', 'Inside a trail sensor message', 'An illustrative 192-bit telemetry format gives identification, timing, temperature, humidity, and error checking their own fields.'],
  quadrantChart: ['Quadrant chart', 'What should the library improve next?', 'Compare six proposals by effort and benefit. Clearer signs and text reminders sit apart from a custom app or a new reading room.'],
  radar: ['Radar', 'Choose a bike for the everyday ride', 'Compare a city bike, an e-bike, and a folding bike across comfort, cargo, hills, range, and upkeep. Scores illustrate trade-offs, not product test results.'],
  railroad: ['Railroad', 'A tiny field-guide search language', 'Build a query from habitat, season, or species terms, with optional negation, quoted values, and repeated AND clauses.'],
  requirement: ['Requirement', 'What must a cargo bike prove?', 'Connect wet braking, night visibility, and carrying groceries to the tests or demonstrations that verify each requirement.'],
  sankey: ['Sankey', 'Where a sunny day’s energy goes', 'Trace an illustrative 48 kWh through solar generation, grid import, battery storage, household uses, export, and storage losses. Every intermediate flow balances.'],
  swimlane: ['Swimlane', 'One repair café visit, three responsibilities', 'A visitor, welcome desk, and volunteer pass an item from registration through diagnosis, repair, and a final try-out.'],
  timeline: ['Timeline', 'A year under the stars', 'A fictional community observatory moves from scouting a dark-sky site to training guides, opening public nights, and sharing a sky atlas.'],
  treemap: ['Treemap', 'Give a small game a launch budget', 'Allocate 100 illustrative budget units across making the game, reaching players, and keeping it running. Area makes the largest commitments visible.'],
  treeView: ['Tree view', 'Bring the field notes home', 'Bird recordings, trail tracks, and sketches live in a small, browsable trip archive alongside the plan and packing list.'],
  usecase: ['Use case', 'Who can do what at the library?', 'Members search, reserve, and renew; librarians handle borrowing and new titles. The system boundary keeps actors separate from capabilities.'],
  venn: ['Venn', 'Who uses which parts of a wildlife garden?', 'An illustrative observation log compares visitors to flowers, water, and shelter. Intersections describe this fictional survey, not fixed species traits.'],
  wardley: ['Wardley map', 'What sits behind a coffee subscription?', 'Start with a coffee lover’s need and follow dependencies into roast profiles, subscriptions, payments, and delivery. Positions are illustrative strategic judgments.'],
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function nestedLinks(fragment: string) {
  return fragment.replace(/href="([^"]*)"/g, (match, href: string) => {
    if (/^(?:[a-z]+:|\/|#)/i.test(href)) return match
    return `href="../../../${href.replace(/^\.\//, '')}"`
  })
}

export async function buildDiagramGallery(destination = sourceDirectory) {
  const files = (await readdir(resolve(sourceDirectory, 'sources'))).filter((file) => file.endsWith('.mmd')).sort()
  const examples = await Promise.all(files.map(async (file) => {
    const id = file.slice(0, -4)
    const metadata = descriptions[id]
    if (!metadata) throw new Error(`Missing diagram gallery description: ${id}`)
    const svg = await readFile(resolve(sourceDirectory, 'rendered', `${id}.svg`), 'utf8')
    const viewport = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/)?.[1]?.trim().split(/\s+/).map(Number)
    if (!viewport || viewport.length !== 4 || viewport.some((value) => !Number.isFinite(value)) || viewport[2]! <= 0 || viewport[3]! <= 0) throw new Error(`Missing diagram viewport: ${id}`)
    const width = viewport[2]!, height = viewport[3]!
    return {
      width, height, wide: width / height > 2.4, portrait: height / width > 1.25,
      id, title: metadata[0], scenario: metadata[1], description: metadata[2],
      source: await readFile(resolve(sourceDirectory, 'sources', file), 'utf8'),
      command: `beautiflow render ${recipe}/sources/${file} --format svg --theme github-light --output ${recipe}/rendered/${id}.svg`,
    }
  }))
  const shell = await readFile(resolve(repository, 'examples.html'), 'utf8')
  const head = nestedLinks(shell.match(/<head>[\s\S]*?<\/head>/)![0])
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Diagram gallery — Beautiflow</title>')
    .replace(/name="description" content="[^"]*"/, `name="description" content="Explore ${examples.length} diagram types with rendered examples, Mermaid sources, and reproducible commands."`)
    .replace(/rel="canonical" href="[^"]*"/, 'rel="canonical" href="https://beautiflow.cc/examples/recipes/diagram-types/"')
  const header = nestedLinks(shell.match(/<header>[\s\S]*?<\/header>/)![0])
  const footer = nestedLinks(shell.match(/<footer>[\s\S]*?<\/footer>/)![0])
  const html = `<!doctype html>
<html lang="en">
${head}
<body class="diagram-types">
  <!-- Generated by scripts/build-diagram-gallery.ts from the Mermaid sources. -->
  <a class="skip-link" href="#main">Skip to content</a>
  ${header}
  <main id="main">
    <section class="shell gallery-intro" aria-labelledby="gallery-title">
      <p><a href="../../../examples.html">Examples</a> / Diagram types</p>
      <div class="section-head">
        <h1 id="gallery-title">Diagram gallery</h1>
        <div class="hero-copy"><p>Explore ${examples.length} additional diagram types. Each has a practical scenario, its Mermaid source, and an exact render command. All scenarios and data are illustrative.</p><a href="/docs/diagram-types/">Compare all 32 diagram types</a> · <a href="/examples/diagrams/">Browse all diagram examples</a></div>
      </div>
    </section>
    <div class="shell">
      <nav id="types" class="type-index" aria-label="Diagram types"><ul>${examples.map(({ id, title }) => `<li><a href="#${id}">${escapeHtml(title)}</a></li>`).join('')}</ul></nav>
      <p class="type-coverage">These types support SVG, PNG, inspection, and read-only preview. Audits check SVG references only; geometry scores, transformations, sidecars, and automatic polish are not available. <a href="/docs/rendering/">Compare capabilities by diagram type.</a></p>
      ${examples.map(({ id, title, scenario, description, source, command, wide, portrait, width, height }) => `<article id="${id}" class="example-row diagram-type${wide ? ' example-row--wide' : ''}" aria-labelledby="${id}-title">
        <div class="example-copy">
          <h2 id="${id}-title">${escapeHtml(title)}</h2>
          <h3>${escapeHtml(scenario)}</h3>
          <p>${escapeHtml(description)}</p>
          <div class="artifact-links"><a href="sources/${id}.mmd">Mermaid source</a><a href="#types">Back to diagram types</a></div>
          <details class="example-source"><summary>Source and render command</summary><pre class="source"><code>${escapeHtml(source.trimEnd())}</code></pre><pre class="source"><code>${escapeHtml(command)}</code></pre></details>
        </div>
        <figure class="showcase example-figure${portrait ? ' example-figure--portrait' : ''}">
          <a class="art" href="rendered/${id}.svg" aria-label="Open full ${escapeHtml(title)} example"><img src="rendered/${id}.svg" alt="${escapeHtml(scenario)}: ${escapeHtml(title)} example" width="${Math.ceil(width)}" height="${Math.ceil(height)}" loading="lazy"></a>
          <figcaption class="diagram-caption"><a href="rendered/${id}.svg">Open full-size SVG</a></figcaption>
        </figure>
      </article>`).join('\n      ')}
      <p class="gallery-notes">Scenarios, dates, measurements, scores, budgets, and observations are illustrative, not product benchmarks or real operational data. Rendering uses Pele 1.10.0, targeting Mermaid 12.1 syntax. Gantt exports use a fixed clock for reproducibility; author explicit dates. <a href="/docs/rendering/">Rendering details and limitations.</a></p>
    </div>
  </main>
  ${footer}
</body>
</html>
`
  const markdown = `# Diagram types

[Open the HTML diagram gallery](index.html).

These original scenario-led examples cover ${examples.length} additional diagram types. Scenarios, dates, measurements, scores, budgets, and observations are illustrative, not product benchmarks or real operational data. Existing types retain their existing examples and renderers. All types below support SVG, PNG, inspection, and read-only preview; their audits check SVG references only, with no geometry score. No layout actions, transformations, sidecars, or automatic polish are advertised. See [rendering capabilities](../../../docs/rendering.md) for the full type list.

Rendering uses Pele 1.10.0, targeting Mermaid 12.1 syntax. Gantt export uses a fixed clock (\`now: 0\`) for reproducibility; use explicit dates in authored source.

${examples.map(({ id, title, scenario, description, command }) => `## ${title}

### ${scenario}

${description}

![${title} example](rendered/${id}.svg)

[Mermaid source](sources/${id}.mmd) · [HTML example](index.html#${id})

\`\`\`sh
${command}
\`\`\`
`).join('\n')}`
  await mkdir(destination, { recursive: true })
  await Promise.all([
    writeFile(resolve(destination, 'index.html'), html),
    writeFile(resolve(destination, 'README.md'), markdown),
  ])
  return examples.length
}

if (import.meta.main) {
  const count = await buildDiagramGallery(process.argv[2] ? resolve(process.argv[2]) : undefined)
  console.log(`Built diagram gallery with ${count} examples`)
}
