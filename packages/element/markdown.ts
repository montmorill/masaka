import type { Node, NodeType } from 'commonmark'
import type { Fragment } from './jsx-runtime'
import { Parser } from 'commonmark'
import h, { Element } from './jsx-runtime'
import { stripNulls } from './strip-nulls'
import { pack } from './utils'

let slotValues: Fragment[] = []

export function markdown(strings: TemplateStringsArray, ...values: Fragment[]): Fragment {
  slotValues = values
  const markdownText = strings.reduce((res, str, i) =>
    res + str + (i < slotValues.length ? `<slot>${i}</slot>` : ''), '')
  const ast = new Parser().parse(markdownText)
  return transformNode(ast)
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

declare global {
  namespace JSX {
    interface IntrinsicElements extends MarkdownElement {}
  }
}

const TRANSFORMERS: Record<NodeType, (node: Node) => Fragment> = {
  text: node => esacpeSlot(node.literal!),
  softbreak: () => ' ',
  linebreak: () => h.newline(),
  emph: node => h.italic(...transformChildren(node)),
  strong: node => h.bold(...transformChildren(node)),
  html_inline: node => esacpeSlot(node.literal!),
  link: node => h.link(stripNulls({ href: node.destination!, title: node.title }), ...transformChildren(node)),
  image: node => h.image(stripNulls({ src: node.destination!, title: node.title }), ...transformChildren(node)),
  code: node => h.code(esacpeSlot(node.literal!)),
  document: node => h.template(...transformChildren(node)),
  paragraph: node => h.paragraph(...transformChildren(node)),
  block_quote: node => h.blockquote(...transformChildren(node)),
  item: node => h.item(...transformChildren(node)),
  list: node => h.list({ ordered: node.listType === 'ordered' }, ...transformChildren(node)),
  heading: node => h.heading({ level: node.level }, ...transformChildren(node)),
  code_block: node => h.codeblock(stripNulls({ info: node.info }), esacpeSlot(node.literal!)),
  html_block: node => esacpeSlot(node.literal!),
  thematic_break: () => h.divider(),
  custom_inline: () => { throw new Error(`Function custom_inline is not implemented.`) },
  custom_block: () => { throw new Error(`Function custom_block is not implemented.`) },
}

function transformNode(node: Node): Fragment {
  return TRANSFORMERS[node.type](node)
}

function transformChildren(node: Node): Fragment[] {
  const children: Fragment[] = []
  for (let child = node.firstChild; child; child = child.next) {
    const node = transformNode(child)
    if (node === '<slot>') {
      const index = +(child = child.next!).literal!
      children.push(slotValues[index]!)
      child = child.next!
    }
    else {
      children.push(node)
    }
  }
  if (children.length === 1 && typeof children[0] === 'string') {
    const fragment = esacpeSlot(children[0])
    if (fragment instanceof Element) {
      return fragment.children
    }
    return [fragment]
  }
  return children
}

function esacpeSlot(...children: [Fragment]): Fragment {
  while (typeof children[children.length - 1] === 'string') {
    const lastStr = children[children.length - 1] as string

    const slotRegex = /<slot>(\d+)<\/slot>/
    const match = lastStr.match(slotRegex)

    if (!match) {
      break
    }

    children.pop()

    const before = lastStr.slice(0, match.index)
    const value = slotValues[+match[1]!]!
    const after = lastStr.slice(match.index! + match[0].length)

    before && children.push(before)
    children.push(value)
    after && children.push(after)
  }

  return pack(...children)
}
