import type { ElementJSON } from './jsx-runtime'
import { Element, Fragment } from './jsx-runtime'

export class Formatter {
  constructor(readonly print: (str: string) => void) { }

  string(value: string): void {
    this.print(JSON.stringify(value))
  }

  object(object: any): void {
    const string = typeof object === 'undefined' ? 'undefined'
      : typeof object === 'function' ? object.toString()
        : JSON.stringify(object)
    this.print(`{${string}}`)
  }

  attrs(attrs: Record<string, any>): void {
    for (const [key, value] of Object.entries(attrs)) {
      this.print(` ${key}`)
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
    const tag = element.type === Fragment ? '' : element.type
    this.print(`<${tag}`)
    this.attrs(element.attrs)
    if (element.children.length === 0) {
      this.print(' />')
    }
    else {
      this.print('>')
      for (const child of element.children)
        this.node(child)
      this.print(`</${tag}>`)
    }
  }

  node(node: unknown): void {
    if (node instanceof Element)
      return this.element(node)
    if (typeof node === 'string')
      return this.print(node)
    return this.object(node)
  }
}

export class BufferFormatter extends Formatter {
  buffer = ''
  constructor() {
    super(text => this.buffer += text)
  }
}
