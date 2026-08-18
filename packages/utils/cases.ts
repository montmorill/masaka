export function capitalize<S extends string>(name: S): Capitalize<S> {
  return (name ? name[0]!.toUpperCase() + name.slice(1) : '') as Capitalize<S>
}

/** Whether the character is a lowercase letter, not a digit or symbol. */
type IsLower<C extends string> = C extends Lowercase<C> ? C extends Uppercase<C> ? false : true : false

/** Flush a word into the list, skipping empty words. */
type PushIf<Cur extends string, Acc extends string[]> = Cur extends '' ? Acc : [...Acc, Cur]

type SplitWordsInner<S extends string, Prev extends string, Cur extends string, Acc extends string[]> =
  S extends `${infer C}${infer Rest}`
    ? C extends Uppercase<C>
      ? C extends Lowercase<C>
        ? C extends '-' | '_'
          ? SplitWordsInner<Rest, '', '', PushIf<Cur, Acc>> // separator: start a new word
          : SplitWordsInner<Rest, C, `${Cur}${C}`, Acc> // digits and other symbols pass through
        : IsLower<Prev> extends true
          ? SplitWordsInner<Rest, C, Lowercase<C>, PushIf<Cur, Acc>> // camelCase boundary
          : Rest extends `${infer N}${string}`
            ? IsLower<N> extends true
              ? SplitWordsInner<Rest, C, Lowercase<C>, PushIf<Cur, Acc>> // acronym boundary
              : SplitWordsInner<Rest, C, `${Cur}${Lowercase<C>}`, Acc>
            : SplitWordsInner<Rest, C, `${Cur}${Lowercase<C>}`, Acc>
      : SplitWordsInner<Rest, C, `${Cur}${C}`, Acc>
    : PushIf<Cur, Acc>

/** Split a name into lowercase word parts, mirroring the runtime `split`. */
export type SplitWords<S extends string> = SplitWordsInner<S, '', '', []>

export function splitWords<S extends string>(name: S): SplitWords<S> {
  return name
    .replaceAll(/[_-]/g, ' ')
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.toLowerCase()) as any
}

type Join<P, Sep extends string> =
  P extends [infer Head extends string, ...infer Tail extends string[]]
    ? Tail extends [] ? Head : `${Head}${Sep}${Join<Tail, Sep>}`
    : ''

/** Rewrite a key to snake_case */
export type SnakeCase<S extends string[]> = Join<S, '_'>

/** Rewrite a key to kebab-case */
export type KebabCase<S extends string[]> = Join<S, '-'>

type CapitalizeParts<P extends string[]> = { [K in keyof P]: Capitalize<P[K]> }

/** Rewrite a key to PascalCase */
export type PascalCase<S extends string[]> = Join<CapitalizeParts<S>, ''>

type CamelParts<P extends string[]> =
  P extends [infer Head extends string, ...infer Tail extends string[]]
    ? [Head, ...CapitalizeParts<Tail>]
    : P

/** Rewrite a key to camelCase */
export type CamelCase<S extends string[]> = Join<CamelParts<S>, ''>

export default {
  snake: parts => parts.join('_'),
  kebab: parts => parts.join('-'),
  scream: parts => parts.map(part => part.toUpperCase()).join(''),
  pascal: parts => parts.map(part => capitalize(part)).join(''),
  camel: parts => parts.map((part, index) => index ? capitalize(part) : part).join(''),
} satisfies Record<string, (parts: string[]) => string>
