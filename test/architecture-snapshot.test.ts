import { expect, test } from 'bun:test'
import { renderStandaloneOutput } from '../src/diagram/pipeline.ts'

test('architecture snapshots are byte-exact without viewport or geometry tolerances', async () => {
  const inputPath = 'examples/recipes/aws-architecture/sources/step-6-production-architecture.mmd'
  const source = await Bun.file(inputPath).text()
  const request = { inputPath, format: 'svg' as const, transparent: false, themeName: 'github-light' }
  const svg = await renderStandaloneOutput(source, request)
  expect(await renderStandaloneOutput(source, request)).toBe(svg)
  expect(svg).toBe(await Bun.file('examples/recipes/aws-architecture/rendered/step-6-production-architecture.svg').text())
  expect(await renderStandaloneOutput(source.replace('CloudFront', 'Different label'), request)).not.toBe(svg)
})
