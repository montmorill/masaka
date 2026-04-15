import type { XOR } from 'ts-xor'
import h, { Element, Fragment } from './jsx-runtime'
import { markdown } from './markdown'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      text: object
      mention: XOR<
        { everyone: true },
        { user: string },
        { channel: string }
      >
    }
  }
}

function raw(strings: TemplateStringsArray, ...values: Fragment[]): Element {
  return h.template(...strings.flatMap((s, i) => values[i] ? [s, values[i]] : [s]).flat())
}

export { Element, Fragment, markdown, raw }
export default Object.assign(h, { Element, Fragment, markdown, raw })
