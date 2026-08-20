import type { QQBot } from './bot'
import { EventEmitter } from 'node:events'
import { createLogger } from '@yarkjs/logger'
import * as QQ from './common'

const logger = createLogger('qq')

export class QQBotWS extends EventEmitter<QQ.DispatchEventMap & {
  HELLO: [interval: number]
  READY: [data: {
    version: 1
    session_id: string
    user: QQ.User
    shard: QQ.Shard
  }]
  RESUMED: [data: '']
}> {
  protected constructor(
    public bot: QQBot,
    public intents: QQ.Intents,
    public inner: WebSocket,
  ) { super() }

  readonly version!: 1
  readonly sessionId!: string
  readonly user!: QQ.User
  readonly shard!: QQ.Shard

  protected seq: number | null = null
  protected heartbeatTimeout?: NodeJS.Timeout

  protected setup(hello: () => void): void {
    this.inner.onmessage = event => this.onmessage(event)
    this.inner.onclose = () => {
      logger.debug('connection closed')
      this.reconnect()
    }
    this.once('HELLO', (interval) => {
      this.heartbeatTimeout = setInterval(() => {
        this.send(QQ.OpCode.Heartbeat, this.seq)
      }, interval)
      hello()
    })
  }

  static async create(bot: QQBot, intents: QQ.Intents): Promise<QQBotWS> {
    const gateway = await bot.gateway()
    const ws = new QQBotWS(bot, intents, new WebSocket(gateway.url))
    ws.setup(() => ws.send(QQ.OpCode.Identify, {
      token: `QQBot ${bot.accessToken}`,
      intents,
      shard: [0, 1],
    }))

    return Object.assign(ws, await new Promise((resolve) => {
      ws.once('READY', (payload) => {
        if (payload.version !== 1)
          throw new Error('unsupported version', payload.version)
        const sessionId = payload.session_id
        delete (payload as { session_id?: string }).session_id
        resolve({ ...payload, sessionId })
      })
    }))
  }

  canReconnect = true
  async reconnect(): Promise<void> {
    if (!this.canReconnect)
      return
    this.canReconnect = false
    this.inner.close()
    clearTimeout(this.heartbeatTimeout)
    logger.debug('reconnecting...')
    const gateway = await this.bot.gateway()
    this.inner = new WebSocket(gateway.url)
    this.setup(() => this.send(QQ.OpCode.Resume, {
      token: `QQBot ${this.bot.accessToken}`,
      session_id: this.sessionId,
      seq: this.seq!,
    }))
    await new Promise(resolve => this.once('RESUMED', resolve))
    logger.debug('session resumed')
    this.canReconnect = true
  }

  onmessage(event: MessageEvent): void {
    const payload: QQ.Payload = JSON.parse(event.data)
    if (payload.s)
      this.seq = payload.s
    payload.d !== undefined && logger.debug(
      'recv',
      QQ.OpCode.toString(payload.op),
      ...payload.op === QQ.OpCode.Dispatch ? [payload.t] : [],
      payload.d,
    )
    switch (payload.op) {
      /* eslint-disable style/max-statements-per-line */
      case QQ.OpCode.Dispatch: this.emit(payload.t, payload.d, payload.id as any); break
      case QQ.OpCode.Heartbeat: this.send(QQ.OpCode.HeartbeatAck); break
      case QQ.OpCode.Reconnect: logger.debug('server request reconnect'); this.reconnect(); break
      case QQ.OpCode.InvalidSession: this.canReconnect = false; throw new Error('invalid session')
      case QQ.OpCode.Hello: this.emit('HELLO', payload.d.heartbeat_interval); break
      case QQ.OpCode.HeartbeatAck: break
      default: logger.warn('unknown payload', payload); break
        /* eslint-enable style/max-statements-per-line */
    }
  }

  send<Op extends keyof QQ.PayloadData>(
    op: Op,
    ...[d]: { d: never } extends QQ.PayloadData[Op] ? [] : [QQ.PayloadData[Op]]
  ): void {
    if (d === undefined)
      return this.inner.send(JSON.stringify({ op }))
    if (op !== QQ.OpCode.Heartbeat)
      logger.debug('send', QQ.OpCode.toString(op), d)
    this.inner.send(JSON.stringify({ op, d }))
  }
}
