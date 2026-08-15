import type { Logger, Message } from 'reggol'
import { inspect } from 'node:util'
import { Exporter, Factory } from 'reggol'

/** reggol's console exporter without the continuation-line indentation. */
class PlainConsole extends Exporter.Console {
  override render(message: Message): string {
    const output = super.render(message)
    const indent = 3 + (this.label?.margin ?? 1) + (this.showTime ? this.showTime.length : 0)
    return output.split(`\n${' '.repeat(indent)}`).join('\n')
  }
}

const factory = new Factory()
factory.addExporter(new PlainConsole())
// reggol's `%o` formatter forces `compact: true`, which inlines element trees
factory.formatters.o = (value: unknown, exporter: Exporter): string => {
  const options = { colors: !!exporter.colors, depth: Infinity, compact: false }
  return inspect(value, options)
}

const loggerMap = new Map<string, Logger>()

export function createLogger(name: string, options?: Omit<Logger.Options, 'name'>): Logger {
  let instance = loggerMap.get(name)
  if (!instance) {
    instance = factory.createLogger(name, options)
    loggerMap.set(name, instance)
  }
  return instance
}

export type { Logger }

const target = createLogger('\b')

/** The default logger, callable to get a cached named logger: `logger('qq')`. */
export const logger = new Proxy((name?: string): Logger => {
  return typeof name === 'string' ? createLogger(name) : target
}, {
  get(_proxy, name) {
    return Reflect.get(target, name)
  },
}) as Logger & ((name?: string) => Logger)
