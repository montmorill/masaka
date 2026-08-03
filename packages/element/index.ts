import h from './jsx-runtime'
import * as utils from './utils'

export * from './jsx-runtime'
export * from './utils'

declare module './jsx-runtime' {
  interface Elements {
    mention(attrs: { everyone: true }): Element<'mention'>
    mention(attrs: { user: string }): Element<'mention'>
    mention(attrs: { channel: string }): Element<'mention'>
  }
}

export default Object.assign(h, utils)
