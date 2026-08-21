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
export type MsgIdx = `REFIDX_${string}`
export type RefMsgIdx = MsgIdx | `TMP_${string}`

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
  Markdown = 2,
  Ark = 3,
  Media = 7,
  Parallel = 101,
  Forward = 102,
  Quote = 103,
}

export namespace MessageType {
  export const stringMap = {
    [MessageType.Text]: 'text',
    [MessageType.Markdown]: 'markdown',
    [MessageType.Ark]: 'ark',
    [MessageType.Media]: 'media',
    [MessageType.Parallel]: 'parallel',
    [MessageType.Forward]: 'forward',
    [MessageType.Quote]: 'quote',
  } as const
  export type StringMap = typeof stringMap
  export type StringTag = StringMap[MessageType]
  export function toString(type: MessageType): StringTag {
    return stringMap[type]
  }
}

export interface MessageScene {
  ext: [
    ...[`ref_msg_idx=${RefMsgIdx}`] | [],
    `msg_idx=${MsgIdx}`,
    ...[`auth_token=${string}`] | [],
  ]
  source: 'default'
}

export interface AttachmentTypes {
  'voice': { voice_wav_url: string, asr_refer_text: string }
  'image/jpeg': { width: number, height: number, content: string }
  'image/png': { width: number, height: number, content: string }
  'image/gif': { width: number, height: number, content: string }
  'video/mp4': { width: number, height: number }
  'file': object
}

export type Attachment =
  { url: string, filename: string, size: number } & {
    [K in keyof AttachmentTypes]:
    { content_type: K } & AttachmentTypes[K]
  }[keyof AttachmentTypes]

export interface ArkTypes {
  unknown: { ark_name: '' } & (
    | { prompt: '[分享]空间说说' }
    | { prompt: `创建了群相册《${string}》` }
  )
  /** 图文 H5 */ tuwen: {
    /** @type `[分享]${this['title']}` */
    prompt: `[分享]${string}`
    ark_name: '图文H5'
    /** 标题 */ title: string
    /** 跳转链接 */ jump_url: string
  } & (
    | { /** 来源标签 */ tag: '班级作业' }
    | { /** 来源标签 */ tag: string, /** 描述 */ desc: string }
  )
  /** 图文卡片 */ feed: {
    /** @type `群相册《${this['title']}》` */
    prompt: `群相册《${string}》`
    ark_name: '图文卡片'
    /** 来源标签 */ tag: '群相册'
    /** 标题 */ title: `群相册《${string}》`
    /** 跳转链接 */ jump_url: string
  }
  /** 小程序 */ miniapp: {
    /** @type `[QQ小程序]${this['title']}` */
    prompt: `[QQ小程序]${string}`
    ark_name: '小程序'
    /** 标题 */ title: string
    /** 预览图 */ preview: string
    /** 来源名称 */ source: string
    /** 来源图标 */ source_logo: string
  }
  /** 位置卡片 */ map: {
    /** @type `[位置]${this['desc']}` */
    prompt: `[位置]${string}`
    ark_name: '位置卡片'
    /** 地址 */ address: string
    /** 描述 */ desc: string
  }
  /** 好友名片 */ contact_card: {
    ark_name: '好友名片'
    type: 'contact'
  } & ({
    /** @type `推荐联系人：${this['nickname']}` */
    prompt: `推荐联系人：${string}`
    /** 来源标签 */ tag: '推荐好友'
    /** 昵称 */ nickname: string
    /** 头像 @type `http://thirdqq.qlogo.cn/g?b=oidb&k=${this['uin']}&kti=${this['uin']}&s=140` */
    avatar: `http://thirdqq.qlogo.cn/g?b=oidb&k=${string}&kti=${string}&s=140`
    /** 跳转链接 @type `mqqapi://card/show_pslcard?src_type=internal&source=sharecard&version=1&uin=${this['uin']}` */
    jump_url: `mqqapi://card/show_pslcard?src_type=internal&source=sharecard&version=1&uin=${number}`
    /** @type `账号：${this['uin']}` */
    contact: `账号：${number}`
  } | {
    /** @type `群名片：${this['nickname']}` */
    prompt: `群名片: ${string}`
    /** 来源标签 */ tag: '群名片'
    /** 昵称 */ nickname: string
    /** 头像 @type `https://p.qlogo.cn/gh/${this['uin']}/${this['uin']}/100` */
    avatar: `https://p.qlogo.cn/gh/${number}/${number}/100`
    /** 跳转链接 @type `mqqapi://card/show_pslcard?authSig=${string}&card_type=group&src_type=internal&uin=${this['uin']}&version=1&wSourceSubID=40001` */
    jump_url: `mqqapi://card/show_pslcard?authSig=${string}&card_type=group&src_type=internal&uin=${number}&version=1&wSourceSubID=40001`
    contact: '在这里，发现更多~'
    /** @type `https://p.qlogo.cn/gh/${this['uin']}/${this['uin']}/100` */
  })
  /** 视频分享 */ video_share: {
    /** @type `[短视频] ${this['title']}` */
    prompt: `[短视频] ${string}`
    ark_name: '视频'
    type: 'video'
    title: string
    preview: string
    nickname: string
    /** @type this['nickname'] */
    desc: string
    avatar: string
    jump_url: `mqqapi://qcircle/opendetail?${string}`
    source_logo: 'https://qq-video.cdn-go.cn/url-resource/latest/defaultmode/changename/qvideo_ark_icon_line_publish_cross.png'
  }
  /** 一起听歌 */ music_together: {
    /** @type `[开启了一起听歌] ${this['desc']}` */
    prompt: `[开启了一起听歌] ${string}`
    ark_name: '一起听歌'
    /** 标题 */ title: '一起听歌'
    /** 描述 */ desc: string
    song_id: string
    cover: `http://img.tencentmusic.com/${string}`
    type: 'music_invite' | unknown
    invite_type: 'listen' | unknown
    button: '加入一起听歌' | string
  }
}

/** Ark type of each card name in the format line, the reverse of `ark_name`. */
export const ArkTypeByName: Record<string, keyof ArkTypes> = {
  图文H5: 'tuwen',
  图文卡片: 'feed',
  小程序: 'miniapp',
  位置卡片: 'map',
  好友名片: 'contact_card',
  视频: 'video_share',
  一起听歌: 'music_together',
}

