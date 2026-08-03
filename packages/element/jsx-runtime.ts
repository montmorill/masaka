import type { InspectOptions } from 'node:util'
import type { FormatterOptions } from './formatter'
import type { Overloads, Pretty, Xor } from './types'
import util from 'node:util'
import { isPlainObject } from 'cosmokit'
import { BufferFormatter } from './formatter'

export const Fragment = 'template'

export type Fragment = Element | string
export type MaybeFragment = Fragment | false | null | undefined

type ElementAttrs<T extends keyof JSX.IntrinsicElements> =
  Omit<JSX.IntrinsicElements[T], 'children'>

type ElementChildren<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T] extends { children: infer C extends any[] } ? C : MaybeFragment[]

type ElementInit<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements> =
  | [attrs: ElementAttrs<T>, ...children: ElementChildren<T>]
  | (Partial<ElementAttrs<T>> extends ElementAttrs<T> ? ElementChildren<T> : never)

export interface Elements {
  mention(attrs: { everyone: true }): Element<'mention'>
  mention(attrs: { user: string }): Element<'mention'>
  mention(attrs: { channel: string }): Element<'mention'>
  button(attrs: { text: string }): Element<'button'>
  button(attrs: { href: string }): Element<'button'>
  button(attrs: { action: string }): Element<'button'>
}

type ExtractedElements = {
  [K in keyof Elements]: Pretty<Xor<
    Elements[K] extends (...args: any[]) => any
      ? Parameters<Overloads<Elements[K]>> extends [infer F, ...infer R]
        ? F extends Fragment ? { children: [F, ...R] }
          : [] extends R ? F : { children?: R } & F
        : Elements[K]
      : Elements[K]
  >>
}

export interface ElementProps {
  link: { href: string, title?: string }
  audio: { src: string, title?: string }
  image: { src: string, title?: string }
  video: { src: string, title?: string }
  file: { src: string, title?: string }
}

type MergedElements = {
  [K in keyof ExtractedElements]: K extends keyof ElementProps
    ? Pretty<ExtractedElements[K] & ElementProps[K]> : ExtractedElements[K]
} & Omit<ElementProps, keyof ExtractedElements>

declare global {
  namespace JSX {
    interface IntrinsicElements extends MergedElements {
      [Fragment]: object
    }

    type Element = InstanceType<{
      [T in keyof JSX.IntrinsicElements]: typeof Element<T>
    }[keyof JSX.IntrinsicElements]>
  }
}

export class Element<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements> {
  constructor(
    public type: T,
    public attrs: ElementAttrs<T>,
    public children: Fragment[] = [],
  ) {}

  toString(opts?: InspectOptions & Omit<FormatterOptions, 'print'>): string {
    const formatter = new BufferFormatter(opts)
    formatter.element(this)
    return formatter.buffer
  }

  [util.inspect.custom](_: any, opts: InspectOptions): string {
    return this.toString(opts)
  }
}

function h<T extends keyof JSX.IntrinsicElements>(type: T, ...args: ElementInit<T>): Element<T> {
  let attrs = {} as ElementAttrs<T>
  if (args.length > 0 && isPlainObject(args[0]) && !(args[0] instanceof Element)) {
    attrs = args.shift()
  }
  return new Element(type, attrs, args.filter(Boolean))
}

h.Element = Element
h.Fragment = Fragment

export default new Proxy(h, {
  get(target, prop, receiver) {
    if (Object.hasOwn(target, prop))
      return Reflect.get(target, prop, receiver)
    // @ts-ignore
    return (...args) => target(prop, ...args)
  },
}) as typeof h & {
  [T in keyof JSX.IntrinsicElements]: (...args: ElementInit<T>) => Element<T>
}
