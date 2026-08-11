import type { IncomingHttpHeaders } from 'node:http'
import type QQBot from './bot'
import { Buffer } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import EventEmitter from 'node:events'
import { Server } from 'node:http'
import { buffer } from 'node:stream/consumers'
import { logger } from '@yarkjs/logger'
import * as QQ from './common'

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

export class QQBotServer extends Server {
  emitter: EventEmitter<QQ.DispatchEventMap> = new EventEmitter()

  static async create(bot: QQBot): Promise<QQBotServer> {
    return new QQBotServer(bot, await deriveKeyPair(Buffer.from(bot.appSecret)))
  }

  private constructor(
    public bot: QQBot,
    public keyPair: webcrypto.CryptoKeyPair,
  ) {
    super(async (req, res) => {
      try {
        const body = await buffer(req)
        if (!await this.verify(req.headers, body)) {
          res.statusCode = 401
          res.end()
          return
        }
        const payload: QQ.Payload = JSON.parse(body.toString('utf-8'))
        if (payload.op === QQ.OpCode.Dispatch) {
          res.statusCode = 204
          this.emitter.emit(payload.t, payload.d, payload.id as any)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ op: QQ.OpCode.CallbackAck }))
        }
        else if (payload.op === QQ.OpCode.CallbackVerify) {
          const { plain_token, event_ts } = payload.d
          const signature = await this.sign(Buffer.from(event_ts + plain_token))
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ plain_token, signature }))
        }
        else {
          logger.warn('unknown payload', payload)
        }
      }
      catch (err) {
        res.statusCode = 400
        res.end()
        logger.error(err)
      }
    })
  }

  async sign(message: Buffer<ArrayBuffer>): Promise<string> {
    const signature = await webcrypto.subtle
      .sign({ name: 'Ed25519' }, this.keyPair.privateKey, message)
    return Buffer.from(signature).toString('hex')
  }

  async verify(headers: IncomingHttpHeaders, body: Buffer): Promise<boolean> {
    const signature = headers['x-signature-ed25519']
    const timestamp = headers['x-signature-timestamp']
    if (headers['user-agent'] !== 'QQBot-Callback'
      || headers['x-signature-method'] !== 'Ed25519'
      || typeof signature !== 'string'
      || typeof timestamp !== 'string') {
      return false
    }
    const sig = Buffer.from(signature, 'hex')
    if (sig.length !== 64)
      return false
    const msg = Buffer.concat([Buffer.from(timestamp), body])
    return await webcrypto.subtle
      .verify({ name: 'Ed25519' }, this.keyPair.publicKey, sig, msg)
  }
}
