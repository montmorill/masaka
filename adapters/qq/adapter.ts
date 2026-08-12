import type { Element, Fragment } from '@yarkjs/element'
import type * as Universal from '@yarkjs/protocol'
import type QQBot from './bot'
import EventEmitter from 'node:events'
import h from '@yarkjs/element'
import { logger } from '@yarkjs/logger'
import { withPrefix } from '@yarkjs/utils'
import * as QQ from './common'

declare module '@yarkjs/protocol' {
  interface User {
    bot: boolean
  }

  interface Message {
    'qq:type': QQ.MessageType.StringTag
    'qq:msg_idx': QQ.RefIdx
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
      U extends keyof QQAdapter,
    >(
      eventName: T,
      decoderName: QQAdapter[U] extends (...args: A) => Universal.EventMap[T] ? U : never,
    ) => (...args: A): void => // @ts-ignore
      void this.emit(eventName, ...this[decoderName](...args))

    emitter.on('C2C_MESSAGE_CREATE', adapt('message', 'decodeUserMessage'))
    emitter.on('GROUP_MESSAGE_CREATE', adapt('message', 'decodeGroupMessage'))
    emitter.on('GROUP_AT_MESSAGE_CREATE', adapt('message', 'decodeGroupMessage'))
  }

  decodeChannel(channel: { group_openid: string }): Universal.Channel {
    return {
      id: channel.group_openid,
    }
  }

  decodeUser(user: QQ.User): Universal.User {
    return {
      id: user.id,
      name: user.username,
      bot: user.bot,
    }
  }

  decodeMember(member: QQ.Member, channel: Universal.Channel): Universal.Member {
    return {
      ...this.decodeUser(member),
      role: member.member_role,
      channel,
    }
  }

  decodeMessageScene(scene: QQ.MessageScene): Record<string, string> {
    if (scene.source !== 'default')
      logger.warn('unexpected scene source', scene.source)
    return Object.fromEntries(scene.ext.map((pair) => {
      const index = pair.search('=')
      const key = pair.slice(0, index)
      const value = pair.slice(index + 1)
      return [key, value]
    }))
  }

  decodeMessageContent(message: Omit<QQ.Message & Partial<QQ.GroupMessage>, 'author'>): Element<'message'> {
    const scene = this.decodeMessageScene(message.message_scene)
    const element = h.message(Object.assign({
      'id': message.id,
      'timestamp': new Date(message.timestamp).valueOf(),
      'qq:type': QQ.MessageType.toString(message.message_type),
      ...withPrefix('qq:', scene),
    }))
    let content: Fragment = message.content
    if (message.mentions) {
      const mentionMap = new Map<string, Element<'mention'>>()
      for (const mention of message.mentions) {
        if (mention.scope === 'all') {
          mentionMap.set('all', h.mention({ everyone: true }))
          continue
        }
        // TODO: record user
        mentionMap.set(mention.id, h.mention({ user: mention.id }))
      }
      content = h.pack(Array.from(h.replace(
        message.content,
        /<@(all|[0-9A-F]{32})>/g,
        (raw, id) => mentionMap.get(id) || raw,
      )))
    }
    element.children = h.unpack(content)
    // TODO: quote
    // TODO: ark
    return element
  }

  decodeUserMessage(message: QQ.Message): Universal.EventMap['message'] {
    const sender = this.decodeUser(message.author)
    if (sender.name === '')
      delete sender.name
    else
      console.warn('unexpected C2C_MESSAGE_CREATE author.username', sender.name)
    const element = this.decodeMessageContent(message)
    return [sender, element]
  }

  decodeGroupMessage(message: QQ.GroupMessage): Universal.EventMap['message'] {
    const channel = this.decodeChannel(message)
    const sender = this.decodeMember(message.author, channel)
    const element = this.decodeMessageContent(message)
    return [sender, element]
  }
}
