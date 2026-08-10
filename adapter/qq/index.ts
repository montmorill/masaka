/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */

import { env } from 'node:process'
import QQBot from './bot'
import * as QQ from './types'
import QQBotWS from './ws'

if (!env.QQ_APP_ID || !env.QQ_SECRET)
  throw new Error('QQ_APP_ID or QQ_SECRET is not provided')

const bot = await QQBot.create(env.QQ_APP_ID, env.QQ_SECRET)
const ws = await QQBotWS.create(bot, QQ.Intents.ALL)
ws.on('dispatch', console.log)
