import { CliError } from './errors.ts'
import { OUTPUT_FORMATS, type OutputFormat, type RenderRequest } from './types.ts'

export type SkillTarget = 'agents' | 'pi' | 'claude' | 'codex'

export type Command =
  | { name: 'help' }
  | { name: 'version' }
  | { name: 'themes' }
  | { name: 'render'; request: RenderRequest }
  | { name: 'server'; inputPath: string }
  | { name: 'inspect'; inputPath: string; json: boolean; agent: boolean }
  | { name: 'doctor'; inputPath?: string; json: boolean }
  | { name: 'layout'; inputPath: string; candidates: number; json: boolean }
  | { name: 'polish'; inputPath: string; dryRun: boolean; json: boolean }
  | { name: 'audit'; inputPath: string; json: boolean }
  | { name: 'diagnose'; inputPath: string; json: boolean }
  | { name: 'apply'; inputPath: string; actionsPath: string; dryRun: boolean; json: boolean }
  | { name: 'transform'; inputPath: string; actionsPath: string; dryRun: boolean; json: boolean }
  | { name: 'install-skill'; target: SkillTarget; local: boolean }

const FORMAT_SET = new Set<string>(OUTPUT_FORMATS)
const SKILL_TARGETS = new Set<string>(['agents', 'pi', 'claude', 'codex'])

function valueAfter(args: string[], index: number, flag: string): string {
  const value = args[index + 1]
  if (!value || (value.startsWith('-') && value !== '-')) {
    throw new CliError(`${flag} requires a value`, 2)
  }
  return value
}

function parseFormat(value: string): OutputFormat {
  if (!FORMAT_SET.has(value)) {
    throw new CliError(`Unknown format "${value}". Expected: ${OUTPUT_FORMATS.join(', ')}`, 2)
  }
  return value as OutputFormat
}

function parseServer(args: string[]): Command {
  if (!args[0]) throw new CliError('Missing Mermaid input file', 2)
  if (args[0].startsWith('-')) throw new CliError(`Unknown option: ${args[0]}`, 2)
  if (args.length > 1) throw new CliError(`Unexpected argument: ${args[1]}`, 2)
  return { name: 'server', inputPath: args[0] }
}

function parseRender(args: string[]): Command {
  let inputPath: string | undefined
  let outputPath: string | undefined
  let format: OutputFormat = 'svg'
  let themeName: string | undefined
  let transparent = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === '--format' || arg === '-f') {
      format = parseFormat(valueAfter(args, index, arg)); index += 1
    } else if (arg === '--output' || arg === '-o') {
      outputPath = valueAfter(args, index, arg); index += 1
    } else if (arg === '--theme' || arg === '-t') {
      themeName = valueAfter(args, index, arg); index += 1
    } else if (arg === '--transparent') {
      transparent = true
    } else if (arg === '--help' || arg === '-h') {
      return { name: 'help' }
    } else if (arg.startsWith('-')) {
      throw new CliError(`Unknown option: ${arg}`, 2)
    } else if (inputPath) {
      throw new CliError(`Unexpected argument: ${arg}`, 2)
    } else {
      inputPath = arg
    }
  }

  if (!inputPath) throw new CliError('Missing Mermaid input file', 2)
  return {
    name: 'render',
    request: {
      inputPath,
      format,
      transparent,
      ...(outputPath ? { outputPath } : {}),
      ...(themeName ? { themeName } : {}),
    },
  }
}

function parseInputCommand(name: 'inspect' | 'audit' | 'diagnose', args: string[]): Command {
  let inputPath: string | undefined
  let json = false
  let agent = false
  for (const arg of args) {
    if (arg === '--json') json = true
    else if (arg === '--agent' && name === 'inspect') agent = true
    else if (arg.startsWith('-')) throw new CliError(`Unknown option: ${arg}`, 2)
    else if (inputPath) throw new CliError(`Unexpected argument: ${arg}`, 2)
    else inputPath = arg
  }
  if (!inputPath) throw new CliError('Missing Mermaid input file', 2)
  if (name === 'inspect') return { name, inputPath, json, agent }
  return { name, inputPath, json }
}

