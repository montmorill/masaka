import type { SatoriDriver } from '@yarkjs/satori'
import type { QQBot } from './bot'
import h, { Element } from '@yarkjs/element'
import * as Satori from '@yarkjs/protocol'
import { serialize } from '@yarkjs/satori'
import * as QQ from './common'

/** 观察到的 channel id → 场景（由适配器维护，供 action 消歧） */
export type ChannelScenes = Map<string, 'group' | 'guild'>

/** QQ 频道类型 → Satori 频道类型 */
export function mapChannelType(type: number): Satori.ChannelType {
  if (type === 2 || type === 3)
    return Satori.ChannelType.Voice
  if (type === 4)
    return Satori.ChannelType.Category
  return Satori.ChannelType.Text
}

export function mapGuildChannel(channel: QQ.Channel): Satori.Channel {
  return {
    id: channel.id,
    type: mapChannelType(channel.type),
    name: channel.name,
    parent_id: channel.parent_id,
  }
}

export function parseGuildUser(user: QQ.GuildUser): Satori.User {
  return {
    id: user.id,
    name: user.username,
    avatar: user.avatar,
    is_bot: user.bot,
  }
}

export function mapGuildMember(member: QQ.GuildMember): Satori.GuildMember {
  return {
    user: parseGuildUser(member.user),
    nick: member.nick,
    joined_at: Date.parse(member.joined_at),
    roles: member.roles.map(id => ({ id })),
  }
}

export function parseGuild(guild: QQ.GuildEvent): Satori.Guild {
  return {
    id: guild.id,
    name: guild.name,
    avatar: guild.icon,
  }
}

export function parseGuildCreate(event: QQ.GuildEvent): Satori.EventBody<'guild-added'> {
  return { guild: parseGuild(event), operator: { id: event.op_user_id } }
}

export function parseGuildUpdate(event: QQ.GuildEvent): Satori.EventBody<'guild-updated'> {
  return { guild: parseGuild(event), operator: { id: event.op_user_id } }
}

export function parseGuildDelete(event: QQ.GuildEvent): Satori.EventBody<'guild-removed'> {
  return { guild: parseGuild(event), operator: { id: event.op_user_id } }
}

export function parseGuildMember(event: QQ.GuildMemberEvent): Satori.GuildMember {
  return {
    user: parseGuildUser(event.user),
    nick: event.nick,
    joined_at: Date.parse(event.joined_at),
    roles: event.roles.map(id => ({ id })),
  }
}

export function parseGuildMemberAdd(event: QQ.GuildMemberEvent): Satori.EventBody<'guild-member-added'> {
  return { guild: { id: event.guild_id }, member: parseGuildMember(event), operator: { id: event.op_user_id } }
}

export function parseGuildMemberUpdate(event: QQ.GuildMemberEvent): Satori.EventBody<'guild-member-updated'> {
  return { guild: { id: event.guild_id }, member: parseGuildMember(event), operator: { id: event.op_user_id } }
}

export function parseGuildMemberRemove(event: QQ.GuildMemberEvent): Satori.EventBody<'guild-member-removed'> {
  return { guild: { id: event.guild_id }, member: parseGuildMember(event), operator: { id: event.op_user_id } }
}

export function parseReaction({ target, emoji }: QQ.MessageReaction): Satori.Reaction {
  return { message: { id: target.id }, emoji: { id: emoji.id } }
}

export function parseReactionAdd(reaction: QQ.MessageReaction): Satori.EventBody<'reaction-added'> {
  return {
    reaction: parseReaction(reaction),
    channel: { id: reaction.channel_id },
    guild: { id: reaction.guild_id },
    user: { id: reaction.user_id },
  }
}

export function parseReactionRemove(reaction: QQ.MessageReaction): Satori.EventBody<'reaction-removed'> {
  return {
    reaction: parseReaction(reaction),
    channel: { id: reaction.channel_id },
    guild: { id: reaction.guild_id },
    user: { id: reaction.user_id },
  }
}

/** 剥离顶层 author 子元素（其信息由事件 user/member 承载）后序列化消息内容 */
export function messageResource(element: Element<'message'>, edited?: string): Satori.Message {
  return {
    id: element.attrs.id,
    content: element.children
      .filter(child => !(child instanceof Element && child.type === 'author'))
      .map(serialize)
      .join(''),
    created_at: element.attrs.timestamp,
    updated_at: edited === undefined ? undefined : Date.parse(edited),
  }
}

export function parseGuildMessageAuthor(message: QQ.GuildMessage): Satori.User {
  const user = parseGuildUser(message.author)
  if (!message.member)
    return user
  return {
    ...user,
    name: message.member.nick || user.name,
  }
}

