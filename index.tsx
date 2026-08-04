/* eslint-disable no-console */

import util, { inspect } from 'node:util'
import h from '@yarkjs/element'

// try uncomment this line!
// util.inspect.defaultOptions.compact = false
util.inspect.defaultOptions.colors = true
util.inspect.defaultOptions.depth = Infinity

const satori = <a href="https://satori.chat">Satori</a>
const koishi = <a href="https://koishi.chat">Koishi</a>

console.log(inspect(h.markdown`
# Hello, ${<mention everyone />}!

- I'm ${h.code('yark')},
- created by ${<mention user="montmorill" />},
- inspired by ${satori} & ${koishi}.
`.toJSON()))
