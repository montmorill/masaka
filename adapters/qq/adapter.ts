import type { Element, ElementAttrs, Fragment } from '@yarkjs/element'
import type * as Universal from '@yarkjs/protocol'
import type QQBot from './bot'
import { Buffer } from 'node:buffer'
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
    'image': {
      'qq:faceType'?: number
      'qq:attachmentType'?: string
      'qq:content_type'?: string
    }
    'audio': {
      'qq:voice_wav_url': string
      'qq:asr_refer_text': string
    }
    'qq:ark': Ark
    'qq:face': {
      type: number
      id: string
      text: string
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
}

interface ForwardAttachment {
  type: string
  filename?: string
  width?: number
  height?: number
  size?: number
  url?: string
}

interface ForwardCard {
  name: string
  fields: Record<string, string>
}

interface ForwardItem {
  content?: string
  author?: string
  attachments: ForwardAttachment[]
  type?: string
  card?: ForwardCard
  forward?: ForwardItem[]
}

/**
 * Whether the line is the separator of the item list at the given nesting
 * level: `=== 消息 N ===` at the top level, `--- 第N条 ---` nested.
 * Item indices are strictly increasing, so a lookalike line with any other
 * index is part of the user content instead.
 */
function matchForwardSeparator(line: string, level: number, expects: number[]): boolean {
  if (level === 0) {
    const match = /^=== 消息 (\d+) ===$/.exec(line)
    return !!match && +match[1]! === expects[0]
  }
  const indent = ' '.repeat(4 * (level - 1))
  if (!line.startsWith(indent))
    return false
  const match = /^--- 第(\d+)条 ---$/.exec(line.slice(indent.length))
  return !!match && +match[1]! === expects[level]
}

/** Whether the line is the separator of one of the open item lists. */
function matchOpenSeparator(line: string, level: number, expects: number[]): boolean {
  const match = /^=== 消息 (\d+) ===$/.exec(line)
  if (match && +match[1]! === expects[0])
    return true
  for (let index = 1; index <= level; index++) {
    const indent = ' '.repeat(4 * (index - 1))
    if (!line.startsWith(indent))
      continue
    const match = /^--- 第(\d+)条 ---$/.exec(line.slice(indent.length))
    if (match && +match[1]! === expects[index])
      return true
  }
  return false
}

/** Field markers that terminate the preceding `[消息内容]` block. */
function matchForwardField(line: string, indent: string): boolean {
  const rest = line.startsWith(indent) ? line.slice(indent.length) : ''
  return rest.startsWith('[发送者] ')
    || /^\[附件\d+\] /.test(rest)
    || rest.startsWith('[消息类型] ')
    || rest.startsWith('[卡片消息] ')
    || rest === '[关联消息]'
}

/** Strip the nesting indent from a content line, if present. */
function dedentForwardLine(line: string, indent: string): string {
  return line.startsWith(indent) ? line.slice(indent.length) : line
}

function parseForwardSize(size: string): number | undefined {
  const match = /^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i.exec(size)
  if (!match) {
    console.warn('unknown forward attachment size', size)
    return
  }
  const units = { '': 1, 'B': 1, 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 } as const
  return +match[1]! * units[(match[2] ?? '').toUpperCase() as keyof typeof units]
}

function parseForwardAttachment(line: string): ForwardAttachment {
  const attachment: ForwardAttachment = { type: '' }
  for (const token of line.split(' ')) {
    const index = token.indexOf(':')
    if (index < 0)
      continue
    const key = token.slice(0, index)
    const value = token.slice(index + 1)
    if (key === '类型') {
      attachment.type = value
    }
    else if (key === '文件名') {
      attachment.filename = value
    }
    else if (key === '尺寸') {
      const [width, height] = value.split('x').map(Number) as [number?, number?]
      attachment.width = width
      attachment.height = height
    }
    else if (key === '大小') {
      attachment.size = parseForwardSize(value)
    }
    else if (key === 'URL') {
      attachment.url = value
    }
  }
  return attachment
}

/**
 * Parse the `[卡片消息]` field: a card name followed by `key:value` pairs,
 * whose values may contain spaces, e.g. `图文H5 摘要:[分享]喵喵喵 tag:小红书`.
 */
function parseForwardCard(line: string): ForwardCard {
  const fields: Record<string, string> = {}
  const pattern = / ([^: ]+):/g
  let match = pattern.exec(line)
  if (!match)
    return { name: line, fields }
  const name = line.slice(0, match.index)
  let start = match.index + match[0]!.length
  while (true) {
    const key = match[1]!
    match = pattern.exec(line)
    fields[key] = line.slice(start, match ? match.index : line.length).trim()
    if (!match)
      break
    start = match.index + match[0]!.length
  }
  return { name, fields }
}

