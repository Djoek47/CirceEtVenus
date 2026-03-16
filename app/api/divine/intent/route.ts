import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/divine-manager'
import {
  isVoiceAutoAllowed,
  executeMassDm,
  getStats,
  executeContentPublish,
  executeCreateTask,
  type MassDmParams,
  type GetStatsParams,
  type ContentPublishParams,
  type CreateTaskParams,
} from '@/lib/divine-intent-actions'

export const maxDuration = 60

/** Intent types that require confirmation when voice_auto is off. */
const RISKY_INTENTS = ['mass_dm', 'pricing_changes', 'content_publish'] as const
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
      RISKY_INTENTS.includes(intentTypeForPolicy) && isVoiceAutoAllowed(settings, intentTypeForPolicy)
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
        result = {
          success: false,
          summary: 'Single-fan messaging via voice is not implemented yet. Use mass_dm for bulk or Messages in the app.',
        }
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
      const notifTitle = type === 'mass_dm' ? 'Divine: Mass DM sent' : type === 'content_publish' ? 'Divine: Content published' : type === 'create_task' ? 'Divine: Task added' : type === 'get_stats' ? 'Divine: Stats' : 'Divine Manager'
      await insertDivineNotification(supabase, user.id, notifTitle, result.summary)
    }

    return NextResponse.json({
      status: 'executed',
      success: result.success,
      summary: result.summary,
      ...(result.results && { results: result.results }),
      ...(result.stats && { stats: result.stats }),
      ...(result.taskId && { task_id: result.taskId }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Intent execution failed'
    console.error('[divine/intent]', err)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