export interface ArkData<T extends string = string> {
  /** 卡片消息中的用户操作提示文本 */ prompt:
  ArkTypes extends Record<T, { prompt: string }>
    ? ArkTypes[T]['prompt'] : string
  /** 卡片消息类型标识 */ ark_type: T
  /** 卡片消息类型的中文名称 */ ark_name:
  ArkTypes extends Record<T, { ark_name: string }>
    ? ArkTypes[T]['ark_name'] : string
  /** 卡片消息字段 */ fields: T extends keyof ArkTypes
    ? Omit<ArkTypes[T], 'ark_name' | 'prompt'>
    : Record<string, string>
}

export interface MsgElement<T extends MessageType = MessageType> {
  /** 消息元素在列表中的引用消息索引 */ msg_idx?: MsgIdx
  /** 该元素对应的消息发送者 */ author?: never | unknown
  /** 消息内容类型 */ message_type?: T
  /** 消息正文内容 */ content: string
  /** 该元素携带的附件 */ attachments?: Attachment[]
  /** 结构化卡片消息数据 */ ark_data?: T extends MessageType.Ark ? ArkData : never
  /** 嵌套消息元素列表 */ msg_elements?: MsgElement[]
}

export interface Message<T extends MessageType = MessageType> {
  /** @ 消息 ID，可用于被动回复和撤回 */ id: MessageId
  /** 发送者 */ author: User
  /** 消息文本内容（已去除@机器人的前缀） */ content: string
  /** 消息发送时间，RFC3339 格式 */ timestamp: string
  /** 消息内容类型（同 C2C_MESSAGE_CREATE） */ message_type: T
  /** 消息场景上下文 */ message_scene: MessageScene
  /** 消息附件 */ attachments?: Attachment[]
  /** 结构化卡片消息数据 */ ark_data: T extends MessageType.Ark ? ArkData : never
  /** 消息元素列表 */ msg_elements: T extends MessageType.Quote ? MsgElement[] : never
}

export interface GroupMessage<T extends MessageType = MessageType> extends Message<T> {
  /** 发送者 */ author: Member
  /** @deprecated */ group_id: string
  /** 群 OpenID */ group_openid: string
  /** 消息中@的用户列表（不含@机器人自身） */ mentions?: (
    | { is_you: true, scope: 'all', username: '全体成员' }
    | { is_you: boolean, scope: 'single' } & Member
  )[]
}

/** 频道对象（旧版频道 API） */
export interface Guild {
  /** 频道ID */ id: string
  /** 频道名称 */ name: string
  /** 频道头像地址 */ icon: string
  /** 创建人用户ID */ owner_id: string
  /** 当前人是否是创建人 */ owner: boolean
  /** 成员数 */ member_count: number
  /** 最大成员数 */ max_members: number
  /** 描述 */ description: string
  /** 加入时间 */ joined_at: string
}

/** 频道事件（在 Guild 基础上增加操作人） */
export interface GuildEvent {
  /** 频道ID */ id: string
  /** 频道名称 */ name: string
  /** 频道头像地址 */ icon: string
  /** 创建人用户ID */ owner_id: string
  /** 成员数 */ member_count: number
  /** 最大成员数 */ max_members: number
  /** 描述 */ description: string
  /** 加入时间 */ joined_at: string
  /** 操作人 */ op_user_id: string
}

/** 子频道对象 */
export interface Channel {
  /** 子频道 id */ id: string
  /** 频道 id */ guild_id: string
  /** 子频道名 */ name: string
  /** 子频道类型 */ type: number
  /** 子频道子类型（仅文字子频道有） */ sub_type: number
  /** 排序值 */ position: number
  /** 所属分组 id（仅对子频道有效） */ parent_id: string
  /** 创建人 id */ owner_id: string
  /** 子频道私密类型 */ private_type: number
  /** 子频道发言权限 */ speak_permission: number
  /** 应用子频道应用类型（仅应用子频道使用） */ application_id?: string
  /** 用户拥有的子频道权限位图 */ permissions: string
}

/** 子频道事件（在 Channel 部分字段基础上增加操作人） */
export interface ChannelEvent {
  /** 频道 id */ guild_id: string
  /** 子频道 id */ id: string
  /** 子频道名 */ name: string
  /** 创建人 id */ owner_id: string
  /** 子频道子类型 */ sub_type: number
  /** 子频道类型 */ type: number
  /** 操作人 */ op_user_id: string
}

/** 用户对象（旧版频道 API） */
export interface GuildUser {
  /** 用户 id */ id: string
  /** 用户名 */ username: string
  /** 用户头像地址 */ avatar: string
  /** 是否是机器人 */ bot: boolean
  /** 特殊关联应用的 openid（需特殊申请并配置后才会返回） */ union_openid?: string
  /** 机器人关联的互联应用的用户信息 */ union_user_account?: string
}

/** 成员对象（旧版频道 API） */
export interface GuildMember {
  /** 用户的频道基础信息 */ user: GuildUser
  /** 用户的昵称 */ nick: string
  /** 用户在频道内的身份组ID */ roles: string[]
  /** 用户加入频道的时间 */ joined_at: string
}

/** 频道成员事件（在 GuildMember 基础上增加频道 id 和操作人） */
export interface GuildMemberEvent {
  /** 频道id */ guild_id: string
  /** 用户的频道基础信息 */ user: GuildUser
  /** 用户的昵称 */ nick: string
  /** 用户在频道内的身份组ID */ roles: string[]
  /** 用户加入频道的时间 */ joined_at: string
  /** 操作人 */ op_user_id: string
}

/** 消息附件（旧版频道 Message 对象） */
export interface GuildMessageAttachment {
  /** 下载地址 */ url: string
}

/** embed 字段（旧版频道 Message 对象） */
export interface GuildMessageEmbed {
  /** 标题 */ title: string
  /** 消息弹窗内容 */ prompt: string
  /** 缩略图 */ thumbnail: { /** 图片地址 */ url: string }
  /** embed 字段数据 */ fields: { /** 字段名 */ name: string }[]
}

/** ark 消息（旧版频道 Message 对象） */
export interface GuildMessageArk {
  /** ark 模板 id（需先申请） */ template_id: number
  /** kv 值列表 */ kv: {
    /** key */ key: string
    /** value */ value: string
    /** ark obj 类型的列表 */ obj: { /** ark objkv 列表 */ obj_kv: { key: string, value: string }[] }[]
  }[]
}

