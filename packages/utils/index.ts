import type { Overwrite, Pretty } from './types'

export type * from './types'

export function noop(..._args: any[]): void {}

export const lazy = (inner: any) => () => inner

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function stripNullish<T extends Record<string, any>>(object: T):
Pretty<Overwrite<T, { [K in keyof T as null extends T[K] ? K : never]?: NonNullable<T[K]> }>> {
  for (const key in Object.keys(object)) {
    if (object[key] == null)
      delete object[key]
  }
  return object as any
}

export function withPrefix<
  P extends string,
  T extends Record<string, any>,
>(
  prefix: P,
  object: T,
): { [K in Extract<keyof T, string> as `${P}${K}`]: T[K] } {
  return Object.fromEntries(Object.entries(object)
    .map(([key, value]) => [prefix + key, value])) as any
}
