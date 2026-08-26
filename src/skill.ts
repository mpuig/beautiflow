import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import skill from '../skills/beautiflow/SKILL.md' with { type: 'text' }
import actions from '../skills/beautiflow/references/actions.md' with { type: 'text' }
import protocol from '../skills/beautiflow/references/agent-protocol.md' with { type: 'text' }
import rubric from '../skills/beautiflow/references/quality-rubric.md' with { type: 'text' }
import transformations from '../skills/beautiflow/references/transformations.md' with { type: 'text' }
import type { SkillTarget } from './args.ts'

function targetRoot(target: SkillTarget, local: boolean): string {
  if (local) {
    if (target === 'pi') return resolve('.pi/skills')
    if (target === 'claude') return resolve('.claude/skills')
    if (target === 'codex') return resolve('.codex/skills')
    return resolve('.agents/skills')
  }

  if (target === 'pi') return join(homedir(), '.pi/agent/skills')
  if (target === 'claude') return join(homedir(), '.claude/skills')
  if (target === 'codex') return join(homedir(), '.codex/skills')
  return join(homedir(), '.agents/skills')
}

export async function installSkill(target: SkillTarget, local: boolean): Promise<string> {
  const directory = join(targetRoot(target, local), 'beautiflow')
  const references = join(directory, 'references')
  await mkdir(references, { recursive: true })
  await Promise.all([
    writeFile(join(directory, 'SKILL.md'), skill),
    writeFile(join(references, 'actions.md'), actions),
    writeFile(join(references, 'agent-protocol.md'), protocol),
    writeFile(join(references, 'quality-rubric.md'), rubric),
    writeFile(join(references, 'transformations.md'), transformations),
  ])
  return directory
}
