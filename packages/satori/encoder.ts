import type { Element, Fragment } from '@yarkjs/element'

/** 转义文本节点：& < > */
function escapeText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/** 转义属性值：& " < > */
function escapeAttr(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** 渲染属性串；standard 为 true 时丢弃 qq: 前缀的平台属性 */
function renderAttrs(attrs: Record<string, unknown>, standard: boolean): string {
  let result = ''
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null)
      continue
    if (standard && key.startsWith('qq:'))
      continue
    result += ` ${key}="${escapeAttr(value)}"`
  }
  return result
}

/**
 * Element 树 → Satori 消息内容字符串。
 * mention{user}→<at id/>，mention{everyone}→<at type="all"/>，mention{channel}→<sharp id/>，
 * link→<link>，image→<img>，audio/video/file/quote/author/button 同名，
 * forward→<message forward="true">，qq:ark/qq:face 等平台专属标签→<custom id="类型">；
 * 其中 qq:face 的 id 属性在线路上改名为 face_id（custom 的 id 被类型名占用）。
 */
export function serialize(fragment: Fragment): string {
  if (typeof fragment === 'string')
    return escapeText(fragment)
  if (fragment.type === 'template')
    return fragment.children.map(serialize).join('')
  return serializeElement(fragment)
}

function serializeElement(element: Element): string {
  const { type } = element
  const attrs = element.attrs as Record<string, unknown>
  const children = element.children.map(serialize).join('')
  const standard = (tag: string, extra = ''): string => {
    const attr = extra + renderAttrs(attrs, true)
    return children
      ? `<${tag}${attr}>${children}</${tag}>`
      : `<${tag}${attr}/>`
  }
  const custom = (id = type): string => {
    const attr = ` id="${escapeAttr(id)}"${renderAttrs(attrs, false)}`
    return children
      ? `<custom${attr}>${children}</custom>`
      : `<custom${attr}/>`
  }

  switch (type) {
    case 'mention':
      if (attrs.everyone)
        return standard('at', ' type="all"')
      if (typeof attrs.channel === 'string') {
        return children
          ? `<sharp id="${escapeAttr(attrs.channel)}">${children}</sharp>`
          : `<sharp id="${escapeAttr(attrs.channel)}"/>`
      }
      return children
        ? `<at id="${escapeAttr(attrs.user)}">${children}</at>`
        : `<at id="${escapeAttr(attrs.user)}"/>`
    case 'link': return standard('link')
    case 'image': return standard('img')
    case 'audio': return standard('audio')
    case 'video': return standard('video')
    case 'file': return standard('file')
    case 'quote': {
      const id = attrs.id ?? attrs['qq:msg_idx']
      const attr = id === undefined ? '' : ` id="${escapeAttr(id)}"`
      return children
        ? `<quote${attr}>${children}</quote>`
        : `<quote${attr}/>`
    }
    case 'author': return standard('author')
    case 'button': return standard('button')
    case 'forward': return standard('message', ' forward="true"')
    case 'message': return standard('message')
    case 'qq:ark': return custom('qq:ark')
    case 'qq:face': {
      const { id, ...rest } = attrs
      const attr = ` id="qq:face"${id === undefined ? '' : ` face_id="${escapeAttr(id)}"`}${renderAttrs(rest, false)}`
      return children
        ? `<custom${attr}>${children}</custom>`
        : `<custom${attr}/>`
    }
    default: return custom()
  }
}
