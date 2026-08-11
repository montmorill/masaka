import type * as Universal from '@yarkjs/protocol'
import type QQBot from './bot'
import type * as QQ from './common'
import EventEmitter from 'node:events'

export class QQAdapter extends EventEmitter<Universal.EventMap> {
  constructor(
    public bot: QQBot,
    public emitter: EventEmitter<QQ.DispatchEventMap>,
  ) {
    super()
  }
}
