import type { Element } from '@yarkjs/element'
import type { GuildMember, User } from './resources'

export * from './api'
export * from './event'
export * from './resources'

declare module '@yarkjs/element' {
  interface Elements {
    mention(attrs: { everyone: true }): Element<'mention'>
    mention(attrs: { user: string }): Element<'mention'>
    mention(attrs: { channel: string }): Element<'mention'>
    button(attrs: { text: string }): Element<'button'>
    button(attrs: { href: string }): Element<'button'>
    button(attrs: { action: string }): Element<'button'>
  }

  interface ElementProps {
    mention: { everyone?: true, user?: string, channel?: string }
    link: { href: string, title?: string }
    audio: { src: string, title?: string, size?: number }
    image: { src: string, title?: string, size?: number, width?: number, height?: number }
    video: { src: string, title?: string, size?: number, width?: number, height?: number }
    file: { src: string, title?: string, size?: number }
    message: { id?: string, timestamp?: number }
    quote: { id?: string, timestamp?: number }
    author: Partial<User> & Partial<GuildMember>
  }
}
