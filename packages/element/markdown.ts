import { Node, Parser, type NodeType } from "commonmark"
import { h, type ElementNode } from "./jsx-runtime"

const parser = new Parser()

let slotValues: ElementNode[] = []

export function raw(strings: TemplateStringsArray, ...values: ElementNode[]) {
  return pack(strings.flatMap((s, i) => values[i] ? [s, values[i]] : [s]).flat())
}

export function markdown(strings: TemplateStringsArray, ...values: ElementNode[]) {
  slotValues = values
  const markdownText = strings.reduce((res, str, i) =>
    res + str + (i < slotValues.length ? `<slot>${i}</slot>` : ""), "")
  const ast = parser.parse(markdownText)
  return transformNode(ast)
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends Record<`h${number}`, {}> {
      br: {}
      em: {}; i: {}
      strong: {}; b: {}
      a: { href: string; title?: string }
      img: { src: string; title?: string; width?: number; height?: number }
      code: {}
      p: {}
      blockquote: {}
      li: {}
      ol: { start?: number, delimiter?: ")" | "." }; ul: {}
      codeblock: { lang: string | null }
      hr: {}
    }
  }
}

export function transformNode(node: Node): ElementNode {
  return TRANSFORMERS[node.type](node)
}

function transformChildren(node: Node) {
  const children: ElementNode[] = []
  for (let child = node.firstChild; child; child = child.next) {
    const node = transformNode(child)
    if (node === "<slot>") {
      const index = +(child = child.next!).literal!
      children.push(slotValues[index])
      child = child.next!
    } else {
      children.push(node)
    }
  }
  if (children.length === 1 && typeof children[0] === "string") {
    return esacpeSlot(children[0])
  }
  return children
}

function esacpeSlot(...children: [ElementNode]) {
  while (typeof children[children.length - 1] === "string") {
    const lastStr = children[children.length - 1] as string

    const slotRegex = /<slot>(\d+)<\/slot>/
    const match = lastStr.match(slotRegex)

    if (!match) {
      break
    }

    children.pop()

    const before = lastStr.slice(0, match.index)
    const value = slotValues[+match[1]!]
    const after = lastStr.slice(match.index! + match[0].length)

    if (before) children.push(before)
    children.push(value)
    if (after) children.push(after)
  }
  return children
}

function pack(children: ElementNode[]) {
  return children.length === 1 ? children[0] : h("Fragment", {}, ...children)
}

const TRANSFORMERS: Record<NodeType, (node: Node) => ElementNode> = {
  text: node => pack(esacpeSlot(node.literal)),
  softbreak: () => " ",
  linebreak: () => h("br"),
  emph: node => h("em", {}, ...transformChildren(node)),
  strong: node => h("strong", {}, ...transformChildren(node)),
  html_inline: node => pack(esacpeSlot(node.literal)),
  link: node => h("a", { href: node.destination!, title: node.title || undefined }, ...transformChildren(node)),
  image: node => h("img", { src: node.destination!, title: node.title || undefined }, ...transformChildren(node)),
  code: node => h("code", {}, pack(esacpeSlot(node.literal))),
  document: node => h("Fragment", {}, ...transformChildren(node)),
  paragraph: node => h("p", {}, ...transformChildren(node)),
  block_quote: node => h("blockquote", {}, ...transformChildren(node)),
  item: node => h("li", {}, ...transformChildren(node)),
  list: node => node.listType === "ordered"
    ? h("ol", { start: node.listStart, delimiter: node.listDelimiter }, ...transformChildren(node))
    : h("ul", {}, ...transformChildren(node)),
  heading: node => h(`h${node.level}`, {}, ...transformChildren(node)),
  code_block: node => h("codeblock", { lang: node.info }, pack(esacpeSlot(node.literal))),
  html_block: node => pack(esacpeSlot(node.literal)),
  thematic_break: () => h("hr"),
  custom_inline: node => { throw new Error(`Function ${node.type} not implemented.`) },
  custom_block: node => { throw new Error(`Function ${node.type} not implemented.`) },
}
