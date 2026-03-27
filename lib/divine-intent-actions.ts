/**
 * Divine Manager intent execution: run mass DM, stats, publish, create task.
 * Used by the Divine Intent API; all require authenticated supabase + userId.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createFanslyAPI } from '@/lib/fansly-api'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createTask } from '@/lib/divine-manager'
import type { DivineManagerSettingsRow } from '@/lib/divine-manager'
import { formatOnlyFansText } from '@/lib/onlyfans-text'
import { validateChatMediaIdsForSend } from '@/lib/onlyfans-chat-media'

export type MassDmParams = {
  message: string
  platform?: string
  platforms?: string[]
  segment?: string
  filter?: 'all' | 'active' | 'expired' | 'renewing'
  price?: number
  mediaIds?: string[]
}

export type GetStatsParams = { period?: string; platform?: string }

export type ContentPublishParams = {
  content: string
  platforms: string[]
  /** OnlyFans media IDs from upload; use these when creating the post. */
  mediaIds?: string[]
  mediaUrls?: string[]
  scheduledFor?: string
  contentId?: string
}

export type CreateTaskParams = { type: string; summary: string; payload?: Record<string, unknown> }

export type SendMessageParams = {
  fanId: string
  message: string
  platform?: 'onlyfans' | 'fansly'
  price?: number
  mediaIds?: (string | number)[]
  previews?: (string | number)[]
  rfTag?: (string | number)[]
}

const MASS_DM_MAX_RECIPIENTS_CAP = 5000

/** Check if voice automation allows this intent type without confirmation. */
export function isVoiceAutoAllowed(
  settings: DivineManagerSettingsRow | null,
  intentType: 'mass_dm' | 'pricing_changes' | 'content_publish'
): boolean {
  if (!settings?.automation_rules?.voice_auto) return false
  const v = settings.automation_rules.voice_auto as Record<string, boolean | undefined>
  if (intentType === 'mass_dm') return v.mass_dm === true
  if (intentType === 'pricing_changes') return v.pricing_changes === true
  if (intentType === 'content_publish') return v.content_publish === true
  return false
}

/** Map segment (e.g. dormant_high_spend) to filter. For now we use filter only. */
function segmentToFilter(segment?: string): 'all' | 'active' | 'expired' | 'renewing' {
  if (!segment) return 'all'
  const s = segment.toLowerCase()
  if (s.includes('active') || s.includes('renewing')) return 'renewing'
  if (s.includes('expired')) return 'expired'
  return 'all'
}

export async function executeMassDm(
  supabase: SupabaseClient,
  userId: string,
  params: MassDmParams
): Promise<{ success: boolean; totalSent: number; totalFailed: number; summary: string; results?: Record<string, unknown> }> {
  const platforms = params.platforms?.length
    ? params.platforms
    : params.platform
      ? [params.platform]
      : ['onlyfans', 'fansly']
  const filter = params.filter ?? segmentToFilter(params.segment)
  const message = params.message?.trim()
  if (!message || platforms.length === 0) {
    return { success: false, totalSent: 0, totalFailed: 0, summary: 'Message and at least one platform required.' }
  }

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .in('platform', platforms)

  if (!connections?.length) {
    return { success: false, totalSent: 0, totalFailed: 0, summary: 'No connected platforms found.' }
  }

  const results: Record<string, { success: boolean; sent?: number; failed?: number; error?: string }> = {}
  let totalSent = 0
  let totalFailed = 0

  for (const platform of platforms) {
    const connection = connections.find((c: { platform: string }) => c.platform === platform)
    if (!connection) {
      results[platform] = { success: false, error: 'Platform not connected' }
      continue
    }
    try {
      if (platform === 'fansly') {
        const api = createFanslyAPI()
        const result = await api.sendMassMessage(connection.platform_user_id, {
          content: message,
          mediaIds: params.mediaIds,
          price: params.price,
          subscriberFilter: filter,
        })
        results.fansly = {
          success: result.success,
          sent: result.sent,
          failed: result.failed,
          error: result.success ? undefined : result.message,
        }
        totalSent += result.sent ?? 0
        totalFailed += result.failed ?? 0
      } else if (platform === 'onlyfans') {
        const api = createOnlyFansAPI(connection.access_token)
        const result = await api.sendMassMessage({
          text: message,
          mediaIds: params.mediaIds,
          price: params.price,
        })
        results.onlyfans = {
          success: result.sent > 0,
          sent: result.sent,
          failed: result.failed,
          error: result.sent === 0 ? 'Failed to send messages' : undefined,
        }
        totalSent += result.sent ?? 0
        totalFailed += result.failed ?? 0
      }
    } catch (err) {
      results[platform] = {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send',
      }
    }
  }

  const cappedSent = Math.min(totalSent, MASS_DM_MAX_RECIPIENTS_CAP)
  const allOk = Object.values(results).every((r) => r.success)
  const summary =
    allOk && cappedSent > 0
      ? `Sent to ${cappedSent} subscribers on ${platforms.join(', ')}.`
      : totalSent > 0
        ? `Sent to ${totalSent}, ${totalFailed} failed.`
        : 'No messages sent; check connections and params.'
  return {
    success: allOk && totalSent > 0,
    totalSent: cappedSent,
    totalFailed,
    summary,
    results,
  }
}

