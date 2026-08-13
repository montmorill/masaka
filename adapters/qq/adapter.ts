import type { Element, Fragment } from '@yarkjs/element'
import type * as Universal from '@yarkjs/protocol'
import type QQBot from './bot'
import EventEmitter from 'node:events'
import h from '@yarkjs/element'
import { logger } from '@yarkjs/logger'
import { withPrefix } from '@yarkjs/utils'
import * as QQ from './common'

export type Ark<T extends string = string, Data extends QQ.ArkData = QQ.ArkData<T>> = {
  /** 卡片消息中的用户操作提示文本 */ prompt: Data['prompt']
  /** 卡片消息类型标识 */ type: T
  /** 卡片消息类型的中文名称 */ name: Data['ark_name']
} & Data['fields']

declare module '@yarkjs/element' {
  interface Elements {
    ark: Ark
  }
}

declare module '@yarkjs/protocol' {
  interface User {
    bot: boolean
  }

  interface Message {
    'qq:type'?: QQ.MessageType.StringTag
    'qq:msg_idx'?: QQ.MsgIdx
  }

  interface Quote {
    'qq:msg_idx': QQ.RefMsgIdx
  }
}

export class QQAdapter extends EventEmitter<Universal.EventMap> {
  constructor(
    public bot: QQBot,
    public emitter: EventEmitter<QQ.DispatchEventMap>,
  ) {
    super()
    const adapt = <
      A extends any[],
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

  parseArkData({ prompt, ark_type: type, ark_name: name, fields }: QQ.ArkData): Element<'ark'> {
    return h.ark({ prompt, type, name, ...fields })
  }

  parseForwardContent(content: string): Element<'message'>[] {
    return [h.message(content)] // TODO: parse forward content
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

  parseMsgElements(msg_elements: QQ.MsgElement[], ref_msg_idx: QQ.RefMsgIdx): Element<'quote'> {
    const element = h.quote({ 'qq:msg_idx': ref_msg_idx })
    for (const { ...msg_element } of msg_elements) {
      if (msg_element.msg_idx !== ref_msg_idx)
        console.warn('unmatched msg_element.msg_idx', msg_element.msg_idx, 'with ref_msg_idx', ref_msg_idx)
      if (msg_element.author)
        console.warn('unexpected msg_element.author', msg_element.author)
      if (msg_element.message_type && msg_element.message_type !== QQ.MessageType.Quote)
        console.warn('unexpected msg_element.message_type', QQ.MessageType.toString(msg_element.message_type))
      if (msg_element.msg_elements)
        console.warn('unexpected msg_element.msg_elements', msg_element.msg_elements)
      // TODO: parse message elements
      if (msg_element.attachments)
        console.warn('unexpected msg_element.attachments', msg_element.attachments)
      else if (msg_element.ark_data)
        element.children.push(this.parseArkData(msg_element.ark_data))
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
    const element = h.message(Object.assign({
      'id': message.id,
      'timestamp': new Date(message.timestamp).valueOf(),
      'qq:type': QQ.MessageType.toString(message_type),
      ...withPrefix('qq:', scene),
    }))
    let content: Fragment = message.content
    if (message_type === QQ.MessageType.Ark)
      content = this.parseArkData(message.ark_data).update(message.content)
    else if (message_type === QQ.MessageType.Parallel) // TODO: parallel
      console.warn('unknown message type', message_type, message)
    else if (message_type === QQ.MessageType.Forward)
      content = h.pack(this.parseForwardContent(message.content))
    else if (message_type !== QQ.MessageType.Text && message_type !== QQ.MessageType.Quote)
      console.warn('unknown message type', message_type, message)
    if (message.mentions)
      content = this.parseMentions(message.content, message.mentions)
    // TODO: attachments
    element.children = h.unpack(content)
    if (message_type === QQ.MessageType.Quote) {
      element.children.unshift(this.parseMsgElements(
        message.msg_elements,
        ref_msg_idx as QQ.RefMsgIdx,
      ))
    }
    return element
  }

  parseUserMessage(message: QQ.Message): Universal.EventMap['message'] {
    const sender = this.parseUser(message.author)
    if (sender.name === '')
      delete sender.name
    else
      console.warn('unexpected C2C_MESSAGE_CREATE author.username', sender.name)
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
