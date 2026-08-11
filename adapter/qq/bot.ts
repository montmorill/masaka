import type * as QQ from './common'
import { logger } from '@yarkjs/logger'

const GATEWAY_URL = 'wss://api.sgroup.qq.com/websocket'

export default class QQBot {
  private constructor(
    public appId: string,
    public appSecret: string,
    public baseUrl: string,
  ) {}

  accessToken!: string

  static async create(
    appId: string,
    appSecret: string,
    baseUrl = 'https://api.bot.qq.com',
  ): Promise<QQBot> {
    const bot = new QQBot(appId, appSecret, baseUrl)
    await bot.refreshAccessToken()
    return bot
  }

  private async refreshAccessToken(): Promise<void> {
    const res = await this.fetch<
      | { access_token: string, expires_in: `${number}` }
      | { code: number, message: string }
    >('/app/getAppAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: this.appId,
        clientSecret: this.appSecret,
      }),
    })
    if ('message' in res)
      throw new Error(`${res.code}: ${res.message}`)
    this.accessToken = res.access_token

    const expiresIn = (Number(res.expires_in) - 60) * 1000
    setTimeout(() => this.refreshAccessToken(), Math.max(expiresIn, 0))
  }

  async fetch<T extends object>(input: string | URL | Request, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (this.accessToken)
      headers.set('Authorization', `QQBot ${this.accessToken}`)
    if (typeof input === 'string' && input.startsWith('/'))
      input = new URL(input, this.baseUrl)
    init.headers = headers

    const resp = await fetch(input, init)
    const res = await resp.json() as QQ.Error | T
    if ('err_code' in res) {
      const message = `${res.err_code} ${res.message} trace_id: ${res.trace_id}`
      throw new Error(message, { cause: res })
    }
    return res
  }

  async gateway(): Promise<{ url: string }> {
    setTimeout(() => this.gateway())
    try {
      return await this.fetch('/gateway')
    }
    catch (error) {
      if (error instanceof Error && (error.cause as QQ.Error).err_code === 40023001)
        logger.warn('gateway', error.message, 'fallback to', GATEWAY_URL)
      return { url: GATEWAY_URL }
    }
  }

  async gatewayBot(): Promise<{
    url: string
    shards: number
    session_start_limit: {
      total: number
      remaining: number
      reset_after: number
      max_concurrency: number
    }
  }> { return await this.fetch('/gateway/bot') }
}