function parseDoctor(args: string[]): Command {
  let inputPath: string | undefined
  let json = false
  for (const arg of args) {
    if (arg === '--json') json = true
    else if (arg.startsWith('-')) throw new CliError(`Unknown option: ${arg}`, 2)
    else if (inputPath) throw new CliError(`Unexpected argument: ${arg}`, 2)
    else inputPath = arg
  }
  return { name: 'doctor', ...(inputPath ? { inputPath } : {}), json }
}

function parsePolish(args: string[]): Command {
  let inputPath: string | undefined
  let dryRun = false
  let json = false
  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--json') json = true
    else if (arg.startsWith('-')) throw new CliError(`Unknown option: ${arg}`, 2)
    else if (inputPath) throw new CliError(`Unexpected argument: ${arg}`, 2)
    else inputPath = arg
  }
  if (!inputPath) throw new CliError('Missing Mermaid input file', 2)
  return { name: 'polish', inputPath, dryRun, json }
}

function parseLayout(args: string[]): Command {
  let inputPath: string | undefined
  let candidates = 5
  let json = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === '--json') json = true
    else if (arg === '--candidates') {
      const value = Number(valueAfter(args, index, arg)); index += 1
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new CliError('--candidates must be an integer from 1 to 5', 2)
      }
      candidates = value
    } else if (arg.startsWith('-')) throw new CliError(`Unknown option: ${arg}`, 2)
    else if (inputPath) throw new CliError(`Unexpected argument: ${arg}`, 2)
    else inputPath = arg
  }
  if (!inputPath) throw new CliError('Missing Mermaid input file', 2)
  return { name: 'layout', inputPath, candidates, json }
}

function parseActionCommand(name: 'apply' | 'transform', args: string[]): Command {
  let inputPath: string | undefined
  let actionsPath: string | undefined
  let dryRun = false
  let json = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === '--actions') {
      actionsPath = valueAfter(args, index, arg); index += 1
    } else if (arg === '--dry-run') dryRun = true
    else if (arg === '--json') json = true
    else if (arg.startsWith('-')) throw new CliError(`Unknown option: ${arg}`, 2)
    else if (inputPath) throw new CliError(`Unexpected argument: ${arg}`, 2)
    else inputPath = arg
  }
  if (!inputPath) throw new CliError('Missing Mermaid input file', 2)
  if (!actionsPath) throw new CliError('Missing --actions <file>', 2)
  return { name, inputPath, actionsPath, dryRun, json }
}

function parseInstallSkill(args: string[]): Command {
  let target: SkillTarget = 'agents'
  let local = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === '--local') local = true
    else if (arg === '--target') {
      const value = valueAfter(args, index, arg); index += 1
      if (!SKILL_TARGETS.has(value)) throw new CliError(`Unknown skill target: ${value}`, 2)
      target = value as SkillTarget
    } else throw new CliError(`Unknown option: ${arg}`, 2)
  }
  return { name: 'install-skill', target, local }
}

export function parseArgs(args: string[]): Command {
  const [command, ...rest] = args
  if (!command || command === 'help' || command === '--help' || command === '-h') return { name: 'help' }
  if (command === 'version' || command === '--version' || command === '-v') return { name: 'version' }
  if (command === 'themes') {
    if (rest.length) throw new CliError(`Unexpected argument: ${rest[0]}`, 2)
    return { name: 'themes' }
  }
  if (command === 'render') return parseRender(rest)
  if (command === 'server') return parseServer(rest)
  if (command === 'inspect' || command === 'audit' || command === 'diagnose') return parseInputCommand(command, rest)
  if (command === 'doctor') return parseDoctor(rest)
  if (command === 'layout') return parseLayout(rest)
  if (command === 'polish') return parsePolish(rest)
  if (command === 'apply' || command === 'transform') return parseActionCommand(command, rest)
  if (command === 'install-skill') return parseInstallSkill(rest)
  throw new CliError(`Unknown command: ${command}`, 2)
}
