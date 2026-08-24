import type { Fragment, JSXElements } from '@yarkjs/element/jsx-runtime'
import { lazy } from '@yarkjs/utils'
import h, { Element } from '@yarkjs/element/jsx-runtime'

export function pack(children: Fragment[], wrap?: false): Fragment
export function pack(children: Fragment[], wrap: true): Element
export function pack(children: Fragment[], wrap?: boolean): Fragment | Element {
  if (children.length !== 1)
    return h.template(...children.flatMap(unpack))
  const child = children[0]!
  return !wrap || child instanceof Element ? child : h.template(child)
}

export function unpack(fragment: Fragment): Fragment[] {
  if (fragment instanceof Element && fragment.type === h.Fragment)
    return fragment.children.flatMap(unpack)
  return [fragment]
}

export function raw(strings: TemplateStringsArray, ...values: Fragment[]): Fragment {
  return pack(strings.flatMap((s, i) => values[i] ? [s, values[i]] : [s]))
}

export type Transformer<T extends Fragment = Fragment> = (fragment: T) => Fragment[]
export type ElementVisitors = { [T in keyof JSXElements]?: Transformer<Element<T>> }
export function transform(visitors: { text?: Transformer<string> } & ElementVisitors): Transformer {
  return function transform(fragment: Fragment) {
    if (typeof fragment === 'string' && visitors.text)
      return Array.from(visitors.text(fragment))
    if (fragment instanceof Element) {
      fragment.children = fragment.children.flatMap(transform)
      const visit = visitors[fragment.type]
      if (visit)
        return Array.from(visit(fragment as any))
    }
    return [fragment]
  }
}

transform.text = (text: Transformer<string>): Transformer => transform({ text })

export function* replace(
  content: string,
  pattern: string | RegExp,
  replacer: Fragment | ((...args: string[]) => Fragment),
): Generator<Fragment> {
  if (typeof pattern === 'string')
    pattern = new RegExp(RegExp.escape(pattern))
  if (typeof replacer !== 'function')
    replacer = lazy(replacer)

  if (!pattern.global) {
    const match = pattern.exec(content)
    if (!match) {
      yield content
      return
    }
    const index = match.index
    if (index > 0)
      yield content.substring(0, index)
    yield replacer(match[0], ...match.slice(1))
    const after = index + match[0].length
    if (after < content.length)
      yield content.substring(after)
    return
  }

  let match: RegExpExecArray | null
  let lastIndex = 0
  pattern.lastIndex = 0
  // eslint-disable-next-line no-cond-assign
  while (match = pattern.exec(content)) {
    const matched = match[0]
    const index = match.index
    if (index > lastIndex)
      yield content.substring(lastIndex, index)
    yield replacer(match[0], ...match.slice(1))
    lastIndex = index + matched.length
    if (matched.length === 0 && pattern.lastIndex === index)
      pattern.lastIndex++
  }
  if (lastIndex < content.length)
    yield content.substring(lastIndex)
}

transform.replace = (
  pattern: string | RegExp,
  replacer: Fragment | ((...args: string[]) => Fragment),
): Transformer => {
  if (typeof pattern === 'string')
    pattern = new RegExp(RegExp.escape(pattern))
  if (typeof replacer !== 'function')
    replacer = lazy(replacer)
  return transform.text(content => Array.from(replace(content, pattern, replacer)))
}
