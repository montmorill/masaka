import type { SatoriDriver } from './driver'
import { createLogger } from '@yarkjs/logger'
import * as Satori from '@yarkjs/protocol'
import { SatoriError } from './driver'
import { serialize } from './encoder'

const logger = createLogger('satori')

const ActionNames = [
  'message.create',
  'message.delete',
  'message.get',
  'message.list',
  'message.update',
  'channel.get',
  'channel.list',
  'channel.create',
  'channel.update',
  'channel.delete',
  'guild.get',
  'guild.list',
  'guild.member.get',
  'guild.member.list',
  'guild.member.kick',
  'guild.member.approve',
  'guild.member.role.set',
  'guild.member.role.unset',
  'guild.role.list',
  'guild.role.create',
  'guild.role.update',
  'guild.role.delete',
  'reaction.create',
  'reaction.delete',
  'reaction.clear',
  'user.get',
  'friend.list',
  'login.get',
  'internal',
] as const satisfies readonly Satori.Action[]
const SatoriActionSet = new Set<string>(ActionNames)

export interface SatoriServerOptions {
  /** 监听端口；0 为随机端口 */
  port?: number
  /** 可选鉴权 token，客户端在 Authorization: Bearer 或 IDENTIFY 中携带 */
  token?: string
}

/** Satori 服务端：HTTP POST /v1/{action} + WebSocket /v1/events（基于 Bun.serve，可承载多平台） */
export class SatoriServer {
  protected sessions = new Set<BunWebSocket>()
  protected ready = new WeakSet<BunWebSocket>()
  protected seq = 0

  protected constructor(
    public drivers: SatoriDriver[],
    public options: SatoriServerOptions = {},
    public inner: BunServer,
  ) {
    for (const driver of drivers) {
      for (const type of Satori.EventTypes)
        driver.on(type, event => this.broadcast(event as Satori.Event))
    }
  }

  static create(options: SatoriServerOptions = {}, ...drivers: SatoriDriver[]): SatoriServer {
    const server = new SatoriServer(drivers, options, undefined as unknown as BunServer)
    server.inner = Bun.serve({
      port: options.port,
      hostname: '127.0.0.1',
      fetch: (req, inner) => server.fetch(req, inner),
      websocket: {
        open: (ws) => {
          server.sessions.add(ws)
        },
        message: (ws, message) => {
          if (typeof message !== 'string')
            return
          server.onmessage(ws, JSON.parse(message) as Satori.Signal)
        },
        close: (ws) => {
          server.sessions.delete(ws)
        },
      },
    })
    return server
  }

  get port(): number {
    return this.inner.port
  }

  stop(): void {
    this.inner.stop()
  }

  protected async fetch(req: Request, inner: BunServer): Promise<Response | undefined> {
    const url = new URL(req.url)
    // WebSocket 升级：/v1/events
    if (url.pathname === '/v1/events' && req.headers.get('upgrade')?.toLowerCase() === 'websocket')
      return inner.upgrade(req) ? undefined : new Response('Upgrade failed', { status: 400 })

    // HTTP action 分发
    try {
      const match = /^\/v1\/([a-z.]+)$/.exec(url.pathname)
      if (req.method !== 'POST' || !match)
        return this.json(404, { code: Satori.ErrorCode.NOT_FOUND, message: 'NOT_FOUND' })
      const action = match[1] as Satori.Action
      if (!SatoriActionSet.has(action))
        return this.json(404, { code: Satori.ErrorCode.NOT_IMPLEMENTED, message: 'NOT_IMPLEMENTED' })
      if (this.options.token && req.headers.get('authorization') !== `Bearer ${this.options.token}`)
        return this.json(401, { code: Satori.ErrorCode.AUTH_FAILED, message: 'AUTH_FAILED' })
      const body = JSON.parse(await req.text()) as unknown
      // 兼容两种请求体：Request 信封 或 裸 params
      let params: unknown = body
      let channelId: string | undefined
      if (typeof body === 'object' && body !== null && typeof (body as Satori.Request).action === 'string') {
        const request = body as Satori.Request
        if (request.action !== action)
          throw new SatoriError(Satori.ErrorCode.BAD_REQUEST, 'action mismatch')
        params = request.params
        channelId = request.channel_id
      }
      let handler: SatoriDriver['actions'][Satori.Action] | undefined
      for (const driver of this.drivers) {
        handler = driver.actions[action]
        if (handler)
          break
      }
      if (!handler)
        return this.json(200, { code: Satori.ErrorCode.NOT_IMPLEMENTED, message: 'NOT_IMPLEMENTED' })
      const data = await handler(params as never, channelId)
      return this.json(200, { code: Satori.ErrorCode.OK, message: 'OK', data })
    }
    catch (error) {
      if (error instanceof SatoriError)
        return this.json(200, { code: error.code, message: error.message })
      logger.error(error)
      return this.json(200, { code: Satori.ErrorCode.INTERNAL_ERROR, message: 'INTERNAL_ERROR' })
    }
  }

  protected json(status: number, body: Satori.Response): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  protected broadcast(event: Satori.Event): void {
    const body: Satori.Event = { ...event, sn: ++this.seq }
    // 消息内容以元素树传输，推送前序列化为 Satori 内容串（wire 与内部类型不同，故用 unknown 承载）
    let wire: unknown = body
    if ('message' in body && body.message) {
      const { content } = body.message
      if (content !== undefined && typeof content !== 'string')
        wire = { ...body, message: { ...body.message, content: serialize(content) } }
    }
    for (const session of this.sessions) {
      if (!this.ready.has(session))
        continue
      session.send(JSON.stringify({ op: Satori.Op.Event, body: wire }))
    }
  }

  protected onmessage(connection: BunWebSocket, signal: Satori.Signal): void {
    switch (signal.op) {
      case Satori.Op.Identify: {
        const body = signal.body as Satori.IdentifySignal['body']
        if (this.options.token && body?.token !== this.options.token)
          return connection.close()
        this.ready.add(connection)
        connection.send(JSON.stringify({
          op: Satori.Op.Ready,
          body: { logins: this.drivers.map(driver => driver.getLogin()), proxy_urls: [] },
        } satisfies Satori.ReadySignal))
        break
      }
      case Satori.Op.Ping:
        connection.send(JSON.stringify({ op: Satori.Op.Pong, body: signal.body }))
        break
      default:
        logger.warn('unknown signal', signal)
    }
  }
}
