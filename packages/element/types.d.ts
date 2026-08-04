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

type IsAny<T> = 0 extends 1 & NoInfer<T> ? true : false

type IsOptionalKeyOf<Type extends object, Key extends keyof Type> =
  IsAny<Type | Key> extends true ? never
    : Key extends keyof Type
      ? Type extends Record<Key, Type[Key]>
        ? false
        : true
      : false

export type OptionalKeys<Type extends object> =
  Type extends unknown // For distributing `Type`
    ? (keyof { [Key in keyof Type as
      IsOptionalKeyOf<Type, Key> extends false
        ? never
        : Key
      ]: never
    }) & keyof Type // Intersect with `keyof Type` to ensure result of `OptionalKeysOf<Type>` is always assignable to `keyof Type`
    : never // Should never happen