export async function getStats(
  supabase: SupabaseClient,
  userId: string,
  _params: GetStatsParams
): Promise<{ success: boolean; summary: string; stats?: Record<string, unknown> }> {
  const { data: snapshots } = await supabase
    .from('analytics_snapshots')
    .select('platform, date, fans, revenue')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(14)

  if (!snapshots?.length) {
    return { success: true, summary: 'No analytics snapshots yet. Connect platforms and sync to see stats.' }
  }

  const byPlatform: Record<string, { fans: number; revenue: number }> = {}
  let totalFans = 0
  let totalRevenue = 0
  for (const row of snapshots) {
    const p = row.platform ?? 'unknown'
    if (!byPlatform[p]) byPlatform[p] = { fans: 0, revenue: 0 }
    byPlatform[p].fans = Math.max(byPlatform[p].fans, Number(row.fans) || 0)
    byPlatform[p].revenue += Number(row.revenue) || 0
    totalFans = Math.max(totalFans, byPlatform[p].fans)
    totalRevenue += byPlatform[p].revenue
  }
  const lines = Object.entries(byPlatform).map(
    ([p, v]) => `${p}: ${v.fans} fans, $${v.revenue.toFixed(0)} revenue`
  )
  const summary = `Last 14 days: ${lines.join('; ')}. Total revenue ~$${totalRevenue.toFixed(0)}.`
  return { success: true, summary, stats: { byPlatform, totalRevenue, totalFans } }
}

export async function executeSendMessage(
  supabase: SupabaseClient,
  userId: string,
  params: SendMessageParams
): Promise<{ success: boolean; summary: string }> {
  const { fanId, message, platform = 'onlyfans', price, mediaIds, previews, rfTag } = params
  const trimmed = message?.trim()
  const hasText = typeof trimmed === 'string' && trimmed.length > 0
  const hasMedia = Array.isArray(mediaIds) && mediaIds.length > 0

  // OnlyFans rule: all paid messages must contain at least one media file
  if (platform === 'onlyfans' && typeof price === 'number' && price > 0 && !hasMedia) {
    return { success: false, summary: 'Paid messages on OnlyFans must include at least one media file.' }
  }

  // We still require at least text or media overall
  if (!fanId || (!hasText && !hasMedia)) {
    return { success: false, summary: 'fanId and either message text or media are required.' }
  }

  // previews must be subset of mediaIds if provided
  if (platform === 'onlyfans' && Array.isArray(previews) && previews.length > 0 && hasMedia) {
    const mediaSet = new Set(mediaIds!.map(String))
    const invalidPreview = previews.find((p) => !mediaSet.has(String(p)))
    if (invalidPreview !== undefined) {
      return {
        success: false,
        summary: 'Preview media must also be included in media files for OnlyFans messages.',
      }
    }
  }
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token, platform_user_id')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection) {
    return { success: false, summary: `${platform} is not connected.` }
  }
  try {
    if (platform === 'onlyfans') {
      const bad = validateChatMediaIdsForSend(mediaIds)
      if (bad) return { success: false, summary: bad }

      const api = createOnlyFansAPI(connection.access_token)
      await api.sendMessage(String(fanId), {
        text: formatOnlyFansText(trimmed || '', { size: 'default' }),
        price: typeof price === 'number' && price >= 0 ? price : undefined,
        mediaFiles: hasMedia ? mediaIds : undefined,
        previews: Array.isArray(previews) && previews.length > 0 ? previews : undefined,
        rfTag: Array.isArray(rfTag) && rfTag.length > 0 ? rfTag : undefined,
      })
      return { success: true, summary: `Message sent to fan on OnlyFans.` }
    }
    if (platform === 'fansly') {
      const api = createFanslyAPI()
      const result = await api.sendMessage(connection.platform_user_id, String(fanId), {
        text: message.trim(),
        mediaIds: Array.isArray(mediaIds) && mediaIds.length > 0 ? mediaIds : undefined,
      })
      if (result?.success) return { success: true, summary: 'Message sent to fan on Fansly.' }
      return { success: false, summary: 'Failed to send on Fansly.' }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Send failed'
    return { success: false, summary: msg }
  }
  return { success: false, summary: 'Unsupported platform.' }
}

