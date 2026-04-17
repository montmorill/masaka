export type Pretty<T> = { [K in keyof T]: T[K] } & {}

export type IsNullable<T> = Partial<T> extends T ? true : false

export type Xor<T, U = T> = T extends any ? T & {
  [K in Exclude<U extends any ? keyof U : never, keyof T>]?: never
} : never

export type Overloads<F, Fp = unknown> =
  F extends (...args: infer A) => infer R
    ? ((...args: A) => R) extends infer S
        ? Fp extends F ? never : Overloads<Fp & F, Fp & S> | S
        : never
    : never
