import type QQBot from './bot'
import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import * as QQ from './types'

export type DispatchEventMap = {
  [T in keyof QQ.DispatchEvents as Lowercase<T>]: [data: QQ.DispatchEvents[T]]
}

export default class QQBotWS extends EventEmitter<DispatchEventMap> {
  private serial: number | null = null

  readonly version!: 1
  readonly sessionId!: string
  readonly user!: QQ.User
  readonly shard!: QQ.Shard

  static async connect(bot: QQBot): Promise<QQBotWS> {
    const gateway = await bot.gatewayBot()
    const ws = new QQBotWS(bot, new WebSocket(gateway.url))

    ws.inner.onmessage = (event) => {
      const payload: QQ.Payload = JSON.parse(event.data)
      if (payload.s)
        ws.serial = payload.s
      switch (payload.op) {
        case QQ.OpCode.Dispatch:
          ws.emit('dispatch', payload)
          ws.emit(payload.t.toLowerCase(), payload.d)
          break

        case QQ.OpCode.Hello:
          setInterval(
            () => ws.send(QQ.OpCode.Heartbeat, ws.serial),
            payload.d.heartbeat_interval,
          )
          ws.send(QQ.OpCode.Identify, {
            token: `QQBot ${bot.accessToken}`,
            intents: QQ.Intents.ALL,
            shard: [0, 1],
          })
          break

        case QQ.OpCode.HeartbeatAck:
          break

        default:
          console.warn('unknown payload', payload)
          break
      }
    }

    return Object.assign(ws, await new Promise((resolve) => {
      ws.once('ready', (payload) => {
        assert(payload.version === 1)
        resolve(payload)
      })
    }))
  }

  constructor(public bot: QQBot, public inner: WebSocket) {
    super({ captureRejections: true })
  }

  async send<Op extends keyof QQ.PayloadData>(
    op: Op,
    d: QQ.PayloadData[Op],
  ): Promise<void> {
    this.inner.send(JSON.stringify({ op, d }))
  }
}
