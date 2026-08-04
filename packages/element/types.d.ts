export type Pretty<T> = { [K in keyof T]: T[K] } & {}

export type Except<T, K extends keyof T> = Omit<T, K>

export type Merge<T, U> = {
  [K in keyof T]: K extends keyof U ? T[K] & U[K] : T[K]
} & Omit<U, keyof T>

export type Xor<T, U = T> = T extends any ? T & {
  [K in Exclude<U extends any ? keyof U : never, keyof T>]?: never
} : never

export type Overloads<F, Fp = unknown> =
  F extends (...args: infer A) => infer R
    ? ((...args: A) => R) extends infer S
        ? Fp extends F ? never : Overloads<Fp & F, Fp & S> | S
        : never
    : never

export type OptionalKeys<T> =
  keyof { [K in keyof T as K extends keyof T
    ? T extends Record<K, T[K]> ? never : K : never]: never }
