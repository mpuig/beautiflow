import { mkdir } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'

const repository = resolve(import.meta.dir, '..')
const outputPath = resolve(repository, process.argv[2] ?? 'dist/diagram-contact-sheet.html')
const tracked = Bun.spawnSync(['git', 'ls-files', 'examples/**/*.svg'], { cwd: repository })
if (tracked.exitCode !== 0) throw new Error('Could not enumerate committed SVG fixtures')
const files = new TextDecoder().decode(tracked.stdout).trim().split('\n').filter(Boolean).sort()

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

const figures: string[] = []
for (const path of files) {
  const source = await Bun.file(resolve(repository, path)).text()
  for (const required of ['role="img"', '<title', '<desc']) {
    if (!source.includes(required)) throw new Error(`${path} is missing ${required}`)
  }
  const href = relative(dirname(outputPath), resolve(repository, path)).replaceAll('\\', '/')
  const label = basename(path, '.svg').replaceAll('-', ' ')
  figures.push(`<figure><a href="${escapeHtml(href)}"><img src="${escapeHtml(href)}" alt="" loading="lazy"></a><figcaption>${escapeHtml(label)}</figcaption></figure>`)
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beautiflow diagram contact sheet</title><style>
:root{font-family:system-ui,sans-serif;color:#20231f;background:#f7f8f5}body{margin:0;padding:32px}h1{font-size:24px;margin:0 0 8px}p{color:#70766d;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}figure{margin:0;border:1px solid #dfe3dc;background:white}a{display:grid;place-items:center;min-height:240px;padding:16px}img{display:block;max-width:100%;max-height:320px}figcaption{padding:10px 14px;border-top:1px solid #dfe3dc;font-size:12px;text-transform:capitalize}
</style></head><body><h1>Beautiflow diagram contact sheet</h1><p>${files.length} committed SVG fixtures · generated for release review</p><main class="grid">${figures.join('')}</main></body></html>`

await mkdir(dirname(outputPath), { recursive: true })
await Bun.write(outputPath, html)
console.log(`Built contact sheet with ${files.length} diagrams at ${outputPath}`)