/** 引用消息（旧版频道 Message 对象） */
export interface GuildMessageReference {
  /** 需要引用回复的消息 id */ message_id: string
  /** 是否忽略获取引用消息详情错误 */ ignore_get_message_error: boolean
}

/** 消息对象（旧版频道 API，频道/私信消息事件与删除事件的内容） */
export interface GuildMessage {
  /** 消息 id */ id: string
  /** 子频道 id */ channel_id: string
  /** 频道 id */ guild_id: string
  /** 消息内容 */ content: string
  /** 消息创建时间 */ timestamp: string
  /** 消息编辑时间 */ edited_timestamp?: string
  /** 是否是@全员消息 */ mention_everyone?: boolean
  /** 消息创建者 */ author: GuildUser
  /** 附件 */ attachments?: GuildMessageAttachment[]
  /** embed */ embeds?: GuildMessageEmbed[]
  /** 消息中@的人 */ mentions?: GuildUser[]
  /** 消息创建者的 member 信息 */ member?: GuildMember
  /** ark 消息对象 */ ark?: GuildMessageArk
  /** 子频道内消息排序（已废弃） */ seq?: number
  /** 子频道消息 seq */ seq_in_channel?: string
  /** 引用消息对象 */ message_reference?: GuildMessageReference
}

/** 消息删除事件（MESSAGE_DELETE / PUBLIC_MESSAGE_DELETE / DIRECT_MESSAGE_DELETE） */
export interface MessageDelete {
  /** 被删除的消息内容 */ message: GuildMessage
  /** 执行删除操作的用户 */ op_user: GuildUser
}

/** 表态对象类型 */ export enum ReactionTargetType {
  /** 消息 */ Message = 0,
  /** 帖子 */ Thread = 1,
  /** 评论 */ Post = 2,
  /** 回复 */ Reply = 3,
}

/** 表情类型 */ export enum EmojiType {
  /** 系统表情 */ System = 1,
  /** emoji 表情 */ Emoji = 2,
}

/** 表情对象 */ export interface Emoji {
  /** 表情ID，系统表情使用数字为ID，emoji使用emoji本身为id */ id: string
  /** 表情类型 */ type: EmojiType
}

/** 表态对象 */ export interface ReactionTarget {
  /** 表态对象ID */ id: string
  /** 表态对象类型 */ type: ReactionTargetType
}

/** 表情表态事件（MESSAGE_REACTION_ADD / MESSAGE_REACTION_REMOVE） */
export interface MessageReaction {
  /** 用户ID */ user_id: string
  /** 频道ID */ guild_id: string
  /** 子频道ID */ channel_id: string
  /** 表态对象 */ target: ReactionTarget
  /** 表态所用表情 */ emoji: Emoji
}

/** 互动事件（INTERACTION_CREATE） */
export interface Interaction {
  /** 平台方事件 ID，可用于被动消息发送 */ id: string
  /** 事件类型：11 消息按钮，12 单聊快捷菜单 */ type: 11 | 12
  /** 事件发生的场景 */ scene: 'c2c' | 'group' | 'guild'
  /** 场景类型：0 频道，1 群聊，2 单聊 */ chat_type: 0 | 1 | 2
  /** 触发时间，RFC 3339 格式 */ timestamp: string
  /** 频道的 openid，仅频道场景提供 */ guild_id?: string
  /** 文字子频道的 openid，仅频道场景提供 */ channel_id?: string
  /** 触发单聊按钮的用户 OpenID，仅单聊场景提供 */ user_openid?: string
  /** 群的 openid，仅群聊场景提供 */ group_openid?: string
  /** 按钮触发用户的群成员 openid，仅群聊场景提供 */ group_member_openid?: string
  data: {
    /** 事件子类型 */ type: 11 | 12
    resolved: {
      /** 操作按钮的 data 字段值（发送消息按钮时设置） */ button_data: string
      /** 操作按钮的 id 字段值（发送消息按钮时设置） */ button_id: string
      /** 操作用户 userid，仅频道场景提供 */ user_id?: string
      /** 操作按钮的 id 字段值（自定义菜单，管理端设置） */ feature_id?: string
      /** 操作的消息 id，仅频道场景提供 */ message_id?: string
    }
  }
  /** 默认 1 */ version: 1
}

/** 消息审核事件（MESSAGE_AUDIT_PASS / MESSAGE_AUDIT_REJECT） */
export interface MessageAudited {
  /** 消息审核 id */ audit_id: string
  /** 消息 id，仅审核通过事件有值 */ message_id?: string
  /** 频道 id */ guild_id: string
  /** 子频道 id */ channel_id: string
  /** 消息审核时间 */ audit_time: string
  /** 消息创建时间 */ create_time: string
  /** 子频道消息 seq */ seq_in_channel?: string
}

/** 富文本类型 */ export enum ForumRichType {
  /** 普通文本 */ Text = 1,
  /** at 信息 */ At = 2,
  /** url 信息 */ Url = 3,
  /** 表情 */ Emoji = 4,
  /** #子频道 */ Channel = 5,
  /** 视频 */ Video = 10,
  /** 图片 */ Image = 11,
}

/** 论坛 at 内容 */
export interface ForumAtInfo {
  /** at 类型：1 at 特定人，2 at 角色组所有人，3 at 频道所有人 */ type: 1 | 2 | 3
  /** 用户信息 */ user_info?: { /** 用户ID */ id: string, /** 用户昵称 */ nick: string }
  /** 角色组信息 */ role_info?: { /** 身份组ID */ role_id: number, /** 身份组名称 */ name: string, /** 颜色值 */ color: number }
  /** 频道信息 */ guild_info?: { /** 频道ID */ guild_id: string, /** 频道名称 */ guild_name: string }
}

/** 论坛表情 */
export interface ForumEmojiInfo {
  /** 表情 id */ id: string | number
  /** 表情类型 */ type: string
  /** 名称 */ name?: string
  /** 链接 */ url?: string
}

