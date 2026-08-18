import type { SnakeCase, SplitWords } from './cases'
import type { Overwrite, Pretty } from './types'
import cases, { splitWords } from './cases'

export function mapKeys<
  M extends { [K in Extract<keyof T, string>]: ReturnType<F> },
  T extends Record<string, unknown>,
  F extends <K extends Extract<keyof T, string>>(key: K, value: T[K]) => string,
>(
  obj: T,
  transform: F,
): { [K in Extract<keyof T, string> as M[K]]: T[K] } {
  const res = {} as any
  for (const key in obj)
    res[transform(key, obj[key])] = obj[key]
  return res
}

export function filterKeys<
  K extends { [P in Extract<keyof T, string>]: boolean },
  T extends Record<string, unknown>,
  F extends <P extends Extract<keyof T, string>>(key: P, value: T[P]) => boolean,
>(
  obj: T,
  predicate: F,
): { [P in Extract<keyof T, string> as K[P] extends false ? never : P]: T[P] } {
  const res = {} as any
  for (const key in obj) {
    if (predicate(key, obj[key]))
      res[key] = obj[key]
  }
  return res
}

export function withPrefix<
  P extends string,
  T extends Record<string, any>,
>(
  prefix: P,
  object: T,
): { [K in Extract<keyof T, string> as `${P}${K}`]: T[K] } {
  return mapKeys(object, key => prefix + key) as any
}

/** Rewrite the keys of an object to snake_case, preserving the value order. */
export function snakeCaseKeys<T extends Record<string, any>>(obj: T):
{ [K in Extract<keyof T, string> as SnakeCase<SplitWords<K>>]: T[K] } {
  return mapKeys(obj, key => cases.snake(splitWords(key))) as any
}

export function stripNullish<T extends Record<string, any>>(object: T):
Pretty<Overwrite<T, { [K in keyof T as null extends T[K] ? K : never]?: NonNullable<T[K]> }>> {
  return filterKeys(object, (_, value) => value != null) as any
}
