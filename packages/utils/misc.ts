export function noop(..._args: unknown[]): void {}

export const lazy = <T>(inner: T) => () => inner

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
