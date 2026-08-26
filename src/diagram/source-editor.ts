import { CliError } from '../errors.ts'
import type { DiagramProject, MermaidEdge, MermaidNode, NodeShape } from './model.ts'
import type { TransformAction } from './transform.ts'

type Graph = DiagramProject['graph']

const OPERATOR = /(<-->|<-.->|<==>|-->|-.->|==>|---|-\.-|===|<--|<-\.-|<==)/

interface SourceEdgeLine {
  index: number
  indent: string
  left: string
  right: string
  source: string
  target: string
  operator: string
  label?: string
  comment: string
}

function expressionId(expression: string): string | undefined {
  return expression.trim().match(/^([A-Za-z_][A-Za-z0-9_-]*)/)?.[1]
}

function parseEdgeLine(line: string, index: number): SourceEdgeLine | undefined {
  const trimmed = line.trimStart()
  if (!trimmed || trimmed.startsWith('%%')) return undefined
  const match = OPERATOR.exec(line)
  if (!match || match.index === undefined) return undefined
  const indent = line.match(/^\s*/)?.[0] ?? ''
  const left = line.slice(indent.length, match.index).trimEnd()
  let remainder = line.slice(match.index + match[0].length).trimStart()
  let label: string | undefined
  if (remainder.startsWith('|')) {
    const close = remainder.indexOf('|', 1)
    if (close < 0) return undefined
    label = remainder.slice(1, close).replaceAll('\\|', '|')
    remainder = remainder.slice(close + 1).trimStart()
  }
  const commentIndex = remainder.indexOf('%%')
  const comment = commentIndex >= 0 ? remainder.slice(commentIndex).trimStart() : ''
  const right = (commentIndex >= 0 ? remainder.slice(0, commentIndex) : remainder).trimEnd()
  const source = expressionId(left)
  const target = expressionId(right)
  if (!source || !target) return undefined
  // Chained edges require a real Mermaid CST to edit safely.
  if (OPERATOR.test(right)) return undefined
  return { index, indent, left, right, source, target, operator: match[0], ...(label ? { label } : {}), comment }
}

function linesOf(source: string): string[] {
  return source.replace(/\r\n/g, '\n').split('\n')
}

function appendLines(lines: string[], additions: string[]): void {
  while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop()
  lines.push(...additions, '')
}

function quote(value: string): string { return JSON.stringify(value) }

function declaration(node: MermaidNode): string {
  const wrappers: Record<NodeShape, [string, string]> = {
    rectangle: ['[', ']'], rounded: ['(', ')'], diamond: ['{', '}'], stadium: ['([', '])'], circle: ['((', '))'],
    subroutine: ['[[', ']]'], doublecircle: ['(((', ')))'], hexagon: ['{{', '}}'], cylinder: ['[(', ')]'], asymmetric: ['>', ']'],
    trapezoid: ['[/', '\\]'], 'trapezoid-alt': ['[\\', '/]'], 'state-start': ['((', '))'], 'state-end': ['(((', ')))'],
  }
  const [open, close] = wrappers[node.shape]
  return `${node.id}${open}${quote(node.label)}${close}`
}

function operator(edge: MermaidEdge): string {
  const arrows = `${edge.hasArrowStart ? '<' : ''}${edge.hasArrowEnd ? '>' : ''}`
  if (edge.style === 'dotted') return arrows === '<>' ? '<-.->' : arrows === '<' ? '<-.-' : arrows === '>' ? '-.->' : '-.-'
  if (edge.style === 'thick') return arrows === '<>' ? '<==>' : arrows === '<' ? '<==' : arrows === '>' ? '==>' : '==='
  return arrows === '<>' ? '<-->' : arrows === '<' ? '<--' : arrows === '>' ? '-->' : '---'
}

function edgeText(edge: MermaidEdge): string {
  const label = edge.label ? `|${edge.label.replaceAll('|', '\\|')}|` : ''
  return `${edge.source} ${operator(edge)}${label} ${edge.target}`
}

function findEdge(lines: string[], source: string, target: string, label?: string): SourceEdgeLine {
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseEdgeLine(lines[index]!, index)
    if (parsed?.source === source && parsed.target === target && (label === undefined || parsed.label === label)) return parsed
  }
  throw new CliError(`Cannot safely locate a standalone source line for edge ${source} -> ${target}. Chained Mermaid edges must be expanded before transforming.`, 2)
}

