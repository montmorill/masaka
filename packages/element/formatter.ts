import type { InspectColor } from 'node:util'
import util from 'node:util'
import { highlight } from '@babel/code-frame'
import { Element, Fragment } from './jsx-runtime'

export interface FormatOptions {
  colors?: boolean
  compact?: boolean
  inline?: boolean
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

  nest(): Formatter {
    const formatter = new Formatter(this.print, this.opts)
    formatter.depth = this.depth + 1
    return formatter
  }

  newLine(): void {
    if (this.opts.inline)
      return
    this.print(`\n${'  '.repeat(this.depth)}`)
    this.needLine = false
  }

  styled(format: InspectColor, data: any): string {
    return this.opts.colors ? util.styleText(format, data) : data
  }

  string(value: string): void {
    this.print(this.styled('green', JSON.stringify(value)))
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
    const string = typeof object === 'function'
      ? object.toString()
      : JSON.stringify(object)
    this.indented(`{${this.opts.colors ? highlight(string) : string}}`)
  }

  attrs(attrs: Record<string, any>): void {
    for (const [key, value] of Object.entries(attrs)) {
      this.print(` ${this.styled('red', key)}`)
      if (value === true)
        continue
      this.print('=')
      if (typeof value === 'string')
        this.string(value)
      else
        this.object(value)
    }
  }

  element(element: Element): void {
    const tag = this.styled('green', element.type === Fragment ? '' : element.type)
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

  node(node: any): void {
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

export class BufferFormatter extends Formatter {
  buffer = ''
  constructor(opts: FormatOptions = {}) {
    super(text => this.buffer += text, opts)
  }
}