export function parseGuildMessageElement(message: QQ.GuildMessage): Element<'message'> {
  const element = h.message({
    'id': message.id,
    'timestamp': new Date(message.timestamp).valueOf(),
    'qq:guild_id': message.guild_id,
    'qq:channel_id': message.channel_id,
  })
  element.children.unshift(h.author(parseGuildMessageAuthor(message)))
  const attachments = message.attachments?.map(({ url }) => h.file({ src: url })) ?? []
  element.update(message.content, ...attachments)
  return element
}

export function parseGuildMessage(message: QQ.GuildMessage, scenes: ChannelScenes): Satori.EventBody<'message-created'> {
  const element = parseGuildMessageElement(message)
  scenes.set(message.channel_id, 'guild')
  const user = parseGuildUser(message.author)
  return {
    message: messageResource(element, message.edited_timestamp),
    channel: { id: message.channel_id },
    guild: { id: message.guild_id },
    user,
    member: message.member
      ? {
          user,
          nick: message.member.nick,
          joined_at: Date.parse(message.member.joined_at),
          roles: message.member.roles.map(id => ({ id })),
        }
      : undefined,
  }
}

export function parseMessageDelete(event: QQ.MessageDelete): Satori.EventBody<'message-deleted'> {
  return {
    message: { id: event.message.id },
    channel: { id: event.message.channel_id },
    guild: { id: event.message.guild_id },
    operator: parseGuildUser(event.op_user),
  }
}

export function parseEmoji(emoji: string | Satori.Emoji): { type: QQ.EmojiType, id: string } {
  const id = typeof emoji === 'string' ? emoji : emoji.id ?? emoji.name ?? ''
  return {
    type: /^\d+$/.test(id) ? QQ.EmojiType.System : QQ.EmojiType.Emoji,
    id,
  }
}

/** 旧版频道 API 相关的 Satori action 实现 */
export function guildActions(bot: QQBot, scenes: ChannelScenes): SatoriDriver['actions'] {
  return {
    'channel.get': async ({ channel_id }) => {
      if (channel_id.startsWith('private:'))
        return { id: channel_id, type: Satori.ChannelType.Direct }
      return mapGuildChannel(await bot.getChannel(channel_id))
    },
    'channel.list': async ({ guild_id }) => {
      const channels = await bot.getChannels(guild_id)
      return { data: channels.map(mapGuildChannel) }
    },
    'guild.get': async ({ guild_id }) => {
      if (scenes.get(guild_id) === 'group') {
        const info = await bot.getGroupInfo(guild_id)
        return { id: info.group_openid, name: info.group_name }
      }
      const guild = await bot.getGuild(guild_id)
      return { id: guild.id, name: guild.name, avatar: guild.icon }
    },
    'guild.member.get': async ({ guild_id, user_id }) => {
      if (scenes.get(guild_id) === 'group') {
        const member = await bot.getGroupMember(guild_id, user_id)
        return { user: { id: member.member_openid, name: member.username, is_bot: member.bot } }
      }
      return mapGuildMember(await bot.getMember(guild_id, user_id))
    },
    'guild.member.list': async ({ guild_id }) => {
      const members = await bot.getMembers(guild_id)
      return { data: members.map(mapGuildMember) }
    },
    'guild.member.kick': async ({ guild_id, user_id }) => {
      return await bot.deleteMember(guild_id, user_id)
    },
    'guild.member.role.set': async ({ guild_id, user_id, role_id }) => {
      return await bot.addMemberRole(guild_id, user_id, role_id)
    },
    'guild.member.role.unset': async ({ guild_id, user_id, role_id }) => {
      return await bot.deleteMemberRole(guild_id, user_id, role_id)
    },
    'guild.role.list': async ({ guild_id }) => {
      const { roles } = await bot.getRoles(guild_id)
      return { data: roles.map(role => ({ id: role.id, name: role.name, color: role.color })) }
    },
    'guild.role.create': async ({ guild_id, data }) => {
      const { role } = await bot.createRole(guild_id, { name: data.name, color: data.color })
      return { id: role.id, name: role.name, color: role.color }
    },
    'guild.role.update': async ({ guild_id, role_id, data }) => {
      const { role } = await bot.patchRole(guild_id, role_id, { name: data.name, color: data.color })
      return { id: role.id, name: role.name, color: role.color }
    },
    'guild.role.delete': async ({ guild_id, role_id }) => {
      return await bot.deleteRole(guild_id, role_id)
    },
    'reaction.create': async ({ channel_id, message_id, emoji }) => {
      const { type, id } = parseEmoji(emoji)
      return await bot.addReaction(channel_id, message_id, type, id)
    },
    'reaction.delete': async ({ channel_id, message_id, emoji }) => {
      const { type, id } = parseEmoji(emoji)
      return await bot.deleteReaction(channel_id, message_id, type, id)
    },
  }
}
