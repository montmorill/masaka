import type { Element } from '@yak/element'
import type { Channel, Message, SendOptions } from '@yak/protocol'
import type { Context } from 'cordis'
import type { Bot } from './bot'

class AggregateError extends Error {
  constructor(public errors: Error[], message = '') {
    super(message)
  }
}

export abstract class MessageEncoder<C extends Context = Context, B extends Bot<C> = Bot<C>> {
  public errors: Error[] = []
  public results: Message[] = []
  public session!: C[typeof Context.session]

  constructor(public bot: B, public channelId: string, public referrer?: any, public options: SendOptions = {}) {}

  async prepare(): Promise<void> {}

  abstract flush(): Promise<void>
  abstract visit(element: Element): Promise<void>

  async render(content: Element, flush?: boolean): Promise<void> {
    if (content)
      await this.visit(content)
    if (flush) {
      await this.flush()
    }
  }

  async send(): Promise<Message[]> {
    this.session = this.bot.session({
      type: 'send',
      channel: { id: this.channelId, ...this.options.session?.event.channel } as Channel,
      guild: this.options.session?.event.guild,
    })
    for (const key in this.options.session || {}) {
      if (key === 'id' || key === 'event')
        continue
      // @ts-ignore
      this.session[key] = this.options.session[key]
    }
    await this.prepare()
    if (await this.session.app.serial(this.session, 'before-send', this.session, this.options))
      return []
    await this.flush()
    if (this.errors.length) {
      throw new AggregateError(this.errors)
    }
    else {
      return this.results
    }
  }
}
