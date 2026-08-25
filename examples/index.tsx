/* eslint-disable no-console */

import { inspect } from 'node:util'
import h from '@yarkjs/element'
import { markdown } from '@yarkjs/markdown'

// try uncomment this line!
// inspect.defaultOptions.compact = true
inspect.defaultOptions.colors = true
inspect.defaultOptions.depth = Infinity

const satori = <a href="https://satori.chat">Satori</a>
const koishi = <a href="https://koishi.chat">Koishi</a>

console.log(inspect(markdown`
# Hello, ${<mention everyone />}!

- I'm ${h.code('yark')},
- created by ${<mention user="montmorill" />},
- inspired by ${satori} & ${koishi}.
` /* try `.toJSON()` or `.toString()` here! */))
