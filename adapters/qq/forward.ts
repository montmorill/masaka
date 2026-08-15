import type { Element, ElementAttrs, Fragment } from '@yarkjs/element'
import { Buffer } from 'node:buffer'
import h from '@yarkjs/element'
import { logger } from '@yarkjs/logger'
import { withPrefix } from '@yarkjs/utils'
import * as QQ from './common'
import { formatForwardItem } from './formatter'

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
  /** Original dedented field lines, for format/parse consistency checking. */
  source?: string
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
    logger.warn('unknown forward attachment size', size)
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
    // store 摘要 as prompt, keeping the original field order for formatting
    fields[key === '摘要' ? 'prompt' : key] = line.slice(start, match ? match.index : line.length).trim()
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
    const start = index
    const parsed = parseForwardItem(lines, index, level, expects)
    const indent = ' '.repeat(4 * level)
    const source = lines.slice(start, parsed.index)
    while (source.length && source[source.length - 1]!.trim() === '')
      source.pop() // trailing blanks between items are structural, not part of the item
    parsed.item.source = source
      .map(line => dedentForwardLine(line, indent))
      .join('\n')
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
  logger.warn('unknown forward attachment type', type)
  return h.file(attrs)
}

/**
 * Replace a face marker with the attachment it references,
 * or a standalone `qq:face` element when no image attachment matches.
 */
export function transformAttachment(
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
    // spread first so prompt/type keep their original field order
    const fields = { ...item.card.fields }
    const ark = h['qq:ark']({
      ...fields,
      prompt: fields.prompt ?? '',
      type: fields.type ?? 'unknown',
      name: item.card.name,
    })
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
  let element: Element<'message' | 'quote'>
  if (item.type === '引用消息') {
    // a quoted item is just the <quote> element itself
    element = h.quote(...children, ...quotes, ...content, ...attachments, forward)
  }
  else {
    const attrs: Partial<ElementAttrs<'message'>> = {}
    if (item.type) {
      if (item.type === '卡片消息')
        attrs['qq:message_type'] = QQ.MessageType.Ark
      else if (item.type === '合并转发消息')
        attrs['qq:message_type'] = QQ.MessageType.Forward
      else
        logger.warn('unknown forward message type', item.type)
    }
    element = h.message(attrs, ...children, ...quotes, ...content, ...attachments, forward)
  }
  // verify the format/parse consistency of this item in debug mode
  if (item.source !== undefined) {
    const formatted = formatForwardItem(element)
    if (formatted !== item.source)
      logger.warn('forward item parse/format mismatch', item.source, formatted)
  }
  return element
}

/**
 * Parse the QQ forward message content string into a structured element tree.
 */
export function parseForwardContent(content: string): Element<'forward'> {
  const lines = content.split('\n')
  let index = 0
  // forward records may begin with a title line such as `[群聊的聊天记录]`
  let title: string | undefined
  if (lines[0] && /^\[[^\]\n]+的聊天记录\]$/.test(lines[0])) {
    title = lines[0]
    index++
  }
  const expects = [1]
  const { items, index: rest } = parseForwardItems(lines, index, 0, expects)
  if (!items.length) {
    logger.warn('unrecognized forward content', content)
    return h.forward(content)
  }
  if (lines.slice(rest).some(line => line.trim() !== ''))
    logger.warn('unparsed forward content', lines.slice(rest))
  const forward = h.forward(...items.map(buildForwardItem))
  if (title)
    forward.update({ 'qq:title': title })
  return forward
}
