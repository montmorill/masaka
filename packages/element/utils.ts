import type { Fragment } from './jsx-runtime'
import h, { Element } from './jsx-runtime'

export { markdown } from './markdown'

export function pack(...children: Fragment[]): Fragment {
  return children.length === 1 ? children[0]! : h.template(...children)
}

export function raw(strings: TemplateStringsArray, ...values: Fragment[]): Fragment {
  return pack(...strings.flatMap((s, i) => values[i] ? [s, values[i]] : [s]))
}

type Transformer = (element: Element) => Fragment

export function transform(
  fragment: Fragment,
  visitors: Partial<Record<keyof JSX.IntrinsicElements, Transformer>>,
): Fragment {
  if (fragment instanceof Element) {
    visitors[fragment.type]?.(fragment)
    fragment.children = fragment.children
      .map(child => transform(child, visitors))
  }
  return fragment
}
