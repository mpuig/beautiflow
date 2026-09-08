import { JSDOM } from 'jsdom'
import { expect } from 'bun:test'

export function expectArchitectureSnapshot(actual: string, expected: string): void {
  const actualDom = new JSDOM(architectureSnapshot(actual), { contentType: 'image/svg+xml' })
  const expectedDom = new JSDOM(architectureSnapshot(expected), { contentType: 'image/svg+xml' })
  try {
    const selector = '.architecture-groups > rect, .architecture-groups [transform]'
    const actualGroups = [...actualDom.window.document.querySelectorAll(selector)]
    const expectedGroups = [...expectedDom.window.document.querySelectorAll(selector)]
    expect(actualGroups.length).toBe(expectedGroups.length)
    for (const [index, element] of actualGroups.entries()) {
      const reference = expectedGroups[index]!
      for (const attribute of ['x', 'y', 'width', 'height', 'transform']) {
        const value = element.getAttribute(attribute)
        const expectedValue = reference.getAttribute(attribute)
        if (value === null || expectedValue === null) {
          expect(value).toBe(expectedValue)
          continue
        }
        const numberPattern = /[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi
        expect(value.replace(numberPattern, '#')).toBe(expectedValue.replace(numberPattern, '#'))
        const actualNumbers = value.match(numberPattern)!.map(Number)
        const expectedNumbers = expectedValue.match(numberPattern)!.map(Number)
        expect(actualNumbers.length).toBe(expectedNumbers.length)
        for (const [coordinate, number] of actualNumbers.entries()) {
          expect(Math.abs(number - expectedNumbers[coordinate]!)).toBeLessThanOrEqual(4)
        }
        element.setAttribute(attribute, expectedValue)
      }
    }
    expect(actualDom.window.document.documentElement.outerHTML).toBe(expectedDom.window.document.documentElement.outerHTML)
  } finally {
    actualDom.window.close()
    expectedDom.window.close()
  }
}

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
