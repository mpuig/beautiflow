import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { buildSite, siteResponse } from '../scripts/build-site.ts'

const root = resolve(import.meta.dir, '..')

describe('developer landing page', () => {
  test('ships accessible product, CLI, skill, and example content', async () => {
    const html = await readFile(resolve(root, 'index.html'), 'utf8')

    expect(html).toContain('<html lang="en">')
    expect(html).toContain('class="skip-link"')
    expect(html.match(/<h1\b/g)?.length).toBe(1)
    expect(html).toContain('Agents supply judgment.')
    expect(html).toContain('Beautiflow supplies control.')
    expect(html).toContain('Diagrams worth <span>sharing.</span>')
    expect(html).toContain('href="#start">Install Beautiflow')
    expect(html).toContain('curl -fsSL https://beautiflow.cc/install.sh | bash')
    expect(html).toContain('beautiflow install-skill')
    expect(html).toContain('Open your harness')
    expect(html).toContain('Use Beautiflow to draw an order platform')
    expect(html).toContain('The CLI is built for agents.')
    expect(html).toContain('No model keys in Beautiflow')
    expect(html).toContain('validated plan')
    expect(html).toContain('allow one named correction')
    expect(html).toContain('aria-live="polite"')
    expect(await readFile(resolve(root, 'site.css'), 'utf8')).toContain('@media (prefers-reduced-motion: reduce)')
  })

  test('switches real example panels with keyboard support and copies installation text', async () => {
    const html = await readFile(resolve(root, 'index.html'), 'utf8')
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://beautiflow.cc/' })
    try {
      const { document } = dom.window
      dom.window.eval(document.querySelector('script:not([type])')!.textContent!)
      const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      expect(tabs).toHaveLength(3)
      tabs[0]!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      expect(document.activeElement?.id).toBe('tab-sequence')
      expect(document.querySelector('#panel-sequence')!.hasAttribute('hidden')).toBe(false)
      expect(document.querySelector('#panel-architecture')!.hasAttribute('hidden')).toBe(true)
      tabs[2]!.click()
      expect(tabs[2]!.getAttribute('aria-selected')).toBe('true')
      expect(document.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1)
      for (const image of document.querySelectorAll('img')) {
        expect(existsSync(resolve(root, image.getAttribute('src')!))).toBe(true)
        expect(image.getAttribute('alt')?.length).toBeGreaterThan(10)
      }
      let copied = ''
      Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: async (value: string) => { copied = value } }, configurable: true })
      const button = document.querySelector<HTMLButtonElement>('[data-copy]')!
      button.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(copied).toBe('curl -fsSL https://beautiflow.cc/install.sh | bash')
      expect(document.querySelector('#copy-status')!.textContent).toContain('copied')
      Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied') } } })
      button.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(document.querySelector('#copy-status')!.textContent).toContain('Clipboard unavailable')
      expect(dom.window.getSelection()!.toString()).toBe(button.dataset.copy!)
    } finally {
      dom.window.close()
    }
  })

  test('moves the example gallery to a dedicated page with committed assets', async () => {
    const landing = await readFile(resolve(root, 'index.html'), 'utf8')
    const html = await readFile(resolve(root, 'examples.html'), 'utf8')
    const paths = [...html.matchAll(/(?:src|href)="(examples\/[^"#]+)"/g)].map((match) => match[1]!)

    expect(landing).toContain('href="examples.html"')
    expect(landing).not.toContain('<section class="examples"')
    expect(html.match(/<h1\b/g)?.length).toBe(1)
    expect(html).toContain('Portable diagrams. Verified outcomes.')
    expect(paths.length).toBeGreaterThanOrEqual(6)
    for (const path of paths) expect(existsSync(resolve(root, path))).toBe(true)
  })

  test('shares the website design and navigation without dropping gallery examples', async () => {
    const pages = await Promise.all(['index.html', 'examples.html'].map(async (file) => new JSDOM(await readFile(resolve(root, file), 'utf8'))))
    try {
      const [home, gallery] = pages.map((page) => page.window.document)
      for (const document of [home!, gallery!]) {
        expect(document.querySelector('link[href="site.css"]')?.getAttribute('rel')).toBe('stylesheet')
        expect(document.querySelector('style')).toBeNull()
        expect(document.querySelector('header .nav')).not.toBeNull()
        expect(document.querySelector('header .button')?.textContent).toBe('Install Beautiflow')
        expect(document.querySelector('footer .footer-inner')).not.toBeNull()
      }
      expect(gallery!.querySelector('.brand')!.innerHTML).toBe(home!.querySelector('.brand')!.innerHTML)
      expect([...gallery!.querySelectorAll('.nav-links a')].map((link) => link.textContent)).toEqual([...home!.querySelectorAll('.nav-links a')].map((link) => link.textContent))
      expect(gallery!.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('examples.html')
      expect(gallery!.querySelector('header .button')?.getAttribute('href')).toBe('index.html#start')
      expect(gallery!.querySelectorAll('.example-row')).toHaveLength(4)
      for (const row of gallery!.querySelectorAll('.example-row')) {
        expect(row.querySelector('.showcase .diagram-caption a')?.getAttribute('href')).toBe(row.querySelector('.art')?.getAttribute('href'))
        expect(row.querySelector('.artifact-links')).not.toBeNull()
      }
    } finally {
      for (const page of pages) page.window.close()
    }
  })

  test('has a GitHub Pages deployment workflow', async () => {
    const workflow = await readFile(resolve(root, '.github/workflows/pages.yml'), 'utf8')

    expect(workflow).toContain('actions/upload-pages-artifact@')
    expect(workflow).toContain('actions/deploy-pages@')
    expect(workflow).toContain('bun run build:site')
    expect(workflow).toContain('path: dist/site')
  })

  test('serves every website docs link from the same assembled site used for deployment', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'beautiflow-site-'))
    try {
      await buildSite(directory)
      const links = new Set<string>(['/', '/examples.html', '/site.css', '/docs/docs.css', '/docs/docs.js'])
      for (const file of ['index.html', 'examples.html']) {
        const html = await readFile(resolve(directory, file), 'utf8')
        for (const match of html.matchAll(/href="(\/docs\/[^"#]*)"/g)) links.add(match[1]!)
      }
      for (const path of links) {
        const response = await siteResponse(new Request(`http://localhost${path}`), directory)
        expect(response.status).toBe(200)
        expect((await response.text()).length).toBeGreaterThan(100)
      }
      expect((await siteResponse(new Request('http://localhost/docs'), directory)).status).toBe(308)
      expect((await siteResponse(new Request('http://localhost/missing'), directory)).status).toBe(404)
      expect((await siteResponse(new Request('http://localhost/..%2fpackage.json'), directory)).status).toBe(404)
      expect((await siteResponse(new Request('http://localhost/', { method: 'POST' }), directory)).status).toBe(405)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('ships a syntax-valid, checksum-verifying installer', async () => {
    const installer = await readFile(resolve(root, 'install.sh'), 'utf8')
    const syntax = Bun.spawnSync(['bash', '-n', resolve(root, 'install.sh')])

    expect(syntax.exitCode).toBe(0)
    expect(installer).toContain('beautiflow-darwin-arm64')
    expect(installer).toContain('beautiflow-linux-x86_64')
    expect(installer).toContain('SHA256SUMS')
    expect(installer).toContain('[ "$actual" = "$expected" ]')
  })
})
