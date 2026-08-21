import type {
  Channel,
  Emoji,
  Friend,
  Guild,
  GuildMember,
  GuildRole,
  Login,
  Message,
  User,
} from './resources'

/** 各 action 的参数与返回数据类型 */
export interface ActionMap {
  'message.create': { params: { channel_id: string, guild_id?: string, content: string }, data: Message }
  'message.delete': { params: { channel_id: string, message_id: string }, data: undefined }
  'message.get': { params: { channel_id: string, message_id: string }, data: Message }
  'message.list': { params: { channel_id?: string, guild_id?: string, next?: string, limit?: number }, data: { data: Message[], next?: string } }
  'message.update': { params: { channel_id: string, message_id: string, content?: string }, data: Message }
  'channel.get': { params: { channel_id: string }, data: Channel }
  'channel.list': { params: { guild_id: string, next?: string, limit?: number }, data: { data: Channel[], next?: string } }
  'channel.create': { params: { guild_id: string, data: Partial<Channel> }, data: Channel }
  'channel.update': { params: { channel_id: string, data: Partial<Channel> }, data: Channel }
  'channel.delete': { params: { channel_id: string }, data: undefined }
  'guild.get': { params: { guild_id: string }, data: Guild }
  'guild.list': { params: { next?: string, limit?: number }, data: { data: Guild[], next?: string } }
  'guild.member.get': { params: { guild_id: string, user_id: string }, data: GuildMember }
  'guild.member.list': { params: { guild_id: string, next?: string, limit?: number }, data: { data: GuildMember[], next?: string } }
  'guild.member.kick': { params: { guild_id: string, user_id: string, permanent?: boolean }, data: undefined }
  'guild.member.approve': { params: { guild_id: string, user_id: string, approve: boolean }, data: undefined }
  'guild.member.role.set': { params: { guild_id: string, user_id: string, role_id: string }, data: undefined }
  'guild.member.role.unset': { params: { guild_id: string, user_id: string, role_id: string }, data: undefined }
  'guild.role.list': { params: { guild_id: string }, data: { data: GuildRole[] } }
  'guild.role.create': { params: { guild_id: string, data: Partial<GuildRole> }, data: GuildRole }
  'guild.role.update': { params: { guild_id: string, role_id: string, data: Partial<GuildRole> }, data: GuildRole }
  'guild.role.delete': { params: { guild_id: string, role_id: string }, data: undefined }
  'reaction.create': { params: { channel_id: string, message_id: string, emoji: string | Emoji }, data: undefined }
  'reaction.delete': { params: { channel_id: string, message_id: string, emoji: string | Emoji }, data: undefined }
  'reaction.clear': { params: { channel_id: string, message_id: string, emoji?: string | Emoji }, data: undefined }
  'user.get': { params: { user_id: string }, data: User }
  'friend.list': { params: { next?: string, limit?: number }, data: { data: Friend[], next?: string } }
  'login.get': { params: object, data: { data: Login[] } }
  'internal': { params: { _type: string, _data?: unknown }, data: unknown }
}

export type Action = keyof ActionMap

/** Satori 请求体；部分客户端直接把 params 当请求体（见 server.ts 兼容逻辑） */
export interface Request<A extends Action = Action> {
  action: A
  params: ActionMap[A]['params']
  /** 发起请求的频道（用于被动调用） */ channel_id?: string
}

/** Satori 响应体 */
export interface Response<A extends Action = Action> {
  code: number
  message?: string
  data?: ActionMap[A]['data']
}

/** Satori 错误码 */
export enum ErrorCode {
  OK = 0,
  /** 操作不支持 */ NOT_IMPLEMENTED = 1,
  /** 参数不合法 */ BAD_REQUEST = 2,
  /** 无权限 */ FORBIDDEN = 3,
  /** 资源不存在 */ NOT_FOUND = 4,
  /** 内部错误 */ INTERNAL_ERROR = 5,
  /** 请求过于频繁 */ RATE_LIMITED = 6,
  /** 未认证 */ AUTH_FAILED = 7,
}

/** WebSocket 信令操作码 */
export enum Op {
  /** 服务端推送事件 */ Event = 0,
  /** 客户端或服务端发送心跳 */ Ping = 1,
  /** 心跳确认 */ Pong = 2,
  /** 客户端鉴权 */ Identify = 3,
  /** 服务端就绪 */ Ready = 4,
}

export interface Signal<O extends Op = Op> {
  op: O
  body?: unknown
}

export interface IdentifySignal extends Signal<Op.Identify> {
  body: { token?: string, sn?: number }
}

export interface ReadySignal extends Signal<Op.Ready> {
  body: { logins: Login[], proxy_urls: string[] }
}

export interface EventSignal extends Signal<Op.Event> {
  body: import('./event').Event
}
