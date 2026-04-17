import type { InspectOptions } from 'node:util'
import type { FormatterOptions } from './formatter'
import type { IsNullable, Overloads, Pretty, Xor } from './types'
import util from 'node:util'
import { isPlainObject } from 'cosmokit'
import { BufferFormatter } from './formatter'

export const Fragment = 'template'

export type Fragment = Element | string
export type MaybeFragment = Fragment | false | null | undefined

type ElementProps<T extends keyof JSX.IntrinsicElements> =
  Omit<JSX.IntrinsicElements[T], 'children'>

type ElementChildren<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T] extends { children: infer C extends any[] } ? C : MaybeFragment[]

type ElementInit<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements> =
  | (IsNullable<ElementProps<T>> extends true ? ElementChildren<T> : never)
  | [attrs: ElementProps<T>, ...children: ElementChildren<T>]

export interface Elements {}

type ResolvedElements = {
  [K in keyof Elements]: Pretty<Xor<
    Elements[K] extends (...args: any[]) => any
      ? Parameters<Overloads<Elements[K]>> extends [infer F, ...infer R]
        ? F extends Fragment ? { children: [F, ...R] }
          : [] extends R ? F : { children?: R } & F
        : Elements[K]
      : Elements[K]
  >>
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ResolvedElements {
      [Fragment]: object
    }

    type Element = InstanceType<{
      [T in keyof JSX.IntrinsicElements]: typeof Element<T>
    }[keyof JSX.IntrinsicElements]>
  }
}

export class Element<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements> {
  constructor(
    readonly type: T,
    readonly attrs = {} as ElementProps<T>,
    readonly children: Fragment[] = [],
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
  let attrs = {} as ElementProps<T>
  if (args.length > 0 && isPlainObject(args[0]) && !(args[0] instanceof Element)) {
    attrs = args.shift()
  }
  return new Element(type, attrs, args.filter(Boolean))
}

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
