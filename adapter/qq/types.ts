/* eslint-disable ts/prefer-literal-enum-member */

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
   * 群聊与 C2C（单聊）事件
   * - C2C_MESSAGE_CREATE      ：用户单聊发消息给机器人
   * - FRIEND_ADD               ：用户添加机器人为好友
   * - FRIEND_DEL               ：用户删除机器人好友
   * - C2C_MSG_REJECT           ：用户在机器人资料卡手动关闭「主动消息」推送
   * - C2C_MSG_RECEIVE          ：用户在机器人资料卡手动开启「主动消息」推送
   * - GROUP_AT_MESSAGE_CREATE  ：用户在群里 @ 机器人收到的消息
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
    | Intents.GROUP_AND_C2C_EVENT
    | Intents.INTERACTION
    | Intents.MESSAGE_AUDIT
    | Intents.FORUMS_EVENT
    | Intents.AUDIO_ACTION
    | Intents.PUBLIC_GUILD_MESSAGES
}

export type Shard = [number, number]

export interface User {
  id: string
  username: string
  bot: true
  status: 1 | unknown
}

export interface DispatchEvents {
  READY: {
    version: 1
    session_id: string
    user: User
    shard: Shard
  }
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
  C2C_MESSAGE_CREATE: unknown
  FRIEND_ADD: unknown
  FRIEND_DEL: unknown
  C2C_MSG_REJECT: unknown
  C2C_MSG_RECEIVE: unknown
  GROUP_AT_MESSAGE_CREATE: unknown
  GROUP_ADD_ROBOT: unknown
  GROUP_DEL_ROBOT: unknown
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

export enum OpCode {
  /** 服务端进行消息推送 */ Dispatch = 0,
  /** 客户端或服务端发送心跳 */ Heartbeat = 1,
  /** 客户端发送鉴权 */ Identify = 2,
  /** 客户端恢复连接 */ Resume = 6,
  /** 服务端通知客户端重新连接 */ Reconnect = 7,
  /** Identify 或 Resume 参数错误 */ InvalidSession = 9,
  /** 服务端下发的第一条消息 */ Hello = 10,
  HeartbeatAck = 11,
  HttpCallbackAck = 12,
}

export interface PayloadData {
  [OpCode.Dispatch]: {
    [Type in keyof DispatchEvents]: {
      t: Type
      d: DispatchEvents[Type]
    }
  }[keyof DispatchEvents]
  [OpCode.Heartbeat]: number | null
  [OpCode.Identify]: {
    token: string
    intents: Intents
    shard?: Shard
    properties?: Record<string, any>
  }
  [OpCode.Reconnect]: unknown
  [OpCode.Resume]: unknown
  [OpCode.InvalidSession]: false
  [OpCode.Hello]: { heartbeat_interval: number }
  [OpCode.HeartbeatAck]: unknown
  [OpCode.HeartbeatAck]: unknown
}

export type Payload<Op extends keyof PayloadData = keyof PayloadData> = {
  [Op in keyof PayloadData]: 'd' extends keyof PayloadData[Op]
    ? { op: Op } & PayloadData[Op]
    : { op: Op, d: PayloadData[Op] }
}[Op] & { s?: number }
