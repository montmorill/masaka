import type { InspectOptions } from 'node:util'
import { inspect } from 'node:util'
import { Element, Fragment } from './jsx-runtime'

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

export interface FormatterOptions {
  indent?: string
  inline?: boolean
}

export class Formatter {
  private needLine = false

  constructor(
    readonly print: (data: any) => void,
    readonly opts: InspectOptions & FormatterOptions = {},
  ) {}

  nest() {
    return new Formatter(this.print, {
      ...this.opts,
      indent: `${this.opts.indent ?? ''}  `,
    })
  }

  newLine() {
    if (this.opts.inline)
      return
    this.print(`\n${this.opts.indent ?? ''}`)
    this.needLine = false
  }

  colored(color: keyof typeof COLORS, data: any) {
    return this.opts.colors ? `\x1B[${COLORS[color]}m${data}\x1B[0m` : data
  }

  string(value: string) {
    this.print(`"${this.colored('green', value.replaceAll('"', '\\"'))}"`)
  }

  indented(value: string) {
    this.needLine = false
    const lines = value.split('\n')
    this.print(lines[0])
    for (const line of lines.slice(1)) {
      this.newLine()
      this.print(line)
    }
  }

  object(object: any) {
    this.indented(`{${inspect(object, this.opts)}}`)
  }

  attrs(attrs: Record<string, any>) {
    for (const [key, value] of Object.entries(attrs)) {
      this.print(` ${this.colored('red', key)}`)
      if (value === true)
        continue
      this.print('=')
      if (typeof value === 'string')
        this.string(value)
      else
        this.object(value)
    }
  }

  element(element: Element) {
    const tag = this.colored('green', element.type === Fragment ? '' : element.type)
    if (this.needLine)
      this.newLine()
    this.print(`<${tag}`)
    this.attrs(element.attrs)
    if (element.children.length === 0) {
      this.print(' />')
    }
    else {
      this.print('>')
      if (element.children.length === 1
        && (this.opts.compact || !(element.children[0] instanceof Element))) {
        this.node(element.children[0]!)
      }
      else {
        const nested = this.nest()
        nested.newLine()
        for (const child of element.children) {
          nested.node(child)
        }
        this.newLine()
      }
      this.print(`</${tag}>`)
    }
    this.needLine = true
  }

  node(node: Fragment) {
    if (node instanceof Element) {
      this.element(node)
    }
    else if (typeof node === 'string') {
      this.indented(node)
    }
    else {
      if (this.needLine)
        this.newLine()
      this.object(node)
      this.newLine()
    }
  }
}

export class BufferFormatter extends Formatter {
  buffer = ''
  constructor(opts: InspectOptions & Omit<FormatterOptions, 'print'> = {}) {
    super(text => this.buffer += text, opts)
  }
}
