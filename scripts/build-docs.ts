import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { marked } from 'marked'
import packageJson from '../package.json' with { type: 'json' }

const root = resolve(import.meta.dir, '..')
const sourceDirectory = resolve(root, 'docs')
const outputDirectory = resolve(root, process.argv[2] ?? 'dist/docs')

const pages = [
  { file: 'README.md', slug: '', label: 'Overview', description: 'Start here: workflows, capability levels, and the technical documentation map.' },
  { file: 'cli.md', slug: 'cli', label: 'CLI reference', description: 'Commands, machine-readable evidence, options, and exit behavior.' },
  { file: 'agent-skill.md', slug: 'agent-skill', label: 'Agent Skill', description: 'Bounded capability discovery, safe mutation, validation, and stop conditions.' },
  { file: 'rendering.md', slug: 'rendering', label: 'Rendering', description: 'Family detection, Mermaid pipelines, SVG, PNG, themes, and architecture rendering.' },
  { file: 'architecture.md', slug: 'architecture', label: 'Architecture', description: 'Process boundaries, data ownership, determinism, and standalone compilation.' },
  { file: 'quality.md', slug: 'quality', label: 'Quality', description: 'Geometric audits, semantic diagnostics, and polish regression gates.' },
  { file: 'transformations.md', slug: 'transformations', label: 'Transformations', description: 'Transactional graph edits, source preservation, and rollback.' },
  { file: 'sidecar.md', slug: 'sidecar', label: 'Layout sidecar', description: 'Persistent presentation state, roles, pins, and source reconciliation.' },
  { file: 'server.md', slug: 'server', label: 'Preview server', description: 'Read-only live preview, recovery, file watching, and security boundaries.' },
  { file: 'development.md', slug: 'development', label: 'Development', description: 'Build, test, release, vendoring, and extension guidance.' },
] as const

const sourceToSlug = new Map(pages.map((page) => [page.file, page.slug]))

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~\[\]]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function slugify(value: string, seen: Map<string, number>) {
  const base = plainText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

function rewriteLinks(html: string) {
  return html.replace(/href="([^"#?]+\.md)(#[^"]*)?"/g, (_match, path: string, hash = '') => {
    const file = basename(path)
    const slug = sourceToSlug.get(file as typeof pages[number]['file'])
    if (slug === undefined) return `href="https://github.com/mpuig/beautiflow/blob/main/docs/${file}${hash}"`
    return `href="/docs/${slug ? `${slug}/` : ''}${hash}"`
  })
}

function navigation(currentSlug: string) {
  return pages.map((page) => {
    const active = page.slug === currentSlug
    const href = `/docs/${page.slug ? `${page.slug}/` : ''}`
    return `<li><a href="${href}"${active ? ' aria-current="page"' : ''}><span>${escapeHtml(page.label)}</span></a></li>`
  }).join('')
}

