// Progressive enhancement: prompt text remains readable without JavaScript.
for (const container of document.querySelectorAll('[data-prompt]')) {
  const button = container.querySelector('[data-copy-prompt]')
  const text = container.querySelector('[data-prompt-text]')
  const status = container.querySelector('.prompt-copy-status')
  if (!button || !text || !status) continue
  button.hidden = false
  button.addEventListener('click', async () => {
    button.disabled = true
    try {
      await navigator.clipboard.writeText(text.textContent)
      status.textContent = 'Prompt copied. Paste it into your coding agent.'
    } catch {
      const disclosure = text.closest('details')
      if (disclosure) disclosure.open = true
      const selection = document.defaultView.getSelection()
      const range = document.createRange()
      range.selectNodeContents(text)
      selection.removeAllRanges()
      selection.addRange(range)
      status.textContent = 'Clipboard unavailable. Prompt text selected; use your device’s copy action.'
    } finally {
      button.disabled = false
    }
  })
}
