/**
 * In-process Divine intent execution (same behavior as POST /api/divine/intent).
 * Used by API routes and server-side tool runners to avoid self-HTTP (Vercel 401 HTML, cookie issues).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getSettings } from '@/lib/divine-manager'
import {
  isVoiceAutoAllowed,
  executeMassDm,
  getStats,
  executeContentPublish,
  executeCreateTask,
  executeSendMessage,
  listFans,
  getFanSubscriptionHistory,
  listFollowings,
  getTopMessage,
  getMessageEngagement,
  publishQueueItem,
  getOnlyFansNotificationSummary,
  listOnlyFansNotifications,
  markOnlyFansNotificationsRead,
  type MassDmParams,
  type GetStatsParams,
  type ContentPublishParams,
  type CreateTaskParams,
  type SendMessageParams,
  type ListFansParams,
  type GetFanSubscriptionHistoryParams,
  type ListFollowingsParams,
  type GetTopMessageParams,
  type GetMessageEngagementParams,
  type PublishQueueItemParams,
} from '@/lib/divine-intent-actions'

/** Intent types that require confirmation when voice_auto is off. */
const RISKY_INTENTS = ['mass_dm', 'pricing_changes', 'content_publish', 'publish_queue_item'] as const
type RiskyIntentType = (typeof RISKY_INTENTS)[number]

/** Supported intent types. */
export type DivineIntentType =
  | 'mass_dm'
  | 'send_message'
  | 'get_stats'
  | 'adjust_price'
  | 'content_publish'
  | 'create_task'
  | 'send_notification'
  | 'list_fans'
  | 'get_fan_subscription_history'
  | 'list_followings'
  | 'get_top_message'
  | 'get_message_engagement'
  | 'publish_queue_item'
  | 'get_notifications_summary'
  | 'list_notifications'
  | 'mark_notifications_read'

export interface IntentBody {
  type?: DivineIntentType
  intent_id?: string
  confirm?: boolean
  message?: string
  platform?: string
  platforms?: string[]
  segment?: string
  filter?: 'all' | 'active' | 'expired' | 'renewing' | 'latest' | 'top'
  price?: number
  mediaIds?: string[]
  period?: string
  tier?: string
  new_price?: number
  delta?: number
  content?: string
  mediaUrls?: string[]
  scheduledFor?: string
  contentId?: string
  summary?: string
  payload?: Record<string, unknown>
  title?: string
  description?: string
  link?: string
  sort?: string
  userId?: string
  fan_id?: string
  fanId?: string
  startDate?: string
  endDate?: string
  /** When intent is get_message_engagement: direct vs mass (see runIntent body merge). */
  channel?: 'direct' | 'mass'
  queueId?: string
  queue_id?: string
  tab?: string
  limit?: number
  offset?: number
}

async function insertDivineNotification(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  description: string,
  link = '/dashboard/divine-manager',
  metadata?: Record<string, unknown>,
) {
  const { insertDivineAppNotification } = await import('@/lib/notifications/divine-app-notification')
  await insertDivineAppNotification(supabase, userId, {
    type: 'system',
    title,
    description,
    link,
    metadata: { kind: 'divine_intent', ...metadata },
  })
}

export type DivineIntentExecuteHttpResult = { status: number; body: Record<string, unknown> }

/**
 * Full POST /api/divine/intent behavior without HTTP.
 * Returns HTTP status + JSON body shape identical to the route.
 */
