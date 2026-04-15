import type { InspectOptions } from 'node:util'
import type { FormatterOptions } from './formatter'
import util from 'node:util'
import { isPlainObject } from 'cosmokit'
import { BufferFormatter } from './formatter'

export const Fragment = 'template'

declare global {
  namespace JSX {
    type Element = InstanceType<{
      [T in keyof JSX.IntrinsicElements]: typeof Element<T>
    }[keyof JSX.IntrinsicElements]>

    interface IntrinsicElements {
      [Fragment]: object
    }
  }
}

export type Fragment = Element | string
export type MaybeFragment = Fragment | false | null | undefined

type IsNullable<T> = Partial<T> extends T ? true : false

type ElementInit<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements> =
  (IsNullable<JSX.IntrinsicElements[T]> extends true ? MaybeFragment[] : never)
  | [attrs: JSX.IntrinsicElements[T], ...children: MaybeFragment[]]

export class Element<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements> {
  constructor(
    readonly type: T,
    readonly attrs = {} as JSX.IntrinsicElements[T],
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
  let attrs = {} as JSX.IntrinsicElements[T]

  if (args.length > 0 && isPlainObject(args[0]) && !(args[0] instanceof Element)) {
    attrs = args.shift() as JSX.IntrinsicElements[T]
  }

  return new Element(type, attrs, args.filter(Boolean) as Fragment[])
}

export default new Proxy(h, {
  get(target, prop, receiver) {
    if (Object.hasOwn(target, prop)) {
      return Reflect.get(target, prop, receiver)
    }
    return (...args: any[]) => target(prop as keyof JSX.IntrinsicElements, ...args)
  },
}) as typeof h & {
  [T in keyof JSX.IntrinsicElements]:
  Parameters<typeof h<T>> extends [infer _, ...infer R]
    ? (...args: R) => Element<T> : never
}
