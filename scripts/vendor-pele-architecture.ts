// Reproduce with a clean obsidianmd/pele checkout at the pinned commit:
// bun scripts/vendor-pele-architecture.ts /path/to/pele
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const checkout = resolve(process.argv[2] ?? '')
const commit = Bun.spawnSync(['git', '-C', checkout, 'rev-parse', 'HEAD']).stdout.toString().trim()
if (commit !== '4eff76f98c73b6817800a05773517f35832e4e92') throw new Error('Expected Pele 1.10.0 pinned checkout')
const temporary = await mkdtemp(join(tmpdir(), 'pele-geometry-'))
try {
  await cp(join(checkout, 'src'), join(temporary, 'src'), { recursive: true })
  const path = join(temporary, 'src/diagrams/architecture/render.ts')
  let source = await readFile(path, 'utf8')
  function patch(before: string, after: string) {
    if (source.split(before).length !== 2) throw new Error(`Patch no longer unique: ${before}`)
    source = source.replace(before, after)
  }
  patch("  let edgesOut = '';", "  const geometryRoutes = [];\n  const geometryHeaders = [];\n  let edgesOut = '';")
  patch('    const id = escText(`${edge.lhsId}-${edge.rhsId}`);', `    geometryRoutes.push({ source: edge.lhsId, target: edge.rhsId, sourcePort: edge.lhsDir.toUpperCase(), targetPort: edge.rhsDir.toUpperCase(), sourceAnchor: s.wire ? { x: centerX(a), y: Y[nodeRow[a]] + half } : { x: s.x, y: s.y }, targetAnchor: e.wire ? { x: centerX(b), y: Y[nodeRow[b]] + half } : { x: e.x, y: e.y }, points: Array.from({ length: points.length / 2 }, (_, i) => ({ x: points[i * 2], y: points[i * 2 + 1] })) });
    const id = escText(\`\${edge.lhsId}-\${edge.rhsId}\`);`)
  patch("      head += labelSvg(label, textX + label.width / 2, cy,", "      geometryHeaders.push({ x: start, y: cy - headH[g] / 2, width: headW[g], height: headH[g] });\n      head += labelSvg(label, textX + label.width / 2, cy,")
  patch('  return { svg, width, height, links: [] };', `  const services = nodes.map((node, i) => ({ id: node.id, icon: node.type === 'junction' ? { x: centerX(i) - DOT, y: Y[nodeRow[i]] + half - DOT, width: DOT * 2, height: DOT * 2 } : { x: centerX(i) - half, y: Y[nodeRow[i]], width: iconSize, height: iconSize }, ...(labels[i].height ? { label: { x: centerX(i) - labels[i].width / 2, y: Y[nodeRow[i]] + iconSize + LABEL_GAP, width: labels[i].width, height: labels[i].height } } : {}) }));
  return { svg, width, height, links: [], geometry: { services, routes: geometryRoutes, headers: geometryHeaders, offset: { x: ox, y: oy } } };`)
  await writeFile(path, source)
  const built = await Bun.build({ entrypoints: [join(temporary, 'src/diagrams/architecture/index.ts')], target: 'bun', minify: false })
  if (!built.success) throw new Error(String(built.logs))
  await writeFile('src/vendor/pele-architecture/index.js', '// Generated from Pele 1.10.0 with additive geometry evidence. See README.md.\n' + await built.outputs[0]!.text())
} finally { await rm(temporary, { recursive: true, force: true }) }
