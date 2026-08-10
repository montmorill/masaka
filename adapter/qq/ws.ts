import type QQBot from './bot'
import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import * as QQ from './types'

export type DispatchEventMap = {
  [T in keyof QQ.DispatchEvents as Lowercase<T>]: [data: QQ.DispatchEvents[T]]
} & {
  '*': {
    [T in keyof QQ.DispatchEvents]: [event: Lowercase<T>, data: QQ.DispatchEvents[T]]
  }[keyof QQ.DispatchEvents]
}

export default class QQBotWS extends EventEmitter<DispatchEventMap> {
  private seq: number | null = null

  readonly version!: 1
  readonly sessionId!: string
  readonly user!: QQ.User
  readonly shard!: QQ.Shard

  private constructor(
    public bot: QQBot,
    public intents: QQ.Intents,
    public inner: WebSocket,
  ) { super({ captureRejections: true }) }

  static async create(bot: QQBot, intents: QQ.Intents): Promise<QQBotWS> {
    const gateway = await bot.gateway()
    const ws = new QQBotWS(bot, intents, new WebSocket(gateway.url))
    ws.inner.onmessage = ws.onmessage.bind(ws)
    ws.inner.onerror = () => ws.reconnect()
    ws.inner.onclose = () => ws.reconnect()

    return Object.assign(ws, await new Promise((resolve) => {
      ws.once('ready', (payload) => {
        assert(payload.version === 1)
        resolve(payload)
      })
    }))
  }

  async reconnect(): Promise<void> {
    this.inner.close()
    const gateway = await this.bot.gateway()
    this.inner = new WebSocket(gateway.url)
    this.inner.onmessage = this.onmessage.bind(this)
    this.inner.onerror = () => this.reconnect()
    this.inner.onclose = () => this.reconnect()
    this.inner.onopen = () => this.send(QQ.OpCode.Resume, {
      token: this.bot.accessToken!,
      session_id: this.sessionId,
      seq: this.seq!,
    })
    await new Promise(resolve => this.once('resumed', resolve))
  }

  onmessage(event: MessageEvent): void {
    const payload: QQ.Payload = JSON.parse(event.data)
    if (payload.s)
      this.seq = payload.s
    switch (payload.op) {
      /* eslint-disable style/max-statements-per-line */
      case QQ.OpCode.Dispatch: this.dispatch(payload); break
      case QQ.OpCode.Reconnect: this.reconnect(); break
      case QQ.OpCode.Hello: this.hello(payload.d.heartbeat_interval); break
      case QQ.OpCode.HeartbeatAck: break
      default: console.warn('unknown payload', payload); break
      /* eslint-enable style/max-statements-per-line */
    }
  }

  dispatch(payload: QQ.Payload<QQ.OpCode.Dispatch>): void {
    const type = payload.t.toLowerCase()
    this.emit('*', type as any, payload.d)
    this.emit(type, payload.d)
  }

  async hello(interval: number): Promise<void> {
    setInterval(() => this.send(QQ.OpCode.Heartbeat, this.seq), interval)
    this.send(QQ.OpCode.Identify, {
      token: `QQBot ${this.bot.accessToken}`,
      intents: this.intents,
      shard: [0, 1],
    })
  }

  async send<Op extends keyof QQ.PayloadData>(
    op: Op,
    d: QQ.PayloadData[Op],
  ): Promise<void> {
    this.inner.send(JSON.stringify({ op, d }))
  }
}
