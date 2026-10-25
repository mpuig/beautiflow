import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { exampleInventory } from './site-catalogue.ts'

const root=resolve(import.meta.dir,'..')
const guard='Inspect the diagram type’s capabilities before choosing an operation. Do not invent pixel coordinates or use unsupported polish or transformations. Render the result, report available checks and their limits, and keep visual judgment separate from mechanical evidence.'
const fresh='Work in a new destination that I approve; do not overwrite the reference files.'
export const recipes:Record<string,string>={
  'aws-architecture':'Use Beautiflow to explain an illustrative AWS web application to a technical audience. Start with the account boundary and EKS, then follow the six authored stages in examples/recipes/aws-architecture/README.md: network and availability, frontend/backend workloads, Aurora, ingress/VPN/egress, and operations. Propose each stage before adding it; preserve earlier relationships unless the next step explicitly replaces them. Distinguish conceptual paths from deployed controls. Do not claim production readiness or automatic architecture polish.',
  'architecture':'Use the flowchart fixture and action files in examples/recipes/architecture/ to demonstrate presentation changes versus semantic edits. First inspect capabilities and explain which actions affect only the sidecar. Then propose the source-changing transformation separately, preserving unrelated source and validating each supported mutation through a fresh receipt. Do not confuse this flowchart recipe with architecture-beta.',
  'architecture-views':'Using examples/recipes/architecture-views/ as references, author three separate views of the same illustrative platform: request flow, network and availability, and delivery and operations. State the question each view answers. Preserve shared service identities and explain any authored detail differences; do not claim these are automatic projections or verified cloud configurations.',
  'render-options':'Use examples/recipes/render-options/diagram.mmd as the reference for a rendering comparison. Preserve its meaning while comparing LR and TD layouts, light and dark SVG, opaque and transparent PNG, and supported Unicode/ASCII outputs. Follow the exact input paths and commands in its README. Inspect capabilities before applying layout; keep a separate output for each variant.',
  'xy-chart':'Create a Mermaid XY chart titled “Illustrative weekly support requests”. Use Mon, Tue, Wed, Thu, Fri on the x-axis and Requests from 0 to 50 on the y-axis, with bars 24, 38, 29, 42, 31. Label the values fictional, not operational measurements. Export SVG and PNG; do not claim geometry scoring or automatic polish.',
  'aws-reference-architectures':'Study the four published AWS walkthroughs and source images linked in examples/recipes/aws-reference-architectures/references.json. Reconstruct each separately in architecture-beta, preserving documented service identities, boundaries and explicit relationships. Record source URLs and dates, label historical-name adaptations, disclose omitted or ambiguous connections, and explain overlapping-boundary limitations. Do not guess connections or claim AWS endorsement, deployability or clean audits.',
}
export const recipeStages:Record<string,Record<string,string>>={
  'architecture':{
    'apply-presentation-actions':'On a disposable copy of the flowchart in examples/recipes/architecture/, inspect the provided presentation action file and explain its effects before applying it through a fresh receipt. Change only supported sidecar presentation; preserve every source node, relationship and label. Render and compare against the original.',
    'transform-graph-semantics':'Inspect the provided transformation actions in examples/recipes/architecture/ and describe the proposed topology changes before requesting approval. Use a fresh receipt for the disposable working copy, preserve unrelated source, verify the resulting model and stop on rejection. Do not substitute ad hoc text rewrites.',
  },
  'render-options':{
    'layout-direction':'Using separate disposable copies of examples/recipes/render-options/diagram.mmd, compare the supplied LR and TD layout action files. Inspect supported operations first and use the agent receipt workflow for mutations. Preserve all nodes, relationships and labels; keep both outputs so the orientation trade-off is visible.',
    'svg-themes':'Render the same source as github-light and dracula SVG using the commands in examples/recipes/render-options/README.md. Keep labels and topology unchanged, use distinct output paths, and compare contrast without treating a theme change as a geometry improvement.',
    'png-backgrounds':'Export the same reference source as an opaque github-dark PNG and a transparent nord-light PNG. Use the documented render commands and distinct output paths; explain transparency without changing the diagram semantics.',
    'terminal-output':'Check terminal-format support for examples/recipes/render-options/diagram.mmd, then produce Unicode and ASCII output using the documented commands. Explain the format trade-offs. Do not assume that every diagram type supports terminal rendering.',
  },
  'architecture-views':{
    'request-flow':'Use examples/recipes/architecture-views/request.mmd as reference for a separately authored request-focused view. Preserve callers, service dependencies and the response meaning. Leave deployment and operational details to their companion views; document any deliberate omission.',
    'network-and-availability':'Use examples/recipes/architecture-views/network.mmd as reference for a separately authored network and availability view. Preserve named boundaries and relationships. Distinguish placement and redundant instances from guarantees about failover, security or recovery.',
    'delivery-and-operations':'Use examples/recipes/architecture-views/operations.mmd as reference for a separately authored delivery and operations view. Preserve the source-owned identities and operational relationships. Do not invent deployment permissions or imply an automatic projection from the other views.',
  },
}
export const comparisons:Record<string,string>={
  release:'Use a disposable copy of examples/recipes/visual-quality/release.mmd and its associated layout state. Make the release workflow fit a document while preserving all nine nodes, eight relationships and every label. Inspect capabilities, run one bounded polish operation through the agent receipt workflow, and propose any happy-path emphasis as a separate presentation action. Keep the revision branch visible. Compare original and final artifacts and report measured scores without promising a particular improvement.',
  job:'Use a disposable copy of examples/recipes/visual-quality/job.mmd and its associated layout state. Make completion, waiting, retry and terminal failure easy to distinguish without changing transitions or labels. Inspect capabilities and apply only supported presentation changes through the agent receipt workflow. Keep original and final artifacts. A clearer presentation need not increase the geometry score; do not fabricate an uplift.',
}
export const safety:Record<string,string>={
  safe:'In a disposable copy of dont-break-the-diagram/source.mmd, rename service api to gateway with label Tenant API. Preserve comments, ports, containment and relationships. Inspect capabilities, plan the architecture-rename action, commit, verify and finish using a fresh receipt. Do not mark visual inspection complete unless it actually occurred.',
  unsafe:'In an isolated temporary copy of the safety fixture, test rejection of the unsafe architecture-rename label encoded as "unsafe]\\nservice surprise(server)[Oops". Plan the action; do not bypass validation or patch Mermaid by hand. Confirm refusal and unchanged source bytes. This is a negative test, not a request to introduce the extra service.',
  stale:'In an isolated temporary copy of the safety fixture, plan the rename, then deliberately append a collaborator comment before commit. Attempt commit once and confirm the stale plan is refused without overwriting the newer source. Do not silently regenerate or retry the plan. Compare current bytes with the collaborator-edited snapshot.',
  rollback:'In a disposable copy of the safety fixture, plan, commit and verify the supported rename. Inspect the current files before requesting explicit snapshot rollback, then confirm restoration with both byte comparison and hashes. Do not reuse downloaded receipts or roll back a real project: snapshot rollback is not a merge and can overwrite newer work.',
}

