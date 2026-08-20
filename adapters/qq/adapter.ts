import type { Element, Fragment } from '@yarkjs/element'
import type * as Universal from '@yarkjs/protocol'
import type { SnakeCaseKeys } from '@yarkjs/utils'
import type { QQBot } from './bot'
import EventEmitter from 'node:events'
import h from '@yarkjs/element'
import { createLogger } from '@yarkjs/logger'
import { snakeCaseKeys, withPrefix } from '@yarkjs/utils'
import * as QQ from './common'
import { parseForwardContent, transformAttachment } from './forward'

const logger = createLogger('qq')

export type Ark<T extends string = string, Data extends QQ.ArkData = QQ.ArkData<T>> = {
  /** 卡片消息类型标识 */ ark_type: T
  /** 卡片消息类型的中文名称 */ ark_name: Data['ark_name']
  /** 卡片消息中的用户操作提示文本 */ prompt: Data['prompt']
} & SnakeCaseKeys<Data['fields']>

export interface QQElements {
  'qq:ark': Ark
  'qq:face': {
    type: number
    id: string
  }
}
declare module '@yarkjs/element' {
  interface Elements extends QQElements {
    image: {
      'qq:faceType'?: number
      'qq:attachmentType'?: string
      'qq:content_type'?: string
    }
    audio: {
      'qq:voice_wav_url': string
      'qq:asr_refer_text': string
    }
  }
}

declare module '@yarkjs/protocol' {
  interface User {
    bot?: boolean
  }

  interface Message {
    'qq:message_type'?: QQ.MessageType
    'qq:msg_idx'?: QQ.MsgIdx
    'qq:auth_token'?: string
    'qq:guild_id'?: string
    'qq:channel_id'?: string
  }

  interface EventMap {
    /** 未抽象为通用事件的平台原生下发事件 */
    dispatch: [name: keyof QQ.DispatchEvents, data: QQ.DispatchEvents[keyof QQ.DispatchEvents], id: `${keyof QQ.DispatchEvents}:${string}`]
  }

  interface Quote {
    'qq:msg_idx'?: QQ.RefMsgIdx
  }

  interface Forward {
    /** Original title line of the record, e.g. `[群聊的聊天记录]`. */
    'qq:title'?: string
  }
}

export class QQAdapter extends EventEmitter<Universal.EventMap> {
  constructor(
    public bot: QQBot,
    public emitter: EventEmitter<QQ.DispatchEventMap>,
  ) {
    super()
    const adapt = <
      A extends unknown[],
      T extends keyof Universal.EventMap,
      P extends keyof QQAdapter,
    >(
      eventName: T,
      parserName: QQAdapter[P] extends (...args: A) => Universal.EventMap[T] ? P : never,
    ) => (...args: A): void => // @ts-ignore
      void this.emit(eventName, ...this[parserName](...args))

    emitter.on('GUILD_CREATE', adapt('guild', 'parseGuildCreate'))
    emitter.on('GUILD_UPDATE', adapt('guild', 'parseGuildUpdate'))
    emitter.on('GUILD_DELETE', adapt('guild', 'parseGuildDelete'))
    emitter.on('CHANNEL_CREATE', adapt('channel', 'parseGuildChannelCreate'))
    emitter.on('CHANNEL_UPDATE', adapt('channel', 'parseGuildChannelUpdate'))
    emitter.on('CHANNEL_DELETE', adapt('channel', 'parseGuildChannelDelete'))
    emitter.on('GUILD_MEMBER_ADD', adapt('member', 'parseGuildMemberAdd'))
    emitter.on('GUILD_MEMBER_UPDATE', adapt('member', 'parseGuildMemberUpdate'))
    emitter.on('GUILD_MEMBER_REMOVE', adapt('member', 'parseGuildMemberRemove'))
    emitter.on('MESSAGE_CREATE', adapt('message', 'parseGuildMessage'))
    emitter.on('MESSAGE_DELETE', adapt('messageDelete', 'parseMessageDelete'))
    emitter.on('MESSAGE_REACTION_ADD', adapt('reaction', 'parseReactionAdd'))
    emitter.on('MESSAGE_REACTION_REMOVE', adapt('reaction', 'parseReactionRemove'))
    emitter.on('DIRECT_MESSAGE_CREATE', adapt('message', 'parseGuildMessage'))
    emitter.on('DIRECT_MESSAGE_DELETE', adapt('messageDelete', 'parseMessageDelete'))
    emitter.on('GROUP_MEMBER_ADD', adapt('member', 'parseGroupMemberAdd'))
    emitter.on('GROUP_MEMBER_REMOVE', adapt('member', 'parseGroupMemberRemove'))
    emitter.on('C2C_MESSAGE_CREATE', adapt('message', 'parseUserMessage'))
    emitter.on('GROUP_MESSAGE_CREATE', adapt('message', 'parseGroupMessage'))
    emitter.on('GROUP_AT_MESSAGE_CREATE', adapt('message', 'parseGroupMessage'))
    emitter.on('FRIEND_ADD', adapt('friend', 'parseFriendAdd'))
    emitter.on('FRIEND_DEL', adapt('friend', 'parseFriendRemove'))
    emitter.on('AT_MESSAGE_CREATE', adapt('message', 'parseGuildMessage'))
    emitter.on('PUBLIC_MESSAGE_DELETE', adapt('messageDelete', 'parseMessageDelete'))

    const rawEvents: (keyof QQ.DispatchEvents)[] = [
      'GROUP_JOIN_REQUEST',
      'C2C_MSG_REJECT',
      'C2C_MSG_RECEIVE',
      'GROUP_ADD_ROBOT',
      'GROUP_DEL_ROBOT',
      'GROUP_MSG_REJECT',
      'GROUP_MSG_RECEIVE',
      'INTERACTION_CREATE',
      'MESSAGE_AUDIT_PASS',
      'MESSAGE_AUDIT_REJECT',
      'FORUM_THREAD_CREATE',
      'FORUM_THREAD_UPDATE',
      'FORUM_THREAD_DELETE',
      'FORUM_POST_CREATE',
      'FORUM_POST_DELETE',
      'FORUM_REPLY_CREATE',
      'FORUM_REPLY_DELETE',
      'FORUM_PUBLISH_AUDIT_RESULT',
      'AUDIO_START',
      'AUDIO_FINISH',
      'AUDIO_ON_MIC',
      'AUDIO_OFF_MIC',
    ]
    for (const name of rawEvents)
      emitter.on(name, (data, id) => this.emit('dispatch', name, data, id))
  }

