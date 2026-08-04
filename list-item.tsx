/* eslint-disable no-console */

import type { Fragment, PartialElementInit } from '@yarkjs/element'
import h, { Element } from '@yarkjs/element'

declare module '@yarkjs/element' {
  interface OverwriteElementChildren {
    list: Fragment | Fragment[]
    ol: Fragment | Fragment[]
    ul: Fragment | Fragment[]
  }
}

class ListElement extends Element<'list'> {
  override update(...args: PartialElementInit<'list'>): this {
    const length = this.children.length
    super.update(...args)
    for (let index = length; index < this.children.length; index++) {
      const child = this.children[index]!
      if (!(child instanceof Element) || child.type !== 'item')
        this.children[index] = h.item(child)
    }
    return this
  }
}

h.components.list = h.list = (...args) => new ListElement('list', ...args)

console.log(
  <list>
    <ol>item 1</ol>
    <ul>item 2</ul>
  </list>,
)
