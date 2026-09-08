import { JSDOM } from 'jsdom'

export function architectureSnapshot(svg: string): string {
  const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
  try {
    const root = dom.window.document.documentElement
    const [originX, originY, width, height] = root.getAttribute('viewBox')!.split(/\s+/).map(Number)
    const decimal = (value: number) => String(Number(value.toFixed(6)))
    const coordinates = (value: string) => {
      let index = 0
      return value.replace(/[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi, (number) =>
        decimal(Number(number) - (index++ % 2 === 0 ? originX! : originY!)))
    }
    root.setAttribute('viewBox', `0 0 ${decimal(width!)} ${decimal(height!)}`)
    for (const element of root.querySelectorAll(':scope > rect, .architecture-groups > rect')) {
      element.setAttribute('x', decimal(Number(element.getAttribute('x')) - originX!))
      element.setAttribute('y', decimal(Number(element.getAttribute('y')) - originY!))
    }
    for (const element of root.querySelectorAll('.architecture-service, .architecture-junction, .architecture-edges [transform], .architecture-groups [transform]')) {
      const transform = element.getAttribute('transform')
      if (!transform || !/^translate\([^()]+\)$/.test(transform)) throw new Error('Unsupported architecture snapshot transform')
      element.setAttribute('transform', coordinates(transform))
    }
    for (const path of root.querySelectorAll('.architecture-edges path')) {
      const data = path.getAttribute('d')!
      if (/[a-df-km-z]/i.test(data.replace(/[ML]/g, ''))) throw new Error('Unsupported architecture snapshot route')
      path.setAttribute('d', coordinates(data))
    }
    return root.outerHTML
  } finally {
    dom.window.close()
  }
}