  parseChannel(channel: { group_openid: string }): Universal.Channel {
    return {
      id: channel.group_openid,
    }
  }

  parseGuild(guild: QQ.GuildEvent): Universal.Guild {
    return {
      id: guild.id,
      name: guild.name,
    }
  }

  parseGuildCreate(guild: QQ.GuildEvent): Universal.EventMap['guild'] {
    return [this.parseGuild(guild), 'create']
  }

  parseGuildUpdate(guild: QQ.GuildEvent): Universal.EventMap['guild'] {
    return [this.parseGuild(guild), 'update']
  }

  parseGuildDelete(guild: QQ.GuildEvent): Universal.EventMap['guild'] {
    return [this.parseGuild(guild), 'delete']
  }

  parseGuildChannel(channel: QQ.ChannelEvent): Universal.Channel {
    return {
      id: channel.id,
      name: channel.name,
      guild: channel.guild_id,
    }
  }

  parseGuildChannelCreate(channel: QQ.ChannelEvent): Universal.EventMap['channel'] {
    return [this.parseGuildChannel(channel), 'create']
  }

  parseGuildChannelUpdate(channel: QQ.ChannelEvent): Universal.EventMap['channel'] {
    return [this.parseGuildChannel(channel), 'update']
  }

  parseGuildChannelDelete(channel: QQ.ChannelEvent): Universal.EventMap['channel'] {
    return [this.parseGuildChannel(channel), 'delete']
  }

  parseGuildUser(user: QQ.GuildUser): Universal.User {
    return {
      id: user.id,
      name: user.username,
      bot: user.bot,
    }
  }

  parseGuildMember({ user, nick, roles, guild_id }: QQ.GuildMemberEvent): Universal.Member {
    return {
      id: user.id,
      name: nick || user.username,
      bot: user.bot,
      guild: guild_id,
      role: roles.includes('2') ? 'admin' : roles.includes('4') ? 'owner' : 'member',
    }
  }

  parseGuildMemberAdd(member: QQ.GuildMemberEvent): Universal.EventMap['member'] {
    return [this.parseGuildMember(member), 'add']
  }

  parseGuildMemberUpdate(member: QQ.GuildMemberEvent): Universal.EventMap['member'] {
    return [this.parseGuildMember(member), 'update']
  }

  parseGuildMemberRemove(member: QQ.GuildMemberEvent): Universal.EventMap['member'] {
    return [this.parseGuildMember(member), 'remove']
  }

  parseGroupMember({ member_openid, group_openid }: QQ.GroupMemberEvent): Universal.Member {
    return {
      id: member_openid,
      channel: group_openid,
    }
  }

  parseGroupMemberAdd(member: QQ.GroupMemberEvent): Universal.EventMap['member'] {
    return [this.parseGroupMember(member), 'add']
  }

