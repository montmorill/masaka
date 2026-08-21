import type { Element, Fragment } from '@yarkjs/element'
import h from '@yarkjs/element'

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
} as const

/** 反转义文本节点 */
function unescapeText(text: string): string {
  return text.replaceAll(/&([a-z]+);/g, (raw, name) => (ENTITIES as Record<string, string>)[name] ?? raw)
}

/** 解析标签内的属性：key="value" */
function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const [, key = '', value = ''] of source.matchAll(/([a-z][a-z0-9:_-]*)="([^"]*)"/g))
    attrs[key] = unescapeText(value)
  return attrs
}

/** 标签名 → 元素类型映射 */
const TAG_MAP = {
  at: 'mention',
  sharp: 'mention',
  img: 'image',
  link: 'link',
  audio: 'audio',
  video: 'video',
  file: 'file',
  quote: 'quote',
  author: 'author',
  button: 'button',
  message: 'message',
  br: 'br',
} as const

const VOID_TAGS = new Set(['br', 'img', 'audio', 'video', 'file'])

/** 动态构建元素（标签名运行时确定） */
function build(type: string, attrs: object, children: Fragment[]): Element {
  return h(type as never, attrs as never, ...children)
}

function parseElement(tag: string, attrs: Record<string, string>, children: Fragment[]): Element {
  if (tag === 'at') {
    if (attrs.type === 'all')
      return build('mention', { everyone: true }, children)
    return build('mention', { user: attrs.id ?? '' }, children)
  }
  if (tag === 'sharp')
    return build('mention', { channel: attrs.id ?? '' }, children)
  if (tag === 'message' && attrs.forward === 'true') {
    const { forward: _forward, ...rest } = attrs
    return build('forward', rest, children)
  }
  // 其余标签（含 qq:ark/qq:face 等平台标签）直接以自身标签名构建
  return build(TAG_MAP[tag as keyof typeof TAG_MAP] ?? tag, attrs, children)
}

/**
 * Satori 消息内容字符串 → Element 树。
 * 未配对/无法解析的标签片段按普通文本处理。
 */
export function parseContent(content: string): Fragment {
  let index = 0
  const parseNodes = (stop?: string): Fragment[] => {
    const nodes: Fragment[] = []
    while (index < content.length) {
      const start = content.indexOf('<', index)
      if (start === -1) {
        const text = unescapeText(content.slice(index))
        if (text)
          nodes.push(text)
        index = content.length
        break
      }
      if (start > index) {
        const text = unescapeText(content.slice(index, start))
        if (text)
          nodes.push(text)
      }
      const end = content.indexOf('>', start)
      if (end === -1) {
        const text = unescapeText(content.slice(index))
        if (text)
          nodes.push(text)
        index = content.length
        break
      }
      const source = content.slice(start + 1, end)
      index = end + 1
      if (source.startsWith('/')) {
        const name = source.slice(1)
        if (name === stop)
          return nodes
        // 未配对闭合标签按文本忽略
        continue
      }
      const selfClosing = source.endsWith('/')
      const [tag, ...rest] = (selfClosing ? source.slice(0, -1) : source).trim().split(/\s+/)
      if (!tag || !/^[a-z][a-z0-9:_-]*$/.test(tag)) {
        nodes.push(`<${source}>`)
        continue
      }
      const attrs = parseAttrs(rest.join(' '))
      if (selfClosing) {
        nodes.push(parseElement(tag, attrs, []))
        continue
      }
      const children = VOID_TAGS.has(tag) ? [] : parseNodes(tag)
      nodes.push(parseElement(tag, attrs, children))
    }
    return nodes
  }
  return h.pack(parseNodes())
}
