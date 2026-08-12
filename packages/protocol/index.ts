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
    audio: { src: string, title?: string }
    image: { src: string, title?: string }
    video: { src: string, title?: string }
    file: { src: string, title?: string }
    message: Message
    quote: Quote
    author: User | Member
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

export interface User {
  id: string
  name?: string
}

export interface Member extends User {
  channel: Channel['id']
  role?: 'owner' | 'admin' | 'member'
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
  message: [Element<'message'>]
}
