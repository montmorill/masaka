/* eslint-disable no-console */

import h from '@ayrk/element'

const satori = <link href="https://satori.chat/">Satori</link>
const koishi = <link href="https://koishi.chat/">Koishi</link>

console.log(h.markdown`
# Hello, ${<mention everyone />}!

- I'm ${h.code('ayrk')},
- created by ${<mention user="montmorill" />},
- inspired by ${satori} & ${koishi}.
`)
