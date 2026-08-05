import type { FormatOptions } from './formatter'
import type { Merge, Overloads, Pretty, Xor } from './types'
import util from 'node:util'
import { BufferFormatter } from './formatter'

export const Fragment = 'template'

export interface Elements {
  mention(attrs: { everyone: true }): Element<'mention'>
  mention(attrs: { user: string }): Element<'mention'>
  mention(attrs: { channel: string }): Element<'mention'>
  button(attrs: { text: string }): Element<'button'>
  button(attrs: { href: string }): Element<'button'>
  button(attrs: { action: string }): Element<'button'>
}

export interface ElementProps {
  [Fragment]: object
  link: { href: string, title?: string }
  audio: { src: string, title?: string }
  image: { src: string, title?: string }
  video: { src: string, title?: string }
  file: { src: string, title?: string }
}

export type Fragment = Element | string
export type MaybeFragment = Fragment | false | null | undefined

export type ElementType<T extends keyof JSXElements> =
  T extends keyof Elements
    ? ReturnType<Elements[T]> extends Element<infer T> ? T : never
    : T

export type ElementAttrs<T extends keyof JSXElements> = JSXElements[T]

export type ElementInit<T extends keyof JSXElements = keyof JSXElements> =
  | [attrs: ElementAttrs<T>, ...children: MaybeFragment[]]
  | (Partial<ElementAttrs<T>> extends ElementAttrs<T> ? MaybeFragment[] : never)

export type PartialElementInit<T extends keyof JSXElements = keyof JSXElements> =
  | [attrs: Partial<ElementAttrs<T>>, ...children: MaybeFragment[]]
  | MaybeFragment[]

export type JSXElements = Merge<ElementProps, {
  [T in keyof Elements]: Pretty<Xor<
    Elements[T] extends (...args: any[]) => any
      ? Parameters<Overloads<Elements[T]>> extends [infer F, ...infer R]
        ? F extends Fragment ? object : [] extends R ? F : F
        : Elements[T]
      : Elements[T]
  >>
}>

declare global {
  namespace JSX {
    interface IntrinsicElements extends JSXElements {}
    type Element = InstanceType<{
      [T in keyof JSXElements]: typeof Element<T>
    }[keyof JSXElements]>
  }
}

export interface ElementJSON<T extends keyof JSXElements = keyof JSXElements> {
  type: ElementType<T>
  attrs: ElementAttrs<T>
  children: Fragment[]
}

export class Element<T extends keyof JSXElements = keyof JSXElements> {
  type: ElementType<T>
  attrs: ElementAttrs<T> = {} as any
  children: Fragment[] = []

  constructor(type: ElementType<T>, ...args: ElementInit<T>) {
    this.type = type
    this.update(...args)
  }

  update(...args: PartialElementInit<T>): this {
    const isPlainObject = args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])
    if (isPlainObject && !(args[0] instanceof Element))
      Object.assign(this.attrs, args.shift())
    this.children.push(...args.filter(Boolean) as Fragment[])
    return this
  }

  toJSON(): ElementJSON<T> {
    return {
      type: this.type,
      attrs: this.attrs,
      children: this.children.map(child => child // @ts-ignore
        && typeof child.toJSON === 'function' ? child.toJSON() : child),
    }
  }

  toString(opts: FormatOptions = { colors: false, compact: 'inline' }): string {
    const formatter = new BufferFormatter(opts)
    formatter.element(this)
    return formatter.buffer
  }

  [util.inspect.custom](_: any, opts: FormatOptions): string {
    return this.toString(opts)
  }
}

export type Component<T extends keyof JSXElements> =
  (...args: ElementInit<T>) => Element<ElementType<T>>

function h<T extends keyof JSXElements>(type: ElementType<T>, ...args: ElementInit<T>): Element<T> {
  if (h.components[type]) // @ts-ignore
    return h.components[type](...args)
  return new Element(type, ...args)
}

h.Element = Element
h.Fragment = Fragment
h.components = {} as { [T in keyof JSXElements]?: Component<T> }

export default new Proxy(h, {
  get(target, prop, receiver) {
    if (!Object.hasOwn(target, prop)) // @ts-ignore
      return (...args) => target(prop, ...args)
    return Reflect.get(target, prop, receiver)
  },
}) as typeof h & { [T in keyof JSXElements]: Component<T> }
