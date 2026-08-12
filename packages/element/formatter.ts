import type { InspectColor, InspectOptions } from 'node:util'
import type { ElementJSON } from './jsx-runtime'
import util, { inspect } from 'node:util'
import { Element, Fragment } from './jsx-runtime'

export interface FormatOptions extends Pick<
  InspectOptions,
  | 'showHidden'
  | 'depth'
  | 'colors'
  // TODO: | 'maxArrayLength'
  // TODO: | 'maxStringLength'
  // TODO: | 'breakLength'
  | 'compact'
  // TODO: | 'sorted'
  // TODO: | 'numericSeparator'
> {
  wrapText?: boolean
  highlight?: (code: string) => string
}

export class Formatter {
  private depth = 0

  get compact(): boolean {
    return typeof this.opts.compact === 'undefined' ? true
      : typeof this.opts.compact === 'boolean' ? this.opts.compact
        : this.depth > this.opts.compact
  }

  constructor(
    readonly print: (str: string) => void,
    readonly opts: FormatOptions = {},
  ) { opts = Object.assign({}, Formatter.defaultOptions, opts) }

  newline(): void {
    if (this.compact)
      return
    this.print(`\n${'  '.repeat(this.depth)}`)
  }

  multiline(value: string): void {
    const lines = value.split('\n')
    this.print(lines.shift()!)
    for (const line of lines) {
      this.newline()
      this.print(line)
    }
  }

  nest(): Formatter {
    const formatter = new Formatter(this.print, this.opts)
    formatter.depth = this.depth + 1
    return formatter
  }

  style(type: keyof typeof Formatter.styles, data: any): string {
    return this.opts.colors ? util.styleText(Formatter.styles[type], data) : data
  }

  string(value: string): void {
    this.print(this.style('string', JSON.stringify(value)))
  }

  inspect(object: unknown): string {
    return inspect(
      object,
      this.opts.showHidden,
      (this.opts.depth ?? 2) - 1,
      this.opts.colors,
    )
  }

  highlight(object: unknown): string {
    if (this.opts.colors && this.opts.highlight) {
      const code = typeof object === 'function' ? object.toString()
        : object === undefined ? 'undefined' : JSON.stringify(object)
      return this.opts.highlight(code)
    }
    return inspect(object)
  }

  object(object: unknown): void {
    this.multiline(`{${this.highlight(object)}}`)
  }

  attrs(attrs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(attrs)) {
      this.print(` ${this.style('attr', key)}`)
      if (value === true)
        continue
      this.print('=')
      if (typeof value === 'string')
        this.string(value)
      else
        this.object(value)
    }
  }

  children(children: unknown[]): void {
    if (this.opts.compact && children.length === 1)
      return this.node(children[0]!)
    const nested = this.nest()
    for (const child of children)
      nested.node(child)
  }

  element(element: ElementJSON): void {
    const tag = this.style('tag', element.type === Fragment ? '' : element.type)
    this.print(`<${tag}`)
    this.attrs(element.attrs)
    if (element.children.length === 0)
      return this.print(this.compact ? '/>' : ' />')
    this.print('>')
    this.children(element.children)
    this.print(`</${tag}>`)
  }

  node(node: unknown): void {
    if (node instanceof Element)
      this.element(node)
    else if (!this.opts.wrapText && typeof node === 'string')
      this.multiline(node)
    else this.object(node)
  }
}

export namespace Formatter {
  export const defaultOptions: Required<FormatOptions> = {
    ...inspect.defaultOptions as Required<InspectOptions>,
    wrapText: false,
    highlight: code => code,
  }

  export const styles = {
    string: 'green',
    attr: 'red',
    tag: 'cyan',
  } as const satisfies Record<string, InspectColor>
}

export class BufferFormatter extends Formatter {
  buffer = ''
  constructor(opts: FormatOptions = {}) {
    super(text => this.buffer += text, opts)
  }
}
