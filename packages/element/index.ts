import type { Awaitable } from 'cosmokit'
import h, { Element, Fragment } from './jsx-runtime'
import { markdown } from './markdown'

export type { Elements } from './jsx-runtime'

declare module './jsx-runtime' {
  interface Elements {
    mention(attrs: { everyone: true }): Element<'mention'>
    mention(attrs: { user: string }): Element<'mention'>
    mention(attrs: { channel: string }): Element<'mention'>
    stream: { children: Awaitable<MaybeFragment>[] }
  }
}

function raw(strings: TemplateStringsArray, ...values: Fragment[]): Element {
  return h.template(...strings.flatMap((s, i) => values[i] ? [s, values[i]] : [s]))
}

export { Element, Fragment, markdown, raw }
export default Object.assign(h, { Element, Fragment, markdown, raw })
