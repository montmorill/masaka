import type { Element, ElementAttrs, Fragment } from '@yarkjs/element'
import { Buffer } from 'node:buffer'
import { createLogger } from '@yarkjs/logger'
import * as QQ from './common'

const logger = createLogger('qq')

interface ForwardItemParts {
  author?: Element<'author'>
  quotes: Element<'quote'>[]
  content: Fragment[]
  attachments: Element<'file' | 'audio' | 'image' | 'video'>[]
  card?: Element<'qq:ark'>
  related?: Element<'forward'>
}

function splitForwardItem(item: Element<'message' | 'quote'>): ForwardItemParts {
  const parts: ForwardItemParts = { quotes: [], content: [], attachments: [] }
  for (const child of item.children) {
    if (typeof child === 'string') {
      parts.content.push(child)
    }
    else if (child.type === 'author') {
      parts.author = child as Element<'author'>
    }
    else if (child.type === 'quote') {
      parts.quotes.push(child as Element<'quote'>)
    }
    else if (child.type === 'forward') {
      parts.related = child as Element<'forward'>
    }
    else if (child.type === 'qq:ark') {
      parts.card = child as Element<'qq:ark'>
    }
    else if (child.type === 'image' || child.type === 'video' || child.type === 'file' || child.type === 'audio') {
      const attrs = child.attrs as ElementAttrs<'image'>
      // marker images stay in the content, but are also emitted as attachments
      if (attrs['qq:faceType'] !== undefined || attrs['qq:attachmentType'] !== undefined)
        parts.content.push(child)
      parts.attachments.push(child as Element<'file' | 'audio' | 'image' | 'video'>)
    }
    else {
      parts.content.push(child) // qq:face and other content fragments
    }
  }
  return parts
}

/**
 * Serialize the content fragments of a forward item back to the original
 * marker syntax: string children as-is, face elements and merged attachment
 * images back to their `<faceType=…>` / `<attachmentType=…>` markers.
 */
function serializeForwardContent(fragments: Fragment[]): string {
  let attachmentIndex = 0
  return fragments.map((fragment) => {
    if (typeof fragment === 'string')
      return fragment
    if (fragment.type === 'qq:face') {
      const { type, id, ...ext } = fragment.attrs as ElementAttrs<'qq:face'>
      const text = id ? fragment.children.join('').slice(1, -1) : fragment.children.join('')
      return `<faceType=${type},faceId="${id}",ext="${Buffer.from(JSON.stringify({ ...ext, text })).toString('base64')}">`
    }
    if (fragment.type === 'image') {
      const attrs = (fragment as Element<'image'>).attrs
      if (attrs['qq:faceType'] !== undefined) {
        const ext = Buffer.from(JSON.stringify({ text: fragment.children.join('') })).toString('base64')
        return `<faceType=${attrs['qq:faceType']},faceId="${attachmentIndex++}",ext="${ext}">`
      }
      if (attrs['qq:attachmentType'] !== undefined) {
        const ext = Buffer.from(JSON.stringify({ text: fragment.children.join('') })).toString('base64')
        return `<attachmentType="${attrs['qq:attachmentType']}",attachmentIndex=${attachmentIndex++},description="${ext}">`
      }
    }
    logger.warn('unknown forward content fragment', fragment)
    return ''
  }).join('')
}

/** Format a `[卡片消息]` field from the card element attrs. */
function formatForwardCard(card: Element<'qq:ark'>): string {
  let line = card.attrs.ark_name ?? ''
  for (const [key, value] of Object.entries(card.attrs)) {
    if (key === 'ark_name' || key === 'ark_type')
      continue // identifier attrs are not fields of the format line
    line += ` ${key === 'prompt' ? '摘要' : key}:${value}`
  }
  return line
}

/** Format a byte size the way QQ prints it in attachment fields. */
function formatForwardSize(size: number): string {
  for (const [unit, suffix] of [[1024 ** 4, 'TB'], [1024 ** 3, 'GB'], [1024 ** 2, 'MB'], [1024, 'KB']] as const) {
    if (size >= unit)
      return `${(size / unit).toFixed(1)}${suffix}` // QQ always prints one decimal, e.g. 8.0KB
  }
  return `${size.toFixed(1)}B`
}

/** Format an attachment element as the `[附件N]` field value. */
function formatForwardAttachment(attachment: Element<'file' | 'audio' | 'image' | 'video'>): string {
  const { src, title, size, width, height, 'qq:content_type': contentType } = attachment.attrs as ElementAttrs<'image'>
  let type: string
  if (attachment.type === 'video')
    type = '视频'
  else if (attachment.type === 'audio')
    type = '语音'
  else if (attachment.type === 'file')
    type = '文件'
  else if (contentType === 'image/gif')
    type = '动图'
  else
    type = '图片'
  const parts = [`类型:${type}`]
  if (title)
    parts.push(`文件名:${title}`)
  if (width !== undefined && height !== undefined)
    parts.push(`尺寸:${width}x${height}`)
  if (size !== undefined)
    parts.push(`大小:${formatForwardSize(size)}`)
  parts.push(`URL:${src}`)
  return parts.join(' ')
}

