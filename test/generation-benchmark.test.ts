import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyGeneration, type GenerationRun } from '../scripts/generation-benchmark.ts'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

test('benchmark requires semantics and hash-bound visual evidence without modifying the candidate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'beautiflow-benchmark-'))
  directories.push(directory)
  const path = join(directory, 'diagram.mmd')
  const source = 'flowchart LR\n alpha[Browser] --> beta[API]\n'
  await Bun.write(path, source)
  const task = { id: 'test', prompt: 'Browser calls API', nodes: { browser: ['Browser'], api: ['API'] }, edges: [{ source: 'browser', target: 'api' }] }
  const run: GenerationRun = { agent: 'test', model: 'fixture-not-a-model-run', commit: 'test', skillSha256: 'a'.repeat(64), attempt: 1 }
  const unreviewed = await verifyGeneration(task, path, run)
  expect(unreviewed.semantic.passed).toBe(true)
  expect(unreviewed.geometry.passed).toBe(true)
  expect(unreviewed.firstPassUsable).toBe(false)
  run.visualReview = { status: 'passed', reviewer: 'test-only-attestation', artifactSha256: unreviewed.artifactSha256, defects: [] }
  expect((await verifyGeneration(task, path, run)).firstPassUsable).toBe(true)
  expect((await verifyGeneration({ ...task, edges: [{ source: 'api', target: 'browser' }] }, path, run)).semantic.passed).toBe(false)
  expect((await verifyGeneration({ ...task, edges: [{ source: 'browser', target: 'api', labels: ['Required'] }] }, path, run)).semantic.passed).toBe(false)
  run.visualReview.artifactSha256 = 'b'.repeat(64)
  expect((await verifyGeneration(task, path, run)).firstPassUsable).toBe(false)
  expect(await Bun.file(path).text()).toBe(source)
  expect((await verifyGeneration({ ...task, nodes: { ...task.nodes, missing: ['Missing'] } }, path, run)).semantic.passed).toBe(false)
  expect((await verifyGeneration({ ...task, nodes: { ...task.nodes, duplicate: ['Browser'] } }, path, run)).semantic.passed).toBe(false)
  await expect(verifyGeneration(task, path, { ...run, attempt: 2 })).rejects.toThrow('attempt 1')
})
