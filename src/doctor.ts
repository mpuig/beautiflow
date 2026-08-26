import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { homedir, platform, arch } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { diagramFamily, renderStandaloneOutput } from './diagram/pipeline.ts'
import { loadProject } from './diagram/project.ts'
import { findFlowContext } from './flow-context.ts'
import { readInput } from './io.ts'

export interface DoctorCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode)
    return true
  } catch {
    return false
  }
}

function skillLocations(): string[] {
  return [
    join(homedir(), '.agents/skills/beautiflow/SKILL.md'),
    join(homedir(), '.pi/agent/skills/beautiflow/SKILL.md'),
    join(homedir(), '.claude/skills/beautiflow/SKILL.md'),
    join(homedir(), '.codex/skills/beautiflow/SKILL.md'),
    resolve('.agents/skills/beautiflow/SKILL.md'),
    resolve('.pi/skills/beautiflow/SKILL.md'),
    resolve('.claude/skills/beautiflow/SKILL.md'),
    resolve('.codex/skills/beautiflow/SKILL.md'),
  ]
}

export async function doctorReport(version: string, inputPath?: string) {
  const checks: DoctorCheck[] = []
  checks.push({ name: 'version', status: 'pass', message: `beautiflow ${version}` })

  const target = `${platform()}/${arch()}`
  const releaseSupported = (platform() === 'darwin' && arch() === 'arm64')
    || (platform() === 'linux' && arch() === 'x64')
  checks.push({
    name: 'platform',
    status: releaseSupported ? 'pass' : 'warn',
    message: releaseSupported
      ? `${target} has a published standalone release`
      : `${target} can run from source but has no published standalone release`,
  })

  const installedSkills: string[] = []
  for (const path of skillLocations()) {
    if (await canAccess(path, constants.R_OK)) installedSkills.push(path)
  }
  checks.push({
    name: 'agent-skill',
    status: installedSkills.length ? 'pass' : 'warn',
    message: installedSkills.length
      ? `Installed at ${installedSkills.join(', ')}`
      : 'Not installed; run beautiflow install-skill or choose a harness-specific target',
  })

  const cwdWritable = await canAccess(resolve('.'), constants.W_OK)
  checks.push({
    name: 'working-directory',
    status: cwdWritable ? 'pass' : 'fail',
    message: cwdWritable ? `Writable: ${resolve('.')}` : `Not writable: ${resolve('.')}`,
  })

  let diagram: Record<string, unknown> | null = null
  if (inputPath) {
    const sourcePath = resolve(inputPath)
    if (!await canAccess(sourcePath, constants.R_OK)) {
      checks.push({ name: 'input', status: 'fail', message: `Cannot read ${sourcePath}` })
    } else {
      const source = await readInput(sourcePath)
      const family = diagramFamily(source)
      if (family === 'unknown') {
        checks.push({ name: 'diagram-family', status: 'fail', message: 'No supported Mermaid diagram family was detected' })
      } else {
        checks.push({ name: 'diagram-family', status: 'pass', message: `Detected ${family}` })
        const outputWritable = await canAccess(dirname(sourcePath), constants.W_OK)
        checks.push({
          name: 'output-directory',
          status: outputWritable ? 'pass' : 'fail',
          message: outputWritable ? `Writable: ${dirname(sourcePath)}` : `Not writable: ${dirname(sourcePath)}`,
        })
        const flowContext = await findFlowContext(sourcePath)
        checks.push({
          name: 'flow-context',
          status: flowContext ? 'pass' : 'warn',
          message: flowContext ? `Using ${flowContext.path}` : 'No FLOW.md found; project-specific guidance is optional',
        })

        try {
          if (family === 'graph') {
            const project = await loadProject(sourcePath)
            diagram = {
              family,
              source: sourcePath,
              sidecar: project.sidecarPath,
              nodes: project.graph.nodes.size,
              edges: project.graph.edges.length,
            }
          } else {
            await renderStandaloneOutput(source, { inputPath: sourcePath, format: 'svg', transparent: false })
            diagram = { family, source: sourcePath, sidecar: null }
          }
          checks.push({ name: 'parse-and-render', status: 'pass', message: 'The diagram parses and reaches its rendering pipeline' })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          checks.push({ name: 'parse-and-render', status: 'fail', message })
        }
      }
    }
  }

  const failures = checks.filter((check) => check.status === 'fail').length
  const warnings = checks.filter((check) => check.status === 'warn').length
  return {
    ok: failures === 0,
    operation: 'doctor',
    version,
    platform: target,
    checks,
    summary: { passed: checks.length - failures - warnings, warnings, failures },
    diagram,
    nextAction: failures
      ? 'Resolve failed checks before allowing an agent to mutate the diagram'
      : installedSkills.length
        ? null
        : 'Run beautiflow install-skill for the active coding harness',
  }
}
