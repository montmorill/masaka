import type { Element } from '@yarkjs/element'

/** 用户对象 */
export interface User {
  /** 用户 ID */ id: string
  /** 用户名称 */ name?: string
  /** 用户昵称 */ nick?: string
  /** 用户头像 URL */ avatar?: string
  /** 是否为机器人 */ is_bot?: boolean
}

/** 群组对象 */
export interface Guild {
  /** 群组 ID */ id: string
  /** 群组名称 */ name?: string
  /** 群组头像 URL */ avatar?: string
}

/** 群组角色对象 */
export interface GuildRole {
  /** 角色 ID */ id: string
  /** 角色名称 */ name?: string
  /** 角色颜色 */ color?: number
  /** 角色的排序位置 */ position?: number
  /** 角色具备的权限列表 */ permissions?: string[]
}

/** 群组成员对象 */
export interface GuildMember {
  /** 用户对象 */ user?: User
  /** 用户在群组中的名称 */ nick?: string
  /** 用户在群组中的头像 */ avatar?: string
  /** 加入时间（Unix 时间戳，毫秒） */ joined_at?: number
  /** 成员的角色列表 */ roles?: GuildRole[]
}

/** 频道类型：0 文本频道，1 私聊频道，2 分类频道，3 语音频道 */
export enum ChannelType {
  Text = 0,
  Direct = 1,
  Category = 2,
  Voice = 3,
}

/** 频道对象 */
export interface Channel {
  /** 频道 ID */ id: string
  /** 频道类型 */ type?: ChannelType
  /** 频道名称 */ name?: string
  /** 父频道 ID */ parent_id?: string
}

/** 消息对象 */
export interface Message {
  /** 消息 ID */ id: string
  /** 消息内容（消息元素树；推送前序列化为 Satori 内容串） */ content?: Element<'message'>
  /** 消息所在频道（事件中会提升到顶层） */ channel?: Channel
  /** 消息所在群组（事件中会提升到顶层） */ guild?: Guild
  /** 消息发送者（事件中会提升到顶层） */ member?: GuildMember
  /** 消息发送者（事件中会提升到顶层） */ user?: User
  /** 发送时间（Unix 时间戳，毫秒） */ created_at?: number
  /** 更新时间（Unix 时间戳，毫秒） */ updated_at?: number
}

/** 登录状态：0 离线，1 在线，2 连接中，3 断开，4 重连 */
export enum LoginStatus {
  Offline = 0,
  Online = 1,
  Connect = 2,
  Disconnect = 3,
  Reconnect = 4,
}

/** 登录对象 */
export interface Login {
  /** 当前登录用户 */ user?: User
  /** 平台账号 */ self_id?: string
  /** 平台名称 */ platform?: string
  /** 登录状态 */ status: LoginStatus
  /** 序列号 */ sn?: number
}

/** 好友对象 */
export interface Friend {
  /** 与 user.id 一致 */ id: string
  /** 用户对象 */ user: User
}

/** 表情对象 */
export interface Emoji {
  /** 表情 ID */ id?: string
  /** 表情名称 */ name?: string
}

/** 表态对象 */
export interface Reaction {
  /** 表态 ID */ id?: string
  /** 被表态的消息 */ message?: Message
  /** 表态所在频道 */ channel?: Channel
  /** 表态所在群组 */ guild?: Guild
  /** 表态用户（群组成员） */ member?: GuildMember
  /** 表态用户 */ user?: User
  /** 表情对象 */ emoji?: Emoji
}

/** 交互按钮对象 */
export interface Button {
  /** 按钮 ID */ id?: string
  /** 按钮类型 */ type?: number
}

/** 交互指令参数对象 */
export interface Argv {
  /** 指令名 */ name: string
  /** 指令参数列表 */ arguments?: string[]
  /** 指令选项 */ options?: Record<string, string | boolean>
}
