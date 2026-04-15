import type { Node, NodeType } from 'commonmark'
import type { Fragment } from './jsx-runtime'
import { Parser } from 'commonmark'
import h, { Element } from './jsx-runtime'

const parser = new Parser()

let slotValues: Fragment[] = []

export function markdown(strings: TemplateStringsArray, ...values: Fragment[]): Fragment {
  slotValues = values
  const markdownText = strings.reduce((res, str, i) =>
    res + str + (i < slotValues.length ? `<slot>${i}</slot>` : ''), '')
  const ast = parser.parse(markdownText)
  return transformNode(ast)
}

interface MarkdownElement extends Record<`h${number}`, object> {
  br: object
  em: object
  strong: object
  a: { href: string, title?: string }
  img: { src: string, title?: string }
  code: object
  p: object
  blockquote: object
  li: object
  ol: { start?: number, delimiter?: ')' | '.' }
  ul: object
  codeblock: { lang?: string }
  hr: object
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends MarkdownElement {}
  }
}

const TRANSFORMERS: Record<NodeType, (node: Node) => Fragment> = {
  text: node => esacpeSlot(node.literal!),
  softbreak: () => ' ',
  linebreak: () => h.br(),
  emph: node => h.em(...transformChildren(node)),
  strong: node => h.strong(...transformChildren(node)),
  html_inline: node => esacpeSlot(node.literal!),
  link: node => h.a({ href: node.destination!, title: node.title ?? undefined }, ...transformChildren(node)),
  image: node => h.img({ src: node.destination!, title: node.title ?? undefined }, ...transformChildren(node)),
  code: node => h.code(esacpeSlot(node.literal!)),
  document: node => h.template(...transformChildren(node)),
  paragraph: node => h.p(...transformChildren(node)),
  block_quote: node => h.blockquote(...transformChildren(node)),
  item: node => h.li(...transformChildren(node)),
  list: node => node.listType === 'ordered'
    ? h.ol({ start: node.listStart, delimiter: node.listDelimiter }, ...transformChildren(node))
    : h.ul(...transformChildren(node)),
  heading: node => h(`h${node.level}`, ...transformChildren(node)),
  code_block: node => h.codeblock({ lang: node.info ?? undefined }, esacpeSlot(node.literal!)),
  html_block: node => esacpeSlot(node.literal!),
  thematic_break: () => h.hr(),
  custom_inline: (node) => { throw new Error(`Function ${node.type} not implemented.`) },
  custom_block: (node) => { throw new Error(`Function ${node.type} not implemented.`) },
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

    if (before) {
      children.push(before)
    }
    children.push(value)
    if (after) {
      children.push(after)
    }
  }

  return children.length === 1 ? children[0] : h.template(...children)
}