export async function executeContentPublish(
  supabase: SupabaseClient,
  userId: string,
  params: ContentPublishParams
): Promise<{ success: boolean; summary: string; results?: Record<string, unknown> }> {
  const { content, platforms, mediaIds, mediaUrls, scheduledFor, contentId } = params
  if (!content?.trim() || !platforms?.length) {
    return { success: false, summary: 'Content and at least one platform required.' }
  }

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .in('platform', platforms)

  if (!connections?.length) {
    return { success: false, summary: 'No connected platforms found.' }
  }

  const results: Record<string, { success: boolean; postId?: string; error?: string }> = {}
  for (const platform of platforms) {
    const connection = connections.find((c: { platform: string }) => c.platform === platform)
    if (!connection) {
      results[platform] = { success: false, error: 'Platform not connected' }
      continue
    }
    try {
      if (platform === 'fansly') {
        const api = createFanslyAPI()
        const { walls } = await api.getWalls(connection.platform_user_id)
        const wallIds = walls?.length ? walls.map((w: { id: string }) => w.id) : []
        const result = await api.createPost(connection.platform_user_id, {
          content,
          wallIds,
          scheduledFor: scheduledFor ? Math.floor(new Date(scheduledFor).getTime() / 1000) : 0,
        })
        results.fansly = {
          success: result.success,
          postId: result.postId,
          error: result.success ? undefined : result.message,
        }
      } else if (platform === 'onlyfans') {
        const api = createOnlyFansAPI(connection.access_token)
        const result = await api.createPost({
          text: content,
          mediaIds: mediaIds?.length ? mediaIds : undefined,
          schedule: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        })
        const rawError = result.error || ''
        const friendlyError =
          rawError.includes('Bad Request - The request could not be understood by the server')
            ? 'OnlyFans rejected this post with a generic \"Bad Request\". This usually means the linked OnlyFans account does not have API posting enabled or the OnlyFans API partner blocked publishing for this account. Try reconnecting OnlyFans from Settings, or contact support for OnlyFans API posting access.'
            : rawError || undefined
        results.onlyfans = {
          success: result.success,
          postId: result.postId,
          error: result.success ? undefined : friendlyError,
        }
      }
    } catch (err) {
      results[platform] = {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to publish',
      }
    }
  }

  if (contentId) {
    const allOk = Object.values(results).every((r) => r.success)
    await supabase
      .from('content')
      .update({
        status: allOk ? 'published' : 'partial',
        published_at: new Date().toISOString(),
        platform_post_ids: results,
      })
      .eq('id', contentId)
      .eq('user_id', userId)
  }

  const successCount = Object.values(results).filter((r) => r.success).length
  const summary =
    successCount === platforms.length
      ? `Published to ${successCount} platform(s).`
      : `Published to ${successCount} of ${platforms.length}; some failed.`
  return { success: successCount > 0, summary, results }
}

export async function executeCreateTask(
  supabase: SupabaseClient,
  userId: string,
  params: CreateTaskParams
): Promise<{ success: boolean; summary: string; taskId?: string }> {
  const { type, summary: taskSummary, payload } = params
  if (!type?.trim()) {
    return { success: false, summary: 'Task type required.' }
  }
  const row = await createTask(supabase, {
    user_id: userId,
    type: type.trim(),
    status: 'suggested',
    payload: { summary: taskSummary ?? type, ...payload },
    source: 'voice',
  })
  return {
    success: true,
    summary: `Task created: ${type} — ${taskSummary ?? type}`,
    taskId: row.id,
  }
}

