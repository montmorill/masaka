import type { Logger } from 'reggol'
import { Exporter, Factory } from 'reggol'

const factory = new Factory()
factory.addExporter(new Exporter.Console())

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
