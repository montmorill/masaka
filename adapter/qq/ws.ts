import type QQBot from './bot'
import type * as QQ from './common'
import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import { logger } from '@yarkjs/logger'

export enum OpCode {
  /** 服务端进行消息推送 */ Dispatch = 0,
  /** 客户端或服务端发送心跳 */ Heartbeat = 1,
  /** 客户端发送鉴权 */ Identify = 2,
  /** 客户端恢复连接 */ Resume = 6,
  /** 服务端通知客户端重新连接 */ Reconnect = 7,
  /** Identify 或 Resume 参数错误 */ InvalidSession = 9,
  /** 服务端下发的第一条消息 */ Hello = 10,
  /** 当发送心跳成功之后，就会收到该消息 */ HeartbeatAck = 11,
}

export namespace OpCode {
  export function toString(op: OpCode): string {
    return {
      [OpCode.Dispatch]: 'Dispatch',
      [OpCode.Heartbeat]: 'Heartbeat',
      [OpCode.Identify]: 'Identify',
      [OpCode.Resume]: 'Resume',
      [OpCode.Reconnect]: 'Reconnect',
      [OpCode.InvalidSession]: 'InvalidSession',
      [OpCode.Hello]: 'Hello',
      [OpCode.HeartbeatAck]: 'HeartbeatAck',
    }[op]
  }
}

export interface PayloadData {
  [OpCode.Dispatch]: QQ.DispatchPayload
  [OpCode.Heartbeat]: number | null
  [OpCode.Identify]: {
    token: QQ.AccessToken
    intents: QQ.Intents
    shard?: QQ.Shard
    properties?: Record<string, any>
  }
  [OpCode.Reconnect]: { d: never }
  [OpCode.Resume]: {
    token: QQ.AccessToken
    session_id: string
    seq: number
  }
  [OpCode.InvalidSession]: false
  [OpCode.Hello]: { heartbeat_interval: number }
  [OpCode.HeartbeatAck]: { d: never }
}

export type MaybePayloadData<Op extends keyof PayloadData = keyof PayloadData> =
  { d: never } extends PayloadData[Op] ? [] : [PayloadData[Op]]

export type Payload<Op extends keyof PayloadData = keyof PayloadData> = {
  [Op in keyof PayloadData]: 'd' extends keyof PayloadData[Op]
    ? { op: Op } & PayloadData[Op]
    : { op: Op, d: PayloadData[Op] }
}[Op] & { s?: number }

export default class QQBotWS extends EventEmitter<QQ.DispatchEventMap & {
  HELLO: [interval: number]
  READY: [data: {
    version: 1
    session_id: string
    user: QQ.User
    shard: QQ.Shard
  }]
  RESUMED: [data: '']
}> {
  private constructor(
    public bot: QQBot,
    public intents: QQ.Intents,
    public inner: WebSocket,
  ) { super() }

  private seq: number | null = null
  private heartbeatTimeout?: NodeJS.Timeout

  readonly version!: 1
  readonly sessionId!: string
  readonly user!: QQ.User
  readonly shard!: QQ.Shard

  private setup(hello: () => void): void {
    this.inner.onmessage = event => this.onmessage(event)
    this.inner.onclose = () => this.reconnect()
    this.once('HELLO', (interval) => {
      this.heartbeatTimeout = setInterval(() => {
        this.send(OpCode.Heartbeat, this.seq)
      }, interval)
      hello()
    })
  }

  static async create(bot: QQBot, intents: QQ.Intents): Promise<QQBotWS> {
    const gateway = await bot.gateway()
    const ws = new QQBotWS(bot, intents, new WebSocket(gateway.url))
    ws.setup(() => ws.send(OpCode.Identify, {
      token: `QQBot ${bot.accessToken}`,
      intents,
      shard: [0, 1],
    }))

    return Object.assign(ws, await new Promise((resolve) => {
      ws.once('READY', (payload) => {
        assert(payload.version === 1)
        ;(payload as unknown as { sessionId: string })
          .sessionId = payload.session_id
        delete (payload as { session_id?: string }).session_id
        resolve(payload)
      })
    }))
  }

  async reconnect(): Promise<void> {
    this.inner.onclose = null
    this.inner.close()
    clearTimeout(this.heartbeatTimeout)
    const gateway = await this.bot.gateway()
    this.inner = new WebSocket(gateway.url)
    this.setup(() => this.send(OpCode.Resume, {
      token: `QQBot ${this.bot.accessToken}`,
      session_id: this.sessionId,
      seq: this.seq!,
    }))
    await new Promise(resolve => this.once('resumed', resolve))
  }

  onmessage(event: MessageEvent): void {
    const payload: Payload = JSON.parse(event.data)
    if (payload.s)
      this.seq = payload.s
    payload.d !== undefined && logger.log(
      'recv',
      OpCode.toString(payload.op),
      ...payload.op === OpCode.Dispatch ? [payload.t] : [],
      payload.d,
    )
    switch (payload.op) {
      /* eslint-disable style/max-statements-per-line */
      case OpCode.Dispatch: this.emit(payload.t, payload.d); break
      case OpCode.Heartbeat: this.send(OpCode.HeartbeatAck); break
      case OpCode.InvalidSession: throw new Error('invalid session')
      case OpCode.Hello: this.emit('HELLO', payload.d.heartbeat_interval); break
      case OpCode.HeartbeatAck: break
      default: console.warn('unknown payload', payload); break
        /* eslint-enable style/max-statements-per-line */
    }
  }

  send<Op extends keyof PayloadData>(op: Op, ...[d]: MaybePayloadData<Op>): void {
    if (d === undefined)
      return this.inner.send(JSON.stringify({ op }))
    if (op !== OpCode.Heartbeat)
      logger.log('send', OpCode.toString(op), d)
    this.inner.send(JSON.stringify({ op, d }))
  }
}
