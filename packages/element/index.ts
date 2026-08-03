import type { Awaitable } from 'cosmokit'
import h from './jsx-runtime'
import * as utils from './utils'

export * from './jsx-runtime'
export * from './utils'

declare module './jsx-runtime' {
  interface Elements {
    mention(attrs: { everyone: true }): Element<'mention'>
    mention(attrs: { user: string }): Element<'mention'>
    mention(attrs: { channel: string }): Element<'mention'>
    stream: { children: Awaitable<MaybeFragment>[] }
  }
}

export default Object.assign(h, utils)
