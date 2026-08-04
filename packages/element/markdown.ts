import type { Node, NodeType } from 'commonmark'
import type { Element, Fragment } from './jsx-runtime'
import type { Except } from './types'
import { Parser } from 'commonmark'
import h from './jsx-runtime'
import { pack, replace, toElement, transform } from './utils'

const PUA_START = 0xE000
const PUA_SIZE = 6400
const PUA_PATTERN = /[\uE000-\uF8FF]/u

export function markdown(strings: TemplateStringsArray, ...values: Fragment[]): Element {
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
  return toElement(pack(transform(fragment, {
    text: text => Array.from(replace(text, PUA_PATTERN, (match) => {
      const codepoint = match.codePointAt(0)
      return values[codepoint! - PUA_START]!
    })),
  })))
}

export interface MarkdownElement {
  newline: { children: never[] }
  divider: { children: never[] }
  italic: { children: Fragment }
  bold: { children: Fragment }
  link: { href: string, title?: string }
  image: { src: string, title?: string }
  code: { children: Fragment }
  paragraph: object
  blockquote: object
  item: object
  list: { ordered?: boolean, children: Element<'item'>[] }
  heading: { level: number, children: Fragment }
  codeblock: { info?: string }
}

declare module '@yarkjs/element' {
  interface ElementProps extends MarkdownElement {}
}

function stripNulls<T extends Record<string, any>>(object: T): {
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
  thematic_break: () => h.divider(),
  emph: node => h.italic(...transformChildren(node)),
  strong: node => h.bold(...transformChildren(node)),
  html_inline: node => (node.literal!),
  link: node => h.link(stripNulls({ href: node.destination!, title: node.title }), ...transformChildren(node)),
  image: node => h.image(stripNulls({ src: node.destination!, title: node.title }), ...transformChildren(node)),
  code: node => h.code(node.literal!),
  document: node => h.template(...transformChildren(node)),
  paragraph: node => h.paragraph(...transformChildren(node)),
  block_quote: node => h.blockquote(...transformChildren(node)),
  item: node => h.item(...transformChildren(node)),
  list: node => h.list({ ordered: node.listType === 'ordered' }, ...transformChildren(node) as Element<'item'>[]),
  heading: node => h.heading({ level: node.level }, ...transformChildren(node)),
  code_block: node => h.codeblock(stripNulls({ info: node.info }), node.literal!),
  html_block: node => node.literal!,
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

declare module '@yarkjs/element' {
  interface Elements {
    br(attrs: ElementProps['newline']): Element<'newline'>
    hr(attrs: ElementProps['divider']): Element<'divider'>
    i(attrs: ElementProps['italic']): Element<'italic'>
    b(attrs: ElementProps['bold']): Element<'bold'>
    a(attrs: ElementProps['link']): Element<'link'>
    img(attrs: ElementProps['image']): Element<'image'>
    p(attrs: ElementProps['paragraph']): Element<'paragraph'>
    li(attrs: ElementProps['item']): Element<'item'>
    ul(attrs: Except<ElementProps['list'], 'ordered'>): Element<'list'>
    ol(attrs: Except<ElementProps['list'], 'ordered'>): Element<'list'>
    h1(attrs: Except<ElementProps['heading'], 'level'>): Element<'heading'>
    h2(attrs: Except<ElementProps['heading'], 'level'>): Element<'heading'>
    h3(attrs: Except<ElementProps['heading'], 'level'>): Element<'heading'>
    h4(attrs: Except<ElementProps['heading'], 'level'>): Element<'heading'>
    h5(attrs: Except<ElementProps['heading'], 'level'>): Element<'heading'>
    h6(attrs: Except<ElementProps['heading'], 'level'>): Element<'heading'>
  }
}

h.components.br = h.br = (...args) => h.newline(...args)
h.components.hr = h.hr = (...args) => h.divider(...args)
h.components.i = h.i = (...args) => h.italic(...args)
h.components.b = h.b = (...args) => h.bold(...args)
h.components.a = h.a = (...args) => h.link(...args)
h.components.img = h.img = (...args) => h.image(...args)
h.components.p = h.p = (...args) => h.paragraph(...args)
h.components.li = h.li = (...args) => h.item(...args)
h.components.ul = h.ul = (...args) => h.list({ ordered: false }).update(...args)
h.components.ol = h.ol = (...args) => h.list({ ordered: true }).update(...args)
h.components.h1 = h.h1 = (...args) => h.heading({ level: 1 }).update(...args)
h.components.h2 = h.h2 = (...args) => h.heading({ level: 2 }).update(...args)
h.components.h3 = h.h3 = (...args) => h.heading({ level: 3 }).update(...args)
h.components.h4 = h.h4 = (...args) => h.heading({ level: 4 }).update(...args)
h.components.h5 = h.h5 = (...args) => h.heading({ level: 5 }).update(...args)
h.components.h6 = h.h6 = (...args) => h.heading({ level: 6 }).update(...args)
