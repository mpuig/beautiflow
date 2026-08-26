import type { DiagramColors } from 'beautiful-mermaid'

export const OUTPUT_FORMATS = ['svg', 'png', 'unicode', 'ascii'] as const
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export interface RenderRequest {
  inputPath: string
  outputPath?: string
  format: OutputFormat
  themeName?: string
  transparent: boolean
}

export interface RenderResult {
  content: string
  format: OutputFormat
  theme?: DiagramColors
}
