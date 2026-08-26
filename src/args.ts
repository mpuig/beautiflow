import { CliError } from './errors.ts'
import { OUTPUT_FORMATS, type OutputFormat, type RenderRequest } from './types.ts'

export type SkillTarget = 'agents' | 'pi' | 'claude' | 'codex'
export type AgentMutationOperation = 'polish' | 'apply' | 'transform'

export type Command =
  | { name: 'help' }
  | { name: 'version' }
  | { name: 'themes' }
  | { name: 'render'; request: RenderRequest }
  | { name: 'server'; inputPath: string }
  | { name: 'inspect'; inputPath: string; json: boolean; agent: boolean }
  | { name: 'doctor'; inputPath?: string; json: boolean }
  | { name: 'schema'; json: boolean }
  | { name: 'agent'; action: 'plan'; inputPath: string; operation: AgentMutationOperation; actionsPath?: string; receiptPath?: string; json: boolean }
  | { name: 'agent'; action: 'commit' | 'verify' | 'rollback'; receiptPath: string; json: boolean }
  | { name: 'agent'; action: 'finish'; receiptPath: string; visualInspected: boolean; json: boolean }
  | { name: 'agent'; action: 'correct'; receiptPath: string; operation: 'apply' | 'transform'; actionsPath: string; json: boolean }
  | { name: 'layout'; inputPath: string; candidates: number; json: boolean }
  | { name: 'polish'; inputPath: string; dryRun: boolean; json: boolean }
  | { name: 'audit'; inputPath: string; json: boolean }
  | { name: 'diagnose'; inputPath: string; json: boolean }
  | { name: 'apply'; inputPath: string; actionsPath: string; dryRun: boolean; json: boolean }
  | { name: 'transform'; inputPath: string; actionsPath: string; dryRun: boolean; json: boolean }
  | { name: 'install-skill'; target: SkillTarget; local: boolean }

const FORMAT_SET = new Set<string>(OUTPUT_FORMATS)
const SKILL_TARGETS = new Set<string>(['agents', 'pi', 'claude', 'codex'])
const AGENT_OPERATIONS = new Set<string>(['polish', 'apply', 'transform'])

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

function parseAgent(args: string[]): Command {
  const [action, ...rest] = args
  if (!action || !['plan', 'commit', 'verify', 'correct', 'finish', 'rollback'].includes(action)) {
    throw new CliError('agent expects plan, commit, verify, correct, finish, or rollback', 2)
  }
  let inputPath: string | undefined
  let operation: AgentMutationOperation | undefined
  let actionsPath: string | undefined
  let receiptPath: string | undefined
  let json = false
  let visualInspected = false
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]!
    if (arg === '--operation') {
      const value = valueAfter(rest, index, arg); index += 1
      if (!AGENT_OPERATIONS.has(value)) throw new CliError(`Unknown agent operation: ${value}`, 2)
      operation = value as AgentMutationOperation
    } else if (arg === '--actions') { actionsPath = valueAfter(rest, index, arg); index += 1 }
    else if (arg === '--receipt') { receiptPath = valueAfter(rest, index, arg); index += 1 }
    else if (arg === '--visual-inspected') visualInspected = true
    else if (arg === '--json') json = true
    else if (arg.startsWith('-')) throw new CliError(`Unknown option: ${arg}`, 2)
    else if (inputPath) throw new CliError(`Unexpected argument: ${arg}`, 2)
    else inputPath = arg
  }
  if (action === 'plan') {
    if (!inputPath) throw new CliError('agent plan requires a Mermaid input file', 2)
    if (!operation) throw new CliError('agent plan requires --operation <polish|apply|transform>', 2)
    if (operation !== 'polish' && !actionsPath) throw new CliError(`agent plan ${operation} requires --actions <file>`, 2)
    return { name: 'agent', action, inputPath, operation, ...(actionsPath ? { actionsPath } : {}), ...(receiptPath ? { receiptPath } : {}), json }
  }
  if (!receiptPath) throw new CliError(`agent ${action} requires --receipt <file>`, 2)
  if (action === 'correct') {
    if (operation !== 'apply' && operation !== 'transform') throw new CliError('agent correct requires --operation <apply|transform>', 2)
    if (!actionsPath) throw new CliError('agent correct requires --actions <file>', 2)
    return { name: 'agent', action, receiptPath, operation, actionsPath, json }
  }
  if (action === 'finish') return { name: 'agent', action, receiptPath, visualInspected, json }
  return { name: 'agent', action: action as 'commit' | 'verify' | 'rollback', receiptPath, json }
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
  if (command === 'schema') {
    if (rest.some((arg) => arg !== '--json')) throw new CliError(`Unknown option: ${rest.find((arg) => arg !== '--json')}`, 2)
    return { name: 'schema', json: rest.includes('--json') }
  }
  if (command === 'agent') return parseAgent(rest)
  if (command === 'layout') return parseLayout(rest)
  if (command === 'polish') return parsePolish(rest)
  if (command === 'apply' || command === 'transform') return parseActionCommand(command, rest)
  if (command === 'install-skill') return parseInstallSkill(rest)
  throw new CliError(`Unknown command: ${command}`, 2)
}
