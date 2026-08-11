/* eslint-disable antfu/no-top-level-await */

import { env } from 'node:process'
import { logger } from '@yarkjs/logger'
import { noop } from '@yarkjs/utils'
import QQBot from './bot'
import * as QQ from './common'
import QQBotWS from './websocket'

logger.debug = noop

if (!env.QQ_APP_ID || !env.QQ_APP_SECRET)
  throw new Error('QQ_APP_ID or QQ_APP_SECRET is not provided')

const bot = await QQBot.create(env.QQ_APP_ID, env.QQ_APP_SECRET)
logger.info('bot connected', bot.appId)

const ws = await QQBotWS.create(bot, QQ.Intents.ALL)
logger.info('websocket connected', ws.sessionId)
