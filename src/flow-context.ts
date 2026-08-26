import { dirname, join, parse, resolve } from 'node:path'

export interface FlowContext {
  path: string
  content: string
}

/** Find the nearest FLOW.md, starting beside the diagram and walking upward. */
export async function findFlowContext(sourcePath: string): Promise<FlowContext | undefined> {
  let directory = dirname(resolve(sourcePath))
  const root = parse(directory).root
  while (true) {
    const path = join(directory, 'FLOW.md')
    const file = Bun.file(path)
    if (await file.exists()) return { path, content: await file.text() }
    if (directory === root) return undefined
    directory = dirname(directory)
  }
}