/** 论坛富文本元素 */
export type ForumRichObject =
  | { /** 类型 */ type: ForumRichType.Text, /** 文本 */ text_info: { /** 文本内容 */ text: string } }
  | { /** 类型 */ type: ForumRichType.At, /** @ 内容 */ at_info: ForumAtInfo }
  | { /** 类型 */ type: ForumRichType.Url, /** 链接 */ url_info: { /** 链接地址 */ url: string, /** 链接显示文本 */ display_text: string } }
  | { /** 类型 */ type: ForumRichType.Emoji, /** 表情 */ emoji_info: ForumEmojiInfo }
  | { /** 类型 */ type: ForumRichType.Channel, /** 提到的子频道 */ channel_info: { /** 子频道 id */ channel_id: number, /** 子频道名称 */ channel_name: string } }

/** 主题事件（FORUM_THREAD_CREATE / UPDATE / DELETE） */
export interface ForumThreadEvent {
  /** 频道ID */ guild_id: string
  /** 子频道ID */ channel_id: string
  /** 作者ID */ author_id: string
  /** 主帖内容 */ thread_info: {
    /** 主帖ID */ thread_id: string
    /** 帖子标题 */ title: ForumRichObject[]
    /** 帖子内容 */ content: ForumRichObject[]
    /** 发表时间 */ date_time: string
  }
}

/** 帖子事件（FORUM_POST_CREATE / DELETE） */
export interface ForumPostEvent {
  /** 频道ID */ guild_id: string
  /** 子频道ID */ channel_id: string
  /** 作者ID */ author_id: string
  /** 帖子内容 */ post_info: {
    /** 主题ID */ thread_id: string
    /** 帖子ID */ post_id: string
    /** 帖子内容 */ content: ForumRichObject[]
    /** 评论时间 */ date_time: string
  }
}

/** 回复事件（FORUM_REPLY_CREATE / DELETE） */
export interface ForumReplyEvent {
  /** 频道ID */ guild_id: string
  /** 子频道ID */ channel_id: string
  /** 作者ID */ author_id: string
  /** 回复内容 */ reply_info: {
    /** 主题ID */ thread_id: string
    /** 帖子ID */ post_id: string
    /** 回复ID */ reply_id: string
    /** 回复内容 */ content: ForumRichObject[]
    /** 回复时间 */ date_time: string
  }
}

/** 论坛审核类型 */ export enum ForumAuditType {
  /** 帖子 */ Thread = 1,
  /** 评论 */ Post = 2,
  /** 回复 */ Reply = 3,
}

/** 论坛帖子审核结果事件（FORUM_PUBLISH_AUDIT_RESULT） */
export interface ForumPublishAuditResult {
  /** 频道ID */ guild_id: string
  /** 子频道ID */ channel_id: string
  /** 作者ID */ author_id: string
  /** 主题ID */ thread_id: string
  /** 帖子ID */ post_id: string
  /** 回复ID */ reply_id: string
  /** 审核的类型 */ type: ForumAuditType
  /** 审核结果：0 成功，1 失败 */ result: 0 | 1
  /** result 不为 0 时的错误信息 */ err_msg: string
}

/** 群成员进出事件（GROUP_MEMBER_ADD / GROUP_MEMBER_REMOVE） */
export interface GroupMemberEvent {
  /** 时间戳（Unix 秒） */ timestamp: number
  /** 群的 openid */ group_openid: string
  /** 成员的 openid */ member_openid: string
}

/** 用户入群验证信息 */
export interface VerifyInfo {
  /** 验证方式 */ method: 'verify_message' | 'admin_review_qa'
  /** 验证消息内容，仅 method=verify_message 时携带 */ verify_message?: string
  /** 管理员问答列表，仅 method=admin_review_qa 时携带 */ review_qa_list?: {
    /** 管理员设置的问题 */ question: string
    /** 申请人填写的答案 */ answer: string
  }[]
}

/** 自动审批通过的扩展信息 */
export interface AutoApproved {
  /** 自动审批通过所命中的策略 ID */ strategy_id: string
}

/** 用户申请加群事件（GROUP_JOIN_REQUEST） */
export interface GroupJoinRequest {
  /** 群 OpenID */ group_openid: string
  /** 申请 ID，审批接口需要回传 */ join_request_id: string
  /** 安全提示语 */ risk_tips?: string
  /** 用户在应用或开放平台下的统一标识，如有 */ union_openid?: string
  /** 申请人的 openid */ member_openid: string
  /** 申请人昵称 */ username: string
  /** 申请时间戳，RFC3339 格式 */ apply_at: string
  /** self_apply 主动申请，invited 被邀请 */ apply_source: 'self_apply' | 'invited'
  /** 邀请人的 openid，仅 apply_source=invited 时有效 */ invited_by?: string
  /** 是否为机器人账号 */ bot: boolean
  /** 用户入群验证信息 */ verify_info: VerifyInfo
  /** 自动审批通过的扩展信息，仅自动通过事件携带 */ auto_approved?: AutoApproved
}

/** 用户添加机器人事件（FRIEND_ADD） */
export interface FriendAdd {
  /** 添加时间戳 */ timestamp: number
  /** 用户 openid */ openid: string
  /** 加好友场景值 */ scene: number
  /** 开发者自定义的回调数据 */ scene_param: string
  /** 机器人分享链接的短链 code */ short_code: string
}

/** 用户与机器人关系变更事件（FRIEND_DEL / C2C_MSG_REJECT / C2C_MSG_RECEIVE） */
export interface UserEvent {
  /** 操作时间戳 */ timestamp: number
  /** 用户 openid */ openid: string
}

/** 群聊通知开关事件（GROUP_MSG_REJECT / GROUP_MSG_RECEIVE） */
export interface GroupMsgEvent {
  /** 操作的时间戳 */ timestamp: number
  /** 操作群的群 openid */ group_openid: string
  /** 操作群成员的 openid */ op_member_openid: string
}

