import type * as QQ from './common'
import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { Server } from 'node:http'
import { env } from 'node:process'
import { buffer } from 'node:stream/consumers'
import { logger } from '@yarkjs/logger'
import nacl from 'tweetnacl'
import QQBot from './bot'

class QQBotServer extends Server {
  emitter: EventEmitter<QQ.DispatchEventMap> = new EventEmitter()

  constructor(public bot: QQBot) {
    super(async (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      try {
        const body = await buffer(req)
        const payload = JSON.parse(body.toString('utf-8'))

        if (payload.op === 13) {
          if (req.headers['user-agent'] !== 'QQBot-Callback')
            throw new Error('Invalid User-Agent')
          if (req.headers['x-signature-method'] !== 'Ed25519')
            throw new Error('Invalid signature method')
          const { plain_token, event_ts } = payload.d
          const signature = await this.sign(event_ts + plain_token)
          res.statusCode = 200
          res.end(JSON.stringify({ plain_token, signature }))
        }
        else {
          res.statusCode = 204
          res.end()
          this.emitter.emit(payload.t, payload.d)
        }
      }
      catch (err) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Bad Request' }))
        logger.error(err)
      }
    })
  }

  async sign(message: string): Promise<string> {
    let seed = Buffer.from(this.bot.appSecret, 'utf-8')
    while (seed.length < 32)
      seed = Buffer.concat([seed, seed])
    const { secretKey } = nacl.sign.keyPair.fromSeed(seed.subarray(0, 32))
    const signature = nacl.sign.detached(Buffer.from(message, 'utf-8'), secretKey)
    return Buffer.from(signature).toString('hex')
  }
}

if (!env.QQ_APP_ID || !env.QQ_APP_SECRET) {
  throw new Error('QQ_APP_ID or QQ_APP_SECRET is not provided')
}

// eslint-disable-next-line antfu/no-top-level-await
const bot = await QQBot.create(env.QQ_APP_ID, env.QQ_APP_SECRET)
logger.info('bot connected', bot.appId)
const server = new QQBotServer(bot)
server.listen(8080, () => logger.info('server started', bot.appId))
