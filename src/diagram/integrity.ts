export interface IntegrityIssue { severity: 'high' | 'medium'; type: string; message: string }
export function svgIntegrity(svg: string) {
  const issues: IntegrityIssue[] = []
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]!)
  if (new Set(ids).size !== ids.length) issues.push({ severity: 'high', type: 'duplicate-svg-id', message: 'SVG contains duplicate IDs' })
  for (const match of svg.matchAll(/(?:url\(#([^)]*)\)|(?:href|xlink:href)="#([^"]+)")/g)) {
    const id = match[1] ?? match[2]!
    if (!ids.includes(id)) issues.push({ severity: 'high', type: 'broken-svg-reference', message: `Unresolved SVG reference: ${id}` })
  }
  for (const match of svg.matchAll(/<svg class="pele-icon" data-icon="([^"]*)"[^>]*>\s*<\/svg>/g)) issues.push({ severity: 'medium', type: 'unresolved-icon', message: `Icon did not resolve: ${match[1]}` })
  return { coverage: 'svg-references-only', issues, limitations: ['This does not measure geometry or establish model-to-render element and label fidelity.'] }
}
