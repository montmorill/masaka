import type * as QQ from './common'
import { createLogger } from '@yarkjs/logger'

const logger = createLogger('qq')

const GATEWAY_URL = 'wss://api.sgroup.qq.com/websocket'

export class QQBot {
  protected constructor(
    public appId: string,
    public appSecret: string,
    public baseUrl: string,
  ) {}

  accessToken!: string

  static async create(
    appId: string,
    appSecret: string,
    baseUrl = 'https://api.bot.qq.com',
  ): Promise<QQBot> {
    const bot = new QQBot(appId, appSecret, baseUrl)
    await bot.refreshAccessToken()
    return bot
  }

  protected async refreshAccessToken(): Promise<void> {
    const res = await this.fetch<
      | { access_token: string, expires_in: `${number}` }
      | { code: number, message: string }
    >('/app/getAppAccessToken', {
      method: 'POST',
      body: JSON.stringify({
        appId: this.appId,
        clientSecret: this.appSecret,
      }),
    })
    if ('message' in res)
      throw new Error(`${res.code}: ${res.message}`)
    this.accessToken = res.access_token

    const expiresIn = (Number(res.expires_in) - 60) * 1000
    setTimeout(() => this.refreshAccessToken(), Math.max(expiresIn, 0))
  }

  async fetch<T>(input: string | URL | Request, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (!headers.has('Content-Type'))
      headers.set('Content-Type', 'application/json')
    if (this.accessToken)
      headers.set('Authorization', `QQBot ${this.accessToken}`)
    if (typeof input === 'string' && input.startsWith('/'))
      input = new URL(input, this.baseUrl)
    init.headers = headers

    const resp = await fetch(input, init)
    const data = await resp.json() as QQ.Error | T
    if (data && typeof data === 'object' && 'err_code' in data) {
      const message = `${data.err_code} ${data.message} trace_id: ${data.trace_id}`
      throw new Error(message, { cause: data })
    }
    return data
  }

