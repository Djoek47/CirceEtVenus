/**
 * Divine Manager intent execution: run mass DM, stats, publish, create task.
 * Used by the Divine Intent API; all require authenticated supabase + userId.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createFanslyAPI } from '@/lib/fansly-api'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createTask } from '@/lib/divine-manager'
import type { DivineManagerSettingsRow } from '@/lib/divine-manager'

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
  mediaIds?: string[]
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
  const { fanId, message, platform = 'onlyfans', price, mediaIds } = params
  if (!fanId || !message?.trim()) {
    return { success: false, summary: 'fanId and message are required.' }
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
      const api = createOnlyFansAPI(connection.access_token)
      await api.sendMessage(String(fanId), {
        text: message.trim(),
        price: typeof price === 'number' && price >= 0 ? price : undefined,
        mediaFiles: Array.isArray(mediaIds) && mediaIds.length > 0 ? mediaIds : undefined,
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
        results.onlyfans = {
          success: result.success,
          postId: result.postId,
          error: result.success ? undefined : result.error,
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
