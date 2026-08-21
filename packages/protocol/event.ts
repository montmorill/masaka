import type {
  Channel,
  Emoji,
  Guild,
  GuildMember,
  GuildRole,
  Login,
  Message,
  Reaction,
  User,
} from './resources'

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

/** 各类事件的资源负载；消息的 channel/guild/member/user 已提升到顶层 */
export interface EventExtras {
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
  'reaction-added': { reaction: Reaction, channel: Channel, guild?: Guild, member?: GuildMember, user?: User, emoji?: Emoji }
  'reaction-removed': { reaction: Reaction, channel: Channel, guild?: Guild, member?: GuildMember, user?: User, emoji?: Emoji }
  /** 好友请求事件（收到用户添加机器人等） */
  'friend-request': { user: User }
  /** 平台原生事件透传：_type 形如 `qq.channel-create`，_data 为原始负载 */
  'internal': { _type: string, _data: unknown }
}

export type EventType = keyof EventExtras

/** 单个事件：基础字段 + 该事件类型的资源负载 */
export type Event<T extends EventType = EventType> = EventBase & { type: T } & EventExtras[T]

/** 适配器解析器的返回值：不含基础字段的资源负载 */
export type EventBody<T extends EventType = EventType> = EventExtras[T]

export type EventMap = {
  [T in EventType]: [event: Event<T>]
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
