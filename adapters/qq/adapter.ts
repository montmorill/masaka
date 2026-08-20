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
    text: string
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

    emitter.on('C2C_MESSAGE_CREATE', adapt('message', 'parseUserMessage'))
    emitter.on('GROUP_MESSAGE_CREATE', adapt('message', 'parseGroupMessage'))
    emitter.on('GROUP_AT_MESSAGE_CREATE', adapt('message', 'parseGroupMessage'))
  }

  parseChannel(channel: { group_openid: string }): Universal.Channel {
    return {
      id: channel.group_openid,
    }
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
