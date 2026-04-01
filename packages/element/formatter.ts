import { Element, type ElementNode, Fragment } from "./jsx-runtime"

const COLORS = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
} as const

interface FormatterOptions {
  print: (data: any) => void
  depth?: number,
  indent?: string,
  inline?: boolean,
  color?: boolean,
}

export class Formatter {
  readonly print: (data: any) => void
  readonly depth: number
  readonly indent: string
  readonly inline: boolean
  readonly color: boolean
  private needLine = false

  constructor({
    print,
    depth = 0,
    indent = "  ",
    inline = false,
    color = true,
  }: FormatterOptions) {
    this.print = print
    this.depth = depth
    this.indent = indent
    this.inline = inline
    this.color = color
  }

  nest() {
    return new Formatter({ ...this, depth: this.depth + 1 })
  }

  newLine() {
    if (this.inline) return
    this.print("\n" + this.indent.repeat(this.depth))
    this.needLine = false
  }

  colored(color: keyof typeof COLORS, data: any) {
    return this.color ? `\x1b[${COLORS[color]}m${data}\x1b[0m` : data
  }

  props(props: Record<string, unknown>) {
    for (const [key, value] of Object.entries(props)) {
      this.print(` ${this.colored("red", key)}`)
      if (value === true) continue
      this.print("=")
      switch (typeof value) {
        case "boolean": this.print(`{${this.colored("magenta", value)}}`); break
        case "number": this.print(`{${this.colored("blue", value)}}`); break
        case "string": this.print(`"${this.colored("green", value.replaceAll('"', '\\"'))}"`); break
        default: this.print(`"{${JSON.stringify(value)}}}`); break
      }
    }
  }

  children(children: ElementNode[]) {
    const nested = this.nest()
    nested.newLine()
    for (const child of children) {
      nested.node(child)
    }
  }

  element(element: Element) {
    const tag = this.colored("green",
      element.type == Fragment ? "" : element.type)
    if (this.needLine) this.newLine()
    this.print(`<${tag}`)
    this.props(element.props)
    if (element.children.length === 0) {
      this.print(" />")
    } else {
      this.print(">")
      this.children(element.children)
      this.newLine()
      this.print(`</${tag}>`)
    }
    this.needLine = true
  }

  node(node: ElementNode) {
    if (node instanceof Element) {
      this.element(node)
    } else {
      this.print(node)
    }
  }
}

export class BufferFormatter extends Formatter {
  buffer = ""
  constructor(options?: Omit<FormatterOptions, "print">) {
    super({ ...options, print: (text) => this.buffer += text })
  }
}
