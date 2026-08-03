import type { Fragment } from './jsx-runtime'
import h, { Element } from './jsx-runtime'

export { markdown } from './markdown'

export function pack(children: Fragment[]): Fragment {
  return children.length === 1 ? children[0]! : h.template(...children.flatMap(unpack))
}

export function unpack(fragment: Fragment): Fragment[] {
  if (fragment instanceof Element && fragment.type === h.Fragment)
    return fragment.children.flatMap(unpack)
  return [fragment]
}

export function raw(strings: TemplateStringsArray, ...values: Fragment[]): Fragment {
  return pack(strings.flatMap((s, i) => values[i] ? [s, values[i]] : [s]))
}

export function transform(
  fragment: Fragment,
  visitors:
    & { text?: (text: string) => Iterable<Fragment> }
    & { [K in keyof JSX.IntrinsicElements]?: (element: Element<K>) => Iterable<Fragment> },
): Fragment {
  if (typeof fragment === 'string' && visitors.text) {
    fragment = pack(Array.from(visitors.text(fragment)))
  }
  else if (fragment instanceof Element) {
    fragment.children = fragment.children
      .flatMap(child => unpack(transform(child, visitors)))
    const visit = visitors[fragment.type]
    if (visit)
      fragment = pack(Array.from(visit(fragment as any)))
  }
  return fragment
}

const lazy = (inner: any) => () => inner

export function* replace(
  string: string,
  pattern: string | RegExp,
  replacer: Fragment | ((substring: string, ...args: any[]) => Fragment),
): Generator<Fragment> {
  if (typeof pattern === 'string')
    pattern = new RegExp(RegExp.escape(pattern))
  if (typeof replacer !== 'function')
    replacer = lazy(replacer)

  if (!pattern.global) {
    const match = pattern.exec(string)
    if (match) {
      const index = match.index
      if (index > 0)
        yield string.substring(0, index)
      yield replacer(match[0], ...match.slice(1), index, string)
      const after = index + match[0].length
      if (after < string.length)
        yield string.substring(after)
    }
    else {
      yield string
    }
    return
  }

  let match: RegExpExecArray | null
  let lastIndex = 0
  pattern.lastIndex = 0
  // eslint-disable-next-line no-cond-assign
  while (match = pattern.exec(string)) {
    const matched = match[0]
    const index = match.index
    if (index > lastIndex)
      yield string.substring(lastIndex, index)
    yield replacer(match[0], ...match.slice(1), index, string)
    lastIndex = index + matched.length
    if (matched.length === 0 && pattern.lastIndex === index)
      pattern.lastIndex++
  }
  if (lastIndex < string.length)
    yield string.substring(lastIndex)
}