// ============ FANS & FOLLOWINGS (OnlyFans API) ============

export type ListFansParams = {
  filter?: 'all' | 'active' | 'expired' | 'latest' | 'top'
  limit?: number
  offset?: number
  sort?: 'total' | 'subscriptions' | 'tips' | 'messages' | 'posts' | 'streams'
}

export async function listFans(
  supabase: SupabaseClient,
  userId: string,
  params: ListFansParams = {}
): Promise<{ success: boolean; summary: string; fans?: unknown[]; total?: number }> {
  const limit = Math.min(params.limit ?? 25, 50)
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI(connection.access_token)
    let data: { data?: unknown[] }
    switch (params.filter ?? 'active') {
      case 'all':
        data = await api.getFansAll({ limit, offset: params.offset })
        break
      case 'expired':
        data = await api.getFansExpired({ limit, offset: params.offset })
        break
      case 'latest':
        data = await api.getFansLatest({ limit, offset: params.offset })
        break
      case 'top':
        data = await api.getFansTop({ limit, offset: params.offset, sort: params.sort })
        break
      default:
        data = await api.getFansActive({ limit, offset: params.offset })
    }
    const list = Array.isArray(data?.data) ? data.data : []
    const summary = `Found ${list.length} fans (${params.filter ?? 'active'}).`
    return { success: true, summary, fans: list, total: list.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list fans'
    return { success: false, summary: msg }
  }
}

export type GetFanSubscriptionHistoryParams = { userId: string; limit?: number; offset?: number }

export async function getFanSubscriptionHistory(
  supabase: SupabaseClient,
  userId: string,
  params: GetFanSubscriptionHistoryParams
): Promise<{ success: boolean; summary: string; history?: unknown[] }> {
  const fanUserId = params.userId?.trim()
  if (!fanUserId) {
    return { success: false, summary: 'Fan user id is required.' }
  }
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI(connection.access_token)
    const result = await api.getSubscriptionHistory(fanUserId, {
      limit: Math.min(params.limit ?? 20, 50),
      offset: params.offset,
    })
    const history = Array.isArray(result?.data) ? result.data : []
    return {
      success: true,
      summary: `Subscription history for fan: ${history.length} record(s).`,
      history,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch subscription history'
    return { success: false, summary: msg }
  }
}

export type ListFollowingsParams = { filter?: 'all' | 'active' | 'expired'; limit?: number; offset?: number }

export async function listFollowings(
  supabase: SupabaseClient,
  userId: string,
  params: ListFollowingsParams = {}
): Promise<{ success: boolean; summary: string; followings?: unknown[] }> {
  const limit = Math.min(params.limit ?? 25, 50)
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI(connection.access_token)
    let data: { data?: unknown[] }
    switch (params.filter ?? 'all') {
      case 'active':
        data = await api.getFollowingActive({ limit, offset: params.offset })
        break
      case 'expired':
        data = await api.getFollowingExpired({ limit, offset: params.offset })
        break
      default:
        data = await api.getFollowingAll({ limit, offset: params.offset })
    }
    const list = Array.isArray(data?.data) ? data.data : []
    return { success: true, summary: `Found ${list.length} followings (${params.filter ?? 'all'}).`, followings: list }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list followings'
    return { success: false, summary: msg }
  }
}

// ============ MESSAGE ENGAGEMENT (OnlyFans API) ============

export type GetTopMessageParams = { startDate?: string; endDate?: string; period?: string }

export async function getTopMessage(
  supabase: SupabaseClient,
  userId: string,
  params: GetTopMessageParams = {}
): Promise<{ success: boolean; summary: string; message?: unknown; buyers?: unknown[] }> {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI(connection.access_token)
    const result = await api.getTopMessage({
      startDate: params.startDate,
      endDate: params.endDate,
      period: params.period,
    })
    const message = result?.data
    let buyers: unknown[] = []
    if (message && typeof message === 'object' && 'id' in message && typeof (message as { id: string }).id === 'string') {
      const buyersRes = await api.getMessageBuyers((message as { id: string }).id, { limit: 25 })
      buyers = Array.isArray(buyersRes?.data) ? buyersRes.data : []
    }
    return {
      success: true,
      summary: message ? `Top message found with ${buyers.length} buyers.` : 'No top message in period.',
      message,
      buyers,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch top message'
    return { success: false, summary: msg }
  }
}