function parseForwardItems(
  lines: string[],
  index: number,
  level: number,
  expects: number[],
): { items: ForwardItem[], index: number } {
  const items: ForwardItem[] = []
  while (index < lines.length) {
    const line = lines[index]!
    if (line.trim() === '') {
      index++
      continue
    }
    if (!matchForwardSeparator(line, level, expects))
      break
    index++
    const parsed = parseForwardItem(lines, index, level, expects)
    items.push(parsed.item)
    index = parsed.index
    expects[level]!++
  }
  return { items, index }
}

function parseForwardItem(
  lines: string[],
  index: number,
  level: number,
  expects: number[],
): { item: ForwardItem, index: number } {
  const item: ForwardItem = { attachments: [] }
  const indent = ' '.repeat(4 * level)
  while (lines[index]?.trim() === '')
    index++
  if (lines[index]?.startsWith(`${indent}[消息内容] `)) {
    const content = [lines[index]!.slice(indent.length + '[消息内容] '.length)]
    index++
    while (index < lines.length) {
      const line = lines[index]!
      if (matchForwardField(line, indent) || matchOpenSeparator(line, level, expects))
        break
      content.push(dedentForwardLine(line, indent))
      index++
    }
    item.content = content.join('\n')
  }
  if (lines[index]?.startsWith(`${indent}[发送者] `)) {
    item.author = lines[index]!.slice(indent.length + '[发送者] '.length)
    index++
  }
  while (lines[index]?.startsWith(`${indent}[附件`)) {
    const match = /^\[附件\d+\] (.*)$/.exec(lines[index]!.slice(indent.length))
    if (!match)
      break
    item.attachments.push(parseForwardAttachment(match[1]!))
    index++
  }
  if (lines[index]?.startsWith(`${indent}[消息类型] `)) {
    item.type = lines[index]!.slice(indent.length + '[消息类型] '.length)
    index++
  }
  if (lines[index]?.startsWith(`${indent}[卡片消息] `)) {
    item.card = parseForwardCard(lines[index]!.slice(indent.length + '[卡片消息] '.length))
    index++
  }
  if (lines[index] === `${indent}[关联消息]`) {
    index++
    expects[level + 1] = 1
    const nested = parseForwardItems(lines, index, level + 1, expects)
    item.forward = nested.items
    index = nested.index
  }
  return { item, index }
}

function buildForwardAttachment({
  type,
  filename,
  width,
  height,
  size,
  url,
}: ForwardAttachment): Element<'file' | 'audio' | 'image' | 'video'> {
  const attrs = { src: url ?? '', title: filename, size }
  if (type === '视频')
    return h.video({ ...attrs, width, height })
  if (type === '图片')
    return h.image({ ...attrs, width, height })
  if (type === '动图')
    return h.image({ ...attrs, width, height, 'qq:content_type': 'image/gif' })
  if (type === '语音') // voice attachments in forward records lack qq-specific attrs
    return h.audio(attrs as ElementAttrs<'audio'>)
  if (type === '文件')
    return h.file(attrs)
  console.warn('unknown forward attachment type', type)
  return h.file(attrs)
}

/**
 * Replace a face marker with the attachment it references,
 * or a standalone `qq:face` element when no image attachment matches.
 */
function transformAttachment(
  attachments: Element<'file' | 'audio' | 'image' | 'video'>[],
  faceType: string,
  faceId: string,
  bExt: string,
): Fragment {
  const [type, id] = [+faceType, +faceId]
  const { text, ...ext } = JSON.parse(Buffer.from(bExt, 'base64').toString('utf-8'))
  const attachment = attachments[id] as Element<'image'>
  if (!attachment || attachment.type !== 'image')
    return h['qq:face']({ type, id: faceId, ...ext }, faceId ? `[${text}]` : text)
  // @ts-ignore
  attachments[id] = null
  if (attachment.children.length > 1 || (attachment.children[0] ?? '') !== text)
    logger.warn('unmatched ext.text', text, 'with attachment.content', attachment.children)
  return attachment.update(withPrefix('qq:', { faceType: type, ...ext }))
}

