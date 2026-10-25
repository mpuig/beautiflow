import { test, expect } from 'bun:test'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { buildSite } from '../scripts/build-site.ts'
import { typeReference } from '../scripts/site-catalogue.ts'

test('publishes a complete type reference, categorized examples and valid local page assets', async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'beautiflow-catalogue-'))
  try {
    await buildSite(directory)
    expect(await readFile('docs/diagram-types.md','utf8')).toBe(await typeReference())
    const types=new JSDOM(await readFile(resolve(directory,'docs/diagram-types/index.html'),'utf8'))
    expect(types.window.document.querySelectorAll('article h2')).toHaveLength(32)
    expect(types.window.document.querySelectorAll('article img')).toHaveLength(32)
    types.window.close()
    const examples=new JSDOM(await readFile(resolve(directory,'examples.html'),'utf8'))
    expect(examples.window.document.querySelectorAll('.example-miniatures li')).toHaveLength(6)
    expect(examples.window.document.querySelectorAll('.example-miniatures h3')).toHaveLength(6)
    const all=new JSDOM(await readFile(resolve(directory,'examples/diagrams/index.html'),'utf8'))
    expect(all.window.document.querySelectorAll('.example-miniatures li')).toHaveLength(42)
    all.window.close()
    for(const id of ['diagrams','walkthroughs','aws-references','workflows']) expect(examples.window.document.getElementById(id)).not.toBeNull()
    expect(examples.window.document.querySelectorAll('a[href^="/examples/aws/"]')).toHaveLength(4)
    examples.window.close()
    const broken:string[]=[]
    for(const file of new Bun.Glob('**/*.html').scanSync(directory)) {
      const dom=new JSDOM(await readFile(resolve(directory,file),'utf8'))
      expect(dom.window.document.querySelectorAll('h1')).toHaveLength(1)
      for(const element of dom.window.document.querySelectorAll('a[href],img[src],script[src],link[href]')) {
        const href=element.getAttribute('href')??element.getAttribute('src')!
        const url=new URL(href,'http://local/'+file)
        if(url.origin!=='http://local')continue
        const path=resolve(directory,'.'+decodeURIComponent(url.pathname))
        try {await stat(path)} catch {broken.push(`${file}: ${url.pathname}`)}
      }
      dom.window.close()
    }
    expect([...new Set(broken)]).toEqual([])
  } finally {await rm(directory,{recursive:true,force:true})}
})
