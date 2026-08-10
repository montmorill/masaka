export default class QQBot {
  private constructor(
    public appId: string,
    public secret: string,
    public baseUrl: string,
  ) {}

  accessToken!: string

  static async create(
    appId: string,
    secret: string,
    baseUrl = 'https://api.bot.qq.com',
  ): Promise<QQBot> {
    const bot = new QQBot(appId, secret, baseUrl)
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
        clientSecret: this.secret,
      }),
    })
    if ('message' in res)
      throw new Error(`${res.code}: ${res.message}`)
    this.accessToken = res.access_token

    const expiresIn = (Number(res.expires_in) - 60) * 1000
    setTimeout(() => this.refreshAccessToken(), Math.max(expiresIn, 0))
  }

  async fetch<T>(input: string | URL | Request, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (this.accessToken)
      headers.set('Authorization', `QQBot ${this.accessToken}`)
    if (typeof input === 'string' && input.startsWith('/'))
      input = new URL(input, this.baseUrl)
    init.headers = headers

    const resp = await fetch(input, init)
    const res = await resp.json() as
      | { err_code: number, message: string, trace_id: string }
    if ('err_code' in res)
      throw new Error(`${res.err_code}: ${res.message}`)
    return res
  }

  async gateway(): Promise<{ url: string }> { return await this.fetch('/gateway') }

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
