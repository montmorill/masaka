/* eslint-disable ts/prefer-literal-enum-member */

export interface Error {
  err_code: number
  message: string
  trace_id: string
}

export enum Intents {
  /**
   * 频道相关事件
   * - GUILD_CREATE   ：机器人加入新频道
   * - GUILD_UPDATE   ：频道资料变更
   * - GUILD_DELETE   ：机器人退出频道
   * - CHANNEL_CREATE ：子频道创建
   * - CHANNEL_UPDATE ：子频道更新
   * - CHANNEL_DELETE ：子频道删除
   */
  GUILDS = 1 << 0,

  /**
   * 频道成员（Member）相关事件
   * - GUILD_MEMBER_ADD    ：成员加入
   * - GUILD_MEMBER_UPDATE ：成员资料变更
   * - GUILD_MEMBER_REMOVE ：成员被移除
   */
  GUILD_MEMBERS = 1 << 1,

  /**
   * 频道消息事件（仅 **私域** 机器人可设置此 Intent）
   * - MESSAGE_CREATE ：频道内的全部消息（不限于 @ 机器人），内容与 AT_MESSAGE_CREATE 相同
   * - MESSAGE_DELETE ：消息被删除（撤回）
   */
  GUILD_MESSAGES = 1 << 9,

  /**
   * 消息表情表态事件
   * - MESSAGE_REACTION_ADD    ：为消息添加表情表态
   * - MESSAGE_REACTION_REMOVE ：为消息删除表情表态
   */
  GUILD_MESSAGE_REACTIONS = 1 << 10,

  /**
   * 私信事件（机器人收到用户的私信）
   * - DIRECT_MESSAGE_CREATE ：收到用户发给机器人的私信消息
   * - DIRECT_MESSAGE_DELETE ：私信消息被删除（撤回）
   */
  DIRECT_MESSAGE = 1 << 12,

  /**
   * 群管理相关事件
   * - GROUP_MEMBER_ADD         : 群成员加入
   * - GROUP_MEMBER_REMOVE      : 群成员退出
   * - GROUP_JOIN_REQUEST       : 用户申请加群请求
   * @todo
   */
  GROUP_MANAGEMENT = 1 << 24,

  /**
   * 群聊与 C2C（单聊）事件
   * - C2C_MESSAGE_CREATE       ：用户单聊发消息给机器人
   * - FRIEND_ADD               ：用户添加机器人为好友
   * - FRIEND_DEL               ：用户删除机器人好友
   * - C2C_MSG_REJECT           ：用户在机器人资料卡手动关闭「主动消息」推送
   * - C2C_MSG_RECEIVE          ：用户在机器人资料卡手动开启「主动消息」推送
   * - GROUP_AT_MESSAGE_CREATE  ：用户在群里 @ 机器人收到的消息
   * - GROUP_MESSAGE_CREATE     ：全量模式下群里的每一条消息
   * - GROUP_ADD_ROBOT          ：机器人被添加到群聊
   * - GROUP_DEL_ROBOT          ：机器人被移出群聊
   * - GROUP_MSG_REJECT         ：群管理员在机器人资料页操作关闭通知
   * - GROUP_MSG_RECEIVE        ：群管理员在机器人资料页操作开启通知
   */
  GROUP_AND_C2C_EVENT = 1 << 25,

  /**
   * 互动事件
   * - INTERACTION_CREATE ：互动事件创建
   */
  INTERACTION = 1 << 26,

  /**
   * 消息审核事件
   * - MESSAGE_AUDIT_PASS   ：消息审核通过
   * - MESSAGE_AUDIT_REJECT ：消息审核不通过
   */
  MESSAGE_AUDIT = 1 << 27,

  /**
   * 论坛事件（仅 **私域** 机器人可设置此 Intent）
   * - FORUM_THREAD_CREATE          ：用户创建主题
   * - FORUM_THREAD_UPDATE          ：用户更新主题
   * - FORUM_THREAD_DELETE          ：用户删除主题
   * - FORUM_POST_CREATE            ：用户创建帖子
   * - FORUM_POST_DELETE            ：用户删除帖子
   * - FORUM_REPLY_CREATE           ：用户回复评论
   * - FORUM_REPLY_DELETE           ：用户删除评论回复
   * - FORUM_PUBLISH_AUDIT_RESULT   ：用户发表审核通过
   */
  FORUMS_EVENT = 1 << 28,

  /**
   * 音频动作事件
   * - AUDIO_START   ：音频开始播放
   * - AUDIO_FINISH  ：音频播放结束
   * - AUDIO_ON_MIC  ：用户上麦
   * - AUDIO_OFF_MIC ：用户下麦
   */
  AUDIO_ACTION = 1 << 29,

