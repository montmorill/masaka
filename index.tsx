/* eslint-disable no-console */

import type { Element } from '@ayrk/element'
import h from '@ayrk/element'

const satori = <link href="https://satori.chat">Satori</link>
const koishi = <link href="https://koishi.chat">Koishi</link>

declare module '@ayrk/element' {
  interface ElementOverloads {
    h1(attrs: Omit<ElementProps['heading'], 'level'>): Element<'heading'>
    h2(attrs: Omit<ElementProps['heading'], 'level'>): Element<'heading'>
    h3(attrs: Omit<ElementProps['heading'], 'level'>): Element<'heading'>
    h4(attrs: Omit<ElementProps['heading'], 'level'>): Element<'heading'>
    h5(attrs: Omit<ElementProps['heading'], 'level'>): Element<'heading'>
    h6(attrs: Omit<ElementProps['heading'], 'level'>): Element<'heading'>
  }
}

h.h1 = (...args) => h.heading({ level: 1 }).update(...args)
h.h2 = (...args) => h.heading({ level: 2 }).update(...args)
h.h3 = (...args) => h.heading({ level: 3 }).update(...args)
h.h4 = (...args) => h.heading({ level: 4 }).update(...args)
h.h5 = (...args) => h.heading({ level: 5 }).update(...args)
h.h6 = (...args) => h.heading({ level: 6 }).update(...args)

console.log(h.h1('Hello, World!'))
console.log(<h1>Hello, World!</h1>)

console.log(h.markdown`
# Hello, ${<mention everyone />}!

- I'm ${h.code('ayrk')},
- created by ${<mention user="montmorill" />},
- inspired by ${satori} & ${koishi}.
`)
