import type { Node, NodeType } from 'commonmark'
import type { Fragment } from './jsx-runtime'
import { Parser } from 'commonmark'
import h from './jsx-runtime'
import { replace, transform } from './utils'

const PUA_START = 0xE000
const PUA_SIZE = 6400
const PUA_PATTERN = /[\uE000-\uF8FF]/u

export function markdown(strings: TemplateStringsArray, ...values: Fragment[]): Fragment {
  if (values.length > PUA_SIZE)
    throw new Error(`values length must be less than ${PUA_SIZE}`)
  const markdownText = strings.reduce((res, str, index) => {
    if (PUA_PATTERN.test(str))
      throw new Error(`strings must not contain PUA characters: ${str}`)
    res += str
    if (index < values.length)
      res += String.fromCodePoint(PUA_START + index)
    return res
  }, '')
  const ast = new Parser().parse(markdownText)
  const fragment = transformNode(ast)
  return transform(fragment, {
    text: text => replace(text, PUA_PATTERN, (match) => {
      const codepoint = match.codePointAt(0)
      return values[codepoint! - PUA_START]!
    }),
  })
}

export interface MarkdownElement {
  newline: object
  italic: object
  bold: object
  link: { href: string, title?: string }
  image: { src: string, title?: string }
  code: object
  paragraph: object
  blockquote: object
  item: object
  list: { ordered?: boolean }
  heading: { level: number }
  codeblock: { info?: string }
  divider: object
}

declare module '@ayrk/element' {
  interface ElementProps extends MarkdownElement {}
}

function filterNulls<T extends Record<string, any>>(object: T): {
  [K in keyof T as null extends T[K] ? K : never]?: Exclude<T[K], null>
} extends infer U ? Omit<T, keyof U> & U : never {
  for (const key in object) {
    if (object[key] === null)
      delete object[key]
  }
  return object as any
}

const TRANSFORMERS: Record<NodeType, (node: Node) => Fragment> = {
  text: node => (node.literal!),
  softbreak: () => ' ',
  linebreak: () => h.newline(),
  emph: node => h.italic(...transformChildren(node)),
  strong: node => h.bold(...transformChildren(node)),
  html_inline: node => (node.literal!),
  link: node => h.link(filterNulls({ href: node.destination!, title: node.title }), ...transformChildren(node)),
  image: node => h.image(filterNulls({ src: node.destination!, title: node.title }), ...transformChildren(node)),
  code: node => h.code(node.literal!),
  document: node => h.template(...transformChildren(node)),
  paragraph: node => h.paragraph(...transformChildren(node)),
  block_quote: node => h.blockquote(...transformChildren(node)),
  item: node => h.item(...transformChildren(node)),
  list: node => h.list({ ordered: node.listType === 'ordered' }, ...transformChildren(node)),
  heading: node => h.heading({ level: node.level }, ...transformChildren(node)),
  code_block: node => h.codeblock(filterNulls({ info: node.info }), node.literal!),
  html_block: node => node.literal!,
  thematic_break: () => h.divider(),
  custom_inline: () => { throw new Error(`Function custom_inline is not implemented.`) },
  custom_block: () => { throw new Error(`Function custom_block is not implemented.`) },
}

function transformNode(node: Node): Fragment {
  return TRANSFORMERS[node.type](node)
}

function transformChildren(node: Node): Fragment[] {
  const children: Fragment[] = []
  for (let child = node.firstChild; child; child = child.next)
    children.push(transformNode(child))
  return children
}
