import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')

describe('developer landing page', () => {
  test('ships accessible product, CLI, skill, and example content', async () => {
    const html = await readFile(resolve(root, 'index.html'), 'utf8')

    expect(html).toContain('<html lang="en">')
    expect(html).toContain('class="skip-link"')
    expect(html.match(/<h1\b/g)?.length).toBe(1)
    expect(html).toContain('The CLI makes every change reproducible.')
    expect(html).toContain('The Agent Skill adds design judgment.')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('@media (prefers-reduced-motion: reduce)')
  })

  test('references committed local example assets', async () => {
    const html = await readFile(resolve(root, 'index.html'), 'utf8')
    const paths = [...html.matchAll(/(?:src|href)="(examples\/[^"#]+)"/g)].map((match) => match[1]!)

    expect(paths.length).toBeGreaterThanOrEqual(10)
    for (const path of paths) expect(existsSync(resolve(root, path))).toBe(true)
  })

  test('has a GitHub Pages deployment workflow', async () => {
    const workflow = await readFile(resolve(root, '.github/workflows/pages.yml'), 'utf8')

    expect(workflow).toContain('actions/upload-pages-artifact@')
    expect(workflow).toContain('actions/deploy-pages@')
    expect(workflow).toContain('cp index.html install.sh CNAME _site/')
    expect(workflow).toContain('cp -R examples _site/examples')
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
