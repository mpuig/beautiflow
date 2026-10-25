import { test, expect } from 'bun:test'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { buildSite } from '../scripts/build-site.ts'
import { exampleInventory } from '../scripts/site-catalogue.ts'
import { recipes, recipeStages, comparisons, safety } from '../scripts/build-example-prompts.ts'

test('every example has an honest, readable prompt and copy supports failure recovery',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'beautiflow-prompts-'))
  try {
    await buildSite(directory)
    const items=await exampleInventory()
    for(const item of items) {
      const dom=new JSDOM(await readFile(resolve(directory,`examples/${item.id}/index.html`),'utf8'))
      const doc=dom.window.document
      expect(doc.querySelectorAll('.agent-prompt')).toHaveLength(1)
      expect(doc.querySelector('[data-prompt-text]')!.textContent).toContain(item.source)
      expect(doc.querySelector('.prompt-provenance')!.textContent).toBe('Suggested prompt')
      expect(doc.querySelector('.prompt-limit, .prompt-invitation')).toBeNull()
      expect(doc.querySelector('.agent-prompt')!.closest('details')).toBeNull()
      expect(doc.querySelector<HTMLDetailsElement>('.prompt-disclosure')!.open).toBe(false)
      expect(doc.querySelector('.prompt-preview')!.textContent!.length).toBeGreaterThan(20)
      expect(doc.querySelector('.agent-prompt')!.compareDocumentPosition(doc.querySelector('.example-guide img')!) & 4).toBe(4)
      expect(doc.querySelector('.diagram-step')!.textContent).toBe('2 · Diagram')
      expect(doc.querySelector('[data-copy-prompt]')!.hasAttribute('hidden')).toBe(true)
      dom.window.close()
    }
    const counts:Record<string,number>={
      'index.html':4,
      'examples/recipes/diagram-types/index.html':23,
      'examples/featured/index.html':8,
      'examples/recipes/visual-quality/index.html':Object.keys(comparisons).length,
      'dont-break-the-diagram/index.html':Object.keys(safety).length,
    }
    for(const key of Object.keys(recipes))counts[`examples/recipes/${key}/index.html`]=1+Object.keys(recipeStages[key]??{}).length
    counts['examples/recipes/aws-architecture/index.html']=11
    const references=JSON.parse(await readFile('examples/recipes/aws-reference-architectures/references.json','utf8')).references
    for(const ref of references)counts[`examples/aws/${ref.id}/index.html`]=1
    for(const [file,count] of Object.entries(counts)) {
      const dom=new JSDOM(await readFile(resolve(directory,file),'utf8'))
      expect(dom.window.document.querySelectorAll('.agent-prompt')).toHaveLength(count)
      const firstImage=dom.window.document.querySelector('main img')
      if(firstImage)expect(dom.window.document.querySelector('.agent-prompt')!.compareDocumentPosition(firstImage) & 4).toBe(4)
      for(const el of dom.window.document.querySelectorAll('[data-prompt-text]'))expect(el.textContent!.length).toBeGreaterThan(40)
      dom.window.close()
    }
    const catalogue=JSON.parse(await readFile('boring-diagrams/catalogue.json','utf8'))
    for(const item of catalogue) {
      const dom=new JSDOM(await readFile(resolve(directory,`boring-diagrams/${item.id}/index.html`),'utf8'))
      expect(dom.window.document.querySelector('[data-prompt-text]')!.textContent).toBe(item.prompt)
      expect(dom.window.document.querySelectorAll('[data-copy-prompt]')).toHaveLength(1)
      expect(dom.window.document.querySelector('#prompt')!.compareDocumentPosition(dom.window.document.querySelector('.drawing-window')!) & 4).toBe(4)
      expect(dom.window.document.querySelector('.prompt-first-workspace')).not.toBeNull()
      expect(dom.window.document.querySelector('.prompt-limit, .prompt-invitation')).toBeNull()
      dom.window.close()
    }
    const dom=new JSDOM(await readFile(resolve(directory,'examples/gantt/index.html'),'utf8'),{runScripts:'outside-only'})
    try {
      let copied=''
      Object.defineProperty(dom.window.navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{copied=text}}})
      dom.window.eval(await readFile('example-prompts.js','utf8'))
      const button=dom.window.document.querySelector<HTMLButtonElement>('[data-copy-prompt]')!
      expect(button.hidden).toBe(false)
      button.click();await new Promise(r=>setTimeout(r,0))
      expect(copied).toBe(dom.window.document.querySelector('[data-prompt-text]')!.textContent!)
      expect(dom.window.document.querySelector<HTMLDetailsElement>('.prompt-disclosure')!.open).toBe(false)
      expect(dom.window.document.querySelector('[role=status]')!.textContent).toContain('Prompt copied')
      Object.defineProperty(dom.window.navigator,'clipboard',{value:undefined})
      button.click();await new Promise(r=>setTimeout(r,0))
      expect(dom.window.getSelection()!.toString()).toBe(copied)
      expect(dom.window.document.querySelector('[role=status]')!.textContent).toContain('Clipboard unavailable')
      expect(button.disabled).toBe(false)
      expect(dom.window.document.querySelector<HTMLDetailsElement>('.prompt-disclosure')!.open).toBe(true)
    } finally {dom.window.close()}
    expect(await readFile(resolve(directory,'dont-break-the-diagram/recording/recording.json'),'utf8')).toBe(await readFile('dont-break-the-diagram/recording/recording.json','utf8'))
  } finally {await rm(directory,{recursive:true,force:true})}
})
