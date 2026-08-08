import type { Pretty } from './types'

export * from './types'

export const lazy = (inner: any) => () => inner

export function stripNullish<T extends Record<string, any>>(object: T): Pretty<{
  [K in keyof T as null extends T[K] ? K : never]?: NonNullable<T[K]>
} extends infer U ? Omit<T, keyof U> & U : never> {
  for (const key in Object.keys(object)) {
    if (object[key] == null)
      delete object[key]
  }
  return object as any
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
