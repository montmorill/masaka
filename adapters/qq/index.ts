/* eslint-disable antfu/no-top-level-await */

import type EventEmitter from 'node:events'
import { env } from 'node:process'
import { Formatter } from '@yarkjs/element'
import { createLogger } from '@yarkjs/logger'
import { noop } from '@yarkjs/utils'
import { QQAdapter } from './adapter'
import { QQBot } from './bot'
import * as QQ from './common'
import { QQMessageEncoder } from './encoder'
import { QQBotServer } from './webhook'
import { QQBotWS } from './websocket'

const logger = createLogger('qq')

Formatter.defaultOptions.explicitTrue = true
Formatter.defaultOptions.explicitString = true

logger.debug = noop

if (!env.QQ_APP_ID || !env.QQ_APP_SECRET)
  throw new Error('QQ_APP_ID or QQ_APP_SECRET is not provided')

const bot = await QQBot.create(env.QQ_APP_ID, env.QQ_APP_SECRET)
logger.info('bot connected', bot.appId)

let emitter: EventEmitter<QQ.DispatchEventMap>

if (env.QQ_SERVER_PORT) {
  const port = Number(env.QQ_SERVER_PORT)
  const server = await QQBotServer.create(bot)
  await new Promise<void>(resolve => server.listen(port, resolve))
  logger.info('server listening on port', port)
  emitter = server.emitter
}
else {
  const ws = await QQBotWS.create(bot, QQ.Intents.ALL)
  logger.info('websocket connected', ws.sessionId)
  emitter = ws
}

const adapter = new QQAdapter(bot, emitter)

adapter.on('message-created', (event) => {
  logger.info(event)
  const composer = new QQMessageEncoder(bot, event.channel.id, QQ.Scene.Group)
  event.message.element && composer.visit(event.message.element)
  composer.flush({ msg_id: event.message.id as QQ.MessageId })
})
