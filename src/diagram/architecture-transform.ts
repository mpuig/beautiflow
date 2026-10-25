import { CliError } from '../errors.ts'
import { readFile, lstat, writeFile, rename, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

export async function writeArchitectureSource(path: string, source: string, expected: string): Promise<void> {
  const status = await lstat(path)
  if (!status.isFile()) throw new CliError('Atomic architecture transforms require a regular source file, not a symbolic link', 2)
  if (await readFile(path, 'utf8') !== expected) throw new CliError('Architecture source changed during validation', 2, 'STALE_INPUT')
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, source, { flag: 'wx', mode: status.mode })
    await rename(temporary, path)
  } finally { await rm(temporary, { force: true }) }
}
import { architectureModel } from './pele.ts'
import { auditArchitecture, inspectArchitecture } from './architecture-analysis.ts'

export type ArchitectureAction =
  | { type: 'architecture-rename'; id: string; newId?: string; label?: string }
  | { type: 'architecture-move'; id: string; group: string }
  | { type: 'architecture-add-edge'; source: string; target: string; sourcePort: Port; targetPort: Port; label?: string }
  | { type: 'architecture-reconnect-edge'; source: string; target: string; newSource: string; newTarget: string; sourcePort: Port; targetPort: Port }
type Port = 'L' | 'R' | 'T' | 'B'
const kinds = new Set(['architecture-rename', 'architecture-move', 'architecture-add-edge', 'architecture-reconnect-edge'])
export function isArchitectureAction(value: unknown): boolean { return !!value && typeof value === 'object' && kinds.has(String((value as { type?: unknown }).type)) }
export function parseArchitectureActions(value: unknown): ArchitectureAction[] {
  const actions = (value as { actions?: unknown })?.actions
  if (!Array.isArray(actions) || !actions.length) throw new CliError('Expected non-empty architecture actions array', 2)
  return actions.map(parseArchitectureAction)
}
export function parseArchitectureAction(value: unknown): ArchitectureAction {
  if (!isArchitectureAction(value)) throw new CliError('Unsupported architecture transformation', 2)
  const input = value as Record<string, unknown>
  const type = input.type as ArchitectureAction['type']
  const allowed: Record<string, string[]> = {
    'architecture-rename': ['id', 'newId', 'label'], 'architecture-move': ['id', 'group'],
    'architecture-add-edge': ['source', 'target', 'sourcePort', 'targetPort', 'label'],
    'architecture-reconnect-edge': ['source', 'target', 'newSource', 'newTarget', 'sourcePort', 'targetPort'],
  }
  for (const key of Object.keys(input)) if (key !== 'type' && !allowed[type]!.includes(key)) throw new CliError(`Unknown architecture field: ${key}`, 2)
  for (const key of allowed[type]!) {
    if ((key === 'newId' || key === 'label') && input[key] === undefined) continue
    const text = input[key]
    if (typeof text !== 'string' || !text.trim().length || (key.endsWith('Port') ? !/^[LRTB]$/.test(text) : key === 'label' ? /[\[\]\r\n<>"{}]/.test(text) : !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(text))) throw new CliError(`Invalid ${type}.${key}`, 2)
  }
  if (type === 'architecture-rename' && !input.newId && !input.label) throw new CliError('Architecture rename requires newId or label', 2)
  return input as unknown as ArchitectureAction
}

function signature(model: ReturnType<typeof architectureModel>): string {
  return JSON.stringify({ nodes: [...model.nodes.values()].sort((a, b) => a.id.localeCompare(b.id)), groups: [...model.groups.values()].sort((a, b) => a.id.localeCompare(b.id)), edges: model.edges, hints: model.layoutHints, title: model.title, accTitle: model.accTitle, accDescr: model.accDescr })
}

// Only patch fully understood statements. Unrecognized source is never serialized
// from a reduced model, nor changed with a global identifier replacement.
export function transformArchitecture(source: string, rawActions: unknown[]) {
  const actions = rawActions.map(parseArchitectureAction)
  const before = auditArchitecture(source)
  let result = source
  for (const action of actions) {
    const model = architectureModel(result)
    const expected = structuredClone(model)
    const lines = result.split(/(?<=\n)/)
    const first = lines.findIndex((line) => line.trim().length > 0)
    const frontmatterEnd = lines[first]?.trim() === '---' ? lines.findIndex((line, i) => i > first && line.trim() === '---') : -1
    const header = lines.findIndex((line, i) => i > frontmatterEnd && /^\s*architecture(?:-beta)?\s*$/.test(line))
    if (header < 0) throw new CliError('Cannot safely locate architecture body', 2)
    const statements = new Set<number>()
    let description = false
    for (let i = header + 1; i < lines.length; i++) {
      const line = lines[i]!
      if (/^\s*accDescr\s*\{/.test(line)) { description = !/\}/.test(line); continue }
      if (description) { if (/^\s*\}/.test(line)) description = false; continue }
      if (!/^\s*(?:%%|accTitle\s*:|accDescr\s*:|title\s*:)/.test(line)) statements.add(i)
    }
    const requireNode = (id: string) => { if (!model.nodes.has(id)) throw new CliError(`Unknown architecture service/junction: ${id}`, 2) }
    if (action.type === 'architecture-rename' || action.type === 'architecture-move') {
      const item = expected.nodes.get(action.id) ?? expected.groups.get(action.id)
      if (!item) throw new CliError(`Unknown architecture element: ${action.id}`, 2)
      let declaration = -1
      for (const [i, line] of lines.entries()) if (statements.has(i) && new RegExp(`^\\s*(?:service|group|junction)\\s+${action.id}(?=[\\s(\\[])`).test(line)) { if (declaration >= 0) throw new CliError('Ambiguous architecture declaration', 2); declaration = i }
      if (declaration < 0) throw new CliError('Cannot safely locate architecture declaration', 2)
      if (action.type === 'architecture-move') {
        if (!expected.groups.has(action.group) || action.group === action.id) throw new CliError('Invalid destination architecture group', 2)
        item.in = action.group
        const line = lines[declaration]!
        if (/%%/.test(line)) throw new CliError('Cannot safely move a declaration with inline comments', 2)
        lines[declaration] = line.replace(/(?:\s+in\s+[\w-]+)?(\s*)$/, ` in ${action.group}$1`)
      } else {
        if (action.label !== undefined) {
          if ((item as { type?: string }).type === 'junction') throw new CliError('Junctions do not support labels', 2)
          ;(item as { title?: string }).title = action.label
          if (!/\[[^\]]*\]/.test(lines[declaration]!)) throw new CliError('Cannot safely locate architecture label', 2)
          lines[declaration] = lines[declaration]!.replace(/\[[^\]]*\]/, () => `[${action.label}]`)
        }
        if (action.newId && action.newId !== action.id) {
          if (model.nodes.has(action.newId) || model.groups.has(action.newId)) throw new CliError('Architecture ID already exists', 2)
          const next = action.newId
          const map = expected.nodes.has(action.id) ? expected.nodes : expected.groups
          map.delete(action.id); item.id = next
          // Map value types differ only by their family discriminator.
          ;(map as Map<string, typeof item>).set(next, item)
          for (const node of [...expected.nodes.values(), ...expected.groups.values()]) if (node.in === action.id) node.in = next
          for (const edge of expected.edges) { if (edge.lhsId === action.id) edge.lhsId = next; if (edge.rhsId === action.id) edge.rhsId = next }
          for (const hint of expected.layoutHints) hint.members = hint.members.map((id) => id === action.id ? next : id)
          for (const [i, line] of lines.entries()) {
            if (!statements.has(i)) continue
            let patched = line.replace(new RegExp(`^(\\s*(?:service|group|junction)\\s+)${action.id}(?=[\\s(\\[])`), `$1${next}`)
              .replace(new RegExp(`(\\s+in\\s+)${action.id}(\\s*)$`), `$1${next}$2`)
            if (/^\s*align\s+(row|column)\s+/.test(line)) patched = patched.replace(/\b[\w-]+\b/g, (token) => token === action.id ? next : token)
            if (/^\s*[\w-]+(?:\{group\})?\s*:/.test(line)) patched = patched.replace(new RegExp(`^(\\s*)${action.id}(?=\\s*(?:\\{group\\})?\\s*:)`), `$1${next}`)
              .replace(new RegExp(`(:\\s*)${action.id}(\\s*)$`), `$1${next}$2`)
            lines[i] = patched
          }
        }
      }
    } else {
      requireNode(action.source); requireNode(action.target)
      if (action.type === 'architecture-add-edge') {
        // Reparse the appended statement to obtain Pele's canonical edge fields.
        const statement = `${action.source}:${action.sourcePort} ${action.label ? `-[${action.label}]->` : '-->'} ${action.targetPort}:${action.target}\n`
        const appended = result.replace(/\s*$/, '\n') + statement
        expected.edges.push(architectureModel(appended).edges.at(-1)!)
        lines.push((result.endsWith('\n') ? '' : '\n') + statement)
      } else {
        requireNode(action.newSource); requireNode(action.newTarget)
        const matches = model.edges.filter((edge) => edge.lhsId === action.source && edge.rhsId === action.target)
        if (matches.length !== 1) throw new CliError('Architecture reconnect requires one unambiguous relationship', 2)
        const index = model.edges.indexOf(matches[0]!)
        const candidates = lines.map((line, i) => statements.has(i) && new RegExp(`^\\s*${action.source}\\s*:[LRTB]\\s+.*[LRTB]:\\s*${action.target}\\s*$`).test(line) ? i : -1).filter((i) => i >= 0)
        if (candidates.length !== 1 || matches[0]!.lhsGroup || matches[0]!.rhsGroup) throw new CliError('Cannot safely patch this architecture relationship', 2)
        const i = candidates[0]!
        lines[i] = lines[i]!.replace(new RegExp(`^(\\s*)${action.source}\\s*:[LRTB]`), `$1${action.newSource}:${action.sourcePort}`)
          .replace(new RegExp(`[LRTB]:\\s*${action.target}(\\s*)$`), `${action.targetPort}:${action.newTarget}$1`)
        const edge = expected.edges[index]!
        edge.lhsId = action.newSource; edge.rhsId = action.newTarget; edge.lhsDir = action.sourcePort; edge.rhsDir = action.targetPort
      }
    }
    const candidate = lines.join('')
    if (signature(architectureModel(candidate)) !== signature(expected)) throw new CliError('Architecture edit rejected: source patch does not match the intended semantic change', 2)
    result = candidate
  }
  const audit = auditArchitecture(result)
  const metricRegression = (Object.keys(audit.metrics) as Array<keyof typeof audit.metrics>).some((key) => audit.metrics[key] > before.metrics[key])
  if (audit.score < before.score || metricRegression || audit.integrity.issues.some((issue) => issue.severity === 'high')) throw new CliError('Architecture edit rejected: measured geometry or render integrity regressed', 2)
  return { source: result, actionsApplied: actions.length, before, audit, semantic: inspectArchitecture(result) }
}
