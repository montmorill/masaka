import type { Fragment } from '@yarkjs/element'
import type { SatoriDriver } from '@yarkjs/satori'
import type { SnakeCaseKeys } from '@yarkjs/utils'
import type { QQBot } from './bot'
import { randomUUID } from 'node:crypto'
import EventEmitter from 'node:events'
import h, { Element } from '@yarkjs/element'
import { createLogger } from '@yarkjs/logger'
import * as Satori from '@yarkjs/protocol'
import { parseContent, serialize } from '@yarkjs/satori'
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
  'qq:face': { type: number, id: string }
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
    message: {
      'qq:message_type'?: QQ.MessageType
      'qq:msg_idx'?: QQ.MsgIdx
      'qq:auth_token'?: string
      'qq:guild_id'?: string
      'qq:channel_id'?: string
    }
    quote: {
      'qq:msg_idx'?: QQ.RefMsgIdx
    }
    forward: {
      'qq:title'?: string
    }
  }
}

/** Satori 内容串 → QQ 文本（mention 转 <@id>/<@all>，其余元素取子文本） */
function toQQText(fragment: Fragment): string {
  if (typeof fragment === 'string')
    return fragment
  if (fragment.type === 'mention') {
    const attrs = fragment.attrs as { everyone?: true, user?: string, channel?: string }
    if (attrs.everyone)
      return '<@all>'
    if (typeof attrs.user === 'string')
      return `<@${attrs.user}>`
  }
  return fragment.children.map(toQQText).join('')
}

export class QQAdapter extends EventEmitter<Satori.EventMap> implements SatoriDriver {
  platform = 'qq'

  /** 观察到的 channel id → 场景，供 message.create 等 action 消歧 */
  protected channelScenes = new Map<string, 'group' | 'guild'>()

  actions: SatoriDriver['actions'] = {
    'message.create': async ({ channel_id, guild_id, content }) => {
      const text = toQQText(parseContent(content))
      if (channel_id.startsWith('private:')) {
        const result = await this.bot.sendUserMessage(channel_id.slice('private:'.length), { msg_type: QQ.MessageType.Text, content: text })
        return { id: result.id }
      }
      if (guild_id === channel_id || this.channelScenes.get(channel_id) === 'group' || !/^\d+$/.test(channel_id)) {
        const result = await this.bot.sendGroupMessage(channel_id, { msg_type: QQ.MessageType.Text, content: text })
        return { id: result.id }
      }
      const result = await this.bot.sendChannelMessage(channel_id, { content: text })
      return { id: result.id }
    },
    'message.delete': async ({ channel_id, message_id }) => {
      if (channel_id.startsWith('private:'))
        return await this.bot.recallUserMessage(channel_id.slice('private:'.length), message_id)
      if (this.channelScenes.get(channel_id) === 'group' || !/^\d+$/.test(channel_id))
        return await this.bot.recallGroupMessage(channel_id, message_id)
      return await this.bot.recallChannelMessage(channel_id, message_id)
    },
    'channel.get': async ({ channel_id }) => {
      if (channel_id.startsWith('private:'))
        return { id: channel_id, type: Satori.ChannelType.Direct }
      const channel = await this.bot.getChannel(channel_id)
      return this.mapGuildChannel(channel)
    },
    'channel.list': async ({ guild_id }) => {
      const channels = await this.bot.getChannels(guild_id)
      return { data: channels.map(channel => this.mapGuildChannel(channel)) }
    },
    'guild.get': async ({ guild_id }) => {
      if (this.channelScenes.get(guild_id) === 'group') {
        const info = await this.bot.getGroupInfo(guild_id)
        return { id: info.group_openid, name: info.group_name }
      }
      const guild = await this.bot.getGuild(guild_id)
      return { id: guild.id, name: guild.name, avatar: guild.icon }
    },
    'guild.member.get': async ({ guild_id, user_id }) => {
      if (this.channelScenes.get(guild_id) === 'group') {
        const member = await this.bot.getGroupMember(guild_id, user_id)
        return { user: { id: member.member_openid, name: member.username, is_bot: member.bot } }
      }
      return this.mapGuildMember(await this.bot.getMember(guild_id, user_id))
    },
    'guild.member.list': async ({ guild_id }) => {
      const members = await this.bot.getMembers(guild_id)
      return { data: members.map(member => this.mapGuildMember(member)) }
    },
    'guild.member.kick': async ({ guild_id, user_id }) => {
      return await this.bot.deleteMember(guild_id, user_id)
    },
    'guild.member.role.set': async ({ guild_id, user_id, role_id }) => {
      return await this.bot.addMemberRole(guild_id, user_id, role_id)
    },
    'guild.member.role.unset': async ({ guild_id, user_id, role_id }) => {
      return await this.bot.deleteMemberRole(guild_id, user_id, role_id)
    },
    'guild.role.list': async ({ guild_id }) => {
      const { roles } = await this.bot.getRoles(guild_id)
      return { data: roles.map(role => ({ id: role.id, name: role.name, color: role.color })) }
    },
    'guild.role.create': async ({ guild_id, data }) => {
      const { role } = await this.bot.createRole(guild_id, { name: data.name, color: data.color })
      return { id: role.id, name: role.name, color: role.color }
    },
    'guild.role.update': async ({ guild_id, role_id, data }) => {
      const { role } = await this.bot.patchRole(guild_id, role_id, { name: data.name, color: data.color })
      return { id: role.id, name: role.name, color: role.color }
    },
    'guild.role.delete': async ({ guild_id, role_id }) => {
      return await this.bot.deleteRole(guild_id, role_id)
    },
    'reaction.create': async ({ channel_id, message_id, emoji }) => {
      const { type, id } = this.parseEmoji(emoji)
      return await this.bot.addReaction(channel_id, message_id, type, id)
    },
    'reaction.delete': async ({ channel_id, message_id, emoji }) => {
      const { type, id } = this.parseEmoji(emoji)
      return await this.bot.deleteReaction(channel_id, message_id, type, id)
    },
    'user.get': async ({ user_id }) => ({ id: user_id }),
    'login.get': async () => ({ data: [this.getLogin()] }),
  }

