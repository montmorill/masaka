/* eslint-disable no-console */

import h from '@yak/element'

const satori = <a href="https://satori.chat/">Satori</a>
const koishi = <a href="https://koishi.chat/">Koishi</a>

console.log(h.markdown`
# Hello, ${<mention everyone />}!

- I'm ${h.code('yak')},
- created by ${<mention user="montmorill" />},
- inspired by ${satori} & ${koishi}.
`)
