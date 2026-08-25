import type { Merge, Overloads, Pretty, Xor } from '@yarkjs/utils'
import type { Inspectable } from 'node:util'
import type { FormatOptions } from './formatter'
import { inspect } from 'node:util'
import { BufferFormatter } from './formatter'
import { unpack } from './utils'

export const Fragment = 'template'

export interface Elements {}

export interface ElementProps {
  [Fragment]: object
  text: never
}

export type Fragment = Element | string
export type MaybeFragment = Fragment | false | null | undefined

export type ElementType<T extends string> =
  T extends keyof Elements
    ? Elements[T] extends (...args: any[]) => Element
      ? ReturnType<Elements[T]> extends Element<infer T> ? T : never
      : T
    : T

export type ElementAttrs<T extends string> =
  T extends JSX.ElementType ? Omit<JSX.IntrinsicElements[T], 'children'> : object

export type ElementInit<T extends string> =
  | [attrs: ElementAttrs<T>, ...children: MaybeFragment[]]
  | (Partial<ElementAttrs<T>> extends ElementAttrs<T> ? MaybeFragment[] : never)

export type PartialElementInit<T extends string> =
  | [attrs: Partial<ElementAttrs<T>>, ...children: MaybeFragment[]]
  | MaybeFragment[]

type IntrinsicElements = Merge<ElementProps, {
  [T in keyof Elements]: Pretty<Xor<
    Elements[T] extends (...args: any[]) => Element
      ? Parameters<Overloads<Elements[T]>> extends [infer F, ...infer R]
        ? F extends Fragment ? object : [] extends R ? F : F
        : Elements[T]
      : Elements[T]
  >>
}>

type IntrinsicElementsWithChildren = {
  [T in keyof IntrinsicElements]: IntrinsicElements[T] & JSX.ElementChildrenAttribute
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends IntrinsicElementsWithChildren {}
    interface IntrinsicAttributes { children?: Fragment | Fragment[] }
    interface ElementChildrenAttribute { children?: Fragment | Fragment[] }
    type ElementType = keyof IntrinsicElements
    type Element = InstanceType<{
      [T in keyof IntrinsicElements]: typeof Element<T>
    }[keyof IntrinsicElements]>
  }
}

export interface ElementJSON<T extends string = string> {
  type: ElementType<T>
  attrs: ElementAttrs<T>
  children: Fragment[]
}

export class Element<T extends string = string> implements Inspectable {
  type: ElementType<T>
  attrs: ElementAttrs<T> = {} as never
  children: Fragment[] = []

  constructor(type: ElementType<T>, ...args: ElementInit<T>) {
    this.type = type
    this.update(...args)
  }

  update(...args: PartialElementInit<T>): this {
    if (typeof args[0] === 'object' && !(args[0] instanceof Element))
      Object.assign(this.attrs, args.shift())
    this.children.push(...args.flatMap(child => child ? unpack(child as Fragment) : []))
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

  toString(opts: FormatOptions = {
    colors: false,
    maxArrayLength: Infinity,
    maxStringLength: Infinity,
    maxAttrStringLength: Infinity,
    breakLength: Infinity,
    compact: true,
  }): string {
    const formatter = new BufferFormatter(opts)
    formatter.element(this)
    return formatter.buffer
  }

  [inspect.custom](_: unknown, opts: FormatOptions): string {
    return this.toString(opts)
  }
}

export type Component<T extends string> = (...args: ElementInit<T>) => Element<ElementType<T>>

function h<T extends string>(type: T, ...args: ElementInit<T>): Element<T> {
  // @ts-ignore
  return h.components[type]?.(...args) ?? new Element(type, ...args)
}

h.Element = Element
h.Fragment = Fragment
h.components = {} as { [T in JSX.ElementType]?: Component<T> }

export default new Proxy(h, {
  get(target, prop, receiver) {
    if (!Object.hasOwn(target, prop)) // @ts-ignore
      return (...args) => target(prop, ...args)
    return Reflect.get(target, prop, receiver)
  },
}) as typeof h & { [T in JSX.ElementType]: Component<T> }

export function jsx<T extends string>(
  type: T,
  { children, ...props }: any,
): Element<T> {
  if (Array.isArray(children))
    return h(type, props, ...children)
  return h(type, props, children)
}
