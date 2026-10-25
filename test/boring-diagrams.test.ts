import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { buildBoringDiagrams } from '../scripts/build-boring-diagrams.ts'
import { drawScene, styles } from '../boring-diagrams/draw.js'
import { exhibits } from '../boring-diagrams/catalogue.ts'
import { architectureIntegrity } from '../src/diagram/architecture-analysis.ts'
import { architectureModel } from '../src/diagram/pele.ts'
import { architectureAnnotations } from '../boring-diagrams/annotations.ts'

const root=resolve(import.meta.dir,'..')
describe('Boring AWS Diagrams collection',()=>{
  test('reproduces ten deployment views and preserves geometry, glyphs, labels, ports and paths',async()=>{
    const directory=await mkdtemp(resolve(tmpdir(),'boring-aws-'))
    try {
      const scenes=await buildBoringDiagrams(directory)
      expect(exhibits).toHaveLength(10);expect(scenes).toHaveLength(10)
      expect(exhibits.filter(e=>e.view==='overview')).toHaveLength(8)
      expect(exhibits.filter(e=>e.view==='focused')).toHaveLength(2)
      expect(new Set(exhibits.map(e=>e.style)).size).toBe(8)
      expect(new Set(exhibits.map(e=>e.id)).size).toBe(10)
      for(const [i,scene] of scenes.entries()) {
        const exhibit=exhibits[i]!,base=resolve(directory,'entries',exhibit.id),original=JSON.stringify(scene)
        const source=await readFile(resolve(root,`boring-diagrams/sources/${exhibit.id}.mmd`),'utf8'),model=architectureModel(source)
        expect(await readFile(resolve(base,'source.mmd'),'utf8')).toBe(source)
        expect(scene.nodes).toHaveLength(model.nodes.size);expect(scene.edges).toHaveLength(model.edges.length)
        expect(scene.groups).toHaveLength(model.groups.size)
        expect(scene.sourceHash).toBe(createHash('sha256').update(source).digest('hex'))
        expect(JSON.parse(await readFile(resolve(base,'scene.json'),'utf8'))).toEqual(scene)
        expect(scene.title).toBe(exhibit.title)
        const svg=drawScene(scene,exhibit.style)
        expect((await readFile(resolve(base,`rendered/${exhibit.style}.svg`),'utf8')).trimEnd()).toBe(svg)
        expect(drawScene(scene,exhibit.style)).toBe(svg)
        expect(architectureIntegrity(source,svg).issues).toEqual([])
        const dom=new JSDOM(svg,{contentType:'image/svg+xml'})
        try {
          const document=dom.window.document
          expect(document.documentElement.getAttribute('role')).toBe('img')
          expect(document.documentElement.getAttribute('data-scene-hash')).toBe(scene.sourceHash)
          expect(document.querySelectorAll('.pele-node')).toHaveLength(scene.nodes.length)
          expect(document.querySelectorAll('.pele-edge')).toHaveLength(scene.edges.length)
          for(const node of scene.nodes) {
            const element=[...document.querySelectorAll('.pele-node')].find(el=>el.getAttribute('data-id')===node.id)!
            expect(element.getAttribute('transform')).toBe(node.transform)
            expect(element.getAttribute('data-parent')).toBe(node.parent??null)
            expect(element.getAttribute('data-box')).toBe(JSON.stringify(node.box))
            expect(element.querySelector('svg.pele-icon')!.outerHTML.replaceAll(`bd-${exhibit.style}-${scene.sourceHash.slice(0,16)}-`,'')).toBe(node.iconSvg)
            const label=element.querySelector('text.pele-label')!
            const expected=new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg">${node.labelSvg}</svg>`,{contentType:'image/svg+xml'})
            try {
              expect(label.textContent).toBe(expected.window.document.querySelector('text')!.textContent)
              for(const attr of ['x','y','text-anchor']) expect(label.getAttribute(attr)).toBe(expected.window.document.querySelector('text')!.getAttribute(attr))
            }finally{expected.window.close()}
          }
          for(const group of scene.groups) {
            const element=[...document.querySelectorAll('.pele-cluster')].find(el=>el.getAttribute('data-id')===group.id)!
            expect(element.getAttribute('data-box')).toBe(JSON.stringify(group.box))
            expect(element.getAttribute('data-parent')).toBe(group.parent??null)
            expect(element.getAttribute('data-boundary')).toBe(group.kind)
            expect(element.querySelector('text')!.textContent).toBe(group.label)
          }
          for(const edge of scene.edges) {
            const element=[...document.querySelectorAll('.pele-edge')].find(el=>el.getAttribute('data-id')===edge.id)!
            expect(element.getAttribute('data-relationship')).toBe(edge.kind)
            expect(element.querySelector('title')!.textContent).toBe(edge.meaning)
            for(const [key,value] of Object.entries({source:edge.source,target:edge.target,'source-port':edge.sourcePort,'target-port':edge.targetPort}))expect(element.getAttribute(`data-${key}`)).toBe(value)
            expect([...element.querySelectorAll('path')].map(path=>path.getAttribute('d'))).toEqual(edge.paths.map(path=>path.d))
          }
          const ids=[...document.querySelectorAll('[id]')].map(el=>el.id)
          expect(new Set(ids).size).toBe(ids.length)
          for(const match of svg.matchAll(/url\(#([^)]*)\)/g))expect(ids).toContain(match[1]!)
        }finally{dom.window.close()}
        expect(JSON.stringify(scene)).toBe(original)
        const evidence=JSON.parse(await readFile(resolve(base,'evidence.json'),'utf8'))
        expect(evidence.audit.issues).toEqual([])
        expect(evidence.audit.coverage).toBe('pele-positioned-geometry')
        expect(evidence.scope).toContain('cloud-provider semantics are not measured')
        expect(evidence.styledIntegrity[exhibit.style].issues).toEqual([])
        expect(evidence.annotations.configurationValidated).toBe(false)
        expect(evidence.annotations.relationships).toBe(scene.edges.length)
        expect(evidence.annotations.boundaries).toBe(scene.groups.length)
        const capabilities=JSON.parse(await readFile(resolve(base,'capabilities.json'),'utf8'))
        expect(capabilities.capabilities.transform.supported).toBe(true)
        expect(capabilities.capabilities.polish.supported).toBe(false)
        expect(JSON.stringify(capabilities)).not.toContain(root)
      }
      expect(new Set(scenes.map(s=>s.sourceHash)).size).toBe(10)
      const html=await readFile(resolve(directory,'index.html'),'utf8')
      expect(html).toBe(await readFile(resolve(root,'boring-diagrams/index.html'),'utf8'))
      const dom=new JSDOM(html)
      try {
        const document=dom.window.document
        expect(document.querySelectorAll('article.exhibit')).toHaveLength(0)
        expect(document.querySelectorAll('.thumbnail-exhibit')).toHaveLength(10)
        expect(document.querySelectorAll('.thumbnail img')).toHaveLength(10)
        expect(document.querySelectorAll('h1')).toHaveLength(1)
        expect(document.querySelector('link[href="../site.css"]')).toBeNull()
        expect(document.body.textContent).toContain('The diagrams aren’t boring.')
        for(const exhibit of exhibits){
          expect(document.querySelector(`a[data-exhibit="${exhibit.id}"]`)!.getAttribute('href')).toBe(`${exhibit.id}/`)
          const page=await readFile(resolve(directory,exhibit.id,'index.html'),'utf8')
          expect(page).toBe(await readFile(resolve(root,'boring-diagrams',exhibit.id,'index.html'),'utf8'))
          const detail=new JSDOM(page)
          try {
            const article=detail.window.document.querySelector('article.exhibit')!
            expect(article.querySelector('#source pre code')!.textContent).toBe(await readFile(resolve(root,`boring-diagrams/sources/${exhibit.id}.mmd`),'utf8'))
            expect(article.querySelector('h1')!.textContent).toBe(exhibit.title)
            expect(detail.window.document.querySelectorAll('h1')).toHaveLength(1)
            expect(article.querySelector('#prompt blockquote')!.textContent).toBe(exhibit.prompt)
            expect(article.querySelector('#prompt')!.closest('details')).toBeNull()
            expect(article.querySelector('#source')!.closest('details')).toBeNull()
            expect(article.querySelector('#evidence')!.closest('details')).toBeNull()
            expect(article.querySelector('.drawing-window')!.getAttribute('data-fit')).toBe('true')
            expect(article.querySelector('[data-fit-toggle]')!.getAttribute('aria-pressed')).toBe('true')
            expect(article.querySelectorAll('.relationships table')).toHaveLength(1)
            expect(article.querySelector('.evidence-summary')!.textContent).toContain('Not validated')
            for(const anchor of ['prompt','source','evidence']) expect(article.querySelector(`.process-navigation a[href="#${anchor}"]`)).not.toBeNull()
            for(const link of article.querySelectorAll<HTMLAnchorElement>('a[href^="../entries/"]')) expect(await Bun.file(resolve(directory,exhibit.id,link.getAttribute('href')!)).exists()).toBe(true)
            for(const related of exhibit.related??[]) expect(article.querySelector(`.related-views a[href="../${related}/"]`)).not.toBeNull()
          }finally{detail.window.close()}
        }
      }finally{dom.window.close()}
    }finally{await rm(directory,{recursive:true,force:true})}
  },60000)

  test('scopes IDs across the collection, rejects invalid inputs and escapes metadata',async()=>{
    const scenes=await Promise.all(exhibits.map(e=>readFile(resolve(root,`boring-diagrams/entries/${e.id}/scene.json`),'utf8').then(JSON.parse)))
    const dom=new JSDOM(`<main>${scenes.map((scene,i)=>drawScene(scene,exhibits[i]!.style)).join('')}</main>`)
    try {
      const ids=[...dom.window.document.querySelectorAll('[id]')].map(el=>el.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(dom.window.document.querySelectorAll('script')).toHaveLength(0)
    }finally{dom.window.close()}
    const scene=scenes[exhibits.findIndex(e=>e.id==='hermes')]!
    for(const style of styles)expect(architectureIntegrity(await readFile(resolve(root,'boring-diagrams/sources/hermes.mmd'),'utf8'),drawScene(scene,style)).issues).toEqual([])
    expect(()=>drawScene({...scene,width:NaN})).toThrow('coordinate')
    const invalid=structuredClone(scene);invalid.nodes[0].transform='translate(0 0) scale(100)'
    expect(()=>drawScene(invalid)).toThrow('transform')
    expect(()=>drawScene({...scene,nodes:Array(51).fill(scene.nodes[0])})).toThrow('budget')
    const hostile=structuredClone(scene);hostile.nodes[0].id='"><script>alert(1)</script>';hostile.title='<script>alert(2)</script>'
    const safe=new JSDOM(drawScene(hostile),{contentType:'image/svg+xml'})
    try {
      expect(safe.window.document.querySelector('script')).toBeNull()
      expect(safe.window.document.querySelector('.pele-node')!.getAttribute('data-id')).toBe(hostile.nodes[0].id)
      expect(safe.window.document.querySelector('title')!.textContent).toContain(hostile.title)
    }finally{safe.window.close()}
  })
  test('browser redraw, native comparison, download and failed-fetch fallback keep working',async()=>{
    const html=await readFile(resolve(root,'boring-diagrams/hermes/index.html'),'utf8')
    const css=await readFile(resolve(root,'boring-diagrams/site.css'),'utf8')
    expect(css).toContain('.drawing-window>svg')
    expect(css).not.toMatch(/\.drawing-window\s+svg/)
    expect(css).toContain('.drawing-window[data-fit=true]{height:clamp(340px,48vh,680px)}')
    expect(css).toContain('height:100%;min-width:0;object-fit:contain')
    const code=(await readFile(resolve(root,'boring-diagrams/app.js'),'utf8')).replace("import { drawScene } from './draw.js'",'')
    for(const fail of [false,true]) {
      const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/boring-diagrams/hermes/'})
      try {
        Object.assign(dom.window,{drawScene,fetch:async(url:string)=>{
          if(fail)throw new Error('offline')
          return {ok:true,json:async()=>JSON.parse(await readFile(resolve(root,'boring-diagrams/hermes',url),'utf8'))}
        }})
        dom.window.eval(code)
        for(let attempt=0;attempt<100;attempt++) {
          const document=dom.window.document
          if(fail?document.querySelector('#drawing-status')!.textContent:document.querySelectorAll('.drawing-window >svg').length===1)break
          await new Promise(resolve=>setTimeout(resolve,10))
        }
        const document=dom.window.document,article=document.querySelector('#hermes')!,image=article.querySelector('img')!
        expect(article.querySelector('.view-controls')!.hasAttribute('hidden')).toBe(false)
        if(fail) {
          expect(image.hidden).toBe(false)
          expect(article.querySelector('.drawing-window >svg')).toBeNull()
          expect(document.querySelector('#drawing-status')!.textContent).toContain('saved drawing')
        } else {
          const svg=article.querySelector('.drawing-window >svg')!
          expect(image.hidden).toBe(true);expect(svg.hasAttribute('hidden')).toBe(false)
          article.querySelector<HTMLButtonElement>('[data-view=native]')!.click()
          expect(image.hidden).toBe(false);expect(svg.hasAttribute('hidden')).toBe(true)
          expect(article.querySelector('.svg-download')!.getAttribute('href')).toEndWith('/native.svg')
          article.querySelector<HTMLButtonElement>('[data-view=art]')!.click()
          expect(image.hidden).toBe(true);expect(svg.hasAttribute('hidden')).toBe(false)
          expect(article.querySelector('.svg-download')!.getAttribute('href')).toEndWith('/ancient.svg')
          expect(article.querySelectorAll('[data-view][aria-pressed=true]')).toHaveLength(1)
          const fit=article.querySelector<HTMLButtonElement>('[data-fit-toggle]')!
          expect(fit.getAttribute('aria-pressed')).toBe('true')
          expect(article.querySelector('.drawing-window')!.getAttribute('data-fit')).toBe('true')
          article.querySelector<HTMLButtonElement>('[data-view=native]')!.click()
          expect(fit.getAttribute('aria-pressed')).toBe('true')
          fit.click();expect(article.querySelector('.drawing-window')!.getAttribute('data-fit')).toBe('false')
          expect(article.querySelector('[data-fit-hint]')!.textContent).toContain('Full-size reading mode')
          article.querySelector<HTMLButtonElement>('[data-view=art]')!.click()
          expect(fit.getAttribute('aria-pressed')).toBe('false')
          fit.click();expect(article.querySelector('.drawing-window')!.getAttribute('data-fit')).toBe('true')
          expect(article.querySelector('[data-fit-hint]')!.textContent).toContain('Whole diagram fitted')
        }
      }finally{dom.window.close()}
    }
  })
  test('redirects known old fragment links to individual pages without hijacking other fragments',async()=>{
    const html=await readFile(resolve(root,'boring-diagrams/index.html'),'utf8')
    const code=await readFile(resolve(root,'boring-diagrams/index.js'),'utf8')
    for(const hash of ['#aurora','#aurora-recovery','#method','#unknown']) {
      const dom=new JSDOM(html,{url:`http://localhost/boring-diagrams/${hash}`})
      try {
        let redirected=''
        new Function('document','location',code)(dom.window.document,{hash,replace:(url:string)=>{redirected=url}})
        if(['#aurora','#aurora-recovery'].includes(hash)) expect(redirected).toBe(`http://localhost/boring-diagrams/${hash.slice(1)}/`)
        else expect(redirected).toBe('')
      }finally{dom.window.close()}
    }
  })

  test('keeps tenancy, account, AZ, replication and recovery decisions explicit in the authored sources',async()=>{
    const load=async(id:string)=>{const source=await readFile(resolve(root,`boring-diagrams/sources/${id}.mmd`),'utf8');const model=architectureModel(source);return {model,annotations:architectureAnnotations(source,model)}}
    for(const exhibit of exhibits){
      const {model,annotations}=await load(exhibit.id)
      expect([...annotations.boundaries.values()].filter(kind=>kind==='account').length).toBeGreaterThanOrEqual(2)
      expect(model.nodes.size).toBeGreaterThanOrEqual(9)
      expect(annotations.coverage).toBe('authored-annotations-and-containment-only')
    }
    const aurora=await load('aurora')
    expect([...aurora.annotations.boundaries.values()].filter(kind=>kind==='account')).toHaveLength(4)
    expect(aurora.annotations.relationships.get('provision-deployRole')!.kind).toBe('control')
    expect(aurora.annotations.relationships.has('sharedApp-dedicatedDb')).toBe(false)
    const identity=await load('aurora-identity')
    expect(identity.annotations.relationships.get('login-pooledApi')!.kind).toBe('identity')
    expect(identity.annotations.relationships.get('pooledApp-pooledDb')!.meaning).toContain('transaction-local')
    expect(identity.annotations.relationships.has('pooledApp-dedicatedDb')).toBe(false)
    const recovery=await load('aurora-recovery')
    expect(recovery.model.nodes.get('writer')!.in).not.toBe(recovery.model.nodes.get('reader')!.in)
    expect(recovery.annotations.relationships.get('volume-standbyDb')!.kind).toBe('replication')
    expect(recovery.annotations.relationships.get('reader-writer')!.kind).toBe('recovery')
    expect(recovery.annotations.relationships.get('volume-vault')!.kind).toBe('recovery')
    const hermes=await load('hermes')
    expect(hermes.model.nodes.get('workerA')!.in).not.toBe(hermes.model.nodes.get('workerB')!.in)
    expect(hermes.model.nodes.get('queue')!.in).toBe('primary')
    expect(hermes.model.nodes.get('ledger')!.in).toBe('primary')
    expect(hermes.annotations.relationships.get('bus-siloBus')!.kind).toBe('event')
    const disco=await load('disco')
    expect(disco.annotations.relationships.get('sales-replica')!.kind).toBe('replication')
    expect([...disco.annotations.relationships.values()].some(r=>r.target==='replica'&&r.kind==='request')).toBe(false)
  })

  test('rejects missing, stale, duplicate and misleading gallery annotations',async()=>{
    const source=await readFile(resolve(root,'boring-diagrams/sources/hermes.mmd'),'utf8')
    const check=(value:string)=>architectureAnnotations(value,architectureModel(value))
    expect(()=>check(source.replace('%% @boundary platform account\n',''))).toThrow('Every boundary')
    expect(()=>check(source+'\n%% @boundary platform account')).toThrow('Invalid boundary')
    expect(()=>check(source.replace('%% @boundary platform account','%% @boundary platform spaceship'))).toThrow('Invalid boundary')
    expect(()=>check(source.replace('%% @boundary primary region','%% @boundary primary az'))).toThrow('Invalid az parent')
    expect(()=>check(source.replace('%% @edge publisherA bus event','%% @edge absent bus event'))).toThrow('Invalid relationship')
    expect(()=>check(source+'\n%% @edge publisherA bus event | Duplicate')).toThrow('Invalid relationship')
    expect(()=>check(source.replace('[Pooled delivery queue] in primary','[Pooled delivery queue] in zoneA'))).toThrow('Regional/global service')
    expect(()=>check(source.replace('[Pooled delivery queue] in primary','[Pooled delivery queue] in workersVpc'))).toThrow('Regional service should be outside')
    expect(()=>check(source+'\n%% @unknown data')).toThrow('Unknown gallery annotation')
  })
})
