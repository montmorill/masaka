import type { Element } from '@yarkjs/element'
import type * as Universal from '@yarkjs/protocol'
import type QQBot from './bot'
import type * as QQ from './common'
import EventEmitter from 'node:events'
import h from '@yarkjs/element'
import { logger } from '@yarkjs/logger'

declare module '@yarkjs/protocol' {
  interface Message {
    'qq:refidx': QQ.RefIdx
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

  decodeGuild(channel: { group_openid: string }): Universal.Guild {
    return {
      id: channel.group_openid,
    }
  }

  decodeChannel(channel: { group_openid: string }): Universal.Channel {
    return {
      id: channel.group_openid,
      guild: this.decodeGuild(channel),
    }
  }

  decodeUser(user: QQ.User): Universal.User {
    return {
      id: user.id,
      name: user.username,
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

  decodeMessageContent(message: QQ.Message | QQ.GroupMessage): Element<'message'> {
    const { msg_idx } = this.decodeMessageScene(message.message_scene)
    if (!msg_idx?.startsWith('REFIDX_'))
      console.warn('unknown refidx', msg_idx)
    const element = h.message({ 'id': message.id, 'qq:refidx': msg_idx as any })
    element.children.push(message.content) // TODO: parse this
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