export async function executeDivineIntentPost(
  supabase: SupabaseClient,
  user: User,
  initialBody: IntentBody,
): Promise<DivineIntentExecuteHttpResult> {
  let body = { ...initialBody }
  let { type, intent_id, confirm } = body

  if (intent_id && confirm) {
    const { data: logRow } = await supabase
      .from('divine_intent_log')
      .select('id, status, intent_type, params')
      .eq('id', intent_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (logRow && (logRow.status === 'executed' || logRow.status === 'rejected')) {
      return {
        status: 200,
        body: {
          status: 'already_handled',
          message: `Intent ${intent_id} was already ${logRow.status}.`,
          summary: (logRow as { result_summary?: string }).result_summary,
        },
      }
    }
    if (logRow?.intent_type && logRow.params && typeof logRow.params === 'object') {
      type = logRow.intent_type as DivineIntentType
      body = { ...(logRow.params as IntentBody), intent_id, confirm }
    }
  }

  if (!type || typeof type !== 'string') {
    return { status: 400, body: { error: 'Intent type is required' } }
  }

  const settings = await getSettings(supabase, user.id)
  const analyticsOnly = type === 'get_stats'
  if ((!settings || settings.mode === 'off') && !analyticsOnly) {
    return {
      status: 400,
      body: { error: 'Divine Manager is off. Enable it in the Divine Manager page.' },
    }
  }

  const intentTypeForPolicy = type as RiskyIntentType
  const allowed =
    RISKY_INTENTS.includes(intentTypeForPolicy) &&
    intentTypeForPolicy !== 'publish_queue_item' &&
    isVoiceAutoAllowed(settings, intentTypeForPolicy as 'mass_dm' | 'pricing_changes' | 'content_publish')
  const requiresConfirmation = RISKY_INTENTS.includes(intentTypeForPolicy) && !allowed && !confirm

  if (requiresConfirmation) {
    const { data: logRow } = await supabase
      .from('divine_intent_log')
      .insert({
        user_id: user.id,
        intent_type: type,
        params: body,
        status: 'proposed',
      })
      .select('id')
      .single()
    const id = logRow?.id ?? intent_id
    return {
      status: 200,
      body: {
        status: 'requires_confirmation',
        intent_id: id,
        message: `Confirm this action to proceed. Say "yes, send it" or confirm in the app.`,
        intent_type: type,
      },
    }
  }

  let result: { success: boolean; summary: string; [key: string]: unknown }
  switch (type) {
    case 'mass_dm': {
      const params: MassDmParams = {
        message: body.message ?? '',
        platform: body.platform,
        platforms: body.platforms,
        segment: body.segment,
        filter: body.filter,
        price: body.price,
        mediaIds: body.mediaIds,
      }
      result = await executeMassDm(supabase, user.id, params)
      break
    }
    case 'get_stats': {
      const params: GetStatsParams = { period: body.period, platform: body.platform }
      result = await getStats(supabase, user.id, params)
      break
    }
    case 'content_publish': {
      const platforms = Array.isArray(body.platforms) ? body.platforms : body.platform ? [body.platform] : []
      const params: ContentPublishParams = {
        content: body.content ?? '',
        platforms,
        mediaIds: body.mediaIds,
        mediaUrls: body.mediaUrls,
        scheduledFor: body.scheduledFor,
        contentId: body.contentId,
      }
      result = await executeContentPublish(supabase, user.id, params)
      break
    }
    case 'create_task': {
      const taskType = (body.payload?.type as string) ?? 'content_idea'
      const params: CreateTaskParams = {
        type: taskType,
        summary: body.summary ?? taskType,
        payload: body.payload,
      }
      result = await executeCreateTask(supabase, user.id, params)
      break
    }
    case 'adjust_price': {
      result = {
        success: true,
        summary:
          'Pricing changes are suggestion-only for now. Use the Pricing Optimizer in AI Studio for recommendations; apply changes in your platform settings.',
      }
      break
    }
    case 'send_message': {
      const params: SendMessageParams = {
        fanId: String(body.fanId ?? body.fan_id ?? ''),
        message: String(body.message ?? '').trim(),
        platform: body.platform === 'fansly' ? 'fansly' : 'onlyfans',
        price: typeof body.price === 'number' ? body.price : undefined,
        mediaIds: Array.isArray(body.mediaIds) ? body.mediaIds : undefined,
      }
      result = await executeSendMessage(supabase, user.id, params)
      break
    }
    case 'send_notification': {
      const title = (body.title as string)?.trim() || 'Divine Manager'
      const description = (body.description as string)?.trim() || 'Reminder from your manager.'
      const link = (body.link as string)?.trim() || '/dashboard/divine-manager'
      await insertDivineNotification(supabase, user.id, title, description, link, {
        intent_type: 'send_notification',
      })
      result = { success: true, summary: 'Notification added.' }
      break
    }
    case 'list_fans': {
      const params: ListFansParams = {
        filter: body.filter,
        limit: typeof body.limit === 'number' ? body.limit : undefined,
        offset: typeof body.offset === 'number' ? body.offset : undefined,
        sort: body.sort as ListFansParams['sort'],
      }
      const listResult = await listFans(supabase, user.id, params)
      result = {
        success: listResult.success,
        summary: listResult.summary,
        ...(listResult.fans != null && { fans: listResult.fans }),
        ...(listResult.total != null && { total: listResult.total }),
      }
      break
    }
    case 'get_fan_subscription_history': {
      const fanUserId = (body.userId ?? body.fan_id) as string | undefined
      const params: GetFanSubscriptionHistoryParams = {
        userId: fanUserId ?? '',
        limit: typeof body.limit === 'number' ? body.limit : undefined,
        offset: typeof body.offset === 'number' ? body.offset : undefined,
      }
      const histResult = await getFanSubscriptionHistory(supabase, user.id, params)
      result = {
        success: histResult.success,
        summary: histResult.summary,
        ...(histResult.history != null && { history: histResult.history }),
      }
      break
    }
    case 'list_followings': {
      const params: ListFollowingsParams = {
        filter: body.filter as ListFollowingsParams['filter'],
        limit: typeof body.limit === 'number' ? body.limit : undefined,
        offset: typeof body.offset === 'number' ? body.offset : undefined,
      }
      const followResult = await listFollowings(supabase, user.id, params)
      result = {
        success: followResult.success,
        summary: followResult.summary,
        ...(followResult.followings != null && { followings: followResult.followings }),
      }
      break
    }
    case 'get_top_message': {
      const params: GetTopMessageParams = {
        startDate: body.startDate as string | undefined,
        endDate: body.endDate as string | undefined,
        period: body.period as string | undefined,
      }
      const topResult = await getTopMessage(supabase, user.id, params)
      result = {
        success: topResult.success,
        summary: topResult.summary,
        ...(topResult.message != null && { message: topResult.message }),
        ...(topResult.buyers != null && { buyers: topResult.buyers }),
      }
      break
    }
    case 'get_message_engagement': {
      const ch = body.channel
      const fallback =
        body.type === 'direct' || body.type === 'mass' ? (body.type as 'direct' | 'mass') : undefined
      const params: GetMessageEngagementParams = {
        type: ch === 'direct' || ch === 'mass' ? ch : fallback,
        limit: typeof body.limit === 'number' ? body.limit : undefined,
        offset: typeof body.offset === 'number' ? body.offset : undefined,
        startDate: body.startDate as string | undefined,
        endDate: body.endDate as string | undefined,
      }
      const engResult = await getMessageEngagement(supabase, user.id, params)
      result = {
        success: engResult.success,
        summary: engResult.summary,
        ...(engResult.messages != null && { messages: engResult.messages }),
        ...(engResult.chart != null && { chart: engResult.chart }),
      }
      break
    }
    case 'publish_queue_item': {
      const params: PublishQueueItemParams = {
        queueId: (body.queueId ?? body.queue_id) as string,
      }
      result = await publishQueueItem(supabase, user.id, params)
      break
    }
    case 'get_notifications_summary': {
      result = await getOnlyFansNotificationSummary(supabase, user.id)
      break
    }
    case 'list_notifications': {
      result = await listOnlyFansNotifications(supabase, user.id, {
        limit: typeof body.limit === 'number' ? body.limit : undefined,
        offset: typeof body.offset === 'number' ? body.offset : undefined,
        tab: body.tab as string | undefined,
      })
      break
    }
    case 'mark_notifications_read': {
      result = await markOnlyFansNotificationsRead(supabase, user.id)
      break
    }
    default:
      return { status: 400, body: { error: `Unknown intent type: ${type}` } }
  }

  if (intent_id) {
    await supabase
      .from('divine_intent_log')
      .update({
        status: result.success ? 'executed' : 'failed',
        result_summary: result.summary,
        executed_at: new Date().toISOString(),
      })
      .eq('id', intent_id)
      .eq('user_id', user.id)
  } else {
    await supabase.from('divine_intent_log').insert({
      user_id: user.id,
      intent_type: type,
      params: body,
      status: result.success ? 'executed' : 'failed',
      result_summary: result.summary,
      executed_at: new Date().toISOString(),
    })
  }

  if (result.success && type !== 'send_notification') {
    const notifTitle =
      type === 'mass_dm'
        ? 'Divine: Mass DM sent'
        : type === 'content_publish'
          ? 'Divine: Content published'
          : type === 'create_task'
            ? 'Divine: Task added'
            : type === 'get_stats'
              ? 'Divine: Stats'
              : type === 'send_message'
                ? 'Divine: DM sent'
                : 'Divine Manager'
    await insertDivineNotification(supabase, user.id, notifTitle, result.summary, {
      intent_type: type,
    })
  }

  if (result.success && type === 'publish_queue_item') {
    await insertDivineNotification(supabase, user.id, 'Divine: Queue item published', result.summary, {
      intent_type: 'publish_queue_item',
    })
  }

  return {
    status: 200,
    body: {
      status: 'executed',
      success: result.success,
      summary: result.summary,
      ...(result.results && { results: result.results }),
      ...(result.stats && { stats: result.stats }),
      ...(result.taskId && { task_id: result.taskId }),
      ...(result.fans != null && { fans: result.fans }),
      ...(result.followings != null && { followings: result.followings }),
      ...(result.history != null && { history: result.history }),
      ...(result.message != null && { message: result.message }),
      ...(result.buyers != null && { buyers: result.buyers }),
      ...(result.messages != null && { messages: result.messages }),
      ...(result.chart != null && { chart: result.chart }),
      ...(result.counts != null && { counts: result.counts }),
      ...(result.notifications != null && { notifications: result.notifications }),
    },
  }
}
