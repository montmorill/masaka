export default class QQBot {
  constructor(
    public appId: string,
    public clientSecret: string,
    public baseUrl = 'https://api.bot.qq.com',
  ) {}

  accessToken: string | null = null

  async refreshAccessToken(): Promise<void> {
    const res = await this.fetch<
      | { access_token: string, expires_in: `${number}` }
      | { code: 10004, message: '机器人不存在' }
      | { code: 100001, message: 'Too many requests' }
      | { code: 100002, message: 'internal err' }
      | { code: 100007, message: 'appid invalid' }
      | { code: 100016, message: 'invalid appid or secret' }
      | { code: number, message: string }
    >('/app/getAppAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: this.appId,
        clientSecret: this.clientSecret,
      }),
    })

    if ('message' in res)
      throw new Error(res.message)

    const expiresIn = (Number(res.expires_in) - 60) * 1000
    setTimeout(() => this.refreshAccessToken(), Math.max(expiresIn, 0))

    this.accessToken = res.access_token
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
      throw new Error(res.message)

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