  constructor(
    public bot: QQBot,
    public emitter: EventEmitter<QQ.DispatchEventMap>,
    public selfId = bot.appId,
  ) {
    super()
    const adapt = <T extends Satori.EventType>(
      eventName: T,
      parserName: keyof QQAdapter,
    ): ((...args: unknown[]) => void) => (...args) => // @ts-ignore
      void this.emit(eventName, {
        id: randomUUID(),
        type: eventName,
        platform: this.platform,
        self_id: this.selfId,
        timestamp: Date.now(),
        ...(this[parserName] as (...args: unknown[]) => Satori.EventBody<T>)(...args),
      })

    emitter.on('GUILD_CREATE', adapt('guild-added', 'parseGuildCreate'))
    emitter.on('GUILD_UPDATE', adapt('guild-updated', 'parseGuildUpdate'))
    emitter.on('GUILD_DELETE', adapt('guild-removed', 'parseGuildDelete'))
    emitter.on('GUILD_MEMBER_ADD', adapt('guild-member-added', 'parseGuildMemberAdd'))
    emitter.on('GUILD_MEMBER_UPDATE', adapt('guild-member-updated', 'parseGuildMemberUpdate'))
    emitter.on('GUILD_MEMBER_REMOVE', adapt('guild-member-removed', 'parseGuildMemberRemove'))
    emitter.on('GROUP_MEMBER_ADD', adapt('guild-member-added', 'parseGroupMemberAdd'))
    emitter.on('GROUP_MEMBER_REMOVE', adapt('guild-member-removed', 'parseGroupMemberRemove'))
    emitter.on('GROUP_JOIN_REQUEST', adapt('guild-member-request', 'parseGroupJoinRequest'))
    emitter.on('MESSAGE_CREATE', adapt('message-created', 'parseGuildMessage'))
    emitter.on('AT_MESSAGE_CREATE', adapt('message-created', 'parseGuildMessage'))
    emitter.on('DIRECT_MESSAGE_CREATE', adapt('message-created', 'parseGuildMessage'))
    emitter.on('MESSAGE_DELETE', adapt('message-deleted', 'parseMessageDelete'))
    emitter.on('DIRECT_MESSAGE_DELETE', adapt('message-deleted', 'parseMessageDelete'))
    emitter.on('PUBLIC_MESSAGE_DELETE', adapt('message-deleted', 'parseMessageDelete'))
    emitter.on('MESSAGE_REACTION_ADD', adapt('reaction-added', 'parseReactionAdd'))
    emitter.on('MESSAGE_REACTION_REMOVE', adapt('reaction-removed', 'parseReactionRemove'))
    emitter.on('C2C_MESSAGE_CREATE', adapt('message-created', 'parseUserMessage'))
    emitter.on('GROUP_AT_MESSAGE_CREATE', adapt('message-created', 'parseGroupMessage'))
    emitter.on('GROUP_MESSAGE_CREATE', adapt('message-created', 'parseGroupMessage'))
    emitter.on('FRIEND_ADD', adapt('friend-request', 'parseFriendAdd'))

    const rawEvents: (keyof QQ.DispatchEvents)[] = [
      'CHANNEL_CREATE',
      'CHANNEL_UPDATE',
      'CHANNEL_DELETE',
      'FRIEND_DEL',
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
    for (const name of rawEvents) {
      emitter.on(name, (data, id) => this.emit('internal', {
        id,
        type: 'internal',
        platform: this.platform,
        self_id: this.selfId,
        timestamp: Date.now(),
        _type: `qq.${name.toLowerCase().replaceAll('_', '-')}`,
        _data: data,
      }))
    }
  }

  getLogin(): Satori.Login {
    return {
      user: { id: this.selfId },
      self_id: this.selfId,
      platform: this.platform,
      status: Satori.LoginStatus.Online,
    }
  }

  /** QQ 频道类型 → Satori 频道类型 */
  protected mapChannelType(type: number): Satori.ChannelType {
    if (type === 2 || type === 3)
      return Satori.ChannelType.Voice
    if (type === 4)
      return Satori.ChannelType.Category
    return Satori.ChannelType.Text
  }

  protected mapGuildChannel(channel: QQ.Channel): Satori.Channel {
    return {
      id: channel.id,
      type: this.mapChannelType(channel.type),
      name: channel.name,
      parent_id: channel.parent_id,
    }
  }

  protected mapGuildMember(member: QQ.GuildMember): Satori.GuildMember {
    return {
      user: this.parseGuildUser(member.user),
      nick: member.nick,
      joined_at: Date.parse(member.joined_at),
      roles: member.roles.map(id => ({ id })),
    }
  }

  protected parseEmoji(emoji: string | Satori.Emoji): { type: QQ.EmojiType, id: string } {
    const id = typeof emoji === 'string' ? emoji : emoji.id ?? emoji.name ?? ''
    return {
      type: /^\d+$/.test(id) ? QQ.EmojiType.System : QQ.EmojiType.Emoji,
      id,
    }
  }

  parseGuild(guild: QQ.GuildEvent): Satori.Guild {
    return {
      id: guild.id,
      name: guild.name,
      avatar: guild.icon,
    }
  }

  parseGuildCreate(event: QQ.GuildEvent): Satori.EventBody<'guild-added'> {
    return { guild: this.parseGuild(event), operator: { id: event.op_user_id } }
  }

  parseGuildUpdate(event: QQ.GuildEvent): Satori.EventBody<'guild-updated'> {
    return { guild: this.parseGuild(event), operator: { id: event.op_user_id } }
  }

  parseGuildDelete(event: QQ.GuildEvent): Satori.EventBody<'guild-removed'> {
    return { guild: this.parseGuild(event), operator: { id: event.op_user_id } }
  }

  parseGuildUser(user: QQ.GuildUser): Satori.User {
    return {
      id: user.id,
      name: user.username,
      avatar: user.avatar,
      is_bot: user.bot,
    }
  }

  parseGuildMember(event: QQ.GuildMemberEvent): Satori.GuildMember {
    return {
      user: this.parseGuildUser(event.user),
      nick: event.nick,
      joined_at: Date.parse(event.joined_at),
      roles: event.roles.map(id => ({ id })),
    }
  }

  parseGuildMemberAdd(event: QQ.GuildMemberEvent): Satori.EventBody<'guild-member-added'> {
    return { guild: { id: event.guild_id }, member: this.parseGuildMember(event), operator: { id: event.op_user_id } }
  }

  parseGuildMemberUpdate(event: QQ.GuildMemberEvent): Satori.EventBody<'guild-member-updated'> {
    return { guild: { id: event.guild_id }, member: this.parseGuildMember(event), operator: { id: event.op_user_id } }
  }

  parseGuildMemberRemove(event: QQ.GuildMemberEvent): Satori.EventBody<'guild-member-removed'> {
    return { guild: { id: event.guild_id }, member: this.parseGuildMember(event), operator: { id: event.op_user_id } }
  }

  parseGroupMember({ member_openid }: QQ.GroupMemberEvent): Satori.GuildMember {
    return { user: { id: member_openid } }
  }

  parseGroupMemberAdd(event: QQ.GroupMemberEvent): Satori.EventBody<'guild-member-added'> {
    return { guild: { id: event.group_openid }, member: this.parseGroupMember(event) }
  }

  parseGroupMemberRemove(event: QQ.GroupMemberEvent): Satori.EventBody<'guild-member-removed'> {
    return { guild: { id: event.group_openid }, member: this.parseGroupMember(event) }
  }

  parseGroupJoinRequest(event: QQ.GroupJoinRequest): Satori.EventBody<'guild-member-request'> {
    return {
      guild: { id: event.group_openid },
      member: {
        user: { id: event.member_openid, name: event.username, is_bot: event.bot },
        nick: event.username,
        joined_at: Date.parse(event.apply_at),
      },
    }
  }

  parseReaction({ target, emoji }: QQ.MessageReaction): Satori.Reaction {
    return { message: { id: target.id }, emoji: { id: emoji.id } }
  }

  parseReactionAdd(reaction: QQ.MessageReaction): Satori.EventBody<'reaction-added'> {
    return {
      reaction: this.parseReaction(reaction),
      channel: { id: reaction.channel_id },
      guild: { id: reaction.guild_id },
      user: { id: reaction.user_id },
    }
  }

  parseReactionRemove(reaction: QQ.MessageReaction): Satori.EventBody<'reaction-removed'> {
    return {
      reaction: this.parseReaction(reaction),
      channel: { id: reaction.channel_id },
      guild: { id: reaction.guild_id },
      user: { id: reaction.user_id },
    }
  }

  parseFriendAdd({ openid }: QQ.FriendAdd): Satori.EventBody<'friend-request'> {
    return { user: { id: openid } }
  }

  /** 剥离顶层 author 子元素（其信息由事件 user/member 承载）后序列化消息内容 */
  protected messageResource(element: Element<'message'>, edited?: string): Satori.Message {
    return {
      id: element.attrs.id,
      content: element.children
        .filter(child => !(child instanceof Element && child.type === 'author'))
        .map(serialize)
        .join(''),
      created_at: element.attrs.timestamp,
      updated_at: edited === undefined ? undefined : Date.parse(edited),
    }
  }

  parseGuildMessageAuthor(message: QQ.GuildMessage): Satori.User {
    const user = this.parseGuildUser(message.author)
    if (!message.member)
      return user
    return {
      ...user,
      name: message.member.nick || user.name,
    }
  }

  parseGuildMessageElement(message: QQ.GuildMessage): Element<'message'> {
    const element = h.message({
      'id': message.id,
      'timestamp': new Date(message.timestamp).valueOf(),
      'qq:guild_id': message.guild_id,
      'qq:channel_id': message.channel_id,
    })
    element.children.unshift(h.author(this.parseGuildMessageAuthor(message)))
    const attachments = message.attachments?.map(({ url }) => h.file({ src: url })) ?? []
    element.update(message.content, ...attachments)
    return element
  }

  parseGuildMessage(message: QQ.GuildMessage): Satori.EventBody<'message-created'> {
    const element = this.parseGuildMessageElement(message)
    this.channelScenes.set(message.channel_id, 'guild')
    const user = this.parseGuildUser(message.author)
    return {
      message: this.messageResource(element, message.edited_timestamp),
      channel: { id: message.channel_id },
      guild: { id: message.guild_id },
      user,
      member: message.member
        ? {
            user,
            nick: message.member.nick,
            joined_at: Date.parse(message.member.joined_at),
            roles: message.member.roles.map(id => ({ id })),
          }
        : undefined,
    }
  }

  parseMessageDelete(event: QQ.MessageDelete): Satori.EventBody<'message-deleted'> {
    return {
      message: { id: event.message.id },
      channel: { id: event.message.channel_id },
      guild: { id: event.message.guild_id },
      operator: this.parseGuildUser(event.op_user),
    }
  }

  parseUser(user: QQ.User): Satori.User {
    return {
      id: user.id,
      name: user.username,
      is_bot: user.bot,
    }
  }

  parseMember(member: QQ.Member): Satori.GuildMember {
    return {
      user: this.parseUser(member),
      nick: member.username,
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

  parseUserMessage(message: QQ.Message): Satori.EventBody<'message-created'> {
    const sender = this.parseUser(message.author)
    if (sender.name === '')
      delete sender.name
    else
      logger.warn('unexpected C2C_MESSAGE_CREATE author.username', sender.name)
    const element = this.parseMessageContent(message)
    element.children.unshift(h.author(sender))
    return {
      message: this.messageResource(element),
      channel: { id: `private:${message.author.id}`, type: Satori.ChannelType.Direct },
      user: sender,
    }
  }

  parseGroupMessage(message: QQ.GroupMessage): Satori.EventBody<'message-created'> {
    const member = this.parseMember(message.author)
    const element = this.parseMessageContent(message)
    element.children.unshift(h.author(member))
    this.channelScenes.set(message.group_openid, 'group')
    return {
      message: this.messageResource(element),
      channel: { id: message.group_openid, type: Satori.ChannelType.Text },
      guild: { id: message.group_openid },
      member,
      user: member.user,
    }
  }
}
