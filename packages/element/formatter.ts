import type { InspectColor, InspectOptions } from 'node:util'
import type { ElementJSON } from './jsx-runtime'
import { inspect, styleText } from 'node:util'
import { Element, Fragment } from './jsx-runtime'

export interface FormatOptions extends InspectOptions {
  wrapText?: boolean
  highlight?: (code: string) => string
}

export class Formatter {
  private depth = 0
  private column = 0
  readonly opts: Required<FormatOptions>

  get compact(): boolean {
    return typeof this.opts.compact === 'undefined' ? true
      : typeof this.opts.compact === 'boolean' ? this.opts.compact
        : this.depth > this.opts.compact
  }

  constructor(
    readonly print: (str: string) => void,
    opts: FormatOptions = {},
  ) {
    this.opts = Object.assign({}, Formatter.defaultOptions, opts)
  }

  /** Print a chunk of output, keeping track of the current column. */
  private write(str: string): void {
    const index = str.lastIndexOf('\n')
    this.column = index === -1
      ? this.column + Formatter.width(str)
      : Formatter.width(str.slice(index + 1))
    this.print(str)
  }

  /**
   * Print a line break for text content: always breaks the line,
   * but only indents when the output is expanded.
   */
  newline(): void {
    if (this.compact)
      return this.write('\n')
    this.write(`\n${'  '.repeat(this.depth)}`)
  }

  /** Break the current line, indented to the current depth. */
  breakLines(): void {
    this.write(`\n${'  '.repeat(this.depth)}`)
  }

  multiline(value: string): void {
    const lines = value.split('\n')
    this.write(lines.shift()!)
    for (const line of lines) {
      this.newline()
      this.write(line)
    }
  }

  nest(): Formatter {
    const formatter = new Formatter(this.print, this.opts)
    formatter.depth = this.depth + 1
    formatter.column = this.column
    return formatter
  }

  /** Rendered width of the first line of a node, ignoring colors. */
  size(node: unknown): number {
    const formatter = new BufferFormatter({ ...this.opts, colors: false, compact: true, breakLength: Infinity })
    formatter.node(node)
    return Formatter.width(formatter.buffer.split('\n')[0]!)
  }

  style(type: keyof typeof Formatter.styles, data: any): string {
    return this.opts.colors ? styleText(Formatter.styles[type], data) : data
  }

  string(value: string): void {
    const json = JSON.stringify(value)
    const max = this.opts.maxStringLength
    this.write(this.style('string', max != null && json.length > max
      ? `${json.slice(0, max)}... ${json.length - max} more character${json.length - max > 1 ? 's' : ''}`
      : json))
  }

