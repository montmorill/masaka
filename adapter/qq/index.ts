/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */

import { env } from 'node:process'
import QQBot from './bot'
import QQBotWS from './ws'

if (!env.QQ_APP_ID || !env.QQ_SECRET)
  throw new Error('QQ_APP_ID or QQ_SECRET is not provided')

const bot = new QQBot(env.QQ_APP_ID, env.QQ_SECRET)
await bot.refreshAccessToken()
const ws = await QQBotWS.connect(bot)
ws.on('dispatch', console.log)
