/* eslint-disable no-console */

import h from '@ayrk/element'

const satori = <a href="https://satori.chat/">Satori</a>
const koishi = <a href="https://koishi.chat/">Koishi</a>

console.log(h.markdown`
# Hello, ${<mention everyone />}!

- I'm ${h.code('ayrk')},
- created by ${<mention user="montmorill" />},
- inspired by ${satori} & ${koishi}.
`)
