import type { InspectColor, InspectOptions } from 'node:util'
import util, { inspect } from 'node:util'
import { Element, Fragment } from './jsx-runtime'

export interface FormatOptions extends InspectOptions {
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
    this.indented(`{${inspect(object, this.opts)}}`)
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
    if (node instanceof Element) {
      this.element(node)
    }
    else if (typeof node === 'string') {
      if (this.opts.compact || !node.includes('\n')) {
        this.indented(node)
      }
      else {
        const nested = this.nest()
        nested.newLine()
        nested.indented(node)
        this.newLine()
      }
    }
    else {
      if (node && typeof node.toString === 'function')
        this.indented(`{${node.toString()}}`)
      else
        this.object(node)
    }
  }
}

export class BufferFormatter extends Formatter {
  buffer = ''
  constructor(opts: FormatOptions = {}) {
    super(text => this.buffer += text, opts)
  }
}
