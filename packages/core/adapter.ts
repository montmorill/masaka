import type { WebSocket } from '@yak/protocol'
import type { Context } from 'cordis'
import type { Awaitable } from 'cosmokit'
import type { Bot } from './bot'
import { Status } from '@yak/protocol'
import { Schema } from 'cordis'
import { remove, Time } from 'cosmokit'

export abstract class Adapter<C extends Context = Context, B extends Bot<C> = Bot<C>> {
  static schema = false as const

  public bots: B[] = []

  constructor(protected ctx: C) {}
  async connect(_bot: B): Promise<void> {}
  async disconnect(_bot: B): Promise<void> {}

  fork(ctx: Context, bot: B): void {
    bot.adapter = this
    this.bots.push(bot)
    ctx.on('dispose', () => {
      remove(this.bots, bot)
    })
  }
}

export namespace Adapter {
  export interface WsClientConfig {
    retryLazy: number
    retryTimes: number
    retryInterval: number
  }

  export const WsClientConfig: Schema<WsClientConfig> = Schema.object({
    retryTimes: Schema.natural().description('初次连接时的最大重试次数。').default(6),
    retryInterval: Schema.natural().role('ms').description('初次连接时的重试时间间隔。').default(5 * Time.second),
    retryLazy: Schema.natural().role('ms').description('连接关闭后的重试时间间隔。').default(Time.minute),
  }).description('连接设置')

  export abstract class WsClientBase<C extends Context, B extends Bot<C>> extends Adapter<C, B> {
    protected socket?: WebSocket
    protected connectionId = 0

    protected abstract prepare(): Awaitable<WebSocket>
    protected abstract accept(socket: WebSocket): void
    protected abstract getActive(): boolean
    protected abstract setStatus(status: Status, error?: Error): void

    constructor(ctx: C, public config: WsClientConfig) {
      super(ctx)
    }

    async start(): Promise<void> {
      let retryCount = 0
      const connectionId = ++this.connectionId
      const logger = this.ctx.logger('adapter')
      const { retryTimes, retryInterval, retryLazy } = this.config

      let connect: (initial?: boolean) => void

      const reconnect = (initial: boolean, message: string): void => {
        if (!this.getActive() || connectionId !== this.connectionId)
          return

        let timeout = retryInterval
        if (retryCount >= retryTimes) {
          if (initial) {
            return void this.setStatus(Status.OFFLINE, new Error(message))
          }
          else {
            timeout = retryLazy
          }
        }

        retryCount++
        this.setStatus(Status.RECONNECT)
        logger.warn(`${message}, will retry in ${Time.format(timeout)}...`)
        setTimeout(() => {
          if (!this.getActive() || connectionId !== this.connectionId)
            return
          connect()
        }, timeout)
      }

      connect = async (initial = false) => {
        logger.debug('websocket client opening')
        let socket: WebSocket
        try {
          socket = await this.prepare()
        }
        catch (error: any) {
          reconnect(initial, error.toString() || `failed to prepare websocket`)
          return
        }

        // remove query args to protect privacy
        const url = socket.url.replace(/\?.+/, '')

        socket.addEventListener('error', (event) => {
          if (event.message)
            logger.warn(event.message)
        })

        socket.addEventListener('close', ({ code, reason }) => {
          if (this.socket === socket)
            this.socket = undefined
          logger.debug(`websocket closed with ${code}`)
          reconnect(initial, reason.toString() || `failed to connect to ${url}, code: ${code}`)
        })

        socket.addEventListener('open', () => {
          retryCount = 0
          this.socket = socket
          logger.info('connect to server: %c', url)
          this.accept(socket)
        })
      }

      connect(true)
    }

    async stop(): Promise<void> {
      this.socket?.close()
    }
  }

  export abstract class WsClient<C extends Context, B extends Bot<C, WsClientConfig>> extends WsClientBase<C, B> {
    static reusable = true

    constructor(ctx: C, public bot: B) {
      super(ctx, bot.config)
      bot.adapter = this
    }

    getActive(): boolean {
      return this.bot.isActive
    }

    setStatus(status: Status, error?: Error): void {
      this.bot.status = status
      this.bot.error = error
    }

    override connect(_bot: B): Promise<void> {
      return this.start()
    }

    override disconnect(_bot: B): Promise<void> {
      return this.stop()
    }
  }
}
