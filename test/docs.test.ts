import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
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