  protected query(params: Record<string, unknown> = {}): string {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params))
      value !== undefined && search.set(key, String(value))
    return search.size ? `?${search}` : ''
  }

  async gateway(): Promise<{ url: string }> {
    try {
      return await this.fetch('/gateway')
    }
    catch (error) {
      if (error instanceof Error && (error.cause as QQ.Error).err_code === 40023001)
        logger.warn('gateway', error.message, 'fallback to', GATEWAY_URL)
      else throw error
      return { url: GATEWAY_URL }
    }
  }

  async gatewayBot(): Promise<{
    url: string
    shards: number
    session_start_limit: {
      total: number
      remaining: number
      reset_after: number
      max_concurrency: number
    }
  }> { return await this.fetch('/gateway/bot') }

  // ========== 频道 ==========

  /** 获取频道详情 GET /guilds/{guild_id} */
  async getGuild(guildId: string): Promise<QQ.Guild> {
    return await this.fetch(`/guilds/${guildId}`)
  }

  /** 获取用户频道列表 GET /users/@me/guilds */
  async getGuilds(options: { before?: string, after?: string, limit?: number } = {}): Promise<QQ.Guild[]> {
    return await this.fetch(`/users/@me/guilds${this.query(options)}`)
  }

  /** 获取用户详情 GET /users/@me */
  async getMe(): Promise<QQ.GuildUser> {
    return await this.fetch('/users/@me')
  }

  // ========== 子频道 ==========

  /** 获取子频道详情 GET /channels/{channel_id} */
  async getChannel(channelId: string): Promise<QQ.Channel> {
    return await this.fetch(`/channels/${channelId}`)
  }

  /** 获取子频道列表 GET /guilds/{guild_id}/channels */
  async getChannels(guildId: string): Promise<QQ.Channel[]> {
    return await this.fetch(`/guilds/${guildId}/channels`)
  }

  /** 创建子频道 POST /guilds/{guild_id}/channels */
  async createChannel(guildId: string, channel: {
    /** 子频道名称 */ name: string
    /** 子频道类型 */ type: number
    /** 子频道子类型 */ sub_type?: number
    /** 子频道排序（必填；分组类型必须大于等于 2） */ position: number
    /** 子频道所属分组ID */ parent_id?: string
    /** 子频道私密类型 */ private_type?: number
    /** 子频道私密类型成员 ID */ private_user_ids?: string[]
    /** 子频道发言权限 */ speak_permission?: number
    /** 应用类型子频道应用 AppID（仅应用子频道需要） */ application_id?: string
  }): Promise<QQ.Channel> {
    return await this.fetch(`/guilds/${guildId}/channels`, {
      method: 'POST',
      body: JSON.stringify(channel),
    })
  }

  /** 修改子频道 PATCH /channels/{channel_id} */
  async patchChannel(channelId: string, patch: {
    /** 子频道名 */ name?: string
    /** 排序 */ position?: number
    /** 分组 id */ parent_id?: string
    /** 子频道私密类型 */ private_type?: number
    /** 子频道发言权限 */ speak_permission?: number
  }): Promise<QQ.Channel> {
    return await this.fetch(`/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }

  /** 删除子频道 DELETE /channels/{channel_id}（无法撤回） */
  async deleteChannel(channelId: string): Promise<void> {
    return await this.fetch(`/channels/${channelId}`, { method: 'DELETE' })
  }

  /** 获取子频道在线成员数 GET /channels/{channel_id}/online_nums */
  async getOnlineNums(channelId: string): Promise<{ online_nums: number }> {
    return await this.fetch(`/channels/${channelId}/online_nums`)
  }

  // ========== 成员与身份组 ==========

  /** 获取频道成员详情 GET /guilds/{guild_id}/members/{user_id} */
  async getMember(guildId: string, userId: string): Promise<QQ.GuildMember> {
    return await this.fetch(`/guilds/${guildId}/members/${userId}`)
  }

  /** 获取频道成员列表 GET /guilds/{guild_id}/members */
  async getMembers(guildId: string, options: {
    /** 上一次回包中最后一个 member 的 user id，第一次请求填 0 */ after?: string
    /** 分页大小，1-400，默认 1 */ limit?: number
  } = {}): Promise<QQ.GuildMember[]> {
    return await this.fetch(`/guilds/${guildId}/members${this.query(options)}`)
  }

  /** 删除频道成员 DELETE /guilds/{guild_id}/members/{user_id} */
  async deleteMember(guildId: string, userId: string, options: {
    /** 同时将该用户添加到频道黑名单 */ add_blacklist?: boolean
    /** 同时撤回该成员的消息，仅支持 0/-1/3/7/15/30，默认 0 不撤回，-1 撤回全部 */ delete_history_msg_days?: 0 | -1 | 3 | 7 | 15 | 30
  } = {}): Promise<void> {
    return await this.fetch(`/guilds/${guildId}/members/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify(options),
    })
  }

  /** 获取频道身份组成员列表 GET /guilds/{guild_id}/roles/{role_id}/members */
  async getRoleMembers(guildId: string, roleId: string, options: {
    /** 将上一次回包中 next 填入，第一次请求填 0 */ start_index?: string
    /** 分页大小，1-400，默认 1 */ limit?: number
  } = {}): Promise<{ data: QQ.GuildMember[], next: string }> {
    return await this.fetch(`/guilds/${guildId}/roles/${roleId}/members${this.query(options)}`)
  }

  /** 获取频道身份组列表 GET /guilds/{guild_id}/roles */
  async getRoles(guildId: string): Promise<{ guild_id: string, roles: QQ.Role[], role_num_limit: string }> {
    return await this.fetch(`/guilds/${guildId}/roles`)
  }

  /** 创建频道身份组 POST /guilds/{guild_id}/roles */
  async createRole(guildId: string, role: QQ.RoleToCreate): Promise<{ role_id: string, role: QQ.Role }> {
    return await this.fetch(`/guilds/${guildId}/roles`, {
      method: 'POST',
      body: JSON.stringify(role),
    })
  }

  /** 修改频道身份组 PATCH /guilds/{guild_id}/roles/{role_id} */
  async patchRole(guildId: string, roleId: string, role: QQ.RoleToCreate): Promise<{ guild_id: string, role_id: string, role: QQ.Role }> {
    return await this.fetch(`/guilds/${guildId}/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(role),
    })
  }

  /** 删除频道身份组 DELETE /guilds/{guild_id}/roles/{role_id} */
  async deleteRole(guildId: string, roleId: string): Promise<void> {
    return await this.fetch(`/guilds/${guildId}/roles/${roleId}`, { method: 'DELETE' })
  }

  /** 创建频道身份组成员 PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id} */
  async addMemberRole(guildId: string, userId: string, roleId: string, channel?: { id: string }): Promise<void> {
    return await this.fetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'PUT',
      body: channel === undefined ? undefined : JSON.stringify({ channel }),
    })
  }

  /** 删除频道身份组成员 DELETE /guilds/{guild_id}/members/{user_id}/roles/{role_id} */
  async deleteMemberRole(guildId: string, userId: string, roleId: string, channel?: { id: string }): Promise<void> {
    return await this.fetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      body: channel === undefined ? undefined : JSON.stringify({ channel }),
    })
  }

  // ========== 消息 ==========

  /** 创建私信会话 POST /users/@me/dms */
  async createDMS(body: { recipient_id: string, source_guild_id: string }): Promise<QQ.DMS> {
    return await this.fetch('/users/@me/dms', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /** 发送私信 POST /dms/{guild_id}/messages */
  async sendDMMessage(guildId: string, message: QQ.MessageToCreate): Promise<QQ.GuildMessage> {
    return await this.fetch(`/dms/${guildId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  /** 撤回私信 DELETE /dms/{guild_id}/messages/{message_id} */
  async recallDMMessage(guildId: string, messageId: string, hideTip = false): Promise<void> {
    return await this.fetch(`/dms/${guildId}/messages/${messageId}${this.query({ hideTip })}`, { method: 'DELETE' })
  }

  /** 发送频道消息 POST /channels/{channel_id}/messages */
  async sendChannelMessage(channelId: string, message: QQ.MessageToCreate): Promise<QQ.GuildMessage> {
    return await this.fetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  /** 撤回频道消息 DELETE /channels/{channel_id}/messages/{message_id} */
  async recallChannelMessage(channelId: string, messageId: string, hideTip = false): Promise<void> {
    return await this.fetch(`/channels/${channelId}/messages/${messageId}${this.query({ hideTip })}`, { method: 'DELETE' })
  }

  // ========== 表情表态 ==========

  /** 添加表情表态 PUT /channels/{channel_id}/messages/{message_id}/reactions/{type}/{id} */
  async addReaction(channelId: string, messageId: string, type: QQ.EmojiType, id: string): Promise<void> {
    return await this.fetch(`/channels/${channelId}/messages/${messageId}/reactions/${type}/${id}`, { method: 'PUT' })
  }

  /** 删除表情表态 DELETE /channels/{channel_id}/messages/{message_id}/reactions/{type}/{id} */
  async deleteReaction(channelId: string, messageId: string, type: QQ.EmojiType, id: string): Promise<void> {
    return await this.fetch(`/channels/${channelId}/messages/${messageId}/reactions/${type}/${id}`, { method: 'DELETE' })
  }

  /** 获取表情表态用户列表 GET /channels/{channel_id}/messages/{message_id}/reactions/{type}/{id} */
  async getReactionUsers(channelId: string, messageId: string, type: QQ.EmojiType, id: string, options: {
    /** 上次请求返回的 cookie，第一次请求无需填写 */ cookie?: string
    /** 每次拉取数量，默认 20，最多 50，只在第一次请求时设置 */ limit?: number
  } = {}): Promise<{ users: QQ.GuildUser[], cookie: string, is_end: boolean }> {
    return await this.fetch(`/channels/${channelId}/messages/${messageId}/reactions/${type}/${id}${this.query(options)}`)
  }

  // ========== 精华消息 ==========

  /** 添加精华消息 PUT /channels/{channel_id}/pins/{message_id} */
  async pinMessage(channelId: string, messageId: string): Promise<QQ.PinsMessage> {
    return await this.fetch(`/channels/${channelId}/pins/${messageId}`, { method: 'PUT' })
  }

  /** 删除精华消息 DELETE /channels/{channel_id}/pins/{message_id}（message_id 传 all 删除全部） */
  async unpinMessage(channelId: string, messageId: string): Promise<void> {
    return await this.fetch(`/channels/${channelId}/pins/${messageId}`, { method: 'DELETE' })
  }

  /** 获取精华消息 GET /channels/{channel_id}/pins */
  async getPins(channelId: string): Promise<QQ.PinsMessage> {
    return await this.fetch(`/channels/${channelId}/pins`)
  }

  // ========== 公告 ==========

  /** 创建频道公告 POST /guilds/{guild_id}/announces */
  async createGuildAnnounce(guildId: string, announce: QQ.AnnounceToCreate): Promise<QQ.Announces> {
    return await this.fetch(`/guilds/${guildId}/announces`, {
      method: 'POST',
      body: JSON.stringify(announce),
    })
  }

  /** 删除频道公告 DELETE /guilds/{guild_id}/announces/{message_id}（message_id 传 all 跳过校验） */
  async deleteGuildAnnounce(guildId: string, messageId: string): Promise<void> {
    return await this.fetch(`/guilds/${guildId}/announces/${messageId}`, { method: 'DELETE' })
  }

  /**
   * 创建子频道公告 POST /channels/{channel_id}/announces
   * @deprecated 2022-03-15 后弃用，使用频道公告
   */
  async createChannelAnnounce(channelId: string, body: { message_id: string }): Promise<QQ.Announces> {
    return await this.fetch(`/channels/${channelId}/announces`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * 删除子频道公告 DELETE /channels/{channel_id}/announces/{message_id}
   * @deprecated 2022-03-15 后弃用，使用频道公告
   */
  async deleteChannelAnnounce(channelId: string, messageId: string): Promise<void> {
    return await this.fetch(`/channels/${channelId}/announces/${messageId}`, { method: 'DELETE' })
  }

  // ========== 日程 ==========

  /** 获取频道日程列表 GET /channels/{channel_id}/schedules */
  async getSchedules(channelId: string, since?: number): Promise<QQ.Schedule[]> {
    return await this.fetch(`/channels/${channelId}/schedules${this.query({ since })}`)
  }

  /** 获取频道日程详情 GET /channels/{channel_id}/schedules/{schedule_id} */
  async getSchedule(channelId: string, scheduleId: string): Promise<QQ.Schedule> {
    return await this.fetch(`/channels/${channelId}/schedules/${scheduleId}`)
  }

  /** 创建频道日程 POST /channels/{channel_id}/schedules */
  async createSchedule(channelId: string, schedule: Omit<QQ.Schedule, 'id'>): Promise<QQ.Schedule> {
    return await this.fetch(`/channels/${channelId}/schedules`, {
      method: 'POST',
      body: JSON.stringify({ schedule }),
    })
  }

  /** 修改频道日程 PATCH /channels/{channel_id}/schedules/{schedule_id} */
  async patchSchedule(channelId: string, scheduleId: string, schedule: Omit<QQ.Schedule, 'id'>): Promise<QQ.Schedule> {
    return await this.fetch(`/channels/${channelId}/schedules/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ schedule }),
    })
  }

  /** 删除频道日程 DELETE /channels/{channel_id}/schedules/{schedule_id} */
  async deleteSchedule(channelId: string, scheduleId: string): Promise<void> {
    return await this.fetch(`/channels/${channelId}/schedules/${scheduleId}`, { method: 'DELETE' })
  }

  // ========== 音频 ==========

  /** 音频控制 POST /channels/{channel_id}/audio */
  async audioControl(channelId: string, control: QQ.AudioControl): Promise<object> {
    return await this.fetch(`/channels/${channelId}/audio`, {
      method: 'POST',
      body: JSON.stringify(control),
    })
  }

  /** 机器上麦 PUT /channels/{channel_id}/mic */
  async micOn(channelId: string): Promise<object> {
    return await this.fetch(`/channels/${channelId}/mic`, { method: 'PUT' })
  }

  /** 机器人下麦 DELETE /channels/{channel_id}/mic */
  async micOff(channelId: string): Promise<object> {
    return await this.fetch(`/channels/${channelId}/mic`, { method: 'DELETE' })
  }

  // ========== 论坛 ==========

  /** 获取主题列表 GET /channels/{channel_id}/threads */
  async getThreads(channelId: string): Promise<{ threads: QQ.ForumThread[], is_finish: number }> {
    return await this.fetch(`/channels/${channelId}/threads`)
  }

  /** 获取主题详情 GET /channels/{channel_id}/threads/{thread_id} */
  async getThread(channelId: string, threadId: string): Promise<{ thread: QQ.ForumThread }> {
    return await this.fetch(`/channels/${channelId}/threads/${threadId}`)
  }

  /** 发布主题 PUT /channels/{channel_id}/threads */
  async publishThread(channelId: string, thread: QQ.ForumThreadToCreate): Promise<{ task_id: string, create_time: string }> {
    return await this.fetch(`/channels/${channelId}/threads`, {
      method: 'PUT',
      body: JSON.stringify(thread),
    })
  }

  /** 删除主题 DELETE /channels/{channel_id}/threads/{thread_id} */
  async deleteThread(channelId: string, threadId: string): Promise<void> {
    return await this.fetch(`/channels/${channelId}/threads/${threadId}`, { method: 'DELETE' })
  }

  // ========== 接口权限 ==========

  /** 获取机器人在频道可用权限列表 GET /guilds/{guild_id}/api_permission */
  async getGuildApiPermission(guildId: string): Promise<{ apis: QQ.ApiPermission[] }> {
    return await this.fetch(`/guilds/${guildId}/api_permission`)
  }

  /** 发送机器人在频道接口权限的授权链接 POST /guilds/{guild_id}/api_permission/demand */
  async demandApiPermission(guildId: string, demand: {
    /** 授权链接发送的子频道 id */ channel_id: string
    /** api 权限需求标识对象 */ api_identify: { /** API 接口名 */ path: string, /** 请求方法 */ method: string }
    /** 机器人申请权限后可使用的功能描述 */ desc: string
  }): Promise<QQ.ApiPermissionDemand> {
    return await this.fetch(`/guilds/${guildId}/api_permission/demand`, {
      method: 'POST',
      body: JSON.stringify(demand),
    })
  }

  /** 获取子频道用户权限 GET /channels/{channel_id}/members/{user_id}/permissions */
  async getChannelPermissions(channelId: string, userId: string): Promise<QQ.ChannelPermissions> {
    return await this.fetch(`/channels/${channelId}/members/${userId}/permissions`)
  }

  /** 获取子频道身份组权限 GET /channels/{channel_id}/roles/{role_id}/permissions */
  async getChannelRolesPermissions(channelId: string, roleId: string): Promise<QQ.ChannelPermissions> {
    return await this.fetch(`/channels/${channelId}/roles/${roleId}/permissions`)
  }

  /** 修改子频道用户权限 PUT /channels/{channel_id}/members/{user_id}/permissions */
  async setChannelPermissions(channelId: string, userId: string, permissions: QQ.ChannelPermissionsToSet): Promise<void> {
    return await this.fetch(`/channels/${channelId}/members/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(permissions),
    })
  }

  /** 修改子频道身份组权限 PUT /channels/{channel_id}/roles/{role_id}/permissions */
  async setChannelRolesPermissions(channelId: string, roleId: string, permissions: QQ.ChannelPermissionsToSet): Promise<void> {
    return await this.fetch(`/channels/${channelId}/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(permissions),
    })
  }

  // ========== 禁言 ==========

  /** 频道全员禁言 PATCH /guilds/{guild_id}/mute（传 "0" 解除禁言） */
  async muteGuild(guildId: string, mute: QQ.MuteParams): Promise<void> {
    return await this.fetch(`/guilds/${guildId}/mute`, {
      method: 'PATCH',
      body: JSON.stringify(mute),
    })
  }

  /** 频道指定成员禁言 PATCH /guilds/{guild_id}/members/{user_id}/mute */
  async muteGuildMember(guildId: string, userId: string, mute: QQ.MuteParams): Promise<void> {
    return await this.fetch(`/guilds/${guildId}/members/${userId}/mute`, {
      method: 'PATCH',
      body: JSON.stringify(mute),
    })
  }

  /** 频道批量成员禁言 PATCH /guilds/{guild_id}/mute */
  async muteGuildMembers(guildId: string, mute: QQ.MuteParams & { user_ids: string[] }): Promise<{ user_ids: string[] }> {
    return await this.fetch(`/guilds/${guildId}/mute`, {
      method: 'PATCH',
      body: JSON.stringify(mute),
    })
  }

  /** 获取频道消息频率的设置详情 GET /guilds/{guild_id}/message/setting */
  async getMessageSetting(guildId: string): Promise<QQ.MessageSetting> {
    return await this.fetch(`/guilds/${guildId}/message/setting`)
  }

  // ========== 群（v2） ==========

  /** 获取机器人在群内状态 GET /v2/groups/{group_openid}/bot_state */
  async getGroupBotState(groupOpenid: string): Promise<QQ.GroupBotState> {
    return await this.fetch(`/v2/groups/${groupOpenid}/bot_state`)
  }

  /** 获取群信息 GET /v2/groups/{group_openid}/info */
  async getGroupInfo(groupOpenid: string): Promise<QQ.GroupInfo> {
    return await this.fetch(`/v2/groups/${groupOpenid}/info`)
  }

  /** 获取群成员信息 GET /v2/groups/{group_openid}/members/{member_openid} */
  async getGroupMember(groupOpenid: string, memberOpenid: string): Promise<QQ.GroupMemberInfo> {
    return await this.fetch(`/v2/groups/${groupOpenid}/members/${memberOpenid}`)
  }

  /** 查询入群自动审批策略列表 GET /v2/groups/join_approval_strategy */
  async listJoinApprovalStrategies(options: {
    /** 分页游标，首次请求可不传或传空字符串 */ cursor?: string
    /** 单页数量，默认 20，最大 100 */ limit?: number
  } = {}): Promise<{ strategies: QQ.JoinApprovalStrategy[], next_cursor: string }> {
    return await this.fetch(`/v2/groups/join_approval_strategy${this.query(options)}`)
  }

  /** 创建入群自动审批策略 POST /v2/groups/join_approval_strategy */
  async createJoinApprovalStrategy(strategy: QQ.JoinApprovalStrategyToCreate): Promise<{ strategy_id: string, is_enable: string, expire_at: string }> {
    return await this.fetch('/v2/groups/join_approval_strategy', {
      method: 'POST',
      body: JSON.stringify(strategy),
    })
  }

  /** 修改入群自动审批策略 PATCH /v2/groups/join_approval_strategy/{strategy_id} */
  async patchJoinApprovalStrategy(strategyId: string, strategy: QQ.JoinApprovalStrategyToPatch): Promise<object> {
    return await this.fetch(`/v2/groups/join_approval_strategy/${strategyId}`, {
      method: 'PATCH',
      body: JSON.stringify(strategy),
    })
  }

  /** 删除入群自动审批策略 DELETE /v2/groups/join_approval_strategy/{strategy_id} */
  async deleteJoinApprovalStrategy(strategyId: string): Promise<void> {
    return await this.fetch(`/v2/groups/join_approval_strategy/${strategyId}`, { method: 'DELETE' })
  }

  /** 执行入群自动审批策略 POST /v2/groups/join_approval_strategy/{strategy_id}/execute */
  async executeJoinApprovalStrategy(strategyId: string): Promise<void> {
    return await this.fetch(`/v2/groups/join_approval_strategy/${strategyId}/execute`, { method: 'POST' })
  }

  /** 修改策略白名单 POST /v2/groups/join_approval_strategy/{strategy_id}/whitelist_users */
  async setJoinApprovalStrategyWhitelist(strategyId: string, whitelist: QQ.WhitelistToSet): Promise<{ strategy_id: string, whitelist_user_count: number, updated_at: string }> {
    return await this.fetch(`/v2/groups/join_approval_strategy/${strategyId}/whitelist_users`, {
      method: 'POST',
      body: JSON.stringify(whitelist),
    })
  }

  /** 查询入群申请列表 GET /v2/groups/{group_openid}/join_request_list */
  async listGroupJoinRequests(groupOpenid: string, options: {
    /** 分页游标，首次请求可不传或传空字符串 */ cursor?: string
    /** 单页数量，默认 20，最大 100 */ limit?: number
  } = {}): Promise<{ list: QQ.GroupJoinRequestItem[], next_cursor: string }> {
    return await this.fetch(`/v2/groups/${groupOpenid}/join_request_list${this.query(options)}`)
  }

  /** 审批入群申请 POST /v2/groups/{group_openid}/approval_join_request/{member_openid} */
  async approvalGroupJoinRequest(groupOpenid: string, memberOpenid: string, approval: QQ.GroupJoinApproval): Promise<void> {
    return await this.fetch(`/v2/groups/${groupOpenid}/approval_join_request/${memberOpenid}`, {
      method: 'POST',
      body: JSON.stringify(approval),
    })
  }

  /** 查询群禁言状态 GET /v2/groups/{group_openid}/restrict_chat_setting */
  async getGroupMuteState(groupOpenid: string): Promise<QQ.GroupMuteState> {
    return await this.fetch(`/v2/groups/${groupOpenid}/restrict_chat_setting`)
  }

  /** 设置群成员禁言 POST /v2/groups/{group_openid}/restrict_chat_setting（单次不超过 10 个） */
  async setGroupMemberMute(groupOpenid: string, members: QQ.SetMemberMuteState[]): Promise<void> {
    return await this.fetch(`/v2/groups/${groupOpenid}/restrict_chat_setting`, {
      method: 'POST',
      body: JSON.stringify({ members }),
    })
  }

  // ========== 富媒体上传（v2） ==========

  /** 单聊富媒体上传 POST /v2/users/{user_openid}/files */
  async uploadUserFile(userOpenid: string, upload: QQ.MediaUpload): Promise<QQ.MediaUploadResult> {
    return await this.fetch(`/v2/users/${userOpenid}/files`, {
      method: 'POST',
      body: JSON.stringify(upload),
    })
  }

  /** 群聊富媒体上传 POST /v2/groups/{group_openid}/files */
  async uploadGroupFile(groupOpenid: string, upload: QQ.MediaUpload): Promise<QQ.MediaUploadResult> {
    return await this.fetch(`/v2/groups/${groupOpenid}/files`, {
      method: 'POST',
      body: JSON.stringify(upload),
    })
  }

  // ========== 消息发送（v2） ==========

  /** 发送单聊消息 POST /v2/users/{user_openid}/messages */
  async sendUserMessage(userOpenid: string, message: QQ.MessageToSend): Promise<QQ.SendMessageResult> {
    return await this.fetch(`/v2/users/${userOpenid}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  /** 发送群聊消息 POST /v2/groups/{group_openid}/messages */
  async sendGroupMessage(groupOpenid: string, message: QQ.MessageToSend): Promise<QQ.SendMessageResult> {
    return await this.fetch(`/v2/groups/${groupOpenid}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  /** 发送单聊流式消息 POST /v2/users/{user_openid}/stream_messages */
  async sendStreamMessage(userOpenid: string, message: QQ.StreamMessageToSend): Promise<QQ.StreamMessageResult> {
    return await this.fetch(`/v2/users/${userOpenid}/stream_messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  /** 撤回单聊消息 DELETE /v2/users/{user_openid}/messages/{message_id} */
  async recallUserMessage(userOpenid: string, messageId: string): Promise<void> {
    return await this.fetch(`/v2/users/${userOpenid}/messages/${messageId}`, { method: 'DELETE' })
  }

  /** 撤回群聊消息 DELETE /v2/groups/{group_openid}/messages/{message_id} */
  async recallGroupMessage(groupOpenid: string, messageId: string): Promise<void> {
    return await this.fetch(`/v2/groups/${groupOpenid}/messages/${messageId}`, { method: 'DELETE' })
  }

  // ========== 分片上传（v2） ==========

  /** 单聊分片上传准备 POST /v2/users/{user_openid}/upload_prepare */
  async prepareUserUpload(userOpenid: string, prepare: QQ.UploadPrepare): Promise<QQ.UploadPrepareResult> {
    return await this.fetch(`/v2/users/${userOpenid}/upload_prepare`, {
      method: 'POST',
      body: JSON.stringify(prepare),
    })
  }

  /** 群聊分片上传准备 POST /v2/groups/{group_openid}/upload_prepare */
  async prepareGroupUpload(groupOpenid: string, prepare: QQ.UploadPrepare): Promise<QQ.UploadPrepareResult> {
    return await this.fetch(`/v2/groups/${groupOpenid}/upload_prepare`, {
      method: 'POST',
      body: JSON.stringify(prepare),
    })
  }

  /** 单聊分片上传完成确认 POST /v2/users/{user_openid}/upload_part_finish */
  async finishUserUploadPart(userOpenid: string, part: QQ.UploadPartFinish): Promise<void> {
    return await this.fetch(`/v2/users/${userOpenid}/upload_part_finish`, {
      method: 'POST',
      body: JSON.stringify(part),
    })
  }

  /** 群聊分片上传完成确认 POST /v2/groups/{group_openid}/upload_part_finish */
  async finishGroupUploadPart(groupOpenid: string, part: QQ.UploadPartFinish): Promise<void> {
    return await this.fetch(`/v2/groups/${groupOpenid}/upload_part_finish`, {
      method: 'POST',
      body: JSON.stringify(part),
    })
  }

  // ========== 分享链接与互动 ==========

  /** 生成机器人分享链接 POST /v2/generate_url_link */
  async generateShareUrl(data: QQ.ShareUrlToCreate): Promise<{ url: string }> {
    return await this.fetch('/v2/generate_url_link', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /** 回应按钮互动 PUT /interactions/{interaction_id}（interaction_id 为事件包 d.id 去掉前缀） */
  async respondInteraction(interactionId: string, callback: QQ.InteractionCallback): Promise<void> {
    return await this.fetch(`/interactions/${interactionId}`, {
      method: 'PUT',
      body: JSON.stringify(callback),
    })
  }
}
