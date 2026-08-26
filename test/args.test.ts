import { describe, expect, test } from 'bun:test'
import { parseArgs } from '../src/args.ts'
import { CliError } from '../src/errors.ts'

describe('parseArgs', () => {
  test('parses an SVG render command', () => {
    expect(parseArgs(['render', 'diagram.mmd'])).toEqual({
      name: 'render',
      request: {
        inputPath: 'diagram.mmd',
        format: 'svg',
        transparent: false,
      },
    })
  })

  test('parses render options', () => {
    expect(
      parseArgs([
        'render',
        'diagram.mmd',
        '--format',
        'ascii',
        '--theme',
        'nord',
        '--transparent',
        '--output',
        '-',
      ]),
    ).toEqual({
      name: 'render',
      request: {
        inputPath: 'diagram.mmd',
        outputPath: '-',
        format: 'ascii',
        themeName: 'nord',
        transparent: true,
      },
    })
  })

  test('parses the zero-config preview server command', () => {
    expect(parseArgs(['server', 'flow.mmd'])).toEqual({ name: 'server', inputPath: 'flow.mmd' })
    expect(() => parseArgs(['server', 'flow.mmd', '--port', '9000'])).toThrow('Unexpected argument')
  })

  test('parses agent inspection and doctor commands', () => {
    expect(parseArgs(['inspect', 'flow.mmd', '--agent', '--json'])).toEqual({
      name: 'inspect', inputPath: 'flow.mmd', agent: true, json: true,
    })
    expect(parseArgs(['inspect', 'flow.mmd'])).toEqual({
      name: 'inspect', inputPath: 'flow.mmd', agent: false, json: false,
    })
    expect(parseArgs(['doctor', '--json'])).toEqual({ name: 'doctor', json: true })
    expect(parseArgs(['doctor', 'flow.mmd'])).toEqual({ name: 'doctor', inputPath: 'flow.mmd', json: false })
  })

  test('parses the simple polish command', () => {
    expect(parseArgs(['polish', 'flow.mmd'])).toEqual({
      name: 'polish', inputPath: 'flow.mmd', dryRun: false, json: false,
    })
    expect(parseArgs(['polish', 'flow.mmd', '--dry-run', '--json'])).toEqual({
      name: 'polish', inputPath: 'flow.mmd', dryRun: true, json: true,
    })
  })

  test('parses a dry-run transform command', () => {
    expect(parseArgs(['transform', 'flow.mmd', '--actions', 'transformations.json', '--dry-run', '--json'])).toEqual({
      name: 'transform',
      inputPath: 'flow.mmd',
      actionsPath: 'transformations.json',
      dryRun: true,
      json: true,
    })
  })

  test('rejects unknown formats', () => {
    expect(() => parseArgs(['render', 'diagram.mmd', '--format', 'pdf'])).toThrow(CliError)
  })
})
