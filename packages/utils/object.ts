import type { SnakeCase } from './cases'
import type { Overwrite, Pretty } from './types'
import cases, { split } from './cases'

/** Rewrite the keys of an object to snake_case, preserving the value order. */
export function snakeCaseKeys<T extends Record<string, any>>(object: T):
{ [K in Extract<keyof T, string> as SnakeCase<K>]: T[K] } {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [cases.snake(split(key)), value]),
  ) as any
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
