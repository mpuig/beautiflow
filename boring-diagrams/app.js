import { drawScene } from './draw.js'
// Only same-origin, trusted build-produced scenes are drawn. No generated code is evaluated.
const status=document.querySelector('#drawing-status')
for(const article of document.querySelectorAll('.exhibit')) {
  const controls=article.querySelector('.view-controls'),window=article.querySelector('.drawing-window'),image=window.querySelector('img'),download=article.querySelector('.svg-download')
  const base=article.dataset.base,art=`${base}/rendered/${article.dataset.style}.svg`
  let drawing=null,request=null,view='art'
  controls.hidden=false
  async function sceneDrawing() {
    request??=fetch(`${base}/scene.json`).then(response=>{if(!response.ok)throw new Error('Scene unavailable');return response.json()}).then(scene=>drawScene(scene,article.dataset.style))
    return request
  }
  async function select(next) {
    view=next
    for(const button of controls.querySelectorAll('button[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===next))
    window.dataset.view=next
    download.href=next==='art'?art:`${base}/rendered/native.svg`
    download.download=`${article.id}-${next==='art'?article.dataset.style:'native'}.svg`
    if(next==='native') {if(drawing)drawing.setAttribute('hidden','');image.hidden=false;image.src=download.href;return}
    image.src=art
    if(drawing){image.hidden=true;drawing.removeAttribute('hidden');return}
    try {
      const svg=await sceneDrawing()
      if(!drawing) {
        const template=document.createElement('template');template.innerHTML=svg
        drawing=template.content.firstElementChild
        drawing.setAttribute('aria-label',image.alt)
        window.append(drawing)
      }
      drawing.toggleAttribute('hidden',view!=='art');image.hidden=view==='art'
    } catch {
      // Saved SVG is the complete fallback, not a partially rendered diagram.
      request=null;image.hidden=false
      status.textContent=`${article.querySelector('h1').textContent}: live redraw unavailable. The saved drawing and source links still work.`
    }
  }
  for(const button of controls.querySelectorAll('button[data-view]'))button.addEventListener('click',()=>select(button.dataset.view))
  const fit=controls.querySelector('[data-fit-toggle]')
  fit.addEventListener('click',()=>{
    const enabled=fit.getAttribute('aria-pressed')!=='true'
    fit.setAttribute('aria-pressed',String(enabled));window.dataset.fit=String(enabled)
    article.querySelector('[data-fit-hint]').textContent=enabled
      ? 'Whole diagram fitted. For larger labels, turn off “Fit whole diagram” and pan, or open the full-size SVG.'
      : 'Full-size reading mode. Pan within the viewer to read labels; turn on “Fit whole diagram” for context.'
    window.scrollLeft=0;window.scrollTop=0
  })
  // Hydrate as the exhibit approaches the viewport; the static image leads.
  if('IntersectionObserver' in globalThis) {
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){select(view);observer.disconnect()}},{rootMargin:'300px'})
    observer.observe(article)
  } else select(view)
}
