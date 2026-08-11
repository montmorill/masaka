import type { IncomingHttpHeaders } from 'node:http'
import type * as QQ from './common'
import { Buffer } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import EventEmitter from 'node:events'
import { Server } from 'node:http'
import { env } from 'node:process'
import { buffer } from 'node:stream/consumers'
import { logger } from '@yarkjs/logger'
import QQBot from './bot'

const ED25519_SEED_SIZE = 32
const ED25519_PKCS8_HEADER = Buffer.from('302e020100300506032b657004220420', 'hex')

async function deriveKeyPair(seedBuffer: Buffer): Promise<webcrypto.CryptoKeyPair> {
  while (seedBuffer.length < ED25519_SEED_SIZE)
    seedBuffer = Buffer.concat([seedBuffer, seedBuffer])
  seedBuffer = seedBuffer.subarray(0, ED25519_SEED_SIZE)
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_HEADER, seedBuffer])
  const privateKey = await webcrypto.subtle
    .importKey('pkcs8', pkcs8Der, { name: 'Ed25519' }, true, ['sign'])
  const { kty, crv, x } = await webcrypto.subtle.exportKey('jwk', privateKey)
  const publicKey = await webcrypto.subtle
    .importKey('jwk', { kty, crv, x }, { name: 'Ed25519' }, false, ['verify'])
  return { privateKey, publicKey }
}

class QQBotServer extends Server {
  emitter: EventEmitter<QQ.DispatchEventMap> = new EventEmitter()

  static async create(bot: QQBot): Promise<QQBotServer> {
    return new QQBotServer(bot, await deriveKeyPair(Buffer.from(bot.appSecret)))
  }

  private constructor(
    public bot: QQBot,
    public keyPair: webcrypto.CryptoKeyPair,
  ) {
    super(async (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      try {
        const body = await buffer(req)
        if (!await this.verify(req.headers, body)) {
          res.writeHead(401, 'Unauthorized')
          res.end(JSON.stringify({ message: 'Invalid signature' }))
          return
        }
        const payload = JSON.parse(body.toString('utf-8'))
        if (payload.op === 13) {
          if (req.headers['user-agent'] !== 'QQBot-Callback')
            throw new Error('Invalid User-Agent')
          if (req.headers['x-signature-method'] !== 'Ed25519')
            throw new Error('Invalid signature method')
          const { plain_token, event_ts } = payload.d
          const signature = await this.sign(Buffer.from(event_ts + plain_token))
          res.statusCode = 200
          res.end(JSON.stringify({ plain_token, signature }))
        }
        else if (payload.op === 0) {
          res.statusCode = 204
          res.end()
          this.emitter.emit(payload.t, payload.d)
        }
      }
      catch (err) {
        res.writeHead(400, 'Bad Request')
        if (err instanceof Error)
          res.end(JSON.stringify({ message: err.message }))
        else res.end('null')
      }
    })
  }

  async sign(message: Buffer<ArrayBuffer>): Promise<string> {
    const signature = await webcrypto.subtle
      .sign({ name: 'Ed25519' }, this.keyPair.privateKey, message)
    return Buffer.from(signature).toString('hex')
  }

  async verify(headers: IncomingHttpHeaders, body: Buffer): Promise<boolean> {
    const signature = headers['x-signature-ed25519'] as string
    const timestamp = headers['x-signature-timestamp'] as string
    if (!signature || !timestamp)
      return false
    const sig = Buffer.from(signature, 'hex')
    if (sig.length !== 64)
      return false
    const msg = Buffer.concat([Buffer.from(timestamp), body])
    return await webcrypto.subtle
      .verify({ name: 'Ed25519' }, this.keyPair.publicKey, sig, msg)
  }
}

if (!env.QQ_APP_ID || !env.QQ_APP_SECRET) {
  throw new Error('QQ_APP_ID or QQ_APP_SECRET is not provided')
}

// eslint-disable-next-line antfu/no-top-level-await
const bot = await QQBot.create(env.QQ_APP_ID, env.QQ_APP_SECRET)
logger.info('bot connected', bot.appId)

// eslint-disable-next-line antfu/no-top-level-await
const server = await QQBotServer.create(bot)
server.listen(8081, () => logger.info('HTTP server running on port 8081'))
