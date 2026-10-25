// Post-layout AWS drawing experiment. Geometry and text come from Beautiflow/Pele.
// iconSvg/labelSvg are trusted, build-produced fragments, never visitor input.
export const styles = ['plain', 'ancient', 'disco', 'blueprint', 'deco', 'pastel', 'diner', 'transit', 'zine']
const palettes = {
  plain: { paper:'#f4f6f2', ink:'#183b32', group:'#e9efe8', nested:'#f0f4ed', panel:'#fcfdf8', border:'#789182', accent:'#1c6b50' },
  ancient: { paper:'#ca6842', ink:'#261e1b', group:'#d9895f', nested:'#e4a478', panel:'#f2cda4', border:'#483026', accent:'#261e1b' },
  disco: { paper:'#49253c', ink:'#ffe7aa', group:'#642e45', nested:'#723e50', panel:'#fff0cc', border:'#ffbd54', accent:'#ef91ad' },
  blueprint: { paper:'#1d467e', ink:'#f0f6fd', group:'#224d85', nested:'#27588f', panel:'#e9f0f7', border:'#a5c4e8', accent:'#e3ecfb' },
  deco: { paper:'#123e38', ink:'#f2deb0', group:'#174840', nested:'#1d5147', panel:'#fcf1d4', border:'#c9a867', accent:'#e6ca8c' },
  pastel: { paper:'#e3f0ea', ink:'#263f47', group:'#cddfe1', nested:'#e2eae4', panel:'#fcf5eb', border:'#65828a', accent:'#c37968' },
  diner: { paper:'#f6efdf', ink:'#712b30', group:'#d1e3da', nested:'#e6ede2', panel:'#fff9ec', border:'#8b4147', accent:'#b52c38' },
  transit: { paper:'#f2d541', ink:'#182429', group:'#f6e782', nested:'#f8eba0', panel:'#fcf8db', border:'#182429', accent:'#182429' },
  zine: { paper:'#efece9', ink:'#252329', group:'#e4c9dc', nested:'#eee0e8', panel:'#fcf7f9', border:'#252329', accent:'#a91d62' },
}
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))
const n = v => { if (!Number.isFinite(v)) throw new Error('Invalid architecture coordinate'); return v }
function boxPath(box, inset=0) {
  const x=n(box.x+inset),y=n(box.y+inset),w=n(box.width-2*inset),h=n(box.height-2*inset)
  if (w<=0 || h<=0) throw new Error('Invalid architecture box')
  return `M${x} ${y}H${x+w}V${y+h}H${x}Z`
}
function scoped(fragment,style) {
  // Only XML id attributes and local references, never semantic data-id values.
  const ids=[...fragment.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1])
  for (const id of ids) fragment=fragment.replaceAll(` id="${id}"`,` id="bd-${style}-${id}"`).replaceAll(`url(#${id})`,`url(#bd-${style}-${id})`).replaceAll(`href="#${id}"`,`href="#bd-${style}-${id}"`)
  return fragment
}
function label(fragment,color) { return fragment.replace(/\sfill="[^"]*"/g,` fill="${color}"`) }
function border(style,w,h,p) {
  if(style==='plain') return `<path d="M24 26H${w-24}M24 ${h-24}H${w-24}" fill="none" stroke="${p.border}" stroke-width=".7"/>`
  if(style==='ancient') {
    let diamonds=''
    for(let x=32;x<w-32;x+=26) diamonds+=`<path d="M${x} 18l5 5-5 5-5-5Zm0 ${h-46}l5 5-5 5-5-5Z"/>`
    return `<g fill="none" stroke="${p.accent}" stroke-width=".8"><path d="M12 12H${w-12}V${h-12}H12ZM17 34H${w-17}M17 ${h-34}H${w-17}"/>${diamonds}</g>`
  }
  if(style==='blueprint') return `<g fill="none" stroke="${p.border}" stroke-width=".5"><path d="M12 38V12H${w-12}V${h-12}H12V38M24 38H${w-24}M24 ${h-30}H${w-24}"/>${Array.from({length:Math.floor(w/20)-2},(_,i)=>`<path d="M${30+i*20} 12v${i%5===0?10:5}M${30+i*20} ${h-12}v-5"/>`).join('')}</g>`
  if(style==='deco') return `<g fill="none" stroke="${p.accent}"><path d="M12 24H24V12H${w-24}V24H${w-12}V${h-24}H${w-24}V${h-12}H24V${h-24}H12Z"/><path d="M18 30H30V18H${w-30}V30H${w-18}V${h-30}H${w-30}V${h-18}H30V${h-30}H18Z" stroke-width=".5"/></g>`
  if(style==='pastel') return `<g fill="none" stroke="${p.border}" stroke-width=".6"><path d="M16 32V16H32M${w-32} 16H${w-16}V32M16 ${h-32}V${h-16}H32M${w-32} ${h-16}H${w-16}V${h-32}"/><path d="M28 ${h-26}h80m-80 -4v8m20-8v8m20-8v8m20-8v8m20-8v8"/></g>`
  if(style==='diner') return `<g fill="${p.accent}">${Array.from({length:Math.floor(w/18)},(_,i)=>`<rect x="${i*18}" y="10" width="9" height="9"/><rect x="${i*18+9}" y="19" width="9" height="9"/><rect x="${i*18}" y="${h-19}" width="9" height="9"/>`).join('')}</g>`
  if(style==='transit') return `<path d="M16 18H${w-16}M16 ${h-18}H${w-16}" fill="none" stroke="${p.ink}" stroke-width="6"/>`
  if(style==='zine') return `<g fill="none" stroke="${p.accent}"><path d="M12 16H${w-20}V${h-12}H20V24H${w-12}" stroke-width="3"/><path d="M26 32H${w-26}M26 ${h-30}H${w-26}" stroke-dasharray="2 3"/></g>`
  let tiles=''
  const colors=['#ffbd54','#ef91ad','#da7046','#f3cf7d']
  for(let i=0;i<Math.floor((w-40)/18);i++) tiles+=`<rect x="${20+i*18}" y="16" width="13" height="13" fill="${colors[i%4]}"/><rect x="${20+i*18}" y="${h-29}" width="13" height="13" fill="${colors[(i+2)%4]}"/>`
  return tiles
}
function plate(box,style,p,prefix,group=false) {
  const inset=group?5:3,x=n(box.x),y=n(box.y),w=n(box.width),h=n(box.height)
  if(style==='ancient') return `<path d="${boxPath(box)}" fill="url(#${prefix}-hatch)" opacity="${group?.18:1}"/><path d="${boxPath(box,inset)}" fill="none" stroke="${p.border}" stroke-width=".6"/>`
  if(style==='disco') return `<path d="${boxPath(box)}" fill="url(#${prefix}-tiles)" opacity="${group?.65:.35}"/><path d="M${x+inset} ${y+14}V${y+inset}H${x+14}M${x+w-14} ${y+h-inset}H${x+w-inset}V${y+h-14}" fill="none" stroke="${p.border}" stroke-width="2"/>`
  if(style==='blueprint') return group?`<path d="${boxPath(box,5)}" fill="url(#${prefix}-grid)" stroke="${p.border}" stroke-width=".4"/>`:`<path d="M${x+2} ${y+9}V${y+2}H${x+9}M${x+w-9} ${y+2}H${x+w-2}V${y+9}M${x+2} ${y+h-9}V${y+h-2}H${x+9}M${x+w-9} ${y+h-2}H${x+w-2}V${y+h-9}" fill="none" stroke="${p.paper}" stroke-width=".7"/>`
  if(style==='deco') return `<path d="M${x+inset} ${y+12}H${x+12}V${y+inset}H${x+w-12}V${y+12}H${x+w-inset}V${y+h-12}H${x+w-12}V${y+h-inset}H${x+12}V${y+h-12}H${x+inset}Z" fill="none" stroke="${p.border}" stroke-width=".7"/>`
  if(style==='pastel') return `<path d="M${x+inset} ${y+16}V${y+inset}H${x+16}M${x+w-16} ${y+h-inset}H${x+w-inset}V${y+h-16}" fill="none" stroke="${p.accent}" stroke-width="2"/>`
  if(style==='diner') return `<path d="${boxPath(box,inset)}" fill="none" stroke="${p.border}" stroke-width=".6"/>`
  if(style==='transit') return `<path d="M${x+3} ${y+3}H${x+15}M${x+w-15} ${y+h-3}H${x+w-3}" stroke="${p.ink}" stroke-width="3"/>`
  if(style==='zine') return `<path d="${boxPath(box,inset)}" fill="url(#${prefix}-dots)" stroke="${p.accent}" stroke-width=".6" stroke-dasharray="3 2"/>`
  return ''
}
const flowPatterns={request:'',identity:'6 3',event:'2 3',replication:'10 3 2 3',control:'8 4',recovery:'1 4 6 4'}
const boundaryPatterns={account:'',region:'10 3',vpc:'',az:'4 3',subnet:'1 3',logical:'8 3 1 3'}
export function drawingSize(scene) {return {width:Math.max(800,n(scene.width+64)),height:n(scene.height+184)}}
function legend(scene,w,h,p) {
  const kinds=Object.keys(flowPatterns).filter(kind=>scene.edges.some(edge=>edge.kind===kind))
  return `<g class="relationship-legend" font-size="13" fill="${p.ink}">${kinds.map((kind,i)=>{const x=32+(i%3)*((w-64)/3),y=h-68+Math.floor(i/3)*22;return `<path d="M${x} ${y}h32" fill="none" stroke="${p.ink}" stroke-width="1.5" stroke-dasharray="${flowPatterns[kind]}"/><text x="${x+40}" y="${y+4}">${kind[0].toUpperCase()+kind.slice(1)}</text>`}).join('')}</g>`
}
export function drawScene(scene,style='plain') {
  if(!styles.includes(style)) throw new Error('Unknown drawing style')
  if(scene.family!=='architecture') throw new Error('This renderer requires an architecture scene')
  if(scene.nodes.length>50 || scene.groups.length>20 || scene.edges.length>100) throw new Error('Architecture scene budget exceeded')
  const {width:w,height:h}=drawingSize(scene)
  const p=palettes[style],scope=`${style}-${scene.sourceHash.slice(0,16)}`,prefix=`bd-${scope}`
  const defs=`<defs><pattern id="${prefix}-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0M-1 1L1-1M6 8L8 6" stroke="${p.border}" stroke-width=".5" stroke-opacity=".45"/></pattern><pattern id="${prefix}-tiles" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H6V6H0ZM6 6H12V12H6Z" fill="${p.accent}" fill-opacity=".2"/></pattern><pattern id="${prefix}-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="${p.border}" stroke-width=".3" opacity=".35"/></pattern><pattern id="${prefix}-dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".55" fill="${p.accent}" opacity=".22"/></pattern></defs>`
  const groups=scene.groups.map(group=>{
    const path=boxPath(group.box)
    const art=plate(group.box,style,p,prefix,true)
    const icon=group.iconSvg.replace(/stroke="#[^"]*"/g,`stroke="${p.ink}"`)
    return `<g class="pele-cluster" data-id="${esc(group.id)}" data-box="${esc(JSON.stringify(group.box))}" data-boundary="${esc(group.kind)}"${group.parent?` data-parent="${esc(group.parent)}"`:''}><path d="${path}" fill="${group.parent?p.nested:p.group}" stroke="${p.border}" stroke-width="${group.kind==='account'?2:group.kind==='vpc'?1.5:1}" stroke-dasharray="${boundaryPatterns[group.kind]??''}"/>${art}<g color="${p.ink}">${scoped(icon,scope)}</g>${label(group.labelSvg,p.ink)}</g>`
  }).join('')
  const edges=scene.edges.map(edge=>`<g class="pele-edge" data-id="${esc(edge.id)}" data-source="${esc(edge.source)}" data-target="${esc(edge.target)}" data-source-port="${esc(edge.sourcePort)}" data-target-port="${esc(edge.targetPort)}" data-relationship="${esc(edge.kind)}"><title>${esc(edge.meaning)}</title>${edge.paths.map(path=>`<path${path.marker?' class="pele-marker"':''} d="${esc(path.d)}" fill="${path.marker?p.ink:'none'}" stroke="${path.marker?'none':p.ink}" stroke-width="${style==='disco'?2.1:1.4}" stroke-dasharray="${path.marker?'':flowPatterns[edge.kind]??''}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>`).join('')
  const nodes=scene.nodes.map(node=>{
    if(!/^translate\([-\d., ]+\)$/.test(node.transform)) throw new Error('Unsupported architecture transform')
    const path=boxPath(node.box)
    const art=plate(node.box,style,p,prefix)
    return `<g class="pele-node pele-service" data-id="${esc(node.id)}" data-box="${esc(JSON.stringify(node.box))}"${node.parent?` data-parent="${esc(node.parent)}"`:''} transform="${node.transform}" fill="${p.ink}"><path d="${path}" fill="${p.panel}" stroke="${p.border}" stroke-width="${style==='disco'?2:1}"/>${art}<g color="#183b32">${scoped(node.iconSvg,scope)}</g>${label(node.labelSvg,p.ink)}</g>`
  }).join('')
  const labels=new Map(scene.nodes.map(node=>[node.id,node.label]))
  const description=scene.edges.map(edge=>`${labels.get(edge.source)} to ${labels.get(edge.target)}`).join('; ')
  return `<svg xmlns="http://www.w3.org/2000/svg" class="boring-aws-art" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial" font-size="16" fill="${p.ink}" color="${p.ink}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc" data-scene-hash="${esc(scene.sourceHash)}" data-style="${style}"><title id="${prefix}-title">${esc(scene.title)}, ${style} drawing</title><desc id="${prefix}-desc">Fictional AWS architecture. ${esc(scene.description)} ${esc(description)}. Boundary labels distinguish accounts, regions, VPCs, AZs, subnets and logical groups. These annotations do not verify deployed isolation or permissions.</desc>${defs}<rect width="${w}" height="${h}" fill="${p.paper}"/>${border(style,w,h,p)}<text x="${w/2}" y="55" text-anchor="middle" font-size="18" font-weight="600">${esc(scene.title)}</text><g transform="translate(${n(32+scene.geometry.offset.x)} ${n(72+scene.geometry.offset.y)})"><g class="pele-clusters">${groups}</g><g class="pele-edges">${edges}</g><g class="pele-nodes">${nodes}</g></g>${legend(scene,w,h,p)}</svg>`
}
