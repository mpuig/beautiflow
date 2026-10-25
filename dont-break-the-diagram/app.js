(() => {
  const view = document.defaultView
  const cases = [...document.querySelectorAll('.case')]
  const links = [...document.querySelectorAll('[data-case]')]
  const current = new Map(cases.map((panel) => [panel.id, panel.querySelectorAll('[data-step]').length - 1]))
  function selectStep(panel, index) {
    const steps = [...panel.querySelectorAll('[data-step]')]
    if (index < 0 || index >= steps.length) return
    current.set(panel.id, index)
    steps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)))
    panel.querySelectorAll('.stage').forEach((stage, i) => { stage.hidden = i !== index })
    panel.querySelector('[data-previous]').disabled = index === 0
    panel.querySelector('[data-next]').disabled = index === steps.length - 1
    panel.querySelector('.step-status').textContent = `Step ${index + 1} of ${steps.length}`
  }
  function selectCase() {
    const id = view.location.hash.slice(1)
    const selected = cases.find((panel) => panel.id === id) || cases[0]
    cases.forEach((panel) => { panel.hidden = panel !== selected })
    links.forEach((link) => {
      if (link.dataset.case === selected.id) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
  }
  cases.forEach((panel) => {
    panel.querySelector('.step-rail').hidden = false
    panel.querySelector('.step-controls').hidden = false
    panel.querySelectorAll('[data-step]').forEach((button) => button.addEventListener('click', () => selectStep(panel, Number(button.dataset.step))))
    panel.querySelector('[data-previous]').addEventListener('click', () => selectStep(panel, current.get(panel.id) - 1))
    panel.querySelector('[data-next]').addEventListener('click', () => selectStep(panel, current.get(panel.id) + 1))
    selectStep(panel, current.get(panel.id))
  })
  view.addEventListener('hashchange', selectCase)
  selectCase()
})()