function layout(page: typeof pages[number], titleHeading: string, article: string, headings: Array<{ level: number; text: string; id: string }>) {
  const canonical = `https://beautiflow.cc/docs/${page.slug ? `${page.slug}/` : ''}`
  const title = page.slug ? `${page.label} — Beautiflow docs` : 'Beautiflow documentation'
  const toc = headings.filter((heading) => heading.level === 2 || heading.level === 3)
    .map((heading) => `<li class="toc-level-${heading.level}"><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`).join('')
  const repositoryPath = page.file === 'README.md' ? 'docs/README.md' : `docs/${page.file}`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="theme-color" content="#f4f1e8">
  <link rel="canonical" href="${canonical}">
  <link rel="preconnect" href="https://fonts.bunny.net">
  <link href="https://fonts.bunny.net/css?family=bricolage-grotesque:500,600,700,800|source-sans-3:400,500,600,700" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f5c46'/%3E%3Ccircle cx='18' cy='32' r='7' fill='%23c8ff62'/%3E%3Cpath d='M25 32h19m-7-8 8 8-8 8' fill='none' stroke='%23f4f1e8' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="/docs/docs.css">
  <title>${escapeHtml(title)}</title>
</head>
<body class="${page.slug ? '' : 'page-index'}">
  <!--
  THESIS: Documentation should feel like following a validated route, not searching a card catalog.
  OWN-WORLD: Drafting paper, evergreen rails, lime state, coral action, and crisp graph geometry extend Beautiflow's landing page.
  STORY: Find the right technical surface, understand its contract, copy a command, and return to the diagram.
  FIRST VIEWPORT: Persistent product header, connected chapter rail, broad reading column, and local contents at desktop scale.
  FORM: A technical field manual inside the established Beautiflow world; seed key docs-read-route.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
  -->
  <a class="skip-link" href="#content">Skip to documentation</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="Beautiflow home">
        <svg class="brand-mark" viewBox="0 0 54 32" aria-hidden="true"><circle cx="9" cy="16" r="7" fill="currentColor"/><path d="M17 16h25m-8-8 8 8-8 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Beautiflow</span>
      </a>
      <nav class="header-nav" aria-label="Primary">
        <a href="/docs/" aria-current="page">Docs</a>
        <a href="/#examples">Examples</a>
        <a class="github-link" href="https://github.com/mpuig/beautiflow">GitHub <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4h9v9M16 4 7 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </nav>
    </div>
  </header>
  <details class="mobile-nav">
    <summary>Documentation <span>${escapeHtml(page.label)}</span></summary>
    <nav aria-label="Documentation pages"><ol>${navigation(page.slug)}</ol></nav>
  </details>
  <div class="docs-shell">
    <aside class="docs-nav">
      <p class="nav-title">Documentation</p>
      <nav aria-label="Documentation pages"><ol>${navigation(page.slug)}</ol></nav>
      <a class="install-note" href="/#install"><span>Install</span><code>curl … | bash</code></a>
    </aside>
    <main id="content" class="doc-content">
      <header class="article-head">${titleHeading}<p>${escapeHtml(page.description)}</p></header>
      <article>${article}</article>
      <footer class="article-footer">
        <a href="https://github.com/mpuig/beautiflow/edit/main/${repositoryPath}">Edit this page on GitHub</a>
        <span>Beautiflow ${escapeHtml(packageJson.version)}</span>
      </footer>
    </main>
    <aside class="toc" aria-label="On this page">
      ${toc ? `<p>On this page</p><ol>${toc}</ol>` : ''}
    </aside>
  </div>
  <script src="/docs/docs.js"></script>
</body>
</html>`
}

const css = `:root{--paper:#f4f1e8;--raised:#fbfaf5;--ink:#17211e;--muted:#5c6863;--rule:#cfd5cb;--green:#0f5c46;--green-deep:#093e30;--lime:#c8ff62;--coral:#ff6b4a;--code:#10241e;--focus:#ad4b34;--display:"Bricolage Grotesque","Trebuchet MS",sans-serif;--body:"Source Sans 3","Segoe UI",sans-serif;--mono:"SFMono-Regular",Consolas,"Liberation Mono",monospace;--ease:cubic-bezier(.16,1,.3,1)}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:6rem}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.65 var(--body);overflow-wrap:anywhere}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.25;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cpath d='M2 2h1v1H2zM92 57h1v1h-1zM32 109h1v1h-1z' fill='%230f5c46' opacity='.16'/%3E%3C/svg%3E");z-index:20}a{color:inherit;text-decoration-thickness:1px;text-underline-offset:.2em}::selection{background:var(--lime);color:var(--green-deep)}:focus-visible{outline:3px solid var(--focus);outline-offset:4px}.skip-link{position:fixed;top:10px;left:10px;transform:translateY(-160%);background:var(--ink);color:var(--paper);padding:.55rem .9rem;z-index:100}.skip-link:focus{transform:none}.site-header{position:sticky;top:0;z-index:15;background:color-mix(in oklab,var(--paper) 94%,transparent);border-bottom:1px solid color-mix(in oklab,var(--green) 28%,transparent);backdrop-filter:blur(12px)}.header-inner{width:min(calc(100% - 40px),1440px);min-height:72px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:2rem}.brand{display:inline-flex;align-items:center;gap:.7rem;font:750 1.15rem/1 var(--display);letter-spacing:-.02em;text-decoration:none}.brand-mark{width:34px;color:var(--green)}.header-nav{display:flex;align-items:center;gap:1.65rem;font-size:.93rem;font-weight:650}.header-nav a{text-decoration:none}.header-nav a:hover{text-decoration:underline;text-underline-offset:.35em}.github-link{display:inline-flex;align-items:center;gap:.45rem;border:1px solid var(--ink);padding:.45rem .7rem}.github-link svg{width:16px}.docs-shell{width:min(calc(100% - 40px),1440px);margin:0 auto;display:grid;grid-template-columns:230px minmax(0,760px) 190px;gap:clamp(2.2rem,5vw,5.5rem);align-items:start}.docs-nav,.toc{position:sticky;top:106px;max-height:calc(100vh - 130px);overflow:auto;padding:3.4rem 0 2rem;scrollbar-width:thin;scrollbar-color:var(--rule) transparent}.nav-title,.toc>p{margin:0 0 1rem;font:700 .78rem/1 var(--display);text-transform:uppercase;letter-spacing:.08em;color:var(--green)}.docs-nav ol,.toc ol,.mobile-nav ol{list-style:none;margin:0;padding:0}.docs-nav ol{position:relative}.docs-nav ol:before{content:"";position:absolute;left:7px;top:.8rem;bottom:.8rem;width:1px;background:var(--rule)}.docs-nav li{position:relative;padding-left:1.55rem}.docs-nav li:before{content:"";position:absolute;left:4px;top:1.08rem;width:7px;height:7px;border-radius:50%;background:var(--paper);border:1px solid var(--green);z-index:1}.docs-nav li:has([aria-current="page"]):before{background:var(--lime);border-color:var(--green-deep);box-shadow:0 0 0 3px var(--paper)}.docs-nav a{display:block;padding:.48rem .25rem;text-decoration:none;color:var(--muted);font-size:.92rem}.docs-nav a:hover{color:var(--green)}.docs-nav [aria-current="page"]{color:var(--ink);font-weight:700}.install-note{display:block;margin:2rem 0 0 1.55rem;padding-top:1rem;border-top:1px solid var(--rule);text-decoration:none}.install-note span{display:block;font-weight:700}.install-note code{color:var(--green);font-size:.74rem}.doc-content{min-width:0;padding:clamp(3.2rem,6vw,6rem) 0 5rem}.article-head{padding-bottom:2rem;margin-bottom:2.3rem;border-bottom:1px solid var(--rule)}.article-head p{margin:0;max-width:62ch;color:var(--muted);font-size:1.08rem}.article-head h1{margin:0 0 1.4rem;font:750 clamp(2.9rem,6vw,5.3rem)/.95 var(--display);letter-spacing:-.04em;text-wrap:balance;overflow-wrap:normal}.doc-content h2,.doc-content h3{font-family:var(--display);line-height:1.1;text-wrap:balance;overflow-wrap:normal}.doc-content h2{margin:4.8rem 0 1.15rem;padding-top:.3rem;font-size:clamp(1.9rem,3vw,2.65rem);letter-spacing:-.025em}.doc-content h3{margin:2.8rem 0 .85rem;font-size:1.32rem}.heading-anchor{margin-left:.45rem;color:var(--rule)!important;font:500 .72em/1 var(--body);text-decoration:none;opacity:0;transition:opacity 160ms var(--ease)}h1:hover>.heading-anchor,h2:hover>.heading-anchor,h3:hover>.heading-anchor,.heading-anchor:focus{opacity:1}.doc-content p,.doc-content li{max-width:72ch}.doc-content p{margin:0 0 1.2rem}.doc-content ul,.doc-content ol{padding-left:1.35rem}.doc-content li{padding-left:.25rem;margin:.3rem 0}.doc-content a{color:var(--green);font-weight:600}.doc-content strong{font-weight:700}.table-wrap{max-width:100%;overflow-x:auto;margin:1.8rem 0 2.4rem;scrollbar-width:thin;scrollbar-color:var(--rule) transparent}.table-wrap:before{display:none;content:"Scroll table →";position:sticky;left:0;width:max-content;margin:0 0 .45rem;color:var(--green);font-size:.76rem;font-weight:700}.doc-content table{width:100%;border-collapse:collapse;font-size:.93rem}.doc-content th{text-align:left;font-family:var(--display);background:var(--green-deep);color:var(--paper);font-weight:650}.doc-content th,.doc-content td{padding:.75rem .8rem;border:1px solid var(--rule);vertical-align:top}.doc-content tbody tr:nth-child(even){background:color-mix(in oklab,var(--raised) 66%,transparent)}code{font-family:var(--mono);font-size:.88em}.doc-content :not(pre)>code{padding:.12em .32em;background:color-mix(in oklab,var(--green) 9%,var(--paper));color:var(--green-deep);border-radius:3px}.code-block{position:relative;margin:1.7rem 0 2.2rem;background:var(--code);color:#e9f1e9}.code-label{min-height:38px;display:flex;align-items:center;justify-content:space-between;padding:.4rem .55rem .4rem 1rem;border-bottom:1px solid rgba(233,241,233,.17);font:600 .72rem/1 var(--display);letter-spacing:.04em;text-transform:uppercase;color:#afc5ba}.copy-code{display:inline-flex;align-items:center;gap:.4rem;min-height:28px;border:1px solid rgba(233,241,233,.25);background:transparent;color:#e9f1e9;padding:.25rem .55rem;font:600 .76rem/1 var(--body);cursor:pointer}.copy-code:hover{background:rgba(233,241,233,.1)}.copy-code svg{width:14px;height:14px}.code-block pre{margin:0;padding:1rem 1.15rem 1.2rem;overflow:auto;scrollbar-width:thin;scrollbar-color:#557166 var(--code)}.code-block pre code{font-size:.83rem;line-height:1.65}.toc ol{border-left:1px solid var(--rule);padding-left:1rem}.toc li{margin:.55rem 0;line-height:1.35}.toc a{display:block;text-decoration:none;color:var(--muted);font-size:.82rem}.toc a:hover{color:var(--green)}.toc-level-3{padding-left:.8rem}.article-footer{display:flex;justify-content:space-between;gap:2rem;margin-top:5.5rem;padding-top:1.3rem;border-top:1px solid var(--rule);color:var(--muted);font-size:.85rem}.article-footer a{color:var(--green)}.page-index .doc-content article>h2:first-of-type+ul{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--rule);padding:0;list-style:none}.page-index .doc-content article>h2:first-of-type+ul li{margin:0;padding:1rem .2rem;border-bottom:1px solid var(--rule)}.page-index .doc-content article>h2:first-of-type+ul li:nth-child(odd){padding-right:1.2rem}.page-index .doc-content article>h2:first-of-type+ul li:nth-child(even){padding-left:1.2rem;border-left:1px solid var(--rule)}.mobile-nav{display:none}@media(max-width:1100px){.docs-shell{grid-template-columns:210px minmax(0,760px)}.toc{display:none}}@media(max-width:760px){html{scroll-padding-top:8rem}.header-inner{width:min(calc(100% - 28px),1440px);min-height:64px}.header-nav{gap:1rem}.header-nav>a:not(.github-link){display:none}.github-link{border:0;padding:.4rem 0}.docs-shell{width:min(calc(100% - 28px),760px);display:block}.docs-nav{display:none}.mobile-nav{display:block;position:sticky;top:64px;z-index:12;background:var(--green-deep);color:var(--paper)}.mobile-nav summary{min-height:50px;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.65rem 14px;font-weight:700;cursor:pointer;list-style:none}.mobile-nav summary::-webkit-details-marker{display:none}.mobile-nav summary:after{content:"+";font-size:1.25rem}.mobile-nav[open] summary:after{content:"−"}.mobile-nav summary span{margin-left:auto;color:#b8c9c0;font-weight:500;font-size:.86rem}.mobile-nav nav{max-height:calc(100vh - 114px);overflow:auto;border-top:1px solid rgba(244,241,232,.18);padding:.6rem 14px 1rem}.mobile-nav a{display:block;padding:.55rem 0;text-decoration:none;color:#dfe8e2}.mobile-nav [aria-current="page"]{color:var(--lime);font-weight:700}.doc-content{padding:2.7rem 0 4rem}.article-head{padding-bottom:1.5rem;margin-bottom:1.8rem}.doc-content article>h1:first-child{font-size:clamp(2.55rem,13vw,4rem)}.doc-content h2{margin-top:3.8rem}.page-index .doc-content article>h2:first-of-type+ul{display:block}.page-index .doc-content article>h2:first-of-type+ul li:nth-child(n){padding:1rem .1rem;border-left:0}.table-wrap:before{display:block}.doc-content table{min-width:680px}.article-footer{display:block}.article-footer span{display:block;margin-top:.5rem}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{.site-header,.docs-nav,.toc,.mobile-nav,.copy-code{display:none}.docs-shell{display:block;width:auto}.doc-content{padding:0}.article-head{color:#333}.code-block{break-inside:avoid}.article-footer{margin-top:2rem}}
`

const javascript = `document.querySelectorAll('.copy-code').forEach((button)=>{button.addEventListener('click',async()=>{const code=button.closest('.code-block').querySelector('code').textContent;try{await navigator.clipboard.writeText(code);const label=button.querySelector('span');label.textContent='Copied';setTimeout(()=>label.textContent='Copy',1400)}catch{button.querySelector('span').textContent='Select text'}})});`

await rm(outputDirectory, { recursive: true, force: true })
await mkdir(outputDirectory, { recursive: true })
await Promise.all([
  writeFile(resolve(outputDirectory, 'docs.css'), css),
  writeFile(resolve(outputDirectory, 'docs.js'), javascript),
])

for (const page of pages) {
  const source = await readFile(resolve(sourceDirectory, page.file), 'utf8')
  let article = String(await marked.parse(source, { gfm: true }))
  article = rewriteLinks(article)
  const seen = new Map<string, number>()
  const headings: Array<{ level: number; text: string; id: string }> = []
  article = article.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_match, levelText: string, contents: string) => {
    const level = Number(levelText)
    const text = plainText(contents)
    const id = slugify(text, seen)
    headings.push({ level, text, id })
    return `<h${level} id="${id}">${contents}<a class="heading-anchor" href="#${id}" aria-label="Link to ${escapeHtml(text)}">#</a></h${level}>`
  })
  article = article.replace(/<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_match, language = 'text', code: string) => `<div class="code-block"><div class="code-label"><span>${escapeHtml(language)}</span><button class="copy-code" type="button" aria-label="Copy code"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 5V4H4v9h1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span>Copy</span></button></div><pre><code>${code}</code></pre></div>`)
  article = article.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="table-wrap" tabindex="0" aria-label="Scrollable data table"><table>$1</table></div>')
  const titleMatch = article.match(/^<h1[\s\S]*?<\/h1>\s*/)
  if (!titleMatch) throw new Error(`Missing H1 in ${page.file}`)
  const titleHeading = titleMatch[0].trim()
  article = article.slice(titleMatch[0].length)

  const directory = resolve(outputDirectory, page.slug)
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'index.html'), layout(page, titleHeading, article, headings))
}

console.log(`Built ${pages.length} documentation pages in ${outputDirectory}`)
