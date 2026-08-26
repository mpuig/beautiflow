import { describe, expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import packageJson from '../package.json' with { type: 'json' }

const root = resolve(import.meta.dir, '..')

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const paths: string[] = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) paths.push(...await markdownFiles(path))
    else if (entry.name.endsWith('.md')) paths.push(path)
  }
  return paths
}

describe('documentation', () => {
  test('keeps local Markdown links valid', async () => {
    const files = [
      ...await markdownFiles(resolve(root, 'docs')),
      ...await markdownFiles(resolve(root, 'skills/beautiflow')),
      ...((await readdir(root)).filter((name) => name.endsWith('.md')).map((name) => resolve(root, name))),
    ]
    const broken: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1]!.split('#', 1)[0]!
        if (!target || target.includes('://') || target.startsWith('mailto:')) continue
        if (!existsSync(resolve(dirname(file), target))) broken.push(`${file}: ${target}`)
      }
    }

    expect(broken).toEqual([])
  })

  test('builds accessible HTML documentation from canonical Markdown', async () => {
    const output = await mkdtemp(resolve(tmpdir(), 'beautiflow-docs-'))
    try {
      const build = Bun.spawnSync(['bun', 'run', resolve(root, 'scripts/build-docs.ts'), output], { cwd: root })
      expect(build.exitCode).toBe(0)

      const overview = await readFile(resolve(output, 'index.html'), 'utf8')
      const cli = await readFile(resolve(output, 'cli/index.html'), 'utf8')
      expect(overview).toContain('<html lang="en">')
      expect(overview).toContain('class="skip-link"')
      expect(overview).toContain('aria-label="Documentation pages"')
      expect(overview).toContain('href="/docs/architecture/"')
      expect(overview.match(/<h1\b/g)?.length).toBe(1)
      expect(cli).toContain('<title>CLI reference — Beautiflow docs</title>')
      expect(cli).toContain('class="copy-code"')
      expect(cli).not.toMatch(/href="(?!https?:)[^"]+\.md(?:#|\")/)
      expect(existsSync(resolve(output, 'docs.css'))).toBe(true)
      expect(existsSync(resolve(output, 'docs.js'))).toBe(true)
    } finally {
      await rm(output, { recursive: true, force: true })
    }
  })

  test('documents the current agent and production surface', async () => {
    const [readme, cli, skill, site] = await Promise.all([
      readFile(resolve(root, 'README.md'), 'utf8'),
      readFile(resolve(root, 'docs/cli.md'), 'utf8'),
      readFile(resolve(root, 'skills/beautiflow/SKILL.md'), 'utf8'),
      readFile(resolve(root, 'index.html'), 'utf8'),
    ])

    for (const command of ['inspect', 'doctor', 'render', 'server', 'layout', 'polish', 'audit', 'diagnose', 'apply', 'transform', 'install-skill']) {
      expect(cli).toContain(`beautiflow ${command}`)
    }
    expect(readme).toContain('https://beautiflow.cc/install.sh')
    expect(readme).toContain('Sigstore verification bundle')
    expect(skill).toContain('beautiflow inspect <diagram.mmd> --agent --json')
    expect(skill).toContain('One initial operation and at most one targeted correction')
    expect(site).toContain(`"softwareVersion": "${packageJson.version}"`)
    expect(site).not.toMatch(/\d+ tests · \d+ assertions/)
  })
})
