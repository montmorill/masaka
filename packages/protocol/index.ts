import type { Element } from '@yarkjs/element'

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
    link: { href: string, title?: string }
    audio: { src: string, title?: string, size?: number }
    image: { src: string, title?: string, size?: number, width?: number, height?: number }
    video: { src: string, title?: string, size?: number, width?: number, height?: number }
    file: { src: string, title?: string, size?: number }
    message: Message
    quote: Quote
    forward: Forward
    author: Partial<User | Member>
  }
}

export interface Message {
  id?: string
  timestamp?: number
}

export interface Quote {
  id?: string
  timestamp?: number
}

export interface Forward {}

export interface User {
  id: string
  name?: string
}

export interface Member extends User {
  channel?: Channel['id']
  guild?: Guild['id']
  role?: 'owner' | 'admin' | 'member'
}

export interface Reaction {
  /** 表态对象（消息/帖子/评论/回复）id */ target: string
  /** 表态对象类型 */ type: 'message' | 'thread' | 'post' | 'reply'
  /** 表态用户 */ user: User['id']
  /** 表情 id */ emoji: string
  /** 所在频道 */ guild?: Guild['id']
  /** 所在子频道 */ channel?: Channel['id']
}

export interface Channel {
  id: string
  name?: string
  guild?: Guild['id']
}

export interface Guild {
  id: string
  name?: string
}

export interface SessionTypes {
  user: User
  member: Member
  channel: Channel
  guild: Guild
}

export type Session = SessionTypes[keyof SessionTypes]

export interface EventMap {
  message: [action: 'create' | 'delete' | 'update', Element<'message'>, operator: User]
  guild: [action: 'create' | 'update' | 'delete', guild: Guild, operator: Member]
  channel: [action: 'create' | 'update' | 'delete', channel: Channel, operator: Member]
  member: [action: 'create' | 'update' | 'delete', member: Member, operator: Member]
  reaction: [action: 'create' | 'delete', reaction: Reaction, operator: Member]
  friend: [action: 'create' | 'delete', user: User, operator: Member]
}
