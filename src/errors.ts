export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
    readonly code = exitCode === 2 ? 'INVALID_INPUT' : 'INTERNAL_ERROR',
  ) {
    super(message)
    this.name = 'CliError'
  }
}