  /**
   * 公域消息事件（公域机器人消息）
   * - AT_MESSAGE_CREATE     ：收到 @ 机器人的消息
   * - PUBLIC_MESSAGE_DELETE ：频道消息被删除
   */
  PUBLIC_GUILD_MESSAGES = 1 << 30,
}

export namespace Intents {
  export const ALL = 0
    | Intents.GUILDS
    | Intents.GUILD_MEMBERS
    | Intents.GUILD_MESSAGES
    | Intents.GUILD_MESSAGE_REACTIONS
    | Intents.DIRECT_MESSAGE
    | Intents.GROUP_MANAGEMENT
    | Intents.GROUP_AND_C2C_EVENT
    | Intents.INTERACTION
    | Intents.MESSAGE_AUDIT
    | Intents.FORUMS_EVENT
    | Intents.AUDIO_ACTION
    | Intents.PUBLIC_GUILD_MESSAGES
}

export type Shard = [number, number]
export type AccessToken = `QQBot ${string}`
export type MessageId = `ROBOT1.0_${string}`
export type RefIdx = `REFIDX_${string}`

export interface Login {
  id: string
  username: string
  bot: true
  status: 1 | unknown
}

export interface User {
  /** 用户唯一标识（OpenID 格式） */ id: string
  /** 用户昵称 */ username: '' | string
  /** 是否为机器人 */ bot: boolean
  /** 跨应用统一用户 OpenID（可能为空） */ union_openid: '' | string
  /** 跨应用统一用户账号（可能为空） */ union_user_account?: string
}

export interface Member extends User {
  /** 群内角色 */ member_role: 'owner' | 'admin' | 'member'
}

export enum MessageType {
  Text = 0,
  Ark = 3,
  Parallel = 101,
  Forward = 102,
  Quote = 103,
}
export interface MessageScene {
  ext: [
    ...[`ref_msg_idx=${RefIdx}`] | [],
    `msg_idx=${RefIdx}`,
    ...[`auth_token=${string}`] | [],
  ]
  source: 'default'
}

export interface MessageAttachmentContentTypes {
  'voice': { voice_wav_url: string, asr_refer_text: string }
  'image/jpeg': { width: number, height: number, content: '' | unknown }
  'image/png': { width: number, height: number, content: '' | unknown }
  'image/gif': { width: number, height: number, content: '' | unknown }
  'video/mp4': { width: number, height: number }
  'file': object
}

export type MessageAttachment =
  { url: string, filename: string, size: number } & {
    [K in keyof MessageAttachmentContentTypes]:
    { content_type: K } & MessageAttachmentContentTypes[K]
  }[keyof MessageAttachmentContentTypes]

export interface KnownArkDataTypes {
  unknown: { ark_name: '' } & (
    | { prompt: '[分享]空间说说' }
    | { prompt: `创建了群相册《${string}》` }
  )
  /** 图文 H5 */ tuwen: {
    ark_name: '图文H5'
    title: string
    jump_url: string
    /** @type `[分享]${this['title']}` */
    prompt: `[分享]${string}`
  } & (
    | { tag: '班级作业' }
    | { tag: string, desc: string }
  )
  /** 图文卡片 */ feed: {
    ark_name: '图文卡片'
    tag: '群相册'
    title: `群相册《${string}》`
    /** @type `群相册《${this['title']}》` */
    jump_url: string
    prompt: `群相册《${string}》`
  }
  /** 小程序 */ miniapp: {
    ark_name: '小程序'
    title: string
    preview: string
    source: string
    source_logo: string
    /** @type `[QQ小程序]${this['title']}` */
    prompt: `[QQ小程序]${string}`
  }
  /** 位置卡片 */ map: {
    ark_name: '位置卡片'
    address: string
    desc: string
    /** @type `[位置]${this['desc']}` */
    prompt: `[位置]${string}`
  }
  /** 好友名片 */ contact_card: {
    ark_name: '好友名片'
    type: 'contact'
  } & ({
    tag: '推荐好友'
    nickname: string
    /** @type `账号：${this['uin']}` */
    contact: `账号：${number}`
    /** @type `http://thirdqq.qlogo.cn/g?b=oidb&k=${this['uin']}&kti=${this['uin']}&s=140` */
    avatar: `http://thirdqq.qlogo.cn/g?b=oidb&k=${string}&kti=${string}&s=140`
    /** @type `mqqapi://card/show_pslcard?src_type=internal&source=sharecard&version=1&uin=${this['uin']}` */
    jumpUrl: `mqqapi://card/show_pslcard?src_type=internal&source=sharecard&version=1&uin=${number}`
    /** @type `推荐联系人：${this['nickname']}` */
    prompt: `推荐联系人：${string}`
  } | {
    tag: '群名片'
    nickname: string
    contact: '在这里，发现更多~'
    /** @type `https://p.qlogo.cn/gh/${this['uin']}/${this['uin']}/100` */
    avatar: `https://p.qlogo.cn/gh/${number}/${number}/100`
    /** @type  `mqqapi://card/show_pslcard?authSig=${string}&card_type=group&src_type=internal&uin=${this['uin']}&version=1&wSourceSubID=40001` */
    jumpUrl: `mqqapi://card/show_pslcard?authSig=${string}&card_type=group&src_type=internal&uin=${number}&version=1&wSourceSubID=40001`
    /** @type `群名片：${this['nickname']}` */ prompt: `群名片: ${string}`
  })
  /** 视频分享 */ video_share: unknown
  /** 一起听歌 */ music_together: {
    ark_name: '一起听歌'
    title: '一起听歌'
    desc: string
    songId: string
    cover: `http://img.tencentmusic.com/${string}`
    type: 'music_invite' | unknown
    inviteType: 'listen' | unknown
    button: '加入一起听歌' | string
    /** @type `[开启了一起听歌] ${this['desc']}` */
    prompt: `[开启了一起听歌] ${string}`
  }
}

