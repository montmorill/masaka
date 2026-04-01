import { markdown, raw } from "./markdown"

export type ElementNode = Element | string | number | boolean | null | undefined

export class Element<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements> {
  constructor(
    readonly type: T,
    readonly props: JSX.IntrinsicElements[T],
    readonly children: ElementNode[]
  ) { }
}

type IsEmptyObject<T> = T extends {} ? keyof T extends never ? true : false : false

export function h<T extends keyof JSX.IntrinsicElements>(
  type: T,
  ...[props, ...children]: IsEmptyObject<JSX.IntrinsicElements[T]> extends true
    ? [props?: JSX.IntrinsicElements[T], ...children: ElementNode[]]
    : [props: JSX.IntrinsicElements[T], ...children: ElementNode[]]
): Element<T> {
  return new Element(type, props || {} as JSX.IntrinsicElements[T], children)
}

h.raw = raw
h.markdown = markdown

export const Fragment = "Fragment"

globalThis.Fragment = Fragment

declare global {
  var Fragment: "Fragment"

  namespace JSX {
    interface IntrinsicElements {
      Fragment: {}
    }

    type Element = InstanceType<{
      [K in keyof JSX.IntrinsicElements]: typeof Element<K>
    }[keyof JSX.IntrinsicElements]>
  }
}