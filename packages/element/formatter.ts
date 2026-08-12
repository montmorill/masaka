import type { InspectColor, InspectOptions } from 'node:util'
import type { ElementJSON } from './jsx-runtime'
import util from 'node:util'
import { Element, Fragment } from './jsx-runtime'

export interface FormatOptions extends Pick<InspectOptions, 'colors' | 'compact'> {
  highlight?: (code: string) => string
}

export class Formatter {
  private needLine = false
  private depth = 0

  constructor(
    readonly print: (str: string) => void,
    readonly opts: FormatOptions = {},
  ) {
    for (const key of Object.keys(util.inspect.defaultOptions)) {
      if (!(key in this.opts)) // @ts-ignore
        this.opts[key] = util.inspect.defaultOptions[key]
    }
  }

  get compact(): boolean {
    return typeof this.opts.compact === 'undefined' ? true
      : typeof this.opts.compact === 'boolean' ? this.opts.compact
        : this.depth > this.opts.compact
  }

  nest(): Formatter {
    const formatter = new Formatter(this.print, this.opts)
    formatter.depth = this.depth + 1
    return formatter
  }

  newLine(): void {
    if (this.compact)
      return
    this.print(`\n${'  '.repeat(this.depth)}`)
    this.needLine = false
  }

  styled(type: keyof typeof Formatter.styles, data: any): string {
    return this.opts.colors ? util.styleText(Formatter.styles[type], data) : data
  }

  string(value: string): void {
    this.print(this.styled('string', JSON.stringify(value)))
  }

  indented(value: string): void {
    this.needLine = false
    const lines = value.split('\n')
    this.print(lines.shift()!)
    for (const line of lines) {
      this.newLine()
      this.print(line)
    }
  }

  object(object: any): void {
    const string = typeof object === 'undefined' ? 'undefined'
      : typeof object === 'function' ? object.toString()
        : JSON.stringify(object)
    this.indented(`{${this.opts.colors && this.opts.highlight
      ? this.opts.highlight(string) : string}}`)
  }

  attrs(attrs: Record<string, any>): void {
    for (const [key, value] of Object.entries(attrs)) {
      this.print(` ${this.styled('attr', key)}`)
      if (value === true)
        continue
      this.print('=')
      if (typeof value === 'string')
        this.string(value)
      else
        this.object(value)
    }
  }

  element(element: ElementJSON): void {
    const tag = this.styled('tag', element.type === Fragment ? '' : element.type)
    if (this.needLine)
      this.newLine()
    this.print(`<${tag}`)
    this.attrs(element.attrs)
    if (element.children.length === 0) {
      this.print(' />')
    }
    else {
      this.print('>')
      if (this.opts.compact && element.children.length === 1) {
        this.node(element.children[0]!)
      }
      else {
        const nested = this.nest()
        nested.newLine()
        for (const child of element.children)
          nested.node(child)
        this.newLine()
      }
      this.print(`</${tag}>`)
    }
    this.needLine = true
  }

  node(node: unknown): void {
    if (node instanceof Element)
      return this.element(node)
    if (typeof node === 'string')
      return this.indented(node)
    if (this.opts.compact)
      return this.object(node)
    if (this.needLine)
      this.newLine()
    this.object(node)
    this.needLine = true
  }
}

export namespace Formatter {
  export const styles = {
    string: 'green',
    attr: 'red',
    tag: 'yellow',
  } as const satisfies Record<string, InspectColor>
}

export class BufferFormatter extends Formatter {
  buffer = ''
  constructor(opts: FormatOptions = {}) {
    super(text => this.buffer += text, opts)
  }
}