  parseGroupMemberRemove(member: QQ.GroupMemberEvent): Universal.EventMap['member'] {
    return [this.parseGroupMember(member), 'remove']
  }

  parseReaction({ target, emoji, user_id, guild_id, channel_id }: QQ.MessageReaction): Universal.Reaction {
    const typeMap = {
      [QQ.ReactionTargetType.Message]: 'message',
      [QQ.ReactionTargetType.Thread]: 'thread',
      [QQ.ReactionTargetType.Post]: 'post',
      [QQ.ReactionTargetType.Reply]: 'reply',
    } as const satisfies Record<QQ.ReactionTargetType, Universal.Reaction['type']>
    return {
      target: target.id,
      type: typeMap[target.type],
      user: user_id,
      emoji: emoji.id,
      guild: guild_id,
      channel: channel_id,
    }
  }

  parseReactionAdd(reaction: QQ.MessageReaction): Universal.EventMap['reaction'] {
    return [this.parseReaction(reaction), 'add']
  }

  parseReactionRemove(reaction: QQ.MessageReaction): Universal.EventMap['reaction'] {
    return [this.parseReaction(reaction), 'remove']
  }

  parseFriendAdd({ openid }: QQ.FriendAdd): Universal.EventMap['friend'] {
    return [{ id: openid }, 'add']
  }

  parseFriendRemove({ openid }: QQ.UserEvent): Universal.EventMap['friend'] {
    return [{ id: openid }, 'remove']
  }

  parseMessageDelete({ message, op_user }: QQ.MessageDelete): Universal.EventMap['messageDelete'] {
    return [
      {
        'id': message.id,
        'timestamp': new Date(message.timestamp).valueOf(),
        'qq:guild_id': message.guild_id,
        'qq:channel_id': message.channel_id,
      },
      this.parseGuildUser(op_user),
    ]
  }

  parseGuildMessage(message: QQ.GuildMessage): Universal.EventMap['message'] {
    const author = message.member
      ? {
        id: message.author.id,
        name: message.member.nick || message.author.username,
        bot: message.author.bot,
        guild: message.guild_id,
        channel: message.channel_id,
        role: message.member.roles.includes('2') ? 'admin' : message.member.roles.includes('4') ? 'owner' : 'member',
      } satisfies Universal.Member
      : this.parseGuildUser(message.author)
    const element = h.message({
      'id': message.id,
      'timestamp': new Date(message.timestamp).valueOf(),
      'qq:guild_id': message.guild_id,
      'qq:channel_id': message.channel_id,
    })
    element.children.unshift(h.author(author))
    const attachments = message.attachments?.map(({ url }) => h.file({ src: url })) ?? []
    element.update(message.content, ...attachments)
    return [element]
  }

  parseUser(user: QQ.User): Universal.User {
    return {
      id: user.id,
      name: user.username,
      bot: user.bot,
    }
  }

  parseMember(member: QQ.Member, channel: Universal.Channel): Universal.Member {
    return {
      ...this.parseUser(member),
      role: member.member_role,
      channel: channel.id,
    }
  }

  parseMessageScene(scene: QQ.MessageScene): Record<string, string> {
    if (scene.source !== 'default')
      logger.warn('unexpected scene source', scene.source)
    return Object.fromEntries(scene.ext.map((pair) => {
      const index = pair.search('=')
      const key = pair.slice(0, index)
      const value = pair.slice(index + 1)
      return [key, value]
    }))
  }

  parseArkData({ prompt, ark_type, ark_name, fields }: QQ.ArkData): Element<'qq:ark'> {
    return h['qq:ark']({ ark_type, ark_name, prompt, ...snakeCaseKeys(fields) })
  }

  parseForwardContent(content: string): Element<'forward'> {
    return parseForwardContent(content)
  }

  parseMentions(content: string, mentions: NonNullable<QQ.GroupMessage['mentions']>): Fragment {
    const mentionMap = new Map<string, Element<'mention'>>()
    for (const mention of mentions) {
      if (mention.scope === 'all')
        mentionMap.set('all', h.mention({ everyone: true }, `@${mention.username}`))
      else if (mention.scope === 'single')
        mentionMap.set(mention.id, h.mention({ user: mention.id }, `@${mention.username}`))
      // TODO: record user
      else
        logger.warn('unknown mention', mention)
    }
    return h.pack(Array.from(h.replace(
      content,
      /<@(all|[0-9A-F]{32})>/g,
      (raw, id) => mentionMap.get(id) || raw,
    )))
  }

  parseImageAttachment(attrs: Element<'image'>['attrs'], {
    width,
    height,
    content,
    ...attachment
  }: { width: number, height: number, content: string }): Element<'image'> {
    return h.image({ ...attrs, width, height, ...withPrefix('qq:', attachment) }, content)
  }