export interface ArkData<T extends string = string> {
  /** 卡片消息类型标识 */ ark_type: T
  /** 卡片消息类型的中文名称 */ ark_name:
  KnownArkDataTypes extends Record<T, { ark_name: string }>
    ? KnownArkDataTypes[T]['ark_name'] : string
  /** 卡片消息字段 */ fields: T extends keyof KnownArkDataTypes
    ? Omit<KnownArkDataTypes[T], 'ark_name' | 'prompt'>
    : Record<string, string>
  /** 卡片消息中的用户操作提示文本 */ prompt:
  KnownArkDataTypes extends Record<T, { prompt: string }>
    ? KnownArkDataTypes[T]['prompt'] : string
}

export interface MsgElement<T extends MessageType = MessageType> {
  /** 消息元素在列表中的引用消息索引 */ msg_idx: RefIdx
  /** 该元素对应的消息发送者 */ author: never | unknown
  /** 消息内容类型 */ message_type: T
  /** 消息正文内容 */ content: string
  /** 该元素携带的附件 */ attachments?: MessageAttachment[]
  /** 结构化卡片消息数据 */ ark_data: T extends MessageType.Ark ? ArkData : never
  /** 嵌套消息元素列表 */ msg_elements?: MsgElement[]
}

export interface Message<T extends MessageType = MessageType> {
  /** @ 消息 ID，可用于被动回复和撤回 */ id: MessageId
  /** 发送者 */ author: User
  /** 消息文本内容（已去除@机器人的前缀） */ content: string
  /** @deprecated */ group_id: string
  /** 群 OpenID */ group_openid: string
  /** 消息发送时间，RFC3339 格式 */ timestamp: string
  /** 消息内容类型（同 C2C_MESSAGE_CREATE） */ message_type: T
  /** 消息场景上下文 */ message_scene: MessageScene
  /** 消息附件 */ attachments?: MessageAttachment[]
  /** 结构化卡片消息数据 */ ark_data: T extends MessageType.Ark ? ArkData : never
  /** 消息元素列表 */ msg_elements: MsgElement[]
}

export interface GroupMessage<T extends MessageType = MessageType> extends Message<T> {
  /** 发送者 */ author: Member
  /** 消息中@的用户列表（不含@机器人自身） */ mentions?: Member[]
}

