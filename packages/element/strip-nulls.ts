export type StripNulls<T> = {
  [K in keyof T as null extends T[K] ? K : never]?: Exclude<T[K], null>
} extends infer U ? Omit<T, keyof U> & U : never

export function stripNulls<T extends Record<string, any>>(object: T): StripNulls<T> {
  for (const key in object) {
    if (object[key] === null)
      delete object[key]
  }
  return object as any
}