function buildForwardItem(item: ForwardItem): Element<'message' | 'quote'> {
  const children: Fragment[] = []
  if (item.author)
    children.push(h.author({ name: item.author }))
  const attachments = item.attachments.map(buildForwardAttachment)
  const content: Fragment[] = []
  if (item.card) {
    const fields = { ...item.card.fields }
    const prompt = fields['摘要'] ?? ''
    const type = fields.type ?? 'unknown'
    delete fields['摘要']
    delete fields.type
    const ark = h['qq:ark']({ prompt, type, name: item.card.name, ...fields })
    if (item.content)
      ark.update(item.content)
    content.push(ark)
  }
  else if (item.content) {
    content.push(...h.transform.replace(
      /<faceType=(\d+),faceId="(\d*)",ext="([A-Za-z0-9+/]+={0,2})">|<attachmentType="([^"]+)",attachmentIndex=(\d+),description="([A-Za-z0-9+/]+={0,2})">/g,
      (raw, faceType, faceId, bExt, attachmentType, attachmentIndex, description) => {
        if (faceType)
          return transformAttachment(attachments, faceType, faceId, bExt)
        const ext = JSON.parse(Buffer.from(description, 'base64').toString('utf-8'))
        const attachment = attachments[+attachmentIndex] as Element<'image'>
        if (!attachment || attachment.type !== 'image')
          return raw
        // @ts-ignore
        attachments[+attachmentIndex] = null
        if (ext.text)
          attachment.update(ext.text)
        delete ext.text
        return attachment.update(withPrefix('qq:', { attachmentType, ...ext }))
      },
    )(item.content))
  }
  // related quoted items are inlined as <quote> elements before the content;
  // other related items are nested in a <forward> element after the attachments
  const related = item.forward
  const quotes = related && related.every(nested => nested.type === '引用消息')
    ? related.map(buildForwardItem)
    : []
  const forward = related && related.length && !quotes.length
    ? h.forward(...related.map(buildForwardItem))
    : null
  if (item.type === '引用消息') {
    // a quoted item is just the <quote> element itself
    return h.quote(...children, ...quotes, ...content, ...attachments, forward)
  }
  const attrs: Partial<ElementAttrs<'message'>> = {}
  if (item.type) {
    if (item.type === '卡片消息')
      attrs['qq:message_type'] = QQ.MessageType.Ark
    else if (item.type === '合并转发消息')
      attrs['qq:message_type'] = QQ.MessageType.Forward
    else
      console.warn('unknown forward message type', item.type)
  }
  return h.message(attrs, ...children, ...quotes, ...content, ...attachments, forward)
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

  parseArkData({ prompt, ark_type: type, ark_name: name, fields }: QQ.ArkData): Element<'qq:ark'> {
    return h['qq:ark']({ prompt, type, name, ...fields })
  }

  parseForwardContent(content: string): Element<'forward'> {
    const lines = content.split('\n')
    let index = 0
    // forward records may begin with a title line such as `[群聊的聊天记录]`
    if (lines[0] && /^\[.{1,30}的聊天记录\]$/.test(lines[0]))
      index++
    const expects = [1]
    const { items, index: rest } = parseForwardItems(lines, index, 0, expects)
    if (!items.length) {
      console.warn('unrecognized forward content', content)
      return h.forward(content)
    }
    if (lines.slice(rest).some(line => line.trim() !== ''))
      console.warn('unparsed forward content', lines.slice(rest))
    return h.forward(...items.map(buildForwardItem))
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

  parseAttachments(attachments: QQ.MessageAttachment[]): Element<'file' | 'audio' | 'image' | 'video'>[] {
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
        console.warn('unknown attachment', attachments[elements.length])
      delete (attachment as any).content_type
    }
    return elements
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
      if (msg_element.attachments)
        console.warn('unexpected msg_element.attachments', msg_element.attachments)
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
        console.warn('expected message.content startswith " ", got', content)
    }
    if (message_type === QQ.MessageType.Ark)
      content = this.parseArkData(message.ark_data).update(message.content)
    else if (message_type === QQ.MessageType.Parallel) // TODO: parallel
      console.warn('unknown message type', message_type, message)
    else if (message_type === QQ.MessageType.Forward)
      content = this.parseForwardContent(message.content)
    else if (message_type !== QQ.MessageType.Text && message_type !== QQ.MessageType.Quote)
      console.warn('unknown message type', message_type, message)
    if (message.mentions)
      content = this.parseMentions(message.content, message.mentions)
    if (message_type === QQ.MessageType.Quote)
      element.children.push(this.parseMsgElements(message.msg_elements, ref_msg_idx as QQ.RefMsgIdx))
    const attachments = message.attachments ? this.parseAttachments(message.attachments) : []
    content = h.pack(h.transform.replace(
      /<faceType=(\d+),faceId="(\d*)",ext="([A-Za-z0-9+/]+={0,2})">/g,
      (_, faceType, faceId, bExt) => transformAttachment(attachments, faceType, faceId, bExt),
    )(content))
    element.update(...h.unpack(content), ...attachments)
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
