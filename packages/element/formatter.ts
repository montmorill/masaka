import type { InspectColor, InspectOptions } from 'node:util'
import util, { inspect } from 'node:util'
import { Element, Fragment } from './jsx-runtime'

export interface FormatOptions extends InspectOptions {
  indent?: string
  inline?: boolean
}

export class Formatter {
  private needLine = false

  constructor(
    readonly print: (data: any) => void,
    readonly opts: FormatOptions = {},
  ) {
    for (const key of Object.keys(util.inspect.defaultOptions)) {
      if (!(key in this.opts)) // @ts-ignore
        this.opts[key] = util.inspect.defaultOptions[key]
    }
  }

  nested(): Formatter {
    return new Formatter(this.print, {
      ...this.opts,
      indent: `${this.opts.indent ?? ''}  `,
    })
  }

  newLine(): void {
    if (this.opts.inline)
      return
    this.print(`\n${this.opts.indent ?? ''}`)
    this.needLine = false
  }

  styled(format: InspectColor, data: any): string {
    return this.opts.colors ? util.styleText(format, data) : data
  }

  string(value: string): void {
    this.print(`"${this.styled('green', value.replaceAll('"', '\\"'))}"`)
  }

  indented(value: string): void {
    this.needLine = false
    const lines = value.split('\n')
    this.print(lines[0])
    for (const line of lines.slice(1)) {
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
      if (element.children.length === 1
        && (this.opts.compact || !(element.children[0] instanceof Element))) {
        this.node(element.children[0]!)
      }
      else {
        const nested = this.nested()
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

  node(node: Fragment): void {
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
  constructor(opts: FormatOptions = {}) {
    super(text => this.buffer += text, opts)
  }
}
