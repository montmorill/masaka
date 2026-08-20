/* eslint-disable antfu/no-top-level-await */

import { env } from 'node:process'
import { inspect } from 'node:util'
import { Formatter } from '@yarkjs/element'
import { createLogger } from '@yarkjs/logger'
import { noop } from '@yarkjs/utils'
import { QQAdapter } from './adapter'
import { QQBot } from './bot'
import * as QQ from './common'
import { QQBotServer } from './webhook'
import { QQBotWS } from './websocket'

const logger = createLogger('qq')

inspect.defaultOptions.compact = 4
inspect.defaultOptions.numericSeparator = true
Formatter.defaultOptions.explicitTrue = true
Formatter.defaultOptions.explicitString = true

logger.debug = noop

if (!env.QQ_APP_ID || !env.QQ_APP_SECRET)
  throw new Error('QQ_APP_ID or QQ_APP_SECRET is not provided')

const bot = await QQBot.create(env.QQ_APP_ID, env.QQ_APP_SECRET)
logger.info('bot connected', bot.appId)

let adapter: QQAdapter

if (env.QQ_SERVER_PORT) {
  const port = Number(env.QQ_SERVER_PORT)
  const server = await QQBotServer.create(bot)
  await new Promise<void>(resolve => server.listen(port, resolve))
  logger.info('server listening on port', port)
  adapter = new QQAdapter(bot, server.emitter)
}
else {
  const ws = await QQBotWS.create(bot, QQ.Intents.ALL)
  logger.info('websocket connected', ws.sessionId)
  adapter = new QQAdapter(bot, ws)
}

adapter.on('message', logger.info)
