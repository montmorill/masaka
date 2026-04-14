import type { Element } from '@yak/element'
import type { Event, GuildMember, Message, User } from '@yak/protocol'
import type { Bot } from './bot'
import { Channel } from '@yak/protocol'
import { Context, Service } from 'cordis'
import { clone, defineProperty } from 'cosmokit'

declare module '@yak/protocol' {
  interface SendOptions {
    session?: Session
  }
}

export interface Session {
  type: string
  selfId: string
  platform: string
  timestamp: number
  userId?: string
  channelId?: string
  guildId?: string
  messageId?: string
  operatorId?: string
  roleId?: string
  quote?: Message
  referrer: any
}

export class Session<C extends Context = Context> {
  public [Service.tracker] = {
    associate: 'session',
    property: 'ctx',
  }

  public sn: number
  public bot!: Bot<C>
  public app!: C['root']
  public event: Event
  public locales: string[] = []

  constructor(bot: Bot<C>, event: Partial<Event>) {
    event.selfId ??= bot.selfId
    event.platform ??= bot.platform
    event.timestamp ??= Date.now()
    this.event = event as Event
    this.sn = ++bot.ctx.satori._sessionSeq
    defineProperty(this, 'bot', bot)
    defineProperty(this, 'app', bot.ctx.root)
    defineProperty(this, Context.current, bot.ctx)
    return Context.associate(this, 'session')
  }

  get isDirect(): boolean {
    return this.event.channel?.type === Channel.Type.DIRECT
  }

  set isDirect(value: boolean) {
    (this.event.channel ??= {} as Channel).type = value ? Channel.Type.DIRECT : Channel.Type.TEXT
  }

  get author(): Partial<User & GuildMember> {
    return {
      ...this.event.user,
      ...this.event.member,
    }
  }

  get uid(): string {
    return `${this.platform}:${this.userId}`
  }

  get gid(): string {
    return `${this.platform}:${this.guildId}`
  }

  get cid(): string {
    return `${this.platform}:${this.channelId}`
  }

  get fid(): string {
    return `${this.platform}:${this.channelId}:${this.userId}`
  }

  get sid(): string {
    return `${this.platform}:${this.selfId}`
  }

  get element(): Element | undefined {
    return this.event.message?.element
  }

  set element(value: Element | undefined) {
    this.event.message ??= {}
    this.event.message.element = value
  }

  // get content(): string | undefined {
  //   return this.event.message?.elements?.join('')
  // }

  // set content(value: string | undefined) {
  //   this.event.message ??= {}
  //   this.event.message.quote = undefined
  //   this.event.message.elements = isNullable(value) ? value : h.parse(value)
  //   if (this.event.message.elements?.[0]?.type === 'quote') {
  //     const el = this.event.message.elements.shift()!
  //     this.event.message.quote = Resource.decode(el)
  //   }
  // }

  setInternal(type: string, data: any): void {
    this.event._type = type
    this.event._data = data
    const internal = Object.create(this.bot.internal)
    defineProperty(this, type, Object.assign(internal, data))
  }

  // async transform(elements: Element[]): Promise<Element[]> {
  //   return await h.transformAsync(elements, async ({ type, attrs, children }, session) => {
  //     const render = type === 'component' ? attrs.is : this.app.get(`component:${type}`)
  //     if (!render)
  //       return true
  //     children = await render(attrs, children, session)
  //     return this.transform(children)
  //   }, this)
  // }

  toJSON(): Event {
    const event: Event = {
      ...clone(this.event),
      sn: this.sn,
      login: this.bot.toJSON(),
    }
    // if (event.message?.elements) {
    //   event.message.content = this.content
    //   delete event.message.elements
    //   // if (event.message.quote) {
    //   //   event.message.content = Resource.encode('quote', event.message.quote) + event.message.content!
    //   // }
    // }
    return event
  }
}

export function defineAccessor(prototype: object, name: string, path: string): void {
  const keys = path.split('.')
  Object.defineProperty(prototype, name, {
    get() {
      return keys.reduce((data, key) => data?.[key], this)
    },
    set(value) {
      const _keys = keys.slice()
      const last = _keys.pop()!
      const data = _keys.reduce((data, key) => data[key] ??= {}, this)
      data[last] = value
    },
  })
}

defineAccessor(Session.prototype, 'type', 'event.type')
defineAccessor(Session.prototype, 'subtype', 'event.subtype')
defineAccessor(Session.prototype, 'selfId', 'event.selfId')
defineAccessor(Session.prototype, 'platform', 'event.platform')
defineAccessor(Session.prototype, 'timestamp', 'event.timestamp')
defineAccessor(Session.prototype, 'userId', 'event.user.id')
defineAccessor(Session.prototype, 'channelId', 'event.channel.id')
defineAccessor(Session.prototype, 'channelName', 'event.channel.name')
defineAccessor(Session.prototype, 'guildId', 'event.guild.id')
defineAccessor(Session.prototype, 'guildName', 'event.guild.name')
defineAccessor(Session.prototype, 'messageId', 'event.message.id')
defineAccessor(Session.prototype, 'operatorId', 'event.operator.id')
defineAccessor(Session.prototype, 'roleId', 'event.role.id')
defineAccessor(Session.prototype, 'quote', 'event.message.quote')
defineAccessor(Session.prototype, 'referrer', 'event.referrer')