export interface DispatchEvents {
  GUILD_CREATE: GuildEvent
  GUILD_UPDATE: GuildEvent
  GUILD_DELETE: GuildEvent
  CHANNEL_CREATE: ChannelEvent
  CHANNEL_UPDATE: ChannelEvent
  CHANNEL_DELETE: ChannelEvent
  GUILD_MEMBER_ADD: GuildMemberEvent
  GUILD_MEMBER_UPDATE: GuildMemberEvent
  GUILD_MEMBER_REMOVE: GuildMemberEvent
  MESSAGE_CREATE: GuildMessage
  MESSAGE_DELETE: MessageDelete
  MESSAGE_REACTION_ADD: MessageReaction
  MESSAGE_REACTION_REMOVE: MessageReaction
  DIRECT_MESSAGE_CREATE: GuildMessage
  DIRECT_MESSAGE_DELETE: MessageDelete
  GROUP_MEMBER_ADD: GroupMemberEvent
  GROUP_MEMBER_REMOVE: GroupMemberEvent
  GROUP_JOIN_REQUEST: GroupJoinRequest
  /** 单聊消息 */ C2C_MESSAGE_CREATE: Message
  FRIEND_ADD: FriendAdd
  FRIEND_DEL: UserEvent
  C2C_MSG_REJECT: UserEvent
  C2C_MSG_RECEIVE: UserEvent
  /** 群 @ 机器人消息 */ GROUP_AT_MESSAGE_CREATE: GroupMessage
  /** 群全量消息 */ GROUP_MESSAGE_CREATE: GroupMessage
  /** 机器人加入群聊 */ GROUP_ADD_ROBOT: GroupMsgEvent
  /** 机器人退出群聊 */ GROUP_DEL_ROBOT: GroupMsgEvent
  GROUP_MSG_REJECT: GroupMsgEvent
  GROUP_MSG_RECEIVE: GroupMsgEvent
  INTERACTION_CREATE: Interaction
  MESSAGE_AUDIT_PASS: MessageAudited
  MESSAGE_AUDIT_REJECT: MessageAudited
  FORUM_THREAD_CREATE: ForumThreadEvent
  FORUM_THREAD_UPDATE: ForumThreadEvent
  FORUM_THREAD_DELETE: ForumThreadEvent
  FORUM_POST_CREATE: ForumPostEvent
  FORUM_POST_DELETE: ForumPostEvent
  FORUM_REPLY_CREATE: ForumReplyEvent
  FORUM_REPLY_DELETE: ForumReplyEvent
  FORUM_PUBLISH_AUDIT_RESULT: ForumPublishAuditResult
  /** 音频事件负载结构文档未定义 */ AUDIO_START: unknown
  /** 音频事件负载结构文档未定义 */ AUDIO_FINISH: unknown
  /** 音频事件负载结构文档未定义 */ AUDIO_ON_MIC: unknown
  /** 音频事件负载结构文档未定义 */ AUDIO_OFF_MIC: unknown
  AT_MESSAGE_CREATE: GuildMessage
  PUBLIC_MESSAGE_DELETE: MessageDelete
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
    properties?: Record<string, unknown>
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

// ========== 主动接口（bot.ts）请求与响应类型 ==========

/** 私信会话对象 */
export interface DMS {
  /** 私信会话关联的频道 id */ guild_id: string
  /** 私信会话关联的子频道 id */ channel_id: string
  /** 创建私信会话时间戳 */ create_time: string
}

/** 频道消息发送参数（POST /channels/{id}/messages、POST /dms/{id}/messages） */
export interface MessageToCreate {
  /** 消息内容，文本内容，支持内嵌格式 */ content?: string
  /** embed 消息 */ embed?: GuildMessageEmbed
  /** ark 消息 */ ark?: GuildMessageArk
  /** 引用消息对象 */ message_reference?: GuildMessageReference
  /** 图片 url 地址，平台会转存该图片 */ image?: string
  /** 要回复的消息 id（被动消息） */ msg_id?: string
  /** 要回复的事件 id（被动消息） */ event_id?: string
  /** markdown 消息对象 */ markdown?: {
    /** markdown 模板 id */ template_id?: number
    /** markdown 模板参数 */ params?: { key: string, values: string[] }[]
    /** 原生 markdown 内容，与 template_id/params 互斥 */ content?: string
  }
}

/** 精华消息对象 */
export interface PinsMessage {
  /** 频道 id */ guild_id: string
  /** 子频道 id */ channel_id: string
  /** 子频道内精华消息 id 数组 */ message_ids: string[]
}

/** 推荐子频道 */
export interface RecommendChannel {
  /** 子频道 id */ channel_id: string
  /** 推荐语 */ introduce: string
}

/** 公告对象 */
export interface Announces {
  /** 频道 id */ guild_id: string
  /** 子频道 id */ channel_id: string
  /** 消息 id */ message_id: string
  /** 公告类别：0 成员公告，1 欢迎公告 */ announces_type: 0 | 1
  /** 推荐子频道列表 */ recommend_channels?: RecommendChannel[]
}

/** 创建公告参数 */
export interface AnnounceToCreate {
  /** 消息 id，有值则优先将某条消息设置为成员公告 */ message_id?: string
  /** 子频道 id，message_id 有值则为必填 */ channel_id?: string
  /** 公告类别：0 成员公告，1 欢迎公告 */ announces_type?: 0 | 1
  /** 推荐子频道列表，会一次全部替换推荐子频道列表 */ recommend_channels?: RecommendChannel[]
}

/** 日程对象 */
export interface Schedule {
  /** 日程 id */ id: string
  /** 日程名称 */ name: string
  /** 日程描述 */ description: string
  /** 日程开始时间戳（ms） */ start_timestamp: string
  /** 日程结束时间戳（ms） */ end_timestamp: string
  /** 创建人 */ creator: GuildMember
  /** 日程开始时跳转到的子频道 id */ jump_channel_id: string
  /** 提醒类型：0 不提醒，1 开始时，2 前5分钟，3 前15分钟，4 前30分钟，5 前60分钟 */ remind_type: '0' | '1' | '2' | '3' | '4' | '5'
}

/** 音频控制参数 */
export interface AudioControl {
  /** 音频数据的 url，status 为 0 时传 */ audio_url: string
  /** 状态文本（如：简单爱-周杰伦），status 为 0 时传 */ text?: string
  /** 0 开始播放，1 暂停，2 继续，3 停止 */ status: 0 | 1 | 2 | 3
}

/** 身份组对象 */
export interface Role {
  /** 身份组 ID */ id: string
  /** 名称 */ name: string
  /** ARGB 的 HEX 十六进制颜色值转换后的十进制数值 */ color: number
  /** 是否在成员列表中单独展示：0 否，1 是 */ hoist: number
  /** 人数 */ number: number
  /** 成员上限 */ member_limit: number
}

/** 创建/修改身份组参数 */
export interface RoleToCreate {
  /** 名称 */ name?: string
  /** ARGB 的 HEX 十六进制颜色值转换后的十进制数值 */ color?: number
  /** 是否在成员列表中单独展示：0 否，1 是 */ hoist?: number
}

/** 子频道权限对象 */
export interface ChannelPermissions {
  /** 子频道 id */ channel_id: string
  /** 用户 id（与 role_id 二选一返回） */ user_id?: string
  /** 身份组 id（与 user_id 二选一返回） */ role_id?: string
  /** 用户/身份组拥有的子频道权限位图（十进制数值字符串） */ permissions: string
}

/** 修改子频道权限参数 */
export interface ChannelPermissionsToSet {
  /** 字符串形式的位图表示赋予的权限 */ add: string
  /** 字符串形式的位图表示删除的权限 */ remove: string
}

/** 频道禁言参数（mute_end_timestamp 与 mute_seconds 二选一，传 "0" 解除禁言） */
export interface MuteParams {
  /** 禁言到期时间戳（秒） */ mute_end_timestamp?: string
  /** 禁言多少秒 */ mute_seconds?: string
}

/** API 权限对象 */
export interface ApiPermission {
  /** API 接口名，例如 /guilds/{guild_id}/members/{user_id} */ path: string
  /** 请求方法，例如 GET */ method: string
  /** API 接口名称 */ desc: string
  /** 授权状态，1 时已授权 */ auth_status: number
}

/** API 权限需求对象 */
export interface ApiPermissionDemand {
  /** 申请接口权限的频道 id */ guild_id: string
  /** 接口权限需求授权链接发送的子频道 id */ channel_id: string
  /** 权限接口唯一标识 */ api_identify: { /** API 接口名 */ path: string, /** 请求方法 */ method: string }
  /** 接口权限链接中的接口权限描述信息 */ title: string
  /** 接口权限链接中的机器人可使用功能的描述信息 */ desc: string
}

/** 频道消息频率设置 */
export interface MessageSetting {
  /** 是否允许创建私信 */ disable_create_dm: boolean
  /** 是否允许发主动消息 */ disable_push_msg: boolean
  /** 子频道 id 数组 */ channel_ids: string[]
  /** 每个子频道允许主动推送消息最大消息条数 */ channel_push_max_num: number
}

/** 论坛主题对象（API 响应） */
export interface ForumThread {
  /** 频道ID */ guild_id: string
  /** 子频道ID */ channel_id: string
  /** 作者ID */ author_id: string
  /** 主帖内容 */ thread_info: ForumThreadInfo
}

/** 论坛主帖内容（API 响应） */
export interface ForumThreadInfo {
  /** 主帖ID */ thread_id: string
  /** 帖子标题 */ title: string
  /** 帖子内容（参照 RichText 结构） */ content: string
  /** 发表时间 */ date_time: string
}

/** 发帖参数 */
export interface ForumThreadToCreate {
  /** 帖子标题 */ title: string
  /** 帖子内容 */ content: string
  /** 帖子文本格式：1 普通文本，2 HTML，3 Markdown，4 JSON */ format: 1 | 2 | 3 | 4
}

/** 群内机器人状态（GET /v2/groups/{group_openid}/bot_state） */
export interface GroupBotState {
  /** 机器人的 openid */ member_openid: string
  /** 入群时间戳，RFC3339 格式 */ joined_at: string
  /** 是否接收主动推送 */ allow_proactive_msg: boolean
  /** 群内接收消息设置 */ recv_msg_setting: 'all' | 'only_mention' | 'mention_and_context'
  /** 群成员角色 */ member_role: 'member' | 'owner' | 'admin'
}

/** 群信息（GET /v2/groups/{group_openid}/info） */
export interface GroupInfo {
  /** 群 OpenID */ group_openid: string
  /** 群名称 */ group_name: string
  /** 群简介 */ group_finger_memo: string
  /** 群分类 */ group_class_text: string
  /** 群标签列表 */ group_tags: string[]
  /** 群成员人数 */ group_member_num: number
}

/** 群成员信息（GET /v2/groups/{group_openid}/members/{member_openid}） */
export interface GroupMemberInfo {
  /** 群成员 openid */ member_openid: string
  /** 群昵称 */ username: string
  /** 群成员角色 */ member_role: 'owner' | 'admin' | 'member'
  /** 是否为机器人 */ bot: boolean
  /** 加入时间，ISO 8601 格式 */ joined_at: string
  /** 用户统一 openid */ union_openid: string
}

/** 入群自动审批策略 */
export interface JoinApprovalStrategy {
  /** 策略 ID */ strategy_id: string
  /** 关联的群 openid 列表（创建时使用 group_openids 才返回） */ group_openids?: string[]
  /** 关联的 QQ 群号列表（创建时使用 group_ids 才返回） */ group_ids?: string[]
  /** 白名单号码数量估算值 */ whitelist_user_count: number
  /** on 启用，off 关闭 */ is_enable: 'on' | 'off'
  /** 过期时间，RFC3339 格式 */ expire_at: string
  /** 创建时间，RFC3339 格式 */ created_at: string
  /** 最近更新时间，RFC3339 格式 */ updated_at: string
  /** 策略备注 */ remark: string
}

/** 创建入群自动审批策略参数 */
export interface JoinApprovalStrategyToCreate {
  /** 群 openid 列表，最多 100 个，与 group_ids 二选一 */ group_openids?: string[]
  /** QQ 群号列表，最多 100 个，与 group_openids 二选一 */ group_ids?: string[]
  /** on 启用，off 关闭，默认为 on */ is_enable?: 'on' | 'off'
  /** 过期时间，RFC3339 格式，不传默认一年后过期 */ expire_at?: string
  /** 策略备注 */ remark?: string
}

/** 修改入群自动审批策略参数 */
export interface JoinApprovalStrategyToPatch {
  /** on 启用，off 关闭 */ is_enable?: 'on' | 'off'
  /** 过期时间，RFC3339 格式 */ expire_at?: string
  /** 关联群增删操作，群标识形式必须与创建时一致 */ group_action?: {
    /** add 新增关联群，del 删除关联群 */ op: 'add' | 'del'
    /** 待操作的群 openid 列表，与 group_ids 互斥 */ group_openids?: string[]
    /** 待操作的 QQ 群号列表，与 group_openids 互斥 */ group_ids?: string[]
  }
  /** 策略备注 */ remark?: string
}

/** 修改白名单参数 */
export interface WhitelistToSet {
  /** add 新增号码，del 删除号码 */ op: 'add' | 'del'
  /** QQ 号码列表，单次最多 10000 个 */ whitelist_users: string[]
}

/** 入群申请（GET /v2/groups/{group_openid}/join_request_list） */
export interface GroupJoinRequestItem {
  /** 申请 ID，审批接口需要回传 */ join_request_id: string
  /** 安全提示语 */ risk_tips: string
  /** 用户在应用或开放平台下的统一标识，如有 */ union_openid?: string
  /** 申请人的 openid */ member_openid: string
  /** 申请人昵称 */ username: string
  /** 申请时间戳，RFC3339 格式 */ apply_at: string
  /** self_apply 主动申请，invited 被邀请 */ apply_source: 'self_apply' | 'invited'
  /** 邀请人的 openid，仅 apply_source=invited 时有效 */ invited_by?: string
  /** 是否为机器人账号 */ bot: boolean
  /** 用户入群验证信息 */ verify_info: VerifyInfo
}

/** 入群申请审批参数 */
export interface GroupJoinApproval {
  /** approve 通过，decline 拒绝 */ op: 'approve' | 'decline'
  /** 申请 ID */ join_request_id?: string
  /** 拒绝理由，op=decline 时可填写 */ reject_reason?: string
  /** 是否同时加入群黑名单，默认 false */ add_to_member_blacklist?: boolean
}

/** 群级全员禁言配置 */
export interface GlobalMuteRule {
  /** none 未开启，always 始终禁言，schedule 定时或周期禁言 */ mode: 'none' | 'always' | 'schedule'
  /** 定时禁言规则列表 */ schedule_rules: {
    /** 定时禁言任务 ID */ task_id: string
    /** 禁言开始时间，RFC3339 格式 */ start_at: string
    /** 禁言结束时间，RFC3339 格式 */ end_at: string
    /** 规则是否启用 */ enabled: boolean
  }[]
  /** 周期禁言规则列表 */ recurring_rules: {
    /** 周期禁言任务 ID */ task_id: string
    /** 生效星期列表，1 表示周一，7 表示周日 */ weekdays: number[]
    /** 开始时间，格式 HH:mm，北京时间 */ start_time: string
    /** 结束时间，格式 HH:mm，小于开始时间时表示跨天 */ end_time: string
    /** 规则是否启用 */ enabled: boolean
  }[]
}

/** 处于禁言中的成员 */
export interface MemberMuteState {
  /** 被禁言成员的 openid */ member_openid: string
  /** 禁言到期时间，RFC3339 格式 */ mute_expire_at: string
  /** 被禁言成员昵称 */ username: string
  /** 用户在应用或开放平台下的统一标识，如有 */ union_openid?: string
}

/** 群禁言状态（GET /v2/groups/{group_openid}/restrict_chat_setting） */
export interface GroupMuteState {
  /** 群级全员禁言配置 */ global_rule: GlobalMuteRule
  /** 当前处于禁言中的用户列表 */ members: MemberMuteState[]
}

/** 设置成员禁言参数（单次不超过 10 个） */
export interface SetMemberMuteState {
  /** add 增加禁言，update 更新到期时间，del 解除禁言 */ op: 'add' | 'update' | 'del'
  /** 被操作成员的 openid */ member_openid: string
  /** 禁言到期时间，RFC3339 格式，最长不超过 30 天 */ mute_expire_at?: string
}

/** 富媒体上传参数（POST /v2/users/{user_openid}/files、/v2/groups/{group_openid}/files） */
export interface MediaUpload {
  /** 1 图片(png/jpg)，2 视频(mp4)，3 语音(silk)，4 文件 */ file_type?: 1 | 2 | 3 | 4
  /** 媒体资源 URL，需以 http 开头，分片上传合并时可为空 */ url?: string
  /** true 直接发送消息并占用主动消息频次，false 仅返回 file_info */ srv_send_msg?: boolean
  /** 文件名 */ file_name?: string
  /** 分片上传任务 ID，传入后走分片合并流程，此时 url 可为空 */ upload_id?: string
}

/** 富媒体上传结果 */
export interface MediaUploadResult {
  /** 文件 ID */ file_uuid: string
  /** 文件信息，用于发消息接口的 media 字段 */ file_info: string
  /** 有效期（秒），0 表示可长期使用 */ ttl: number
  /** 消息 ID，仅 srv_send_msg=true 时返回 */ id?: string
  /** 文件下载链接，仅分片合并且媒体类型为图片/视频/语音时返回 */ raw_url?: string
}

/** 发送按钮 */
export interface KeyboardButton {
  /** 按钮 ID，在一个 keyboard 消息内设置唯一 */ id?: string
  render_data: {
    /** 按钮上的文字 */ label: string
    /** 点击后按钮上的文字 */ visited_label: string
    /** 按钮样式：0 灰色线框，1 蓝色线框 */ style: 0 | 1
  }
  action: {
    /** 0 跳转按钮，1 回调按钮，2 指令按钮 */ type: 0 | 1 | 2
    permission: {
      /** 0 指定用户可操作，1 仅管理者可操作，2 所有人可操作，3 指定身份组可操作（仅频道可用） */ type: 0 | 1 | 2 | 3
      /** 有权限的用户 id 列表 */ specify_user_ids?: string[]
      /** 有权限的身份组 id 列表（仅频道可用） */ specify_role_ids?: string[]
    }
    /** 操作相关的数据 */ data: string
    /** 指令按钮可用，指令是否带引用回复本消息 */ reply?: boolean
    /** 指令按钮可用，点击按钮后直接自动发送 data */ enter?: boolean
    /** 仅指令按钮下有效，1 时点击自动唤起手机端 QQ 选图器 */ anchor?: 1
    /** 【已弃用】可操作点击的次数 */ click_limit?: number
    /** 【已弃用】指令按钮可用，弹出子频道选择器 */ at_bot_show_channel_list?: boolean
    /** 客户端不支持本 action 时弹出的 toast 文案 */ unsupport_tips: string
  }
}

/** 消息按钮组件 */
export type Keyboard =
  | { /** 按钮模板 id */ id: string }
  | { content: { /** 最多 5 行 */ rows: { /** 每行最多 5 个按钮 */ buttons: KeyboardButton[] }[] } }

/** markdown 消息参数（v2 发送接口） */
export interface SendMarkdown {
  /** 原生 markdown 文本内容 */ content?: string
  /** markdown 模版 id */ custom_template_id?: string
  /** 模版变量与填充值的 kv 映射 */ params?: { key: string, values: string[] }[]
}

/** ark 消息参数（v2 发送接口） */
export interface SendArk {
  /** 模版 id（默认可使用 23 链接+文本列表、24 文本+缩略图、37 大图） */ template_id: number
  /** kv 值列表 */ kv: ({
    key: string
    value: string
  } | {
    key: string
    obj: { obj_kv: { key: string, value: string }[] }[]
  })[]
}

/** 消息发送参数（POST /v2/users/{user_openid}/messages、/v2/groups/{group_openid}/messages） */
export interface MessageToSend {
  /** 0 文本，2 Markdown，3 Ark，6 输入状态通知，7 富媒体（群消息不支持 3/6） */ msg_type?: 0 | 2 | 3 | 6 | 7
  /** 文本内容，msg_type=0 时使用，填写 markdown 时必须为空 */ content?: string
  /** Markdown 对象，msg_type=2 时使用 */ markdown?: SendMarkdown
  /** Keyboard 对象 */ keyboard?: Keyboard
  /** Ark 对象，msg_type=3 时使用，需要申请对应权限 */ ark?: SendArk
  /** 富媒体对象，msg_type=7 时使用，file_info 来自富媒体上传接口 */ media?: { /** 文件信息 */ file_info: string }
  /** 输入状态通知对象，仅 msg_type=6 时使用 */ input_notify?: {
    /** 输入状态类型，当前使用 1 表示"正在输入" */ input_type: 1
    /** 输入状态持续时间（秒） */ input_second: number
  }
  /** 消息引用对象 */ message_reference?: { /** 被引用消息 ID，例如 REFIDX_xxxxxx */ message_id?: string }
  /** 被动回复的事件 ID，与 msg_id 二选一 */ event_id?: string
  /** 被动回复的消息 ID，与 event_id 二选一 */ msg_id?: MessageId
  /** 回复序号，与 msg_id 联合使用，默认 1 */ msg_seq?: number
  /** 互动召回消息标记，与 msg_id、event_id 互斥 */ is_wakeup?: boolean
  /** 是否校验图片转存结果，默认 false */ force_verify_image_resource?: boolean
}

/** 消息发送结果 */
export interface SendMessageResult {
  /** 消息唯一 ID */ id: string
  /** 发送时间 */ timestamp: number
  /** 扩展信息，ref_idx 可用于后续引用机器人自己发送的消息 */ ext_info: { ref_idx?: RefMsgIdx }
}

/** 流式消息发送参数（POST /v2/users/{user_openid}/stream_messages） */
export interface StreamMessageToSend {
  /** append（默认）追加内容，replace 传入当前全量正文且不能修改已下发内容前缀 */ input_mode?: 'append' | 'replace'
  /** 1 生成中，10 生成结束 */ input_state?: 1 | 10
  /** text 或 markdown */ content_type?: 'text' | 'markdown'
  /** 当前需要展示的消息内容 */ content_raw?: string
  /** 被动回复事件 ID，与 msg_id 二选一 */ event_id?: string
  /** 被动回复消息 ID，与 event_id 二选一 */ msg_id?: MessageId
  /** 消息序号，用于去重，同一条流式消息内保持一致 */ msg_seq?: number
  /** 流式消息分片序号，从 0 递增 */ index?: number
  /** 流式消息 ID，首次不填，后续填首次响应的 id */ stream_msg_id?: string
  /** 互动召回标记，true 时不校验 msg_id/event_id 有效期 */ is_wakeup?: boolean
}

/** 流式消息发送结果 */
export interface StreamMessageResult {
  /** 消息唯一 ID，后续请求作为 stream_msg_id */ id: string
  /** 消息发送时间，RFC3339 格式 */ timestamp: string
  /** 扩展信息，包含引用消息索引 ref_idx */ ext_info: { ref_idx?: RefMsgIdx }
  /** 流式消息剩余长度（字符） */ remain_msg_len: number
}

export enum UploadPrepareFileType {
  Image = 1,
  Video = 2,
  Audio = 3,
  File = 4,
}

/** 分片上传准备参数 */
export interface UploadPrepare {
  /** 1 图片，2 视频，3 语音，4 文件 */ file_type: UploadPrepareFileType
  /** 文件名 */ file_name: string
  /** 文件大小（字节） */ file_size: string
  /** 完整文件 MD5 */ md5: string
  /** 完整文件 SHA1 */ sha1: string
  /** 文件前 10002432 字节（约 10MB）的 MD5 */ md5_10m: string
}

/** 分片上传准备结果 */
export interface UploadPrepareResult {
  /** 上传任务 ID */ upload_id: string
  /** 默认分片大小（字节） */ block_size: string
  /** 分片列表 */ parts: { /** 分片序号 */ index: number, /** 预签名上传地址 */ presigned_url: string, /** 分片大小 */ block_size: string }[]
  /** 上传配置 */ upload_config: {
    /** 并发数，默认 1 */ concurrency: number
    /** 重试超时（秒），默认 300 */ retry_timeout: number
    /** 重试间隔（秒），默认 1 */ retry_delay: number
  }
}

/** 分片上传完成确认参数 */
export interface UploadPartFinish {
  /** 上传任务 ID */ upload_id?: string
  /** 分片序号，从 0 开始 */ part_index?: number
  /** 分片大小 */ block_size?: string
  /** 分片 MD5 */ md5?: string
}

/** 机器人分享链接生成参数（POST /v2/generate_url_link） */
export interface ShareUrlToCreate {
  /** 添加好友时会回传该参数给开发者 */ callback_data?: string
}

export enum InteractionCallbackCode {
  Success = 0,
  Failed = 1,
  RateLimited = 2,
  Duplicated = 3,
  NoPermission = 4,
  AdminOnly = 5,
}

/** 互动回应参数（PUT /interactions/{interaction_id}） */
export interface InteractionCallback {
  /** 0 成功，1 操作失败，2 操作频繁，3 重复操作，4 没有权限，5 仅管理员操作 */ code: InteractionCallbackCode
}
