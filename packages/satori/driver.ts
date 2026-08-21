import type { EventEmitter } from 'node:events'
import * as Satori from '@yarkjs/protocol'

/** 平台适配器需要实现的 Satori 驱动 */
export interface SatoriDriver extends EventEmitter<Satori.EventMap> {
  /** 平台标识，如 'qq' */
  platform: string
  /** 机器人自身 id */
  selfId: string
  /** 当前登录信息（READY 下发） */
  getLogin(): Satori.Login
  /** 各 action 的实现；未实现的 action 不注册，服务端返回 NOT_IMPLEMENTED */
  actions: Partial<{
    [A in Satori.Action]: (
      params: Satori.ActionMap[A]['params'],
      channelId?: string,
    ) => Promise<Satori.ActionMap[A]['data'] | void>
  }>
}

export class SatoriError extends Error {
  constructor(
    public code: Satori.ErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export const notImplemented = (): SatoriError => new SatoriError(Satori.ErrorCode.NOT_IMPLEMENTED, 'NOT_IMPLEMENTED')
export const badRequest = (message = 'BAD_REQUEST'): SatoriError => new SatoriError(Satori.ErrorCode.BAD_REQUEST, message)
export const notFound = (message = 'NOT_FOUND'): SatoriError => new SatoriError(Satori.ErrorCode.NOT_FOUND, message)