  inspect(object: unknown): string {
    return inspect(object, this.opts)
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

  /** Print a single attr. */
  private writeAttr(key: string, value: unknown): void {
    this.write(this.style('attr', key))
    if (value === true)
      return
    this.write('=')
    if (typeof value === 'string')
      this.string(value)
    else
      this.object(value)
  }

  /** Rendered width of a single attr, including the leading space. */
  private sizeAttr(key: string, value: unknown): number {
    const formatter = new BufferFormatter({ ...this.opts, colors: false, compact: true, breakLength: Infinity })
    formatter.write(' ')
    formatter.writeAttr(key, value)
    return Formatter.width(formatter.buffer)
  }

  /**
   * Print attrs, breaking lines when they no longer fit the remaining
   * width. Returns whether any line was broken.
   */
  attrs(attrs: Record<string, unknown>): boolean {
    const entries = Object.entries(attrs)
    if (this.opts.sorted === true) {
      entries.sort()
    }
    else if (this.opts.sorted) {
      const compare = this.opts.sorted
      entries.sort(([a], [b]) => compare(a, b))
    }
    if (entries.length === 0)
      return false
    const nested = this.nest()
    const inline = entries.reduce<number>((width, [key, value]) => width + this.sizeAttr(key, value), 0)
    const multiline = this.column + inline > this.opts.breakLength
    for (const [key, value] of entries) {
      if (multiline)
        nested.breakLines()
      else
        nested.write(' ')
      nested.writeAttr(key, value)
    }
    this.column = nested.column
    return multiline
  }

  /**
   * Print children. When the output is expanded, break the line before
   * every child; when the children no longer fit the remaining width,
   * break the line before every element child so that consecutive text
   * children stay merged on one line. Returns whether any line was broken.
   */
  children(children: unknown[]): boolean {
    const length = children.length
    if (length === 0)
      return false
    const max = this.opts.maxArrayLength
    if (this.compact && length === 1 && (max == null || max >= length)) {
      this.node(children[0]!)
      return false
    }
    const nested = this.nest()
    const shown = max == null ? children : children.slice(0, max)
    const rest = length - shown.length
    const marker = rest > 0 ? `... ${rest} more ${rest > 1 ? 'children' : 'child'}` : ''
    let multiline = !nested.compact
    if (!multiline) {
      const inline = shown.reduce<number>((width, child) => width + nested.size(child), 0)
        + Formatter.width(marker)
      multiline = this.column + inline > this.opts.breakLength
    }
    for (const child of shown) {
      const flow = nested.compact ? nested.isText(child) : nested.isWhitespace(child)
      if (multiline && !flow)
        nested.breakLines()
      nested.node(child)
    }
    if (rest > 0) {
      if (multiline)
        nested.breakLines()
      nested.write(this.style('more', marker))
    }
    this.column = nested.column
    return multiline
  }

  element(element: ElementJSON): void {
    const tag = this.style('tag', element.type === Fragment ? '' : element.type)
    this.write(`<${tag}`)
    const multiline = this.attrs(element.attrs)
    if (element.children.length === 0) {
      if (multiline)
        this.breakLines()
      return this.write(multiline || this.compact ? '/>' : ' />')
    }
    if (multiline)
      this.breakLines()
    this.write('>')
    if (this.children(element.children))
      this.breakLines()
    this.write(`</${tag}>`)
  }

  /** Whether the node is rendered as plain text. */
  private isText(node: unknown): node is string {
    return !this.opts.wrapText && typeof node === 'string'
  }

  /** Whether the node is rendered as whitespace-only text. */
  private isWhitespace(node: unknown): node is string {
    return this.isText(node) && node.trim() === ''
  }

  text(value: string): void {
    const max = this.opts.maxStringLength
    this.multiline(max != null && value.length > max
      ? `${value.slice(0, max)}... ${value.length - max} more character${value.length - max > 1 ? 's' : ''}`
      : value)
  }

  node(node: unknown): void {
    if (node instanceof Element)
      this.element(node)
    else if (this.isText(node))
      this.text(node)
    else this.object(node)
  }
}

export namespace Formatter {
  export const defaultOptions: Required<FormatOptions> = {
    ...inspect.defaultOptions as Required<InspectOptions>,
    wrapText: false,
    highlight: code => code,
  }

  /** Matches the ANSI escape sequences produced by styleText. */
  // eslint-disable-next-line prefer-regex-literals, no-control-regex
  const ansi = new RegExp('\\x1b\\[[0-9;]*m', 'g')

  /** Whether a character is rendered at double width in terminals. */
  export function isWide(char: string): boolean {
    const code = char.codePointAt(0)!
    return (code >= 0x1100 && code <= 0x115F) // Hangul Jamo
      || (code >= 0x2E80 && code <= 0xA4CF) // CJK Radicals, Kangxi Radicals, CJK Unified Ideographs
      || (code >= 0xAC00 && code <= 0xD7A3) // Hangul Syllables
      || (code >= 0xF900 && code <= 0xFAFF) // CJK Compatibility Ideographs
      || (code >= 0xFE30 && code <= 0xFE4F) // CJK Compatibility Forms
      || (code >= 0xFF00 && code <= 0xFF60) // Fullwidth Forms
      || (code >= 0xFFE0 && code <= 0xFFE6) // Fullwidth Signs
  }

  /** Visible width of a string, ignoring ANSI escapes. */
  export function width(string: string): number {
    let width = 0
    for (const char of string.replace(ansi, ''))
      width += Formatter.isWide(char) ? 2 : 1
    return width
  }

  export const styles = {
    string: 'green',
    attr: 'red',
    tag: 'cyan',
    more: 'dim',
  } as const satisfies Record<string, InspectColor>
}

export class BufferFormatter extends Formatter {
  buffer = ''
  constructor(opts: FormatOptions = {}) {
    super(text => this.buffer += text, opts)
  }
}
