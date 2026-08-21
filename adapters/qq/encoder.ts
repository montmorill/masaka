import type { Fragment } from '@yarkjs/element'
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

/** 发送场景：private 单聊，group 群聊，guild 频道 */
export type QQScene = 'private' | 'group' | 'guild'

interface PendingMedia {
  url: string
  type: QQ.MediaUpload['file_type']
  name?: string
}

/**
 * QQ 消息编码器：visit 累积元素，flush 按场景发送。
 * 文本与 @ 拼接为 content；首个媒体元素在 flush 时上传并以 msg_type=7 发送；
 * 频道场景暂不支持媒体（降级为纯文本并告警）。
 */
export class QQMessageEncoder {
  protected content = ''
  protected media?: PendingMedia

  constructor(
    protected bot: QQBot,
    /** 目标频道 id；private 场景携带 `private:` 前缀 */
    protected channelId: string,
    protected scene: QQScene,
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

  async flush(): Promise<{ id: string }> {
    if (this.scene === 'guild') {
      if (this.media)
        logger.warn('guild scene does not support media, dropped', this.media)
      const result = await this.bot.sendChannelMessage(this.channelId, { content: this.content })
      return { id: result.id }
    }
    if (this.media) {
      const upload = this.scene === 'private'
        ? await this.bot.uploadUserFile(this.userOpenid, { url: this.media.url, file_type: this.media.type, file_name: this.media.name })
        : await this.bot.uploadGroupFile(this.channelId, { url: this.media.url, file_type: this.media.type, file_name: this.media.name })
      const message: QQ.MessageToSend = {
        msg_type: QQ.MessageType.Media,
        // 文档要求 msg_type=7 时 content 至少有一个值（如空格）
        content: this.content || ' ',
        media: { file_info: upload.file_info },
      }
      const result = this.scene === 'private'
        ? await this.bot.sendUserMessage(this.userOpenid, message)
        : await this.bot.sendGroupMessage(this.channelId, message)
      return { id: result.id }
    }
    const message: QQ.MessageToSend = { msg_type: QQ.MessageType.Text, content: this.content }
    const result = this.scene === 'private'
      ? await this.bot.sendUserMessage(this.userOpenid, message)
      : await this.bot.sendGroupMessage(this.channelId, message)
    return { id: result.id }
  }

  /** private 场景去掉 `private:` 前缀得到用户 openid */
  protected get userOpenid(): string {
    return this.channelId.slice('private:'.length)
  }
}
