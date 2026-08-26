import type { DiagramColors } from 'beautiful-mermaid'
import { CliError } from '../errors.ts'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function svgRoot(width: number, height: number, colors: DiagramColors, content: string, transparent: boolean): string {
  const bg = colors.bg ?? '#ffffff'; const fg = colors.fg ?? '#27272a'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${transparent ? '' : `<rect width="100%" height="100%" fill="${bg}" />\n`}<g font-family="Inter, Arial, sans-serif" fill="${fg}">${content}</g>
</svg>`
}

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#84cc16', '#f97316']

export function renderPieSvg(source: string, colors: DiagramColors, transparent: boolean): string {
  const lines = source.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('%%'))
  const header = lines.shift() ?? ''
  const title = header.match(/\btitle\s+(.+)$/i)?.[1]?.trim() ?? 'Pie chart'
  const entries = lines.map((line) => {
    const match = line.match(/^"((?:\\.|[^"])*)"\s*:\s*(-?\d+(?:\.\d+)?)$/)
    return match ? { label: match[1]!.replaceAll('\\"', '"'), value: Number(match[2]) } : undefined
  }).filter((entry): entry is { label: string; value: number } => Boolean(entry && entry.value >= 0))
  const total = entries.reduce((sum, entry) => sum + entry.value, 0)
  if (!entries.length || total <= 0) throw new CliError('Pie diagram requires at least one positive data value', 2)
  const width = 760; const height = Math.max(440, 150 + entries.length * 34)
  const cx = 235; const cy = height / 2 + 20; const radius = 150
  let angle = -Math.PI / 2
  const parts = [`<text x="40" y="48" font-size="24" font-weight="700">${escapeXml(title)}</text>`]
  entries.forEach((entry, index) => {
    const next = angle + (entry.value / total) * Math.PI * 2
    const x1 = cx + Math.cos(angle) * radius; const y1 = cy + Math.sin(angle) * radius
    const x2 = cx + Math.cos(next) * radius; const y2 = cy + Math.sin(next) * radius
    const large = next - angle > Math.PI ? 1 : 0
    const color = PALETTE[index % PALETTE.length]!
    const path = entries.length === 1
      ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" />`
      : `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" stroke="${colors.bg ?? '#fff'}" stroke-width="2" />`
    parts.push(path)
    const middle = (angle + next) / 2; const percent = Math.round(entry.value / total * 100)
    if (percent >= 5) parts.push(`<text x="${cx + Math.cos(middle) * radius * 0.64}" y="${cy + Math.sin(middle) * radius * 0.64}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="13" font-weight="700">${percent}%</text>`)
    const legendY = 110 + index * 34
    parts.push(`<rect x="455" y="${legendY - 13}" width="18" height="18" rx="4" fill="${color}" />`)
    parts.push(`<text x="485" y="${legendY}" dominant-baseline="middle" font-size="14">${escapeXml(entry.label)} · ${entry.value}</text>`)
    angle = next
  })
  return svgRoot(width, height, colors, parts.join('\n'), transparent)
}

interface GitCommit {
  id: string
  branch: string
  lane: number
  parent?: GitCommit
  mergeFrom?: GitCommit
  tag?: string
  type?: string
  index: number
}

