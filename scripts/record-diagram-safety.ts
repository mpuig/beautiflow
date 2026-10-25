import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dir, '..')
export const sha256 = (text: string | Uint8Array) => createHash('sha256').update(text).digest('hex')
export interface ReplayStep {
  name: string
  command: string | null
  exitCode: number | null
  output: Record<string, any> | null
  receipt: Record<string, any> | null
  source: string
  hash: string
  diagram: string
}
export interface ReplayCase { id: string; title: string; description: string; outcome: string; steps: ReplayStep[] }
export interface SafetyRecording {
  format: 1; recordedAt: string; version: string; executableSha256: string
  provenance: string; cases: ReplayCase[]
}

/** Explicit recording command only. The static site build never runs mutations. */
export async function recordDiagramSafety(destination = resolve(root, 'dont-break-the-diagram/recording'), binary = resolve(root, 'dist/beautiflow')) {
  const directory = await mkdtemp(join(tmpdir(), 'beautiflow-safety-'))
  const initial = await readFile(resolve(root, 'dont-break-the-diagram/source.mmd'), 'utf8')
  const cases: ReplayCase[] = []
  const definitions = [
    ['safe', 'Make a supported edit', 'Rename the API identifier and label. Keep the comment, group membership, explicit graphical ports and relationships.', 'complete'],
    ['unsafe', 'Refuse an injected statement', 'A label tries to close its bracket and insert a new service. Validation refuses the action before writing a receipt or source.', 'blocked'],
    ['stale', 'Keep the newer source', 'After planning, a simulated collaborator adds a source comment. Commit refuses the outdated plan and preserves that edit.', 'stale'],
    ['rollback', 'Restore the original bytes', 'Apply and verify the rename, then explicitly restore the original snapshot. Compare the full SHA-256, not just the picture.', 'rolled-back'],
  ] as const
  await mkdir(destination, { recursive: true })
  try {
    const version = Bun.spawnSync([binary, 'version'])
    if (version.exitCode !== 0) throw new Error('Compiled binary version check failed')
    for (const [id, title, description, outcome] of definitions) {
      const work = join(directory, id)
      const out = join(destination, id)
      await mkdir(work); await mkdir(out, { recursive: true })
      await writeFile(join(work, 'source.mmd'), initial)
      const actions = { actions: [{ type: 'architecture-rename', id: 'api', newId: 'gateway', label: id === 'unsafe' ? 'unsafe]\nservice surprise(server)[Oops' : 'Tenant API' }] }
      await writeFile(join(work, 'actions.json'), JSON.stringify(actions, null, 2) + '\n')
      await cp(join(work, 'actions.json'), join(out, 'actions.json'))
      await writeFile(join(out, 'original.mmd'), initial)
      const steps: ReplayStep[] = []
      const snapshot = async (name: string, command: string | null, exitCode: number | null, output: Record<string, any> | null) => {
        const source = await readFile(join(work, 'source.mmd'), 'utf8')
        const receiptFile = Bun.file(join(work, 'receipt.json'))
        const receipt = await receiptFile.exists() ? await receiptFile.json() : null
        const diagram = `${id}/step-${steps.length}.svg`
        const rendered = Bun.spawnSync([binary, 'render', 'source.mmd', '--output', join(destination, diagram)], { cwd: work })
        if (rendered.exitCode !== 0) throw new Error(rendered.stderr.toString())
        const step = { name, command, exitCode, output, receipt, source, hash: sha256(source), diagram }
        await writeFile(join(out, `step-${steps.length}.mmd`), source)
        await writeFile(join(out, `step-${steps.length}.json`), JSON.stringify(step, null, 2) + '\n')
        steps.push(step)
      }
      const run = async (name: string, args: string[], expectedExit = 0) => {
        const result = Bun.spawnSync([binary, ...args, '--json'], { cwd: work })
        if (result.exitCode !== expectedExit) throw new Error(`${id}/${name}: ${result.stdout.toString()} ${result.stderr.toString()}`)
        await snapshot(name, `beautiflow ${[...args, '--json'].join(' ')}`, result.exitCode, JSON.parse(result.stdout.toString()))
      }
      await snapshot('Original source', null, null, null)
      await run(id === 'unsafe' ? 'Plan refused' : 'Plan validated', ['agent', 'plan', 'source.mmd', '--operation', 'transform', '--actions', 'actions.json', '--receipt', 'receipt.json'], id === 'unsafe' ? 2 : 0)
      if (id === 'stale') {
        await writeFile(join(work, 'source.mmd'), initial + '%% Collaborator: review tenant policy before release.\n')
        await snapshot('Collaborator edits source', "printf '%s\\n' '%% Collaborator: review tenant policy before release.' >> source.mmd", null, null)
        await run('Commit refused', ['agent', 'commit', '--receipt', 'receipt.json'], 2)
      } else if (id !== 'unsafe') {
        await run('Edit applied', ['agent', 'commit', '--receipt', 'receipt.json'])
        await run('Mechanically verified', ['agent', 'verify', '--receipt', 'receipt.json'])
        if (id === 'safe') await run('Finished without visual attestation', ['agent', 'finish', '--receipt', 'receipt.json'])
        else await run('Snapshot restored', ['agent', 'rollback', '--receipt', 'receipt.json'])
      }
      const last = steps.at(-1)!
      if ((last.receipt?.state ?? last.output?.state) !== outcome) throw new Error(`Unexpected terminal state: ${id}`)
      if (id === 'rollback' && last.source !== initial) throw new Error('Rollback did not restore exact source bytes')
      if (id === 'unsafe' && (last.source !== initial || last.receipt !== null)) throw new Error('Unsafe planning wrote source or receipt')
      if (id === 'stale' && last.source !== steps.at(-2)!.source) throw new Error('Stale commit overwrote collaborator')
      const commands = steps.flatMap((step) => step.command ? [step.command] : [])
      await writeFile(join(out, 'reproduce.sh'), `#!/bin/sh\n# Run in a NEW directory with original.mmd and actions.json downloaded here.\n# Requires Beautiflow ${version.stdout.toString().trim().replace('beautiflow ', '')}.\nset -eu\ncp original.mmd source.mmd\n${commands.map((command) => command.includes('plan') && id === 'unsafe' || command.includes('agent commit') && id === 'stale' ? `# Expected rejection: exit 2.\nset +e\n${command}\nstatus=$?\nset -e\n[ "$status" -eq 2 ] || exit 1` : command).join('\n')}\n`)
      cases.push({ id, title, description, outcome, steps })
    }
    const recording: SafetyRecording = {
      format: 1, recordedAt: new Date().toISOString(), version: version.stdout.toString().trim(),
      executableSha256: sha256(await readFile(binary)),
      provenance: 'Real compiled-CLI executions in disposable local directories. Outputs and receipt snapshots are unmodified; absolute paths identify the recording workspace, not a portable receipt. Illustrative hotel system; no visual attestation or deployed AWS validation.', cases,
    }
    await writeFile(join(destination, 'recording.json'), JSON.stringify(recording, null, 2) + '\n')
    return recording
  } finally { await rm(directory, { recursive: true, force: true }) }
}
if (import.meta.main) {
  const recording = await recordDiagramSafety()
  console.log(`Recorded ${recording.cases.length} cases using ${recording.version}`)
}