export interface DispatchEvents {
  GUILD_CREATE: unknown
  GUILD_UPDATE: unknown
  GUILD_DELETE: unknown
  CHANNEL_CREATE: unknown
  CHANNEL_UPDATE: unknown
  CHANNEL_DELETE: unknown
  GUILD_MEMBER_ADD: unknown
  GUILD_MEMBER_UPDATE: unknown
  GUILD_MEMBER_REMOVE: unknown
  MESSAGE_CREATE: unknown
  MESSAGE_DELETE: unknown
  MESSAGE_REACTION_ADD: unknown
  MESSAGE_REACTION_REMOVE: unknown
  DIRECT_MESSAGE_CREATE: unknown
  DIRECT_MESSAGE_DELETE: unknown
  GROUP_MEMBER_ADD: unknown
  GROUP_MEMBER_REMOVE: unknown
  GROUP_JOIN_REQUEST: unknown
  /** 单聊消息 */ C2C_MESSAGE_CREATE: Message
  FRIEND_ADD: unknown
  FRIEND_DEL: unknown
  C2C_MSG_REJECT: unknown
  C2C_MSG_RECEIVE: unknown
  /** 群 @ 机器人消息 */ GROUP_AT_MESSAGE_CREATE: GroupMessage
  /** 群全量消息 */ GROUP_MESSAGE_CREATE: GroupMessage
  /** 机器人加入群聊 */ GROUP_ADD_ROBOT: {
    /** 加入时间戳（Unix 秒） */ timestamp: number
    /** 群 OpenID */ group_openid: string
    /** 操作添加机器人进群的群成员 OpenID */op_member_openid: string
  }
  /** 机器人退出群聊 */ GROUP_DEL_ROBOT: {
    /** 移除时间戳（Unix 秒） */ timestamp: number
    /** 群 OpenID */ group_openid: string
    /** 操作移除机器人退群的群成员 OpenID */op_member_openid: string
  }
  GROUP_MSG_REJECT: unknown
  GROUP_MSG_RECEIVE: unknown
  INTERACTION_CREATE: unknown
  MESSAGE_AUDIT_PASS: unknown
  MESSAGE_AUDIT_REJECT: unknown
  FORUM_THREAD_CREATE: unknown
  FORUM_THREAD_UPDATE: unknown
  FORUM_THREAD_DELETE: unknown
  FORUM_POST_CREATE: unknown
  FORUM_POST_DELETE: unknown
  FORUM_REPLY_CREATE: unknown
  FORUM_REPLY_DELETE: unknown
  FORUM_PUBLISH_AUDIT_RESULT: unknown
  AUDIO_START: unknown
  AUDIO_FINISH: unknown
  AUDIO_ON_MIC: unknown
  AUDIO_OFF_MIC: unknown
  AT_MESSAGE_CREATE: unknown
  PUBLIC_MESSAGE_DELETE: unknown
}

export type DispatchEventMap = {
  [T in keyof DispatchEvents]: [data: DispatchEvents[T], id: `${T}:${string}`]
}

export type DispatchPayload = {
  [T in keyof DispatchEvents]: {
    t: T
    id: `${T}:${string}`
    d: DispatchEvents[T]
  }
}[keyof DispatchEvents]

export enum OpCode {
  /** 服务端进行消息推送 */ Dispatch = 0,
  /** 客户端或服务端发送心跳 */ Heartbeat = 1,
  /** 客户端发送鉴权 */ Identify = 2,
  /** 客户端恢复连接 */ Resume = 6,
  /** 服务端通知客户端重新连接 */ Reconnect = 7,
  /** Identify 或 Resume 参数错误 */ InvalidSession = 9,
  /** 服务端下发的第一条消息 */ Hello = 10,
  /** 当发送心跳成功之后，就会收到该消息 */ HeartbeatAck = 11,
  /** 代表机器人收到了平台推送的数据 */ CallbackAck = 12,
  /** 开放平台对机器人服务端进行验证 */ CallbackVerify = 13,
}

export namespace OpCode {
  export function toString(op: OpCode): string {
    return {
      [OpCode.Dispatch]: 'Dispatch',
      [OpCode.Heartbeat]: 'Heartbeat',
      [OpCode.Identify]: 'Identify',
      [OpCode.Resume]: 'Resume',
      [OpCode.Reconnect]: 'Reconnect',
      [OpCode.InvalidSession]: 'InvalidSession',
      [OpCode.Hello]: 'Hello',
      [OpCode.HeartbeatAck]: 'HeartbeatAck',
      [OpCode.CallbackAck]: 'CallbackAck',
      [OpCode.CallbackVerify]: 'CallbackVerify',
    }[op]
  }
}

export interface PayloadData {
  [OpCode.Dispatch]: DispatchPayload
  [OpCode.Heartbeat]: number | null
  [OpCode.Identify]: {
    token: AccessToken
    intents: Intents
    shard?: Shard
    properties?: Record<string, any>
  }
  [OpCode.Reconnect]: { d: never }
  [OpCode.Resume]: {
    token: AccessToken
    session_id: string
    seq: number
  }
  [OpCode.InvalidSession]: false
  [OpCode.Hello]: { heartbeat_interval: number }
  [OpCode.HeartbeatAck]: { d: never }
  [OpCode.CallbackAck]: unknown
  [OpCode.CallbackVerify]: {
    plain_token: string
    event_ts: string
  }
}

export type Payload<Op extends keyof PayloadData = keyof PayloadData> = {
  [Op in keyof PayloadData]: 'd' extends keyof PayloadData[Op]
    ? { op: Op } & PayloadData[Op]
    : { op: Op, d: PayloadData[Op] }
}[Op] & { s?: number }