export async function buildExamplePrompts(destination:string) {
  const pages=new Map<string,JSDOM>()
  async function document(path:string) {
    if(!pages.has(path))pages.set(path,new JSDOM(await readFile(resolve(destination,path),'utf8')))
    return pages.get(path)!.window.document
  }
  function panel(doc:Document,text:string,provenance='Suggested prompt',level=2) {
    const section=doc.createElement('section');section.className='agent-prompt';section.dataset.prompt=''
    const header=doc.createElement('div');header.className='prompt-toolbar'
    const heading=doc.createElement(`h${level}`);heading.className='prompt-title';heading.textContent='1 · Prompt';header.append(heading);section.append(header)
    const label=doc.createElement('p');label.className='prompt-provenance';label.textContent=provenance;section.append(label)
    const details=doc.createElement('details');details.className='prompt-disclosure'
    const summary=doc.createElement('summary')
    const preview=doc.createElement('span');preview.className='prompt-preview';preview.textContent=text.replace(/^Use the Beautiflow skill\.\s*/, '').split('\n\n')[0]!;summary.append(preview)
    const expand=doc.createElement('span');expand.className='prompt-expand';expand.innerHTML='<span class="prompt-closed">Read full prompt</span><span class="prompt-open">Close full prompt</span>';summary.append(expand);details.append(summary)
    const pre=doc.createElement('pre');pre.tabIndex=0;pre.dataset.promptText='';pre.textContent=text;details.append(pre)
    section.append(details)
    controls(doc,section);header.append(section.querySelector('[data-copy-prompt]')!);return section
  }
  function controls(doc:Document,container:Element) {
    const button=doc.createElement('button');button.type='button';button.hidden=true;button.dataset.copyPrompt='';button.textContent='Copy prompt';container.append(button)
    const status=doc.createElement('p');status.className='prompt-copy-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');container.append(status)
  }
  const items=await exampleInventory()
  const prompts=new Map<string,string>()
  for(const item of items) {
    let existing=''
    if(item.guide.endsWith('.md')) {
      const guide=await readFile(resolve(root,item.guide),'utf8')
      existing=guide.match(/```text\n([\s\S]*?)```/)?.[1]?.trim()??''
    }
    const text=`Use the Beautiflow skill. ${existing || `Create a ${item.type} diagram for “${item.title}”. ${item.description}`}\n\nUse ${item.source} as the semantic reference; preserve its named participants, relationships, labels and authored values. Explain the system to a reader unfamiliar with this example. Keep fictional measurements and scenarios explicitly illustrative. ${fresh}\n\n${guard}`
    prompts.set(item.id,text)
    const doc=await document(`examples/${item.id}/index.html`)
    const anchor=doc.querySelector('.example-guide img')?.closest('p')??doc.querySelector('.example-guide img')?.parentElement??doc.querySelector('.example-guide h1')!
    anchor.before(panel(doc,text))
  }
  for(const [id,brief] of Object.entries(recipes)) {
    const doc=await document(`examples/recipes/${id}/index.html`)
    doc.querySelector('.example-guide h1')!.after(panel(doc,`${brief}\n\n${fresh}\n\n${guard}`))
    for(const [anchor,text] of Object.entries(recipeStages[id]??{})) {
      const heading=doc.getElementById(anchor)
      if(!heading)throw new Error(`Missing recipe stage ${id}/${anchor}`)
      heading.after(panel(doc,`${text}\n\n${fresh}\n\n${guard}`,undefined,3))
    }
    // Existing authored walkthrough stages keep their own provenance and wording.
    if(id==='aws-architecture')for(const code of doc.querySelectorAll('code.language-text')) {
      const pre=code.parentElement!;const brief=panel(doc,code.textContent!,'Walkthrough prompt — wording from the guide',3);pre.replaceWith(brief)
    }
  }
  const references=JSON.parse(await readFile(resolve(root,'examples/recipes/aws-reference-architectures/references.json'),'utf8')).references as Array<{id:string;url:string}>
  for(const reference of references) {
    const doc=await document(`examples/aws/${reference.id}/index.html`)
    const title=doc.querySelector('h1')!.textContent!
    const text=`Reconstruct “${title}” in Mermaid architecture-beta using ${reference.url} and the original source image linked from that walkthrough. Read both before authoring. Use examples/recipes/aws-reference-architectures/README.md and references.json for the documented source mapping and adaptations. Preserve service identities, account/region/AZ distinctions and explicitly supported relationships. Omit ambiguous connections rather than guessing; list every omission. Do not infer IAM policies, replication guarantees or deployment readiness. Retain remaining audit findings and distinguish measured integrity from visual and AWS correctness.\n\n${fresh}\n\n${guard}`
    prompts.set(reference.id,text);doc.querySelector('.example-guide .example-row figure')!.before(panel(doc,text))
  }
  const legacy=await document('examples/recipes/diagram-types/index.html')
  for(const row of legacy.querySelectorAll('.diagram-type'))row.prepend(panel(legacy,prompts.get(row.id)!,undefined,3))
  const featured=await document('examples/featured/index.html')
  for(const [i,row] of [...featured.querySelectorAll('.example-row')].entries()) {
    const id=row.classList.contains('aws-reference')?references[i-2]!.id:i===6?'01-subscription-intake':i===7?'15-support-escalation-sequence':null
    row.prepend(panel(featured,id?prompts.get(id)!:`Use Beautiflow to explain this illustrative order platform using ${i===0?'examples/recipes/visual-quality/architecture.mmd':'examples/recipes/aws-architecture/sources/step-6-production-architecture.mmd'} as the semantic reference. Preserve services, boundaries, ports and relationships; distinguish conceptual paths from network or security guarantees. ${fresh} ${guard}`,undefined,3))
  }
  const before=await document('examples/recipes/visual-quality/index.html')
  for(const [id,text] of Object.entries(comparisons))before.querySelector(`#${id}`)!.prepend(panel(before,text,undefined,3))
  const replay=await document('dont-break-the-diagram/index.html')
  for(const [id,text] of Object.entries(safety)) {
    const section=replay.querySelector(`#${id}`)!
    section.querySelector('.case-heading')!.after(panel(replay,text,undefined,3))
  }
  const home=await document('index.html')
  const homeBriefs:Record<string,string>={
    'panel-architecture':'Create an architecture-beta view of an order platform: customers call an Orders API, which stores orders in a database and queues work for a worker and email notification path. Use examples/recipes/visual-quality/architecture.mmd as the reference. Preserve the platform boundary and all relationships. Do not claim the boundary is a verified security control.',
    'panel-sequence':'Use examples/recipes/visual-quality/cache.mmd as the reference to explain a cache hit versus a database fallback in a Mermaid sequence diagram. Preserve participants, message order, branches and labels. Sequence diagrams are render-only; do not request automatic polish or geometry scores.',
    'panel-lifecycle':comparisons.job!,
  }
  for(const [id,text] of Object.entries(homeBriefs)) {
    const target=home.querySelector(`#${id} .diagram-caption`)
    if(!target)throw new Error(`Missing homepage prompt target: ${id}`)
    home.querySelector(`#${id} .diagram-stage`)!.before(panel(home,`${text}\n\n${fresh}\n\n${guard}`))
  }
  const approval=home.querySelector('.comparison')!
  approval.before(panel(home,`Use a disposable copy of examples/recipes/visual-quality/approval.mmd and its sidecar. Emphasize Draft → Ready → Ship as the primary path and No → Revise as the exception. Preserve all four nodes, three relationships and every label. Use a supported presentation action, not a source topology change. Make no layout-score uplift claim. ${guard}`,undefined,3))
  const catalogue=JSON.parse(await readFile(resolve(destination,'boring-diagrams/catalogue.json'),'utf8')) as Array<{id:string}>
  for(const item of catalogue) {
    const doc=await document(`boring-diagrams/${item.id}/index.html`)
    const original=doc.querySelector('.authoring-prompt')!
    const prompt=panel(doc,original.querySelector('blockquote')!.textContent!,'Authored brief · fictional system')
    prompt.id='prompt';prompt.classList.add('studio-prompt')
    original.remove();doc.querySelector('.diagram-workspace')!.before(prompt)
    doc.querySelector('.diagram-workspace')!.classList.add('prompt-first-workspace')
  }
  for(const path of ['examples.html','examples/diagrams/index.html']) {
    const doc=await document(path)
    for(const item of doc.querySelectorAll('.example-miniatures li')) {const badge=doc.createElement('span');badge.className='prompt-included';badge.textContent='Prompt included';item.querySelector('a')!.append(badge)}
  }
  for(const [path,dom] of pages) {
    const doc=dom.window.document
    if(doc.querySelector('[data-prompt]')) {
      const targets=new Set<Element>()
      for(const image of doc.querySelectorAll('main img'))targets.add(image.closest('.comparison')??image.closest('figure')??image.closest('p')??image.parentElement!)
      for(const target of targets) {
        const step=doc.createElement('p');step.className='diagram-step';step.textContent='2 · Diagram';if(target.tagName==='FIGURE')target.prepend(step);else target.before(step)
      }
    }
    const css=doc.createElement('link');css.rel='stylesheet';css.href='/example-prompts.css';doc.head.append(css)
    const script=doc.createElement('script');script.src='/example-prompts.js';script.defer=true;doc.head.append(script)
    await writeFile(resolve(destination,path),dom.serialize());dom.window.close()
  }
}
