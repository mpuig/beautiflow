import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { buildSite, siteResponse } from '../scripts/build-site.ts'
import { buildDiagramGallery } from '../scripts/build-diagram-gallery.ts'

const root = resolve(import.meta.dir, '..')

describe('developer landing page', () => {
  test('ships accessible product, CLI, skill, and example content', async () => {
    const html = await readFile(resolve(root, 'index.html'), 'utf8')

    expect(html).toContain('<html lang="en">')
    expect(html).toContain('class="skip-link"')
    expect(html.match(/<h1\b/g)?.length).toBe(1)
    expect(html).toContain('Agents supply judgment.')
    expect(html).toContain('Beautiflow supplies control.')
    expect(html).toContain('Mermaid diagrams.<span>With your agent.</span>')
    expect(html).toContain('Start with an idea or an existing Mermaid file')
    expect(html).toContain('macOS Apple silicon or Linux x86-64')
    expect(html).toContain('Your first result:')
    expect(html).toContain('order-platform.svg')
    expect(html).toContain('href="#start">Install Beautiflow')
    expect(html).toContain('curl -fsSL https://beautiflow.cc/install.sh | bash')
    expect(html).toContain('beautiflow install-skill')
    expect(html).toContain('Ask your coding agent')
    expect(html).toContain('Use Beautiflow to draw an order platform')
    expect(html).toContain('The CLI is built for agents.')
    expect(html).toContain('no AI subscription or model keys of its own')
    expect(html).toContain('validated plan')
    expect(html).toContain('allows one targeted correction')
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
    expect(html).toContain('Architecture examples and references.')
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
      expect(gallery!.querySelectorAll('.example-row')).toHaveLength(8)
      for (const row of gallery!.querySelectorAll('.example-row')) {
        expect(row.querySelector('.showcase .diagram-caption a')?.getAttribute('href')).toBe(row.querySelector('.art')?.getAttribute('href'))
        expect(row.querySelector('.artifact-links')).not.toBeNull()
      }
    } finally {
      for (const page of pages) page.window.close()
    }
  })

  test('makes all four AWS reference reconstructions discoverable on the Examples page', async () => {
    const dom = new JSDOM(await readFile(resolve(root, 'examples.html'), 'utf8'))
    try {
      const document = dom.window.document
      expect(document.querySelector('.hero-actions a[href="#aws-references"]')).not.toBeNull()
      expect(document.querySelector('#aws-references')).not.toBeNull()
      const rows = [...document.querySelectorAll('.aws-reference')]
      expect(rows).toHaveLength(4)
      const catalogue = JSON.parse(await readFile(resolve(root, 'examples/recipes/aws-reference-architectures/references.json'), 'utf8'))
      for (const [index, entry] of catalogue.references.entries()) {
        const row = rows[index]!
        expect(row.querySelector(`a[href="${entry.url}"]`)).not.toBeNull()
        for (const path of [`sources/${entry.id}.mmd`, `rendered/${entry.id}.svg`, `rendered/${entry.id}.png`, `evidence/${entry.id}.json`]) {
          const href = `examples/recipes/aws-reference-architectures/${path}`
          expect(row.querySelector(`a[href="${href}"]`)).not.toBeNull()
          expect(existsSync(resolve(root, href))).toBe(true)
        }
        expect(row.querySelector('img')!.getAttribute('alt')!.length).toBeGreaterThan(50)
      }
      expect(rows[1]!.textContent).toContain('Partial topology:')
      expect(rows[0]!.textContent).toContain('shared-route findings remain')
      expect(rows[2]!.textContent).toContain('not a chain of HTTP proxies')
      expect(rows[3]!.textContent).toContain('No database replication')
    } finally { dom.window.close() }
  })

  test('generates a source-synchronized HTML diagram gallery with user-facing type names', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'beautiflow-gallery-'))
    const recipe = resolve(root, 'examples/recipes/diagram-types')
    let dom: JSDOM | undefined
    try {
      expect(await buildDiagramGallery(directory)).toBe(23)
      for (const file of ['index.html', 'README.md']) {
        expect(await readFile(resolve(directory, file), 'utf8')).toBe(await readFile(resolve(recipe, file), 'utf8'))
      }
      const html = await readFile(resolve(directory, 'index.html'), 'utf8')
      expect(html).not.toContain('pele-families')
      expect(html).not.toContain('Pele family')
      dom = new JSDOM(html)
      const document = dom.window.document
      expect(document.querySelectorAll('h1')).toHaveLength(1)
      expect(document.querySelector('h1')!.textContent).toBe('Diagram gallery')
      expect(document.querySelector('link[href="../../../site.css"]')?.getAttribute('rel')).toBe('stylesheet')
      expect(document.querySelectorAll('.type-index a')).toHaveLength(23)
      expect(document.querySelectorAll('.diagram-type')).toHaveLength(23)
      expect(document.querySelector('.hero-copy')!.textContent).toContain('All scenarios and data are illustrative')
      expect(document.querySelector('#sankey h3')!.textContent).toBe('Where a sunny day’s energy goes')
      expect(document.querySelector('#journey')!.classList.contains('example-row--wide')).toBe(true)
      expect(document.querySelector('#agentflow figure')!.classList.contains('example-figure--portrait')).toBe(true)
      expect(document.querySelector('#info')).toBeNull()
      expect(document.querySelector('a[href="#info"]')).toBeNull()
      expect(document.querySelector('img[src="rendered/info.svg"]')).toBeNull()
      expect(document.querySelector('.type-coverage')!.textContent).toContain('geometry scores, transformations, sidecars, and automatic polish are not available')
      for (const link of document.querySelectorAll('.type-index a')) {
        expect(document.querySelector(link.getAttribute('href')!)).not.toBeNull()
      }
      for (const row of document.querySelectorAll('.diagram-type')) {
        const source = await readFile(resolve(recipe, `sources/${row.id}.mmd`), 'utf8')
        expect(row.querySelector('pre code')!.textContent).toBe(source.trimEnd())
        expect(row.querySelector('.art')!.getAttribute('href')).toBe(`rendered/${row.id}.svg`)
        expect(row.querySelector('img')!.getAttribute('alt')!.length).toBeGreaterThan(10)
        expect(existsSync(resolve(recipe, row.querySelector('img')!.getAttribute('src')!))).toBe(true)
      }
    } finally {
      dom?.window.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('focuses before-and-after on reproducible improvements within the shared website', async () => {
    const html = await readFile(resolve(root, 'examples/recipes/visual-quality/index.html'), 'utf8')
    const dom = new JSDOM(html)
    try {
      const document = dom.window.document
      expect(document.querySelector('h1')!.textContent).toBe('Before & after')
      expect(document.querySelectorAll('h1')).toHaveLength(1)
      expect(document.querySelector('style')).toBeNull()
      expect(document.querySelector('link[href="../../../site.css"]')).not.toBeNull()
      expect(document.querySelector('header .nav')).not.toBeNull()
      expect(document.querySelector('footer .footer-inner')).not.toBeNull()
      expect(document.querySelector('#architecture')).toBeNull()
      expect(document.querySelector('#cache')).toBeNull()
      expect(document.querySelectorAll('.before-after-row')).toHaveLength(2)
      expect(document.querySelectorAll('.comparison-original summary')).toHaveLength(2)
      expect(html).toContain('79 → 94')
      expect(html).toContain('97 → 97')
      for (const id of ['release', 'job']) {
        expect(document.querySelector(`#${id} .comparison-result img`)!.getAttribute('src')).toBe(`rendered/${id}-after.svg`)
      }
      for (const file of ['architecture.mmd', 'cache.mmd', 'rendered/architecture.svg', 'rendered/cache.svg']) {
        expect(existsSync(resolve(root, 'examples/recipes/visual-quality', file))).toBe(true)
      }
      for (const page of ['index.html', 'examples.html']) {
        expect(await readFile(resolve(root, page), 'utf8')).not.toContain('visual test gallery')
      }
    } finally { dom.window.close() }
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
      await Bun.write(resolve(directory, 'examples/removed-example.html'), 'obsolete generated content')
      await buildSite(directory)
      expect((await siteResponse(new Request('http://localhost/examples/removed-example.html'), directory)).status).toBe(404)
      const links = new Set<string>(['/', '/examples.html', '/examples/recipes/visual-quality/', '/boring-diagrams/', '/dont-break-the-diagram/', '/dont-break-the-diagram/recording/recording.json', '/site.css', '/docs/docs.css', '/docs/docs.js'])
      for (const file of ['index.html', 'examples.html']) {
        const html = await readFile(resolve(directory, file), 'utf8')
        for (const match of html.matchAll(/href="(\/docs\/[^"#]*)"/g)) links.add(match[1]!)
      }
      for (const path of links) {
        const response = await siteResponse(new Request(`http://localhost${path}`), directory)
        expect(response.status).toBe(200)
        expect((await response.text()).length).toBeGreaterThan(100)
      }
      const galleryUrl = 'http://localhost/examples/recipes/diagram-types/'
      const galleryResponse = await siteResponse(new Request(galleryUrl), directory)
      expect(galleryResponse.status).toBe(200)
      expect(galleryResponse.headers.get('Content-Type')).toContain('text/html')
      const galleryHtml = await galleryResponse.text()
      const dom = new JSDOM(galleryHtml)
      try {
        for (const element of dom.window.document.querySelectorAll('[href], img[src]')) {
          const href = element.getAttribute('href') ?? element.getAttribute('src')!
          const url = new URL(href, galleryUrl)
          if (url.origin !== 'http://localhost') continue
          expect((await siteResponse(new Request(url), directory)).status).toBe(200)
        }
      } finally { dom.window.close() }
      const catalogue = JSON.parse(await readFile(resolve(directory, 'boring-diagrams/catalogue.json'), 'utf8'))
      expect(catalogue).toHaveLength(10)
      for (const entry of catalogue) {
        const pageUrl = `http://localhost/boring-diagrams/${entry.id}/`
        const response = await siteResponse(new Request(pageUrl), directory)
        expect(response.status).toBe(200)
        const page = new JSDOM(await response.text())
        try {
          expect(page.window.document.querySelector('.drawing-window')!.getAttribute('data-fit')).toBe('true')
          for (const element of page.window.document.querySelectorAll('[href], img[src], script[src]')) {
            const href = element.getAttribute('href') ?? element.getAttribute('src')!
            const url = new URL(href, pageUrl)
            if (url.origin !== 'http://localhost') continue
            expect((await siteResponse(new Request(url), directory)).status).toBe(200)
          }
        } finally { page.window.close() }
      }
      expect((await siteResponse(new Request('http://localhost/boring-diagrams/aurora'), directory)).status).toBe(308)
      for (const page of ['docs/index.html', 'docs/rendering/index.html']) {
        const html = await readFile(resolve(directory, page), 'utf8')
        expect(html).toContain('href="/docs/diagram-types/"')
        expect(html).toContain('href="/examples.html"')
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
