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
    quote: Message
    author: Partial<User & GuildMember>
  }
}

export interface Channel {
  id: string
  type: ChannelType
  name?: string
  parentId?: string
  position?: number
}

export enum ChannelType {
  Text = 0,
  Direct = 1,
  Category = 2,
  Voice = 3,
}

export interface Guild {
  id: string
  name?: string
  avatar?: string
}

export interface GuildRole {
  id: string
  name?: string
  color?: number
  position?: number
  permissions?: bigint
  hoist?: boolean
  mentionable?: boolean
}

export interface Emoji {
  id: string
  name?: string
}

export interface User {
  id: string
  name?: string
  nick?: string
  avatar?: string
  discriminator?: string
  isBot?: boolean
}

export interface Friend {
  user?: User
  nick?: string
}

export interface GuildMember {
  user?: User
  name?: string
  nick?: string
  avatar?: string
  title?: string
  roles?: GuildRole[]
  joinedAt?: number
}

export interface Login {
  // TODO: sn: number
  // TODO: adapter: string
  user?: User
  platform?: string
  hidden?: boolean
  status: Status
  // TODO: features: string[]
}

export enum Status {
  Offline = 0,
  Online = 1,
  Connecting = 2,
  Disconnecting = 3,
  Reconnecting = 4,
}

export interface Message {
  id?: string
  channel?: Channel
  guild?: Guild
  user?: User
  member?: GuildMember
  element?: Element
  timestamp?: number
  quote?: Message
  createdAt?: number
  updatedAt?: number
}

export interface Button {
  id: string
}

export interface Command {
  name: string
  description: Record<string, string>
  arguments: Command.Declaration[]
  options: Command.Declaration[]
  children: Command[]
}

export namespace Command {
  export interface Declaration {
    name: string
    description: Record<string, string>
    type: string
    required: boolean
  }
}

export interface Argv {
  name: string
  arguments: any[]
  options: Record<string, unknown>
}

type PartialWithPick<T, K extends keyof T> = Partial<T> & Pick<T, K>

export interface SendOptions {
  linkPreview?: boolean
}

export interface Upload {
  type: string
  filename?: string
  data: ArrayBuffer
}

export interface Response {
  status: number
  statusText?: string
  body?: ArrayBuffer
  headers?: Headers
}

export interface List<T = any> {
  data: T[]
  next?: string
}

export interface BidiList<T = any> {
  data: T[]
  prev?: string
  next?: string
}

export type Direction = 'before' | 'after' | 'around'

export type Order = 'asc' | 'desc'

type Genres = 'friend' | 'channel' | 'guild' | 'guild-member' | 'guild-role' | 'guild-file' | 'guild-emoji'
type Actions = 'added' | 'deleted' | 'updated'

export type EventName =
  | `${Genres}-${Actions}`
  | 'message'
  | 'message-deleted'
  | 'message-updated'
  | 'message-pinned'
  | 'message-unpinned'
  | 'interaction/command'
  | 'reaction-added'
  | 'reaction-deleted'
  | 'reaction-deleted/one'
  | 'reaction-deleted/all'
  | 'reaction-deleted/emoji'
  | 'send'
  | 'friend-request'
  | 'guild-request'
  | 'guild-member-request'

export interface Event {
  sn: number
  type: string
  login: Login
  selfId: string
  platform: string
  timestamp: number
  argv?: Argv
  channel?: Channel
  guild?: Guild
  friend?: Friend
  member?: GuildMember
  message?: Message
  operator?: User
  emoji?: Emoji
  role?: GuildRole
  user?: User
  button?: Button
  referrer: any
  _type?: string
  _data?: any
}

/** 事件基础字段（由适配器的 adapt() 统一填充） */
export interface EventBase {
  /** 事件 ID */ id?: string
  /** 序列号 */ sn?: number
  /** 事件类型 */ type: EventType
  /** 平台名称 */ platform: string
  /** 接收者的平台账号 */ self_id: string
  /** 事件时间戳（毫秒） */ timestamp: number
  /** 登录信息 */ login?: Login
}

export interface Resources {
  login: Login
  message: Message
  channel: Channel
  guild?: Guild
  member?: GuildMember
  user?: User
}

export interface Events {
  'guild-added': { guild: Guild, operator?: User }
  'guild-updated': { guild: Guild, operator?: User }
  'guild-removed': { guild: Guild, operator?: User }
  'guild-member-added': { guild: Guild, member: GuildMember, operator?: User }
  'guild-member-updated': { guild: Guild, member: GuildMember, operator?: User }
  'guild-member-removed': { guild: Guild, member: GuildMember, operator?: User }
  'guild-member-request': { guild: Guild, member: GuildMember }
  'guild-role-created': { guild: Guild, role: GuildRole, operator?: User }
  'guild-role-updated': { guild: Guild, role: GuildRole, operator?: User }
  'guild-role-deleted': { guild: Guild, role: GuildRole, operator?: User }
  'login-added': { login: Login }
  'login-updated': { login: Login }
  'login-removed': { login: Login }
  'message-created': { message: Message, channel: Channel, guild?: Guild, member?: GuildMember, user?: User }
  'message-updated': { message: Message, channel: Channel, guild?: Guild, member?: GuildMember, user?: User }
  'message-deleted': { message: Message, channel?: Channel, guild?: Guild, operator?: User }
  'reaction-added': { message: Message, channel: Channel, guild?: Guild, member?: GuildMember, user?: User, emoji: Emoji }
  'reaction-removed': { message: Message, channel: Channel, guild?: Guild, member?: GuildMember, user?: User, emoji: Emoji }
  /** 好友请求事件（收到用户添加机器人等） */
  'friend-request': { user: User }
  /** 平台原生事件透传：_type 形如 `qq.channel-create`，_data 为原始负载 */
  'internal': { _type: string, _data: unknown }
}

