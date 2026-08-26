import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const path = resolve('node_modules/jsdom/lib/jsdom/living/xhr/XMLHttpRequest-impl.js')
const original = 'const syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;'
const replacement = 'const syncWorkerFile = null; // Beautiflow never uses synchronous XHR; keep standalone builds asset-free.'
const source = await readFile(path, 'utf8')

if (source.includes(replacement)) process.exit(0)
if (!source.includes(original)) throw new Error(`Unsupported JSDOM XMLHttpRequest implementation at ${path}`)
await writeFile(path, source.replace(original, replacement))