  parseAttachments(attachments: QQ.Attachment[]): Element<'file' | 'audio' | 'image' | 'video'>[] {
    const elements = []
    for (const { url, filename, size, ...attachment } of attachments) {
      const attrs = { src: url, title: filename, size }
      if (attachment.content_type === 'file')
        elements.push(h.file({ ...attrs, ...withPrefix('qq:', attachment) }))
      else if (attachment.content_type === 'voice')
        elements.push(h.audio({ ...attrs, ...withPrefix('qq:', attachment) }))
      else if (attachment.content_type === 'video/mp4')
        elements.push(h.video({ ...attrs, ...withPrefix('qq:', attachment) }))
      else if (attachment.content_type.startsWith('image/'))
        elements.push(this.parseImageAttachment(attrs, attachment))
      else
        logger.warn('unknown attachment', attachments[elements.length])
      delete (attachment as any).content_type
    }
    return elements
  }

  parseMsgElements(msg_elements: QQ.MsgElement[], ref_msg_idx: QQ.RefMsgIdx): Element<'quote'> {
    const element = h.quote({ 'qq:msg_idx': ref_msg_idx })
    for (const { ...msg_element } of msg_elements) {
      if (msg_element.msg_idx !== ref_msg_idx)
        logger.warn('unmatched msg_element.msg_idx', msg_element.msg_idx, 'with ref_msg_idx', ref_msg_idx)
      if (msg_element.author)
        logger.warn('unexpected msg_element.author', msg_element.author)
      if (msg_element.message_type && msg_element.message_type !== QQ.MessageType.Quote)
        logger.warn('unexpected msg_element.message_type', QQ.MessageType.toString(msg_element.message_type))
      if (msg_element.msg_elements)
        logger.warn('unexpected msg_element.msg_elements', msg_element.msg_elements)
      if (msg_element.attachments)
        logger.warn('unexpected msg_element.attachments', msg_element.attachments)
      else if (msg_element.ark_data)
        element.children.push(this.parseArkData(msg_element.ark_data).update(msg_element.content))
      else if (msg_element.content)
        element.children.push(msg_element.content)
      else
        element.children.push(msg_element as unknown as Fragment)
    }
    return element
  }

  parseMessageContent({
    message_scene,
    message_type,
    ...message
  }: Omit<QQ.Message & Partial<QQ.GroupMessage>, 'author'>): Element<'message'> {
    const { ref_msg_idx, ...scene } = this.parseMessageScene(message_scene)
    const element = h.message({
      'id': message.id,
      'timestamp': new Date(message.timestamp).valueOf(),
      'qq:message_type': message_type,
      ...withPrefix('qq:', scene),
    })
    let content: Fragment = message.content
    if (message_type === QQ.MessageType.Quote) {
      if (content[0] === ' ')
        content = content.slice(1)
      else
        logger.warn('expected message.content startswith " ", got', content)
    }
    if (message_type === QQ.MessageType.Ark)
      content = this.parseArkData(message.ark_data).update(message.content)
    else if (message_type === QQ.MessageType.Parallel) // TODO: parallel
      logger.warn('unknown message type', message_type, message)
    else if (message_type === QQ.MessageType.Forward)
      content = this.parseForwardContent(message.content)
    else if (message_type !== QQ.MessageType.Text && message_type !== QQ.MessageType.Quote)
      logger.warn('unknown message type', message_type, message)
    if (message.mentions)
      content = this.parseMentions(message.content, message.mentions)
    if (message_type === QQ.MessageType.Quote)
      element.children.push(this.parseMsgElements(message.msg_elements, ref_msg_idx as QQ.RefMsgIdx))
    const attachments = message.attachments ? this.parseAttachments(message.attachments) : []
    content = h.pack(h.transform.replace(
      /<faceType=(\d+),faceId="(\d*)",ext="([A-Za-z0-9+/]+={0,2})">/g,
      (_, faceType, faceId, bExt) => transformAttachment(attachments, faceType, faceId, bExt),
    )(content))
    element.update(content, ...attachments)
    return element
  }

  parseUserMessage(message: QQ.Message): Universal.EventMap['message'] {
    const sender = this.parseUser(message.author)
    if (sender.name === '')
      delete sender.name
    else
      logger.warn('unexpected C2C_MESSAGE_CREATE author.username', sender.name)
    const element = this.parseMessageContent(message)
    element.children.unshift(h.author(sender))
    return [element]
  }

  parseGroupMessage(message: QQ.GroupMessage): Universal.EventMap['message'] {
    const channel = this.parseChannel(message)
    const sender = this.parseMember(message.author, channel)
    const element = this.parseMessageContent(message)
    element.children.unshift(h.author(sender))
    return [element]
  }
}
