import { mkdir } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import { CliError } from './errors.ts'
import type { OutputFormat, RenderRequest } from './types.ts'

export async function readInput(path: string): Promise<string> {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new CliError(`Input file not found: ${path}`, 2)

  try {
    return await file.text()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not read ${path}: ${message}`)
  }
}

function outputExtension(format: OutputFormat): string {
  if (format === 'svg') return '.svg'
  if (format === 'png') return '.png'
  return '.txt'
}

export function defaultOutputPath(inputPath: string, format: OutputFormat): string {
  const extension = extname(inputPath)
  const stem = extension ? inputPath.slice(0, -extension.length) : inputPath
  return `${stem}${outputExtension(format)}`
}

export function requestedOutputPath(request: RenderRequest): string {
  return request.outputPath ?? defaultOutputPath(request.inputPath, request.format)
}

export async function writeOutput(path: string, content: string | Uint8Array): Promise<void> {
  if (path === '-') {
    if (typeof content === 'string') {
      process.stdout.write(content)
      if (!content.endsWith('\n')) process.stdout.write('\n')
    } else {
      process.stdout.write(content)
    }
    return
  }

  try {
    await mkdir(dirname(path), { recursive: true })
    await Bun.write(path, content)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`Could not write ${path}: ${message}`)
  }
}
