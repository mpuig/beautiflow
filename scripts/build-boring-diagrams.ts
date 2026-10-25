import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { architectureModel, renderPeleDetailed } from '../src/diagram/pele.ts'
import { auditArchitecture, architectureIntegrity, inspectArchitecture } from '../src/diagram/architecture-analysis.ts'
import { makeSvgAccessible } from '../src/diagram/svg.ts'
import { agentInspection } from '../src/agent.ts'
import { drawScene, type Box, type DrawingScene } from '../boring-diagrams/draw.js'
import { exhibits, type Exhibit } from '../boring-diagrams/catalogue.ts'
import { architectureAnnotations } from '../boring-diagrams/annotations.ts'
import { galleryHtml, exhibitHtml } from '../boring-diagrams/page.ts'

const root=resolve(import.meta.dir,'..')
async function buildExhibit(exhibit: Exhibit, destination: string) {
  const path=resolve(root,`boring-diagrams/sources/${exhibit.id}.mmd`),source=await readFile(path,'utf8')
  const model=architectureModel(source)
  const annotations=architectureAnnotations(source,model)
  if([...model.nodes.values()].some(node=>node.type!=='service')) throw new Error('Drawing adapter does not support junctions')
  const rendered=renderPeleDetailed(source,{bg:'#f4f6f2',fg:'#183b32'},false)
  if(!rendered.geometry) throw new Error('Architecture geometry is required')
  const audit=auditArchitecture(source)
  if(audit.issues.length) throw new Error(`${exhibit.id} failed native geometry checks: ${JSON.stringify(audit.issues)}`)
  const dom=new JSDOM(rendered.svg,{contentType:'image/svg+xml'})
  let scene:DrawingScene
  try {
    const document=dom.window.document
    function find(kind:string,id:string) {
      const matches=[...document.querySelectorAll(`g.pele-${kind}`)].filter(el=>el.getAttribute('data-id')===id)
      if(matches.length!==1) throw new Error(`Ambiguous architecture ${kind}: ${id}`)
      return matches[0]!
    }
    function box(element:Element):Box {
      const rect=element.querySelector(':scope > rect')!
      if(!rect) throw new Error('Expected architecture rectangle')
      const get=(key:string)=>Number(rect.getAttribute(key)??0)
      return {x:get('x'),y:get('y'),width:get('width'),height:get('height'),rx:Number(rect.getAttribute('rx')??rect.getAttribute('style')?.match(/rx:([\d.]+)/)?.[1]??0)}
    }
    function fragment(element:Element,selector:string) {
      const found=element.querySelector(selector)
      if(!found) throw new Error(`Missing architecture fragment: ${selector}`)
      return found.outerHTML
    }
    scene={family:'architecture',title:exhibit.title,description:exhibit.notes.join(' '),sourceHash:createHash('sha256').update(source).digest('hex'),
      width:Number(document.documentElement.getAttribute('width')),height:Number(document.documentElement.getAttribute('height')),geometry:rendered.geometry,
      nodes:[...model.nodes.values()].map(node=>{
        if(node.type!=='service') throw new Error('Expected service')
        const element=find('node',node.id)
        return {id:node.id,label:node.title??'',icon:node.icon??'',...(node.in?{parent:node.in}:{}),transform:element.getAttribute('transform')!,box:box(element),iconSvg:fragment(element,':scope > svg.pele-icon'),labelSvg:fragment(element,':scope > text.pele-label')}
      }),
      groups:[...model.groups.values()].map(group=>{
        const element=find('cluster',group.id)
        return {id:group.id,label:group.title??'',kind:annotations.boundaries.get(group.id)!,...(group.in?{parent:group.in}:{}),box:box(element),iconSvg:fragment(element,':scope > svg.pele-icon'),labelSvg:fragment(element,':scope > text.pele-cluster-label')}
      }),
      edges:model.edges.map(edge=>{
        const id=`${edge.lhsId}-${edge.rhsId}`,element=find('edge',id)
        if(element.querySelector('text')) throw new Error('Drawing adapter does not support edge-label fragments')
        return {id,...annotations.relationships.get(id)!,sourcePort:edge.lhsDir,targetPort:edge.rhsDir,paths:[...element.querySelectorAll(':scope > path')].map(path=>({d:path.getAttribute('d')!,marker:path.classList.contains('pele-marker')}))}
      }),
    }
  } finally { dom.window.close() }
  await mkdir(resolve(destination,'rendered'),{recursive:true})
  const styledIntegrity:Record<string,ReturnType<typeof architectureIntegrity>>={}
  for(const style of [exhibit.style]) {
    const svg=drawScene(scene,style)
    const integrity=architectureIntegrity(source,svg)
    if(integrity.issues.length) throw new Error(`Styled ${style} architecture lost integrity: ${JSON.stringify(integrity.issues)}`)
    styledIntegrity[style]=integrity
    await writeFile(resolve(destination,'rendered',`${style}.svg`),svg+'\n')
  }
  const agent=await agentInspection(path)
  await writeFile(resolve(destination,'capabilities.json'),JSON.stringify({protocolVersion:agent.protocolVersion,family:agent.family,capabilities:agent.capabilities,constraints:agent.constraints,budget:agent.budget,stopWhen:agent.stopWhen},null,2)+'\n')
  await writeFile(resolve(destination,'scene.json'),JSON.stringify(scene,null,2)+'\n')
  await writeFile(resolve(destination,'evidence.json'),JSON.stringify({engine:'Beautiflow architecture pipeline: Pele + local positioned-geometry extension',sourceHash:scene.sourceHash,scope:'Geometry audit of the native layout; each styled drawing additionally checks elements, plain service labels, IDs, and SVG references. Decorative ink and cloud-provider semantics are not measured.',annotations:{coverage:annotations.coverage,boundaries:annotations.boundaries.size,relationships:annotations.relationships.size,configurationValidated:false},structure:inspectArchitecture(source),audit,styledIntegrity},null,2)+'\n')
  await writeFile(resolve(destination,'rendered/native.svg'),makeSvgAccessible(rendered.svg,source,`${exhibit.id}.mmd`,'architecture')+'\n')
  await writeFile(resolve(destination,'source.mmd'),source)
  return scene
}
export async function buildBoringDiagrams(destination=resolve(root,'boring-diagrams')) {
  const scenes: DrawingScene[]=[]
  for(const exhibit of exhibits) scenes.push(await buildExhibit(exhibit,resolve(destination,'entries',exhibit.id)))
  const sources=await Promise.all(exhibits.map(exhibit=>readFile(resolve(root,`boring-diagrams/sources/${exhibit.id}.mmd`),'utf8')))
  await writeFile(resolve(destination,'index.html'),galleryHtml(exhibits,scenes))
  for(const [index,exhibit] of exhibits.entries()) {
    const evidence=JSON.parse(await readFile(resolve(destination,'entries',exhibit.id,'evidence.json'),'utf8'))
    const page=resolve(destination,exhibit.id)
    await mkdir(page,{recursive:true})
    await writeFile(resolve(page,'index.html'),exhibitHtml(exhibit,scenes[index]!,sources[index]!,evidence,exhibits))
  }
  await writeFile(resolve(destination,'catalogue.json'),JSON.stringify(exhibits,null,2)+'\n')
  return scenes
}
if(import.meta.main) {
  const scenes=await buildBoringDiagrams()
  console.log(`Built ${scenes.length} Boring AWS Diagrams, ${scenes.reduce((count,scene)=>count+scene.nodes.length,0)} services`)
}