export function renderGitGraphSvg(source: string, colors: DiagramColors, transparent: boolean): string {
  const lines = source.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('%%'))
  if (!/^gitgraph\s*:?$/i.test(lines.shift() ?? '')) throw new CliError('Invalid gitGraph header', 2)
  const branches = new Map<string, { lane: number; head?: GitCommit }>([['main', { lane: 0 }]])
  let current = 'main'; const commits: GitCommit[] = []; let generated = 1
  const ensureBranch = (name: string) => {
    const branch = branches.get(name)
    if (!branch) throw new CliError(`Unknown gitGraph branch: ${name}`, 2)
    return branch
  }
  for (const line of lines) {
    const [command] = line.split(/\s+/, 1)
    if (command === 'branch') {
      const name = line.slice(6).trim().split(/\s+/)[0]!
      if (!name || branches.has(name)) throw new CliError(`Invalid or duplicate gitGraph branch: ${name}`, 2)
      branches.set(name, { lane: branches.size, head: ensureBranch(current).head }); current = name
    } else if (command === 'checkout' || command === 'switch') {
      current = line.slice(command.length).trim(); ensureBranch(current)
    } else if (command === 'commit') {
      const branch = ensureBranch(current)
      const id = line.match(/(?:^|\s)id\s*:\s*"?([^"\s]+)"?/i)?.[1]
        ?? line.match(/^commit\s+"([^"]+)"/)?.[1]
        ?? String(generated++)
      const commit: GitCommit = {
        id, branch: current, lane: branch.lane, index: commits.length,
        ...(branch.head ? { parent: branch.head } : {}),
        ...(line.match(/(?:^|\s)tag\s*:\s*"([^"]+)"/i)?.[1] ? { tag: line.match(/(?:^|\s)tag\s*:\s*"([^"]+)"/i)![1] } : {}),
        ...(line.match(/(?:^|\s)type\s*:\s*([A-Za-z]+)/i)?.[1] ? { type: line.match(/(?:^|\s)type\s*:\s*([A-Za-z]+)/i)![1]!.toUpperCase() } : {}),
      }
      commits.push(commit); branch.head = commit
    } else if (command === 'merge') {
      const fromName = line.slice(5).trim().split(/\s+/)[0]!
      const branch = ensureBranch(current); const from = ensureBranch(fromName)
      if (!from.head) throw new CliError(`Cannot merge empty gitGraph branch: ${fromName}`, 2)
      const commit: GitCommit = { id: `merge ${fromName}`, branch: current, lane: branch.lane, index: commits.length, ...(branch.head ? { parent: branch.head } : {}), mergeFrom: from.head }
      commits.push(commit); branch.head = commit
    } else if (command === 'cherry-pick') {
      const sourceId = line.match(/id\s*:\s*"?([^"\s]+)"?/i)?.[1]
      const picked = commits.find((commit) => commit.id === sourceId)
      if (!picked) throw new CliError(`Unknown cherry-pick commit: ${sourceId ?? ''}`, 2)
      const branch = ensureBranch(current)
      const commit: GitCommit = { id: `${picked.id}′`, branch: current, lane: branch.lane, index: commits.length, ...(branch.head ? { parent: branch.head } : {}) }
      commits.push(commit); branch.head = commit
    } else throw new CliError(`Unsupported gitGraph statement: ${line}`, 2)
  }
  if (!commits.length) throw new CliError('gitGraph requires at least one commit', 2)
  const xFor = (commit: GitCommit) => 150 + commit.index * 86
  const yFor = (commit: GitCommit) => 95 + commit.lane * 92
  const width = Math.max(720, 230 + commits.length * 86); const height = 175 + branches.size * 92
  const lineColor = colors.line ?? '#71717a'; const fg = colors.fg ?? '#27272a'
  const parts: string[] = []
  for (const [name, branch] of branches) {
    const y = 95 + branch.lane * 92; const color = PALETTE[branch.lane % PALETTE.length]!
    parts.push(`<rect x="24" y="${y - 16}" width="96" height="32" rx="8" fill="${color}" opacity="0.14" />`)
    parts.push(`<text x="72" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700" fill="${color}">${escapeXml(name)}</text>`)
    parts.push(`<line x1="130" y1="${y}" x2="${width - 35}" y2="${y}" stroke="${lineColor}" opacity="0.18" stroke-dasharray="3 5" />`)
  }
  for (const commit of commits) {
    const x = xFor(commit); const y = yFor(commit); const color = PALETTE[commit.lane % PALETTE.length]!
    if (commit.parent) parts.push(`<path d="M ${xFor(commit.parent)} ${yFor(commit.parent)} L ${x} ${y}" fill="none" stroke="${color}" stroke-width="4" />`)
    if (commit.mergeFrom) parts.push(`<path d="M ${xFor(commit.mergeFrom)} ${yFor(commit.mergeFrom)} C ${xFor(commit.mergeFrom) + 35} ${yFor(commit.mergeFrom)}, ${x - 35} ${y}, ${x} ${y}" fill="none" stroke="${PALETTE[commit.mergeFrom.lane % PALETTE.length]}" stroke-width="3" />`)
    const highlighted = commit.type === 'HIGHLIGHT'
    parts.push(highlighted
      ? `<rect x="${x - 8}" y="${y - 8}" width="16" height="16" fill="${colors.bg ?? '#fff'}" stroke="${color}" stroke-width="4" />`
      : `<circle cx="${x}" cy="${y}" r="8" fill="${color}" stroke="${colors.bg ?? '#fff'}" stroke-width="3" />`)
    parts.push(`<text x="${x}" y="${y + 28}" text-anchor="middle" font-size="11" fill="${fg}" transform="rotate(-28 ${x} ${y + 28})">${escapeXml(commit.id)}</text>`)
    if (commit.tag) {
      parts.push(`<rect x="${x - 21}" y="${y - 38}" width="42" height="20" rx="5" fill="${color}" opacity="0.16" />`)
      parts.push(`<text x="${x}" y="${y - 28}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="700" fill="${color}">${escapeXml(commit.tag)}</text>`)
    }
  }
  return svgRoot(width, height, colors, parts.join('\n'), transparent)
}
