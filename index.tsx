import { h } from "@masaka/element"

console.log(h.raw`\
# Hello, ${<mention everyone />}

${<img src="https://masaka.dev/avatar.png" />}\
`)

console.log(h.markdown`
# Hello, ${<mention everyone />}!
${<img src="https://masaka.dev/avatar.png" width={480} />}
`)
