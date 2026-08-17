export function toTitleCase<S extends string>(name: S): Capitalize<S> {
  return (name ? name[0]!.toUpperCase() + name.slice(1) : '') as Capitalize<S>
}

export function split(name: string): string[] {
  return name
    .replaceAll(/[_-]/g, ' ')
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.toLowerCase())
}

export default {
  snake: parts => parts.join('_'),
  kebab: parts => parts.join('-'),
  pascal: parts => parts.map(part => toTitleCase(part)).join(''),
  camel: parts => parts.map((part, index) => index ? toTitleCase(part) : part).join(''),
} satisfies Record<string, (parts: string[]) => string>

/** Whether the character is a lowercase letter, not a digit or symbol. */
type IsLower<C extends string> = C extends Lowercase<C> ? C extends Uppercase<C> ? false : true : false

/** Flush a word into the list, skipping empty words. */
type PushWord<Word extends string, Words extends string[]> = Word extends '' ? Words : [...Words, Word]

type SplitInner<S extends string, Prev extends string, Word extends string, Words extends string[]> =
  S extends `${infer C}${infer Rest}`
    ? C extends Uppercase<C>
      ? C extends Lowercase<C>
        ? C extends '-' | '_'
          ? SplitInner<Rest, '', '', PushWord<Word, Words>> // separator: start a new word
          : SplitInner<Rest, C, `${Word}${C}`, Words> // digits and other symbols pass through
        : IsLower<Prev> extends true
          ? SplitInner<Rest, C, Lowercase<C>, PushWord<Word, Words>> // camelCase boundary
          : Rest extends `${infer N}${string}`
            ? IsLower<N> extends true
              ? SplitInner<Rest, C, Lowercase<C>, PushWord<Word, Words>> // acronym boundary
              : SplitInner<Rest, C, `${Word}${Lowercase<C>}`, Words>
            : SplitInner<Rest, C, `${Word}${Lowercase<C>}`, Words>
      : SplitInner<Rest, C, `${Word}${C}`, Words>
    : PushWord<Word, Words>

/** Split a name into lowercase word parts, mirroring the runtime `split`. */
export type Split<S extends string> = SplitInner<S, '', '', []>

type Join<P, Sep extends string> =
  P extends [infer Head extends string, ...infer Tail extends string[]]
    ? Tail extends [] ? Head : `${Head}${Sep}${Join<Tail, Sep>}`
    : ''

type CapitalizeParts<P extends string[]> = { [K in keyof P]: Capitalize<P[K]> }

type CamelParts<P extends string[]> =
  P extends [infer Head extends string, ...infer Tail extends string[]]
    ? [Head, ...CapitalizeParts<Tail>]
    : P

export type MaybeSplit<S extends string | string[]> = S extends string ? Split<S> : S

/** Rewrite a key to snake_case */
export type SnakeCase<S extends string | string[]> = Join<MaybeSplit<S>, '_'>

/** Rewrite a key to kebab-case */
export type KebabCase<S extends string | string[]> = Join<MaybeSplit<S>, '-'>

/** Rewrite a key to PascalCase */
export type PascalCase<S extends string | string[]> = Join<CapitalizeParts<MaybeSplit<S>>, ''>

/** Rewrite a key to camelCase */
export type CamelCase<S extends string | string[]> = Join<CamelParts<MaybeSplit<S>>, ''>
