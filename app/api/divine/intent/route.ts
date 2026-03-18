import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

export const maxDuration = 60

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

interface IntentBody {
  type: DivineIntentType
  intent_id?: string
  confirm?: boolean
  // mass_dm
  message?: string
  platform?: string
  platforms?: string[]
  segment?: string
  filter?: 'all' | 'active' | 'expired' | 'renewing'
  price?: number
  mediaIds?: string[]
  // get_stats / adjust_price
  period?: string
  tier?: string
  new_price?: number
  delta?: number
  // content_publish
  content?: string
  mediaIds?: string[]
  mediaUrls?: string[]
  scheduledFor?: string
  contentId?: string
  // create_task
  summary?: string
  payload?: Record<string, unknown>
  // send_notification
  title?: string
  description?: string
  link?: string
  // list_fans
  filter?: 'all' | 'active' | 'expired' | 'latest' | 'top'
  sort?: string
  // get_fan_subscription_history
  userId?: string
  // list_followings
  // get_top_message / get_message_engagement
  startDate?: string
  endDate?: string
  period?: string
  type?: 'direct' | 'mass'
  // publish_queue_item
  queueId?: string
  // notifications
  tab?: string
}

async function insertDivineNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string,
  description: string,
  link = '/dashboard/divine-manager'
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'system',
    title,
    description,
    link,
    read: false,
  })
}

/** GET: List recent intent log entries for the current user (action log). */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 10, 50)
    const { data: rows, error } = await supabase
      .from('divine_intent_log')
      .select('id, intent_type, params, status, result_summary, created_at, executed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      // Table may not exist yet (migration 019 not run)
      if (error.code === '42P01') return NextResponse.json({ intents: [] })
      throw error
    }
    return NextResponse.json({ intents: rows ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch intents'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body = (await req.json().catch(() => ({}))) as IntentBody
    let { type, intent_id, confirm } = body

    // When confirming, resolve type and params from the stored intent log
    if (intent_id && confirm) {
      const { data: logRow } = await supabase
        .from('divine_intent_log')
        .select('id, status, intent_type, params')
        .eq('id', intent_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (logRow && (logRow.status === 'executed' || logRow.status === 'rejected')) {
        return NextResponse.json({
          status: 'already_handled',
          message: `Intent ${intent_id} was already ${logRow.status}.`,
          summary: (logRow as { result_summary?: string }).result_summary,
        })
      }
      if (logRow?.intent_type && logRow.params && typeof logRow.params === 'object') {
        type = logRow.intent_type as DivineIntentType
        body = { ...(logRow.params as IntentBody), intent_id, confirm }
      }
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'Intent type is required' }, { status: 400 })
    }

    const settings = await getSettings(supabase, user.id)
    if (!settings || settings.mode === 'off') {
      return NextResponse.json(
        { error: 'Divine Manager is off. Enable it in the Divine Manager page.' },
        { status: 400 }
      )
    }

    const intentTypeForPolicy = type as RiskyIntentType
    const allowed =
      RISKY_INTENTS.includes(intentTypeForPolicy) &&
      intentTypeForPolicy !== 'publish_queue_item' &&
      isVoiceAutoAllowed(settings, intentTypeForPolicy as 'mass_dm' | 'pricing_changes' | 'content_publish')
    const requiresConfirmation =
      RISKY_INTENTS.includes(intentTypeForPolicy) && !allowed && !confirm

    if (requiresConfirmation) {
      // Log as proposed and return intent_id for client to confirm
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
      return NextResponse.json({
        status: 'requires_confirmation',
        intent_id: id,
        message: `Confirm this action to proceed. Say "yes, send it" or confirm in the app.`,
        intent_type: type,
      })
    }

    // Execute
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
        await insertDivineNotification(supabase, user.id, title, description, link)
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
        const params: GetMessageEngagementParams = {
          type: body.type as 'direct' | 'mass' | undefined,
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
        return NextResponse.json({ error: `Unknown intent type: ${type}` }, { status: 400 })
    }

    // Log execution
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
      const notifTitle = type === 'mass_dm' ? 'Divine: Mass DM sent' : type === 'content_publish' ? 'Divine: Content published' : type === 'create_task' ? 'Divine: Task added' : type === 'get_stats' ? 'Divine: Stats' : type === 'send_message' ? 'Divine: DM sent' : 'Divine Manager'
      await insertDivineNotification(supabase, user.id, notifTitle, result.summary)
    }

    if (result.success && type === 'publish_queue_item') {
      await insertDivineNotification(supabase, user.id, 'Divine: Queue item published', result.summary)
    }

    return NextResponse.json({
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
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Intent execution failed'
    console.error('[divine/intent]', err)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