export type GetMessageEngagementParams = {
  type?: 'direct' | 'mass'
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

export async function getMessageEngagement(
  supabase: SupabaseClient,
  userId: string,
  params: GetMessageEngagementParams = {}
): Promise<{ success: boolean; summary: string; messages?: unknown[]; chart?: unknown[] }> {
  const limit = Math.min(params.limit ?? 10, 50)
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI(connection.access_token)
    const isMass = params.type === 'mass'
    const list = isMass
      ? await api.getMassMessagesEngagement({ limit, offset: params.offset, startDate: params.startDate, endDate: params.endDate })
      : await api.getDirectMessagesEngagement({ limit, offset: params.offset, startDate: params.startDate, endDate: params.endDate })
    const chart = isMass
      ? await api.getMassMessagesChart({ startDate: params.startDate, endDate: params.endDate })
      : await api.getDirectMessagesChart({ startDate: params.startDate, endDate: params.endDate })
    const messages = Array.isArray(list?.data) ? list.data : []
    const chartData = Array.isArray(chart?.data) ? chart.data : []
    return {
      success: true,
      summary: `${isMass ? 'Mass' : 'Direct'} messages: ${messages.length} items; chart points: ${chartData.length}.`,
      messages,
      chart: chartData,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch message engagement'
    return { success: false, summary: msg }
  }
}

// ============ QUEUE ============

export type PublishQueueItemParams = { queueId: string }

export async function publishQueueItem(
  supabase: SupabaseClient,
  userId: string,
  params: PublishQueueItemParams
): Promise<{ success: boolean; summary: string }> {
  const queueId = params.queueId?.trim()
  if (!queueId) {
    return { success: false, summary: 'Queue item id is required.' }
  }
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI(connection.access_token)
    const result = await api.publishQueueItem(queueId)
    if (result.success) {
      return { success: true, summary: 'Queue item published successfully.' }
    }
    return { success: false, summary: result.error ?? 'Failed to publish queue item.' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to publish queue item'
    return { success: false, summary: msg }
  }
}

// ============ ONLYFANS NOTIFICATIONS ============

export async function getOnlyFansNotificationSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; summary: string; counts?: Record<string, unknown>; notifications?: unknown[] }> {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)
    const counts = await api.getNotificationCounts()
    const { notifications } = await api.listNotifications({ limit: 25 })

    const tipCount = (counts as Record<string, unknown>).tips ?? (counts as Record<string, unknown>).tip ?? 0
    const fanCount = (counts as Record<string, unknown>).fans ?? (counts as Record<string, unknown>).new_fans ?? 0
    const messageCount =
      (counts as Record<string, unknown>).messages ??
      (counts as Record<string, unknown>).new_messages ??
      0

    const parts: string[] = []
    if (fanCount) parts.push(`${fanCount} new fan${Number(fanCount) === 1 ? '' : 's'}`)
    if (tipCount) parts.push(`${tipCount} new tip${Number(tipCount) === 1 ? '' : 's'}`)
    if (messageCount) parts.push(`${messageCount} new message${Number(messageCount) === 1 ? '' : 's'}`)
    const summary =
      parts.length > 0
        ? `OnlyFans notifications: ${parts.join(', ')}.`
        : 'No notable new OnlyFans notifications right now.'

    return { success: true, summary, counts, notifications }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch OnlyFans notifications'
    return { success: false, summary: msg }
  }
}

export async function listOnlyFansNotifications(
  supabase: SupabaseClient,
  userId: string,
  params?: { limit?: number; offset?: number; tab?: string }
): Promise<{ success: boolean; summary: string; notifications?: unknown[] }> {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)
    const limit = Math.min(params?.limit ?? 25, 50)
    const { notifications } = await api.listNotifications({
      limit,
      offset: params?.offset ?? 0,
      tab: params?.tab,
    })
    const summary = `Fetched ${notifications.length} OnlyFans notification(s).`
    return { success: true, summary, notifications }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list OnlyFans notifications'
    return { success: false, summary: msg }
  }
}

export async function markOnlyFansNotificationsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; summary: string }> {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { success: false, summary: 'OnlyFans is not connected.' }
  }
  try {
    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)
    await api.markAllNotificationsAsRead()
    return { success: true, summary: 'Marked all OnlyFans notifications as read.' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to mark OnlyFans notifications as read'
    return { success: false, summary: msg }
  }
}
