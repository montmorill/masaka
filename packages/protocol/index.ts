import type { Element } from '@yarkjs/element'

declare module '@yarkjs/element' {
  interface ElementProps {
    message: Message
    author: User
  }
}

export interface Message {
  id: string
  forward?: true
}

export interface User {
  id: string
  name?: string
}

export interface Member extends User {
  channel: Channel
}

export interface Channel {
  id: string
  name?: string
  guild: Guild
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
  message: [session: Member, message: Element<'message'>]
}
