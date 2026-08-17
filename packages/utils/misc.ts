export function noop(..._args: any[]): void {}

export const lazy = (inner: any) => () => inner

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