/** Translate the message type attr back to the Chinese field value. */
function formatForwardMessageType(type: QQ.MessageType): string {
  if (type === QQ.MessageType.Ark)
    return '卡片消息'
  if (type === QQ.MessageType.Forward)
    return '合并转发消息'
  if (type === QQ.MessageType.Quote)
    return '引用消息'
  logger.warn('unknown forward message type', type)
  return ''
}

/** Push a possibly multi-line field value, indenting continuation lines. */
function pushForwardBlock(lines: string[], indent: string, text: string): void {
  const [first, ...rest] = text.split('\n')
  lines.push(`${indent}${first}`)
  for (const line of rest)
    lines.push(`${indent}${line}`)
}

/** Append the item fields, indented, in the original parse order. */
function appendForwardItem(lines: string[], item: Element<'message' | 'quote' | 'forward'>, indent: string): void {
  if (item.type === 'forward')
    return appendForwardRecord(lines, item as Element<'forward'>, indent)
  const { author, quotes, content, attachments, card, related } = splitForwardItem(item as Element<'message' | 'quote'>)
  const text = card ? card.children.join('') : serializeForwardContent(content)
  if (text)
    pushForwardBlock(lines, indent, `[消息内容] ${text}`)
  if (author)
    lines.push(`${indent}[发送者] ${author.attrs.name}`)
  for (let index = 0; index < attachments.length; index++)
    lines.push(`${indent}[附件${index + 1}] ${formatForwardAttachment(attachments[index]!)}`)
  let type = ''
  if (item.type === 'quote') {
    type = '引用消息'
  }
  else {
    const messageType = (item.attrs as ElementAttrs<'message'>)['qq:message_type']
    if (messageType !== undefined)
      type = formatForwardMessageType(messageType)
  }
  if (type)
    lines.push(`${indent}[消息类型] ${type}`)
  if (card)
    lines.push(`${indent}[卡片消息] ${formatForwardCard(card)}`)
  let relatedItems: Fragment[]
  if (quotes.length)
    relatedItems = quotes
  else if (related)
    relatedItems = related.children
  else
    relatedItems = []
  if (relatedItems.length) {
    lines.push(`${indent}[关联消息]`)
    for (let index = 0; index < relatedItems.length; index++) {
      lines.push(`${indent}--- 第${index + 1}条 ---`)
      appendForwardItem(lines, relatedItems[index] as Element<'message' | 'quote'>, `${indent}    `)
    }
  }
}

/** Format a forward record back to a 合并转发消息 item. */
function appendForwardRecord(lines: string[], forward: Element<'forward'>, indent: string): void {
  const items: Element<'message' | 'quote'>[] = []
  let author: Element<'author'> | undefined
  const attachments: Element<'file' | 'audio' | 'image' | 'video'>[] = []
  for (const child of forward.children) {
    if (typeof child === 'string')
      continue
    if (child.type === 'author') {
      author = child as Element<'author'>
    }
    else if (child.type === 'image' || child.type === 'video' || child.type === 'file' || child.type === 'audio') {
      attachments.push(child as Element<'file' | 'audio' | 'image' | 'video'>)
    }
    else {
      items.push(child as Element<'message' | 'quote'>)
    }
  }
  const title = forward.attrs['qq:title']
  if (title)
    pushForwardBlock(lines, indent, `[消息内容] ${title}`)
  if (author)
    lines.push(`${indent}[发送者] ${author.attrs.name}`)
  for (let index = 0; index < attachments.length; index++)
    lines.push(`${indent}[附件${index + 1}] ${formatForwardAttachment(attachments[index]!)}`)
  lines.push(`${indent}[消息类型] 合并转发消息`)
  if (items.length) {
    lines.push(`${indent}[关联消息]`)
    for (let index = 0; index < items.length; index++) {
      lines.push(`${indent}--- 第${index + 1}条 ---`)
      appendForwardItem(lines, items[index]!, `${indent}    `)
    }
  }
}

/**
 * Format a single forward item back to its dedented field lines,
 * the inverse of one `parseForwardItem` pass.
 */
export function formatForwardItem(item: Element<'message' | 'quote' | 'forward'>): string {
  const lines: string[] = []
  appendForwardItem(lines, item, '')
  return lines.join('\n')
}

/**
 * Format a forward element back to the original text,
 * the inverse of `parseForwardContent`.
 */
export function formatForwardContent(forward: Element<'forward'>): string {
  const lines: string[] = []
  const title = forward.attrs['qq:title']
  if (title)
    lines.push(title)
  const items = forward.children
  for (let index = 0; index < items.length; index++) {
    lines.push(`=== 消息 ${index + 1} ===`)
    appendForwardItem(lines, items[index] as Element<'message' | 'quote' | 'forward'>, '')
    if (index + 1 < items.length)
      lines.push('')
  }
  return `${lines.join('\n')}\n`
}
