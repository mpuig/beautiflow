import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const recipe = resolve(root, 'examples/recipes/aws-reference-architectures')
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')

/** Explicit fixture generation with the compiled executable, not a website mutation endpoint. */
export async function buildAwsReferences(binary = resolve(root, 'dist/beautiflow')) {
  const catalogue = await Bun.file(resolve(recipe, 'references.json')).json()
  await mkdir(resolve(recipe, 'rendered'), { recursive: true })
  await mkdir(resolve(recipe, 'evidence'), { recursive: true })
  const version = Bun.spawnSync([binary, 'version'])
  if (version.exitCode) throw new Error('Build the standalone executable first')
  for (const entry of catalogue.references) {
    const input = resolve(recipe, 'sources', `${entry.id}.mmd`)
    for (const format of ['svg', 'png']) {
      const result = Bun.spawnSync([binary, 'render', input, '--theme', 'github-light', '--format', format, '--output', resolve(recipe, 'rendered', `${entry.id}.${format}`)])
      if (result.exitCode) throw new Error(result.stderr.toString())
    }
    const auditResult = Bun.spawnSync([binary, 'audit', input, '--json'])
    const inspectResult = Bun.spawnSync([binary, 'inspect', input, '--json'])
    if (auditResult.exitCode || inspectResult.exitCode) throw new Error('Audit or inspection could not run')
    const audit = JSON.parse(auditResult.stdout.toString())
    const inspection = JSON.parse(inspectResult.stdout.toString())
    if (audit.integrity.issues.length) throw new Error(`Render integrity failed: ${entry.id}`)
    const svg = await readFile(resolve(recipe, 'rendered', `${entry.id}.svg`), 'utf8')
    const evidence = {
      source: `sources/${entry.id}.mmd`, sourceSha256: hash(await readFile(input)),
      svgSha256: hash(svg), pngSha256: hash(await readFile(resolve(recipe, 'rendered', `${entry.id}.png`))),
      executable: { version: version.stdout.toString().trim(), sha256: hash(await readFile(binary)) },
      reference: entry.url, referenceImage: entry.imageUrl,
      geometryAcceptedAsClean: Object.values(audit.metrics).every((value) => value === 0),
      visualReview: { attestedByGenerator: false, note: 'The generator does not perform visual review. See README for the separate manual-review scope and limitations.' },
      audit, inspection,
    }
    await Bun.write(resolve(recipe, 'evidence', `${entry.id}.json`), JSON.stringify(evidence, null, 2) + '\n')
    console.log(`${entry.id}: ${inspection.nodes.length} services; ${JSON.stringify(audit.metrics)}`)
  }
  return catalogue.references.length
}
if (import.meta.main) await buildAwsReferences()