function renameIdentifierInLines(lines: string[], oldId: string, newId: string): void {
  const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const expressionPattern = new RegExp(`^${escaped}(?=$|[\\[({>])`)
  const tokenPattern = new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, 'g')
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseEdgeLine(lines[index]!, index)
    if (parsed) {
      const left = parsed.source === oldId ? parsed.left.replace(expressionPattern, newId) : parsed.left
      const right = parsed.target === oldId ? parsed.right.replace(expressionPattern, newId) : parsed.right
      const label = parsed.label ? `|${parsed.label.replaceAll('|', '\\|')}|` : ''
      lines[index] = `${parsed.indent}${left} ${parsed.operator}${label} ${right}${parsed.comment ? ` ${parsed.comment}` : ''}`
      continue
    }
    const content = lines[index]!.trimStart()
    if (content.startsWith('%%')) continue
    if (expressionPattern.test(content)) {
      const indent = lines[index]!.slice(0, lines[index]!.length - content.length)
      lines[index] = `${indent}${content.replace(expressionPattern, newId)}`
    } else if (/^(class|style)\s+/.test(content)) {
      lines[index] = lines[index]!.replace(tokenPattern, newId)
    }
  }
}

function replaceNodeExpressions(lines: string[], node: MermaidNode): void {
  const replacement = declaration(node)
  const idPattern = new RegExp(`^(${node.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=$|[\[({>])`)
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseEdgeLine(lines[index]!, index)
    if (parsed) {
      const left = parsed.source === node.id ? replacement : parsed.left
      const right = parsed.target === node.id ? replacement : parsed.right
      if (left !== parsed.left || right !== parsed.right) {
        const label = parsed.label ? `|${parsed.label.replaceAll('|', '\\|')}|` : ''
        lines[index] = `${parsed.indent}${left} ${parsed.operator}${label} ${right}${parsed.comment ? ` ${parsed.comment}` : ''}`
      }
      continue
    }
    const line = lines[index]!
    const indent = line.match(/^\s*/)?.[0] ?? ''
    const content = line.slice(indent.length)
    if (idPattern.test(content) && !content.startsWith('class ') && !content.startsWith('style ')) lines[index] = `${indent}${replacement}`
  }
}

function removeNodeAndIncidentLines(lines: string[], graph: Graph, nodeId: string): void {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const parsed = parseEdgeLine(lines[index]!, index)
    if (parsed && (parsed.source === nodeId || parsed.target === nodeId)) {
      const survivorId = parsed.source === nodeId ? parsed.target : parsed.source
      const survivorExpression = parsed.source === nodeId ? parsed.right : parsed.left
      const survivor = graph.nodes.get(survivorId)
      lines.splice(index, 1, `${parsed.indent}${survivorExpression || (survivor ? declaration(survivor) : survivorId)}`)
      continue
    }
    const content = lines[index]!.trim()
    if (new RegExp(`^${nodeId}(?:$|[\[({>])`).test(content)) lines.splice(index, 1)
  }
}

function assertSourceEditable(graph: Graph, action: TransformAction): void {
  const changesEdgeIndices = ['remove-node', 'add-edge', 'remove-edge', 'insert-node', 'bypass-node'].includes(action.type)
  if (changesEdgeIndices && [...graph.linkStyles.keys()].some((key) => typeof key === 'number')) {
    throw new CliError('Source-preserving edge transformations with numeric linkStyle directives are not yet safe; use class-based edge styling first.', 2)
  }
}

