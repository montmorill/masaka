import type { FormatOptions } from './formatter'
import type { Merge, Overloads, Pretty, Xor } from './types'
import util from 'node:util'
import { isPlainObject } from 'cosmokit'
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

export type ElementAttrs<T extends keyof JSXElements> = Omit<JSXElements[T], 'children'>

export type ElementChildren<T extends keyof JSXElements> =
  ElementAttrs<T> extends { children: infer C extends any[] } ? C : MaybeFragment[]

export type ElementInit<T extends keyof JSXElements = keyof JSXElements> =
  | [attrs: ElementAttrs<T>, ...children: ElementChildren<T>]
  | (Partial<ElementAttrs<T>> extends ElementAttrs<T> ? ElementChildren<T> : never)

export type PartialElementInit<T extends keyof JSXElements = keyof JSXElements> =
  | [attrs: Partial<ElementAttrs<T>>, ...children: ElementChildren<T>]
  | ElementChildren<T>

export type FragmentJSON = ElementJSON | string
export interface ElementJSON<T extends keyof JSXElements = keyof JSXElements> {
  type: ElementType<T>
  attrs: ElementAttrs<T>
  children: FragmentJSON[]
}

export type JSXElements = Merge<ElementProps, {
  [T in keyof Elements]: Pretty<Xor<
    Elements[T] extends (...args: any[]) => any
      ? Parameters<Overloads<Elements[T]>> extends [infer A]
        ? A extends Fragment ? object : A : object : never
  >>
}>

type Compoents = {
  [T in keyof JSXElements]: (...args: ElementInit<T>) => Element<ElementType<T>>
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends JSXElements {}

    type Element = InstanceType<{
      [T in keyof JSXElements]: typeof Element<T>
    }[keyof JSXElements]>
  }
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
    if (args.length > 0 && isPlainObject(args[0]) && !(args[0] instanceof Element))
      Object.assign(this.attrs, args.shift())
    this.children.push(...args.filter(Boolean))
    return this
  }

  toJSON(): ElementJSON<T> {
    return {
      type: this.type,
      attrs: this.attrs,
      children: this.children.map(child => child instanceof Element ? child.toJSON() : child),
    }
  }

  toString(opts?: FormatOptions): string {
    const formatter = new BufferFormatter(opts)
    formatter.element(this)
    return formatter.buffer
  }

  [util.inspect.custom](_: any, opts: FormatOptions): string {
    return this.toString(opts)
  }
}

function h<T extends keyof JSXElements>(type: ElementType<T>, ...args: ElementInit<T>): Element<T> {
  if (h.components[type]) // @ts-ignore
    return h.components[type](...args)
  return new Element(type, ...args)
}

h.Element = Element
h.Fragment = Fragment
h.components = {} as Partial<Compoents>

export default new Proxy(h, {
  get(target, prop, receiver) {
    if (!Object.hasOwn(target, prop)) // @ts-ignore
      return (...args) => target(prop, ...args)
    return Reflect.get(target, prop, receiver)
  },
}) as typeof h & Compoents
