import type { Element, Fragment } from '@yarkjs/element'
import type { SnakeCaseKeys } from '@yarkjs/utils'
import type { QQBot } from './bot'
import EventEmitter from 'node:events'
import h from '@yarkjs/element'
import { createLogger } from '@yarkjs/logger'
import * as Satori from '@yarkjs/protocol'
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

export class QQAdapter extends EventEmitter<Satori.EventMap> implements Partial<Satori.Methods> {
  readonly platform = 'qq'

  constructor(
    public bot: QQBot,
    public emitter: EventEmitter<QQ.DispatchEventMap>,
  ) {
    super()
    const adapt = <
      A extends unknown[],
      T extends keyof Satori.EventMap,
      P extends (...args: A) => Satori.Events[T],
    >(eventName: T,
      parser: P,
    ) => (...args: A): void => // @ts-ignore
      void this.emit(eventName, parser(...args))

    emitter.on('GROUP_MEMBER_ADD', adapt('guild-member-added', this.parseGroupMemberAdd.bind(this)))
    emitter.on('GROUP_MEMBER_REMOVE', adapt('guild-member-removed', this.parseGroupMemberRemove.bind(this)))
    emitter.on('GROUP_JOIN_REQUEST', adapt('guild-member-request', this.parseGroupJoinRequest.bind(this)))
    emitter.on('C2C_MESSAGE_CREATE', adapt('message-created', this.parseUserMessage.bind(this)))
    emitter.on('GROUP_AT_MESSAGE_CREATE', adapt('message-created', this.parseGroupMessage.bind(this)))
    emitter.on('GROUP_MESSAGE_CREATE', adapt('message-created', this.parseGroupMessage.bind(this)))
    emitter.on('FRIEND_ADD', adapt('friend-request', this.parseFriendAdd.bind(this)))

    const rawEvents: (keyof QQ.DispatchEvents)[] = [
      'FRIEND_DEL',
      'C2C_MSG_REJECT',
      'C2C_MSG_RECEIVE',
      'GROUP_ADD_ROBOT',
      'GROUP_DEL_ROBOT',
      'GROUP_MSG_REJECT',
      'GROUP_MSG_RECEIVE',
    ]
    for (const name of rawEvents) {
      emitter.on(name, () => {
        throw new Error('unimplemented')
      })
    }
  }

  async getLogin(): Promise<Satori.Login> {
    const me = await this.bot.getMe()
    return {
      status: Satori.Status.Online,
      user: this.parseGuildUser(me),
      platform: 'qq',
    }
  }

  parseGroupMember({ member_openid }: QQ.GroupMemberEvent): Satori.GuildMember {
    return { user: { id: member_openid } }
  }

  parseGroupMemberAdd(event: QQ.GroupMemberEvent): Satori.Events['guild-member-added'] {
    return { guild: { id: event.group_openid }, member: this.parseGroupMember(event) }
  }

  parseGroupMemberRemove(event: QQ.GroupMemberEvent): Satori.Events['guild-member-removed'] {
    return { guild: { id: event.group_openid }, member: this.parseGroupMember(event) }
  }

  parseGroupJoinRequest(event: QQ.GroupJoinRequest): Satori.Events['guild-member-request'] {
    return {
      guild: { id: event.group_openid },
      member: {
        user: { id: event.member_openid, name: event.username, isBot: event.bot },
        nick: event.username,
        joinedAt: Date.parse(event.apply_at),
      },
    }
  }

  parseFriendAdd({ openid }: QQ.FriendAdd): Satori.Events['friend-request'] {
    return { user: { id: openid } }
  }

  parseUser(user: QQ.User): Satori.User {
    return {
      id: user.id,
      name: user.username,
      avatar: `https://q.qlogo.cn/qqapp/${this.bot.id}/${user.id}/640`,
      isBot: user.bot,
    }
  }

  parseMember(member: QQ.Member): Satori.GuildMember {
    return {
      user: this.parseUser(member),
      // TODO: roles: [member.member_role],
    }
  }

  parseGuildUser(user: QQ.GuildUser): Satori.User {
    return {
      id: user.id,
      name: user.username,
      avatar: `https://q.qlogo.cn/qqapp/${this.bot.id}/${user.id}/640`,
      isBot: user.bot,
    }
  }

  parseGuildMember(member: QQ.GuildMember): Satori.GuildMember {
    return {
      user: this.parseGuildUser(member.user),
      nick: member.nick,
      // TODO: roles: member.roles,
      joinedAt: new Date(member.joined_at).valueOf(),
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
        logger.warn('unexpected msg_element', msg_element)
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
      content = parseForwardContent(message.content)
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

  parseUserMessage(message: QQ.Message): Satori.Events['message-created'] {
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

  parseGroupMessage(message: QQ.GroupMessage): Satori.Events['message-created'] {
    const member = this.parseMember(message.author)
    const element = this.parseMessageContent(message)
    return {
      message: this.messageResource(element),
      channel: { id: message.group_openid, type: Satori.ChannelType.Text },
      guild: { id: message.group_openid },
      member,
      user: member.user,
    }
  }

  messageResource(element: Element<'message'>): Satori.Message {
    return Object.assign({ element }, element.attrs)
  }
}
