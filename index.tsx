import { h } from "@masaka/element"
import { markdown } from "@masaka/element/markdown"

console.log(markdown`
# Hello, ${<mention everyone />}!
${<img src="https://masaka.dev/avatar.png" />}
`)