export type EventType = keyof Events

export type EventMap = {
  [T in EventType]: [event: EventBase & { type: T } & Events[T]]
}

/** 全部事件名（SatoriServer 据此注册监听器） */
export const EventTypes = [
  'guild-added',
  'guild-updated',
  'guild-removed',
  'guild-member-added',
  'guild-member-updated',
  'guild-member-removed',
  'guild-member-request',
  'guild-role-created',
  'guild-role-updated',
  'guild-role-deleted',
  'login-added',
  'login-updated',
  'login-removed',
  'message-created',
  'message-updated',
  'message-deleted',
  'reaction-added',
  'reaction-removed',
  'friend-request',
  'internal',
] as const satisfies readonly EventType[]

export interface Methods {
  // message
  createMessage(channelId: string, element: Element, referrer?: any, options?: SendOptions): Promise<Message[]>
  sendMessage(channelId: string, element: Element, referrer?: any, options?: SendOptions): Promise<string[]>
  sendPrivateMessage(userId: string, element: Element, guildId?: string, options?: SendOptions): Promise<string[]>
  getMessage(channelId: string, messageId: string): Promise<Message>
  getMessageList(channelId: string, next?: string, direction?: Direction, limit?: number, order?: Order): Promise<BidiList<Message>>
  getMessageIter(channelId: string): AsyncIterable<Message>
  editMessage(channelId: string, messageId: string, element: Element): Promise<void>
  deleteMessage(channelId: string, messageId: string): Promise<void>

  // reaction
  createReaction(channelId: string, messageId: string, emojiId: string): Promise<void>
  deleteReaction(channelId: string, messageId: string, emojiId: string, userId?: string): Promise<void>
  clearReaction(channelId: string, messageId: string, emojiId?: string): Promise<void>
  getReactionList(channelId: string, messageId: string, emojiId: string, next?: string): Promise<List<User>>
  getReactionIter(channelId: string, messageId: string, emojiId: string): AsyncIterable<User>

  // upload
  createUpload(...uploads: Upload[]): Promise<string[]>

  // user
  getLogin(): Promise<Login>
  getUser(userId: string, guildId?: string): Promise<User>
  getFriendList(next?: string): Promise<List<Friend>>
  getFriendIter(): AsyncIterable<Friend>
  deleteFriend(userId: string): Promise<void>

  // guild
  getGuild(guildId: string): Promise<Guild>
  getGuildList(next?: string): Promise<List<Guild>>
  getGuildIter(): AsyncIterable<Guild>

  // guild member
  getGuildMember(guildId: string, userId: string): Promise<GuildMember>
  getGuildMemberList(guildId: string, next?: string): Promise<List<GuildMember>>
  getGuildMemberIter(guildId: string): AsyncIterable<GuildMember>
  kickGuildMember(guildId: string, userId: string, permanent?: boolean): Promise<void>
  muteGuildMember(guildId: string, userId: string, duration: number, reason?: string): Promise<void>
  setGuildMemberRole(guildId: string, userId: string, roleId: string): Promise<void>
  unsetGuildMemberRole(guildId: string, userId: string, roleId: string): Promise<void>
  getGuildMemberRoleList(guildId: string, userId: string, next?: string): Promise<List<PartialWithPick<GuildRole, 'id'>>>

  // role
  getGuildRoleList(guildId: string, next?: string): Promise<List<GuildRole>>
  getGuildRoleIter(guildId: string): AsyncIterable<GuildRole>
  createGuildRole(guildId: string, data: Partial<GuildRole>): Promise<GuildRole>
  updateGuildRole(guildId: string, roleId: string, data: Partial<GuildRole>): Promise<void>
  deleteGuildRole(guildId: string, roleId: string): Promise<void>

  // channel
  getChannel(channelId: string, guildId?: string): Promise<Channel>
  getChannelList(guildId: string, next?: string): Promise<List<Channel>>
  getChannelIter(guildId: string): AsyncIterable<Channel>
  createDirectChannel(userId: string, guildId?: string): Promise<Channel>
  createChannel(guildId: string, data: Partial<Channel>): Promise<Channel>
  updateChannel(channelId: string, data: Partial<Channel>): Promise<void>
  deleteChannel(channelId: string): Promise<void>
  muteChannel(channelId: string, guildId?: string, enable?: boolean): Promise<void>

  // request
  handleFriendRequest(messageId: string, approve: boolean, comment?: string): Promise<void>
  handleGuildRequest(messageId: string, approve: boolean, comment?: string): Promise<void>
  handleGuildMemberRequest(messageId: string, approve: boolean, comment?: string): Promise<void>

  // commands
  updateCommands(commands: Command[]): Promise<void>
}