export function applySourceTransform(source: string, graph: Graph, action: TransformAction): string {
  assertSourceEditable(graph, action)
  let lines = linesOf(source)
  switch (action.type) {
    case 'add-node':
      appendLines(lines, [`  ${declaration({ id: action.id, label: action.label, shape: action.shape ?? 'rectangle' })}`])
      break
    case 'remove-node':
      removeNodeAndIncidentLines(lines, graph, action.id)
      break
    case 'rename-node': {
      if (action.newId) renameIdentifierInLines(lines, action.id, action.newId)
      const current = graph.nodes.get(action.id)!
      replaceNodeExpressions(lines, { ...current, id: action.newId ?? action.id, label: action.label ?? current.label })
      break
    }
    case 'set-node-shape':
      replaceNodeExpressions(lines, { ...graph.nodes.get(action.id)!, shape: action.shape })
      break
    case 'add-edge':
      appendLines(lines, [`  ${edgeText({ source: action.source, target: action.target, ...(action.label ? { label: action.label } : {}), style: action.style ?? 'solid', hasArrowStart: false, hasArrowEnd: true })}`])
      break
    case 'remove-edge': {
      const found = findEdge(lines, action.source, action.target, action.label)
      lines.splice(found.index, 1, `${found.indent}${found.left}`, `${found.indent}${found.right}`)
      break
    }
    case 'set-edge-label': {
      const found = findEdge(lines, action.source, action.target)
      const label = action.label ? `|${action.label.replaceAll('|', '\\|')}|` : ''
      lines[found.index] = `${found.indent}${found.left} ${found.operator}${label} ${found.right}${found.comment ? ` ${found.comment}` : ''}`
      break
    }
    case 'reverse-edge': {
      const found = findEdge(lines, action.source, action.target)
      const label = found.label ? `|${found.label.replaceAll('|', '\\|')}|` : ''
      lines[found.index] = `${found.indent}${found.right} ${found.operator}${label} ${found.left}${found.comment ? ` ${found.comment}` : ''}`
      break
    }
    case 'insert-node': {
      const found = findEdge(lines, action.between.source, action.between.target)
      const node = declaration({ id: action.id, label: action.label, shape: action.shape ?? 'rectangle' })
      const label = found.label ? `|${found.label.replaceAll('|', '\\|')}|` : ''
      lines.splice(found.index, 1,
        `${found.indent}${found.left} ${found.operator}${label} ${node}`,
        `${found.indent}${action.id} ${found.operator} ${found.right}${found.comment ? ` ${found.comment}` : ''}`,
      )
      break
    }
    case 'bypass-node': {
      const incoming = graph.edges.filter((edge) => edge.target === action.id)
      const outgoing = graph.edges.filter((edge) => edge.source === action.id)
      removeNodeAndIncidentLines(lines, graph, action.id)
      const additions: string[] = []
      for (const before of incoming) for (const after of outgoing) {
        if (before.source !== after.target) additions.push(`  ${edgeText({ source: before.source, target: after.target, ...(after.label ? { label: after.label } : {}), style: after.style, hasArrowStart: false, hasArrowEnd: true })}`)
      }
      appendLines(lines, additions)
      break
    }
    case 'create-subgraph':
      appendLines(lines, [
        `  subgraph ${action.id}[${quote(action.label)}]`,
        ...action.nodes.map((nodeId) => `    ${declaration(graph.nodes.get(nodeId)!)}`),
        '  end',
      ])
      break
    case 'move-to-subgraph': {
      const memberships: string[] = []
      const collectMemberships = (groups: Graph['subgraphs']) => {
        for (const group of groups) {
          if (group.id !== action.subgraph && action.nodes.some((nodeId) => group.nodeIds.includes(nodeId))) memberships.push(group.id)
          collectMemberships(group.children)
        }
      }
      collectMemberships(graph.subgraphs)
      if (memberships.length) {
        throw new CliError(`Cannot minimally move nodes out of subgraph(s) ${[...new Set(memberships)].join(', ')}; move their source block explicitly first`, 2)
      }
      let start = -1; let depth = 0; let end = -1
      for (let index = 0; index < lines.length; index += 1) {
        const content = lines[index]!.trim()
        if (new RegExp(`^subgraph\\s+${action.subgraph}(?:\\s|\\[|$)`).test(content)) { start = index; depth = 1; continue }
        if (start >= 0 && content.startsWith('subgraph ')) depth += 1
        if (start >= 0 && content === 'end' && --depth === 0) { end = index; break }
      }
      if (end < 0) throw new CliError(`Cannot locate subgraph block in Mermaid source: ${action.subgraph}`, 2)
      lines.splice(end, 0, ...action.nodes.map((nodeId) => `${lines[start]!.match(/^\s*/)?.[0] ?? ''}  ${declaration(graph.nodes.get(nodeId)!)}`))
      break
    }
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}
