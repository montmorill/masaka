import type { Fragment } from '@yarkjs/element'
import type { Message } from '@yarkjs/protocol'
import type { QQBot } from './bot'
import { createLogger } from '@yarkjs/logger'
import * as QQ from './common'

const logger = createLogger('qq')

const MEDIA_TYPES = {
  image: 1,
  video: 2,
  audio: 3,
  file: 4,
} as const satisfies Record<string, NonNullable<QQ.MediaUpload['file_type']>>

type MediaElementType = keyof typeof MEDIA_TYPES

interface PendingMedia {
  url: string
  type: QQ.MediaUpload['file_type']
  name?: string
}

export class QQMessageEncoder {
  protected content = ''
  protected media?: PendingMedia

  constructor(
    protected bot: QQBot,
    protected channelId: string,
    protected scene: QQ.Scene,
  ) {}

  visit(fragment: Fragment): this {
    if (typeof fragment === 'string') {
      this.content += fragment
      return this
    }
    switch (fragment.type) {
      case 'mention': {
        const attrs = fragment.attrs as { everyone?: true, user?: string }
        this.content += attrs.everyone
          ? '<@all>'
          : typeof attrs.user === 'string' ? `<@${attrs.user}>` : ''
        break
      }
      case 'image':
      case 'audio':
      case 'video':
      case 'file': {
        const attrs = fragment.attrs as { src?: string, title?: string }
        if (typeof attrs.src === 'string') {
          if (this.media)
            logger.warn('multiple media elements, only the first is sent', this.media, attrs.src)
          else
            this.media = { url: attrs.src, type: MEDIA_TYPES[fragment.type as MediaElementType], name: attrs.title }
        }
        break
      }
      default:
        for (const child of fragment.children)
          this.visit(child)
    }
    return this
  }

  async flush(message: QQ.MessageToSend): Promise<Message[]> {
    if (this.scene === QQ.Scene.Guild) {
      if (this.media)
        logger.warn('guild scene does not support media, dropped', this.media)
      const { id } = await this.bot.sendChannelMessage(this.channelId, { content: this.content })
      return [{ id }]
    }
    message.msg_type = QQ.MessageType.Text
    message.content = this.content
    if (this.media) {
      const upload = this.scene === QQ.Scene.Group
        ? await this.bot.uploadGroupFile(this.channelId, { url: this.media.url, file_type: this.media.type, file_name: this.media.name })
        : await this.bot.uploadUserFile(this.userOpenid, { url: this.media.url, file_type: this.media.type, file_name: this.media.name })
      message.msg_type = QQ.MessageType.Media
      message.content ||= ' '
      message.media = { file_info: upload.file_info }
    }
    const { id } = this.scene === QQ.Scene.Group
      ? await this.bot.sendGroupMessage(this.channelId, message)
      : await this.bot.sendUserMessage(this.userOpenid, message)
    return [{ id }]
  }

  /** private 场景去掉 `private:` 前缀得到用户 openid */
  protected get userOpenid(): string {
    return this.channelId.slice('private:'.length)
  }
}
