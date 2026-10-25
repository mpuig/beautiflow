import { cp, mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { safetyPage } from '../dont-break-the-diagram/page.ts'
import type { SafetyRecording } from './record-diagram-safety.ts'

const source = resolve(import.meta.dir, '../dont-break-the-diagram')
/** Assemble previously captured evidence. Never run agent commands during a site build. */
export async function buildDiagramSafety(destination = source) {
  await mkdir(destination, { recursive: true })
  const recording = JSON.parse(await readFile(resolve(source, 'recording/recording.json'), 'utf8')) as SafetyRecording
  if (resolve(destination) !== source) for (const file of ['site.css', 'app.js', 'source.mmd', 'recording']) {
    await cp(resolve(source, file), resolve(destination, file), { recursive: true })
  }
  await Bun.write(resolve(destination, 'index.html'), safetyPage(recording))
  return recording
}
if (import.meta.main) console.log(`Built ${ (await buildDiagramSafety()).cases.length } recorded safety cases`)
