import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname, posix } from 'node:path'
import { marked } from 'marked'
import { JSDOM } from 'jsdom'
import { peleFamily } from '../src/diagram/pele.ts'

const root = resolve(import.meta.dir, '..')
const slug = (s:string) => s.toLowerCase().replace(/<[^>]*>/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export const escape = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
export async function exampleInventory() {
  const items: Array<{id:string; title:string; type:string; source:string; image:string; guide:string; description:string}> = []
  for (const file of (await readdir(resolve(root,'examples'))).filter(f=>/^\d.*\.md$/.test(f)).sort()) {
    const text=await readFile(resolve(root,'examples',file),'utf8')
    const source=text.match(/```mermaid\n([\s\S]*?)```/)?.[1] ?? ''
    items.push({id:file.slice(0,-3), title:text.match(/^# (.+)/)![1]!,type:peleFamily(source) ?? 'flowchart',source:`examples/sources/${file.slice(0,-3)}.mmd`, image:posix.join('examples',text.match(/!\[[^\]]*\]\(([^)]+)\)/)![1]!),guide:`examples/${file}`,description:text.split('\n').find((line,i)=>i>0&&line.trim())??''})
  }
  const gallery=new JSDOM(await readFile(resolve(root,'examples/recipes/diagram-types/index.html'),'utf8'))
  for(const article of gallery.window.document.querySelectorAll('.diagram-type')) {
    const id=article.id
    items.push({id,title:article.querySelector('h3')!.textContent!,type:id,source:`examples/recipes/diagram-types/sources/${id}.mmd`,image:`examples/recipes/diagram-types/rendered/${id}.svg`,guide:`examples/recipes/diagram-types/index.html#${id}`,description:article.querySelector('.example-copy p')!.textContent!})
  }
  gallery.window.close()
  return items
}
export async function typeReference() {
  const items=await exampleInventory()
  const types=['flowchart','state','sequence','class','er','xychart','pie','gitGraph','architecture',...items.slice(19).map(x=>x.type)]
  const labels:Record<string,string>={state:'State diagram',sequence:'Sequence diagram',er:'Entity relationship',xychart:'XY chart',gitGraph:'GitGraph',architecture:'Architecture',quadrantChart:'Quadrant chart',treeView:'Tree view',agentflow:'Agent flow',block:'Block diagram',c4:'C4',eventmodeling:'Event modeling',journey:'User journey',usecase:'Use case',wardley:'Wardley map'}
  return '# Diagram types\n\nChoose a notation for the question you need to explain. All **32 types** support SVG, PNG, inspection and read-only preview. Support for checks and edits varies; rendering alone does not imply automatic polish.\n\n[Browse practical examples](/examples.html) · [Rendering and export](rendering.md) · [Quality coverage](quality.md)\n\n'+types.map(type=>`[${labels[type]??type.charAt(0).toUpperCase()+type.slice(1)}](#${slug(labels[type]??type)})`).join(' · ')+'\n\n'+types.map(type=>{
    const item=items.find(x=>x.type===type)
    const image=item?.image ?? (type==='architecture'?'examples/recipes/visual-quality/rendered/architecture.svg':'examples/recipes/xy-chart/rendered/chart.svg')
    const support=['flowchart','state'].includes(type)?'Measured geometry, source transformations, sidecar layout and automatic polish.':type==='architecture'?'Measured geometry and bounded source transformations. No sidecar layout or automatic polish.':'SVG-reference checks. No measured geometry score, transformations, sidecars or automatic polish.'
    return `## ${labels[type]??type.charAt(0).toUpperCase()+type.slice(1)}\n\n${support}\n\n${item?`![${escape(item.title)}](/${image})\n\n${item.description}\n\n[Example and source](/examples/${item.id}/)` : type==='architecture'?`![Order platform](/${image})\n\nUse architecture diagrams for services, dependencies and nested boundaries.\n\n[Architecture walkthrough](/examples/recipes/aws-architecture/)`:`![Weekly support requests](/${image})\n\nUse an XY chart to compare values along numeric or categorical axes.\n\n[XY chart example](/examples/recipes/xy-chart/)`}\n`
  }).join('\n')
}

export async function buildExamplePages(destination:string) {
  const shell=await readFile(resolve(root,'examples.html'),'utf8')
  const head=shell.match(/<head>[\s\S]*?<\/head>/)![0].replace('href="site.css"','href="/site.css"')
  const header=shell.match(/<header>[\s\S]*?<\/header>/)![0]
  const footer=shell.match(/<footer>[\s\S]*?<\/footer>/)![0]
  const absolute=(s:string)=>s.replace(/href="(?![a-z]+:|\/|#)([^"]+)"/g,'href="/$1"')
  const page=(title:string,body:string,url:string)=>`<!doctype html><html lang="en">${head.replace(/<title>.*?<\/title>/,`<title>${escape(title)} — Beautiflow</title>`).replace(/rel="canonical" href="[^"]*"/,`rel="canonical" href="https://beautiflow.cc${url}"`)}<body class="reading-page"><a class="skip-link" href="#main">Skip to content</a>${absolute(header)}<main id="main" class="shell">${url==='/examples.html'?'':`<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/examples.html">Examples</a> / ${escape(title)}</nav>`}<article class="example-guide">${body}</article></main>${absolute(footer)}</body></html>`
  const items=await exampleInventory()
  const guides=[...items.filter(x=>x.guide.endsWith('.md')).map(x=>({file:x.guide,url:`/examples/${x.id}/`})),...(await readdir(resolve(root,'examples/recipes'))).filter(x=>!x.startsWith('.')&&x!=='diagram-types'&&x!=='visual-quality').map(x=>({file:`examples/recipes/${x}/README.md`,url:`/examples/recipes/${x}/`}))]
  const mapping=new Map(guides.map(x=>[x.file,x.url]))
  for(const guide of guides) {
    const source=await readFile(resolve(root,guide.file),'utf8')
    let html=String(await marked.parse(source)).replace(/<h([1-6])>(.*?)<\/h\1>/g,(_m,n,text)=>`<h${n} id="${slug(text)}">${text}</h${n}>`)
    html=html.replace(/(href|src)="([^"#]+)(#[^"]*)?"/g,(match,attr,path,hash='')=>{
      if(/^(?:[a-z]+:|\/)/.test(path))return match
      const target=posix.normalize(posix.join(posix.dirname(guide.file),path))
      return `${attr}="${mapping.get(target)??'/'+target}${hash}"`
    })
    html=html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,'<details class="guide-source"><summary>Read the Mermaid source</summary><pre tabindex="0"><code>$1</code></pre></details>')
    html=html.replace(/<img src="([^"]+)"([^>]+)>/g,'<a href="$1" aria-label="Open full-size diagram"><img src="$1"$2></a>')
    const title=source.match(/^# (.+)/)![1]!
    const file=resolve(destination,'.'+guide.url,'index.html');await mkdir(dirname(file),{recursive:true});await writeFile(file,page(title,html,guide.url))
  }
  for(const item of items.filter(x=>!x.guide.endsWith('.md'))) {
    const source=await readFile(resolve(root,item.source),'utf8')
    const body=`<h1>${escape(item.title)}</h1><p>${escape(item.description)}</p><p class="entry-type">${escape(item.type)} · Illustrative scenario</p><a href="/${item.image}"><img src="/${item.image}" alt="${escape(item.title)}"></a><p><a href="/${item.image}">Full-size SVG</a> · <a href="/${item.source}">Mermaid source</a> · <a href="/docs/diagram-types/">Capabilities</a></p><h2>Mermaid source</h2><pre><code>${escape(source)}</code></pre><h2>Reproduce</h2><pre><code>beautiflow render ${escape(item.source)} --format svg --theme github-light</code></pre>`
    const file=resolve(destination,'examples',item.id,'index.html');await mkdir(dirname(file),{recursive:true});await writeFile(file,page(item.title,body,`/examples/${item.id}/`))
  }
  const doc=new JSDOM(shell)
  const featured=doc.window.document.createElement('div')
  featured.innerHTML='<h1>Architecture examples and references</h1>'+[...doc.window.document.querySelectorAll('.example-row')].map(x=>x.outerHTML).join('')
  // Preserve the existing detailed comparisons, reference caveats and artifact links.
  await mkdir(resolve(destination,'examples/featured'),{recursive:true})
  await writeFile(resolve(destination,'examples/featured/index.html'),page('Architecture reference collection',absolute(featured.innerHTML).replace(/src="(?![a-z]+:|\/)([^"]+)"/g,'src="/$1"').replaceAll('href="/examples/recipes/aws-reference-architectures/README.md"','href="/examples/recipes/aws-reference-architectures/"'),'/examples/featured/'))
  const references = JSON.parse(await readFile(resolve(root,'examples/recipes/aws-reference-architectures/references.json'),'utf8')).references as Array<{id:string}>
  const referenceTiles: string[]=[]
  for(const [i, row] of [...doc.window.document.querySelectorAll('.aws-reference')].entries()) {
    const id=references[i]!.id, title=row.querySelector('h2')!.textContent!
    const url=`/examples/aws/${id}/`
    const content=absolute(row.outerHTML.replace(/<h2>[\s\S]*?<\/h2>/,'')).replace(/src="(?![a-z]+:|\/)([^"]+)"/g,'src="/$1"').replaceAll('href="/examples/recipes/aws-reference-architectures/README.md"','href="/examples/recipes/aws-reference-architectures/"')
    const file=resolve(destination,'.'+url,'index.html');await mkdir(dirname(file),{recursive:true});await writeFile(file,page(title,`<h1>${escape(title)}</h1>${content}<p><a href="/examples/recipes/aws-reference-architectures/">Source mapping, omissions and reproduction</a></p>`,url))
    referenceTiles.push(`<li><a href="${url}"><h3>${escape(title)}</h3><p>Published AWS reference reconstruction. Open the diagram, source and measured evidence.</p></a></li>`)
  }
  doc.window.close()
  const tile=(title:string,href:string,description:string)=>`<li><a href="${href}"><h3>${escape(title)}</h3><p>${escape(description)}</p><span>Explore →</span></a></li>`
  const body=`<section class="catalogue-intro"><h1>Examples you can build on.</h1><p>Choose a diagram to copy, a walkthrough to follow, or a recorded result to inspect. Sources and reproduction commands stay with every example.</p><nav class="category-nav" aria-label="Example categories"><a href="#diagrams">Diagram examples</a><a href="#walkthroughs">Walkthroughs</a><a href="#references">AWS references</a><a href="#workflows">Workflow demonstrations</a></nav><p>Choosing a notation? <a href="/docs/diagram-types/">Compare all 32 diagram types and capabilities.</a></p></section>
<section id="walkthroughs" class="catalogue-section"><h2>Step-by-step walkthroughs</h2><ul class="link-grid">${tile('Build an AWS architecture','/examples/recipes/aws-architecture/','Six authored stages, from a system boundary to a detailed deployment view.')}${tile('One source, multiple outputs','/examples/recipes/render-options/','Compare layouts, themes, transparency and export formats.')}${tile('Presentation and source edits','/examples/recipes/architecture/','Understand the difference between layout actions and semantic changes.')}</ul></section>
<section id="aws-references" class="catalogue-section"><span id="references"></span><h2>AWS reference reconstructions</h2><p>Four reconstructions of published AWS references. Provenance, adaptations and remaining findings are explicit; these are not AWS-authored or certified deployments.</p><ul class="link-grid">${referenceTiles.join('')}${tile('Source mapping and limitations','/examples/recipes/aws-reference-architectures/','Original references, omitted connections, reproduction commands and audit evidence.')}</ul></section>
<section id="workflows" class="catalogue-section"><h2>See the runtime at work</h2><ul class="link-grid">${tile('Before & after','/examples/recipes/visual-quality/','Measured flowchart and state improvements, with original source preserved.')}${tile('Don’t Break the Diagram','/dont-break-the-diagram/','Replay a safe edit, unsafe input, stale plan and exact rollback.')}${tile('Boring AWS Diagrams','/boring-diagrams/','A separate artistic collection: eight fictional systems, ten authored views.')}</ul></section>
<section id="diagrams" class="catalogue-section"><h2>Diagram examples</h2><p><a href="/examples/recipes/xy-chart/">XY chart: weekly support requests</a> · <a href="/examples/recipes/aws-architecture/">Architecture: an AWS system</a></p><p>Browse by notation. Categories describe what you can learn; diagram types describe the notation.</p><nav class="category-nav" aria-label="Browse examples by type">${[...new Set(items.map(x=>x.type))].map(type=>`<a href="#examples-${type}">${escape(type)}</a>`).join('')}</nav>${[...new Set(items.map(x=>x.type))].map(type=>`<section id="examples-${type}" class="example-type-group"><h3>${escape(type)}</h3><ul class="example-miniatures">${items.filter(x=>x.type===type).map(item=>`<li><a href="/examples/${item.id}/"><img src="/${item.image}" alt="${escape(item.title)}" loading="lazy"><h4>${escape(item.title)}</h4><p>${escape(item.description)}</p></a></li>`).join('')}</ul></section>`).join('')}</section>`
  const catalogue=body.slice(body.indexOf('<section id="diagrams"'))
  await mkdir(resolve(destination,'examples/diagrams'),{recursive:true})
  await writeFile(resolve(destination,'examples/diagrams/index.html'),page('Diagram examples',`<h1>Find a diagram to start from.</h1>${catalogue}`,'/examples/diagrams/').replace('<article class="example-guide">','<article class="example-catalogue">'))
  const selected=[items[0]!,items[1]!,items[3]!,items.find(x=>x.type==='gantt')!,items.find(x=>x.type==='sankey')!,items.find(x=>x.type==='c4')!]
  const preview=`<section id="diagrams" class="catalogue-section"><h2>Diagram examples</h2><p>Practical questions, different notations. <a href="/examples/diagrams/">Browse all 42 examples by type</a>.</p><ul class="example-miniatures">${selected.map(item=>`<li><a href="/examples/${item.id}/"><img src="/${item.image}" alt="${escape(item.title)}" loading="lazy"><h3>${escape(item.title)}</h3><p>${escape(item.type)} · ${escape(item.description)}</p></a></li>`).join('')}</ul></section>`
  const index=body.slice(0,body.indexOf('<section id="diagrams"')).replace('<section id="walkthroughs"',preview+'<section id="walkthroughs"')
  await writeFile(resolve(destination,'examples.html'),page('Examples',index,'/examples.html').replace('<article class="example-guide">','<article class="example-catalogue">'))
  return {examples:items.length,guides:guides.length}
}
