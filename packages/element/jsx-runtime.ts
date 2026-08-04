import type { InspectOptions } from 'node:util'
import type { FormatterOptions } from './formatter'
import type { Overloads, Pretty, Xor } from './types'
import util from 'node:util'
import { isPlainObject } from 'cosmokit'
import { BufferFormatter } from './formatter'

export const Fragment = 'template'

export type Fragment = Element | string
export type MaybeFragment = Fragment | false | null | undefined

type ElementChildren<T extends keyof JSXElements> =
  JSXElements[T] extends { children: infer C extends any[] } ? C : MaybeFragment[]

type ElementInit<T extends keyof JSXElements = keyof JSXElements> =
  | [attrs: JSXElements[T], ...children: ElementChildren<T>]
  | (Partial<JSXElements[T]> extends JSXElements[T] ? ElementChildren<T> : never)

type PartialElementInit<T extends keyof JSXElements = keyof JSXElements> =
  | [attrs: Partial<JSXElements[T]>, ...children: ElementChildren<T>]
  | ElementChildren<T>

export interface Elements {
  mention(attrs: { everyone: true }): Element<'mention'>
  mention(attrs: { user: string }): Element<'mention'>
  mention(attrs: { channel: string }): Element<'mention'>
  button(attrs: { text: string }): Element<'button'>
  button(attrs: { href: string }): Element<'button'>
  button(attrs: { action: string }): Element<'button'>
}

type ExtractOverloadProps<K extends keyof Elements> =
  Pretty<Xor<Elements[K] extends (...args: any[]) => any
    ? Parameters<Overloads<Elements[K]>> extends [infer A]
      ? A extends Fragment ? object : A : object : never>>

export interface ElementProps {
  [Fragment]: object
  link: { href: string, title?: string }
  audio: { src: string, title?: string }
  image: { src: string, title?: string }
  video: { src: string, title?: string }
  file: { src: string, title?: string }
}

type JSXElements = {
  [K in keyof Elements]:
  K extends keyof ElementProps
    ? ExtractOverloadProps<K> & ElementProps[K]
    : ExtractOverloadProps<K>
} & Omit<ElementProps, keyof Elements>

type ElementType = {
  [K in keyof Elements]:
  ReturnType<Elements[K]> extends Element<infer T> ? T : never
} & { [K in keyof Omit<JSXElements, keyof Elements>]: K }

declare global {
  namespace JSX {
    interface IntrinsicElements extends JSXElements {}

    type Element = InstanceType<{
      [T in keyof JSXElements]: typeof Element<T>
    }[keyof JSXElements]>
  }
}

export class Element<T extends keyof JSXElements = keyof JSXElements> {
  constructor(
    public type: ElementType[T],
    public attrs: JSXElements[T],
    public children: Fragment[] = [],
  ) {}

  update(...args: PartialElementInit<T>): this {
    let attrs = {} as JSXElements[T]
    if (args.length > 0 && isPlainObject(args[0]) && !(args[0] instanceof Element))
      attrs = args.shift()
    Object.assign(this.attrs, attrs)
    this.children.push(...args.filter(Boolean))
    return this
  }

  toString(opts?: InspectOptions & FormatterOptions): string {
    const formatter = new BufferFormatter(opts)
    formatter.element(this)
    return formatter.buffer
  }

  [util.inspect.custom](_: any, opts: InspectOptions): string {
    return this.toString(opts)
  }
}

function h<T extends keyof JSXElements>(type: ElementType[T], ...args: ElementInit<T>): Element<T> {
  if (h.components[type]) // @ts-ignore
    return h.components[type](...args)
  let attrs = {} as JSXElements[T]
  if (args.length > 0 && isPlainObject(args[0]) && !(args[0] instanceof Element))
    attrs = args.shift()
  return new Element(type, attrs, args.filter(Boolean))
}

h.Element = Element
h.Fragment = Fragment
h.components = {} as {
  [K in keyof JSXElements]?: (...args: ElementInit<K>) => Element<ElementType[K]>
}

export default new Proxy(h, {
  get(target, prop, receiver) {
    if (Object.hasOwn(target, prop))
      return Reflect.get(target, prop, receiver)
    // @ts-ignore
    return (...args) => target(prop, ...args)
  },
}) as typeof h & {
  [T in keyof JSXElements]: (...args: ElementInit<T>) => Element<ElementType[T]>
}
