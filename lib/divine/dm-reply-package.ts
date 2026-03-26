/**
 * Shared DM thread + Circe/Venus/Flirt reply package (OnlyFans).
 * Used by /api/divine/dm-reply-suggestions and divine-manager-chat (no extra HTTP hop).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import {
  generateMessageSuggestionsWithGrok,
  generateMessageSuggestionsWithOpenAI,
} from '@/lib/ai/message-suggestions'
import type { NormalizedChatMessage } from '@/lib/ai/message-suggestions'
import {
  formatThreadTextForAi,
  normalizeSortedRawOfMessages,
} from '@/lib/divine/of-thread-text'

type Mode = 'scan' | 'circe' | 'venus' | 'flirt'

const MAX_AI_MS = 7000

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('AI_TIMEOUT')), ms)
    promise
      .then((value) => {
        clearTimeout(id)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(id)
        reject(err)
      })
  })
}

export type DmReplyPackageResult =
  | {
      error: string
      scan?: undefined
      circeSuggestions?: undefined
      threadPreview?: undefined
    }
  | {
      scan: unknown
      circeSuggestions: string[]
      venusSuggestions: string[]
      flirtSuggestions: string[]
      recommendation: 'circe' | 'venus' | 'flirt' | null
      recommendationReason: string | null
      fan: { id: string; username: string; name: string | null }
      message?: string
      threadPreview: string
    }

export async function fetchDmReplySuggestionsPackage(
  supabase: SupabaseClient,
  userId: string,
  body: { fanId?: string; fan_id?: string; username?: string; name?: string },
): Promise<DmReplyPackageResult> {
  const fanId = body.fanId ?? body.fan_id
  if (!fanId) return { error: 'fanId required' }

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  if (!connection?.access_token) {
    return { error: 'OnlyFans not connected' }
  }

  const api = createOnlyFansAPI(connection.access_token)
  const [threadRes, convRes] = await Promise.all([
    api.getMessages(String(fanId), { limit: 80 }),
    api.getConversations({ limit: 60 }),
  ])
  const fanFromConv = (convRes.conversations || []).find((c: any) => String(c.user?.id) === String(fanId))
  const fan = {
    id: fanId,
    username: body.username ?? fanFromConv?.user?.username ?? 'fan',
    name: body.name ?? fanFromConv?.user?.name ?? null,
  }
  const rawMessages = (threadRes.messages || []).sort((a: any, b: any) =>
    new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime(),
  )
  const messages: NormalizedChatMessage[] = normalizeSortedRawOfMessages(rawMessages)

  const threadPreview =
    messages.length > 0
      ? formatThreadTextForAi(messages, {
          lastN: 50,
          lineMax: 800,
          maxTotalChars: 12000,
        })
      : ''

  if (messages.length === 0) {
    return {
      scan: null,
      circeSuggestions: [],
      venusSuggestions: [],
      flirtSuggestions: [],
      recommendation: null,
      recommendationReason: null,
      fan: { id: String(fanId), username: fan.username, name: fan.name },
      message: 'No messages in thread.',
      threadPreview: '',
    }
  }

  const { data: settings } = await supabase
    .from('divine_manager_settings')
    .select('persona')
    .eq('user_id', userId)
    .maybeSingle()
  const persona = (settings?.persona as Record<string, unknown>) ?? {}
  const niches = (persona.niches as string[]) ?? []
  const boundaries = (persona.boundaries as string[]) ?? []

  const ctxBase = {
    platform: 'onlyfans' as const,
    fan,
    messages,
    niches,
    boundaries,
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, ai_credits_used')
    .eq('user_id', userId)
    .maybeSingle()
  const isPro =
    !!subscription?.plan_id &&
    ['venus-pro', 'circe-elite', 'divine-duo'].includes(String(subscription.plan_id).toLowerCase())
  const xaiKey = process.env.XAI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  const runMode = async (mode: Mode) => {
    const ctx = { ...ctxBase, mode }
    if (isPro && xaiKey) return generateMessageSuggestionsWithGrok(xaiKey, ctx)
    if (openaiKey) return generateMessageSuggestionsWithOpenAI(ctx)
    if (xaiKey) return generateMessageSuggestionsWithGrok(xaiKey, ctx)
    return null
  }

  let scanResult: unknown = null
  let circeResult: unknown = null
  let venusResult: unknown = null
  let flirtResult: unknown = null

  try {
    ;[scanResult, circeResult, venusResult, flirtResult] = await withTimeout(
      Promise.all([runMode('scan'), runMode('circe'), runMode('venus'), runMode('flirt')]),
      MAX_AI_MS,
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'AI_TIMEOUT') {
      return {
        scan: null,
        circeSuggestions: [],
        venusSuggestions: [],
        flirtSuggestions: [],
        recommendation: null,
        recommendationReason: 'Divine took too long to generate suggestions; please try again.',
        fan: { id: String(fanId), username: fan.username, name: fan.name },
        threadPreview,
      }
    }
    throw err
  }

  const scan = scanResult && 'insights' in (scanResult as object)
    ? (scanResult as { insights?: { insights?: string[]; riskFlags?: string[]; suggestedAngles?: string[] } }).insights ?? null
    : null
  const circeSuggestions = (circeResult && 'suggestions' in circeResult ? (circeResult.suggestions || []) : [])
    .map((s: { text?: string }) => s.text)
    .filter(Boolean) as string[]
  const venusSuggestions = (venusResult && 'suggestions' in venusResult ? (venusResult.suggestions || []) : [])
    .map((s: { text?: string }) => s.text)
    .filter(Boolean) as string[]
  const flirtSuggestions = (flirtResult && 'suggestions' in flirtResult ? (flirtResult.suggestions || []) : [])
    .map((s: { text?: string }) => s.text)
    .filter(Boolean) as string[]

  let recommendation: 'circe' | 'venus' | 'flirt' | null = null
  let recommendationReason: string | null = null
  if (openaiKey && (circeSuggestions.length || venusSuggestions.length || flirtSuggestions.length)) {
    try {
      const { generateText } = await import('ai')
      const { gateway } = await import('@ai-sdk/gateway')
      const scanSummary = scan
        ? `Scan: ${(scan.insights || []).slice(0, 2).join('; ')}. Risks: ${(scan.riskFlags || []).slice(0, 2).join('; ')}.`
        : ''
      const circeSample = circeSuggestions[0] ? circeSuggestions[0].slice(0, 150) : ''
      const venusSample = venusSuggestions[0] ? venusSuggestions[0].slice(0, 150) : ''
      const flirtSample = flirtSuggestions[0] ? flirtSuggestions[0].slice(0, 150) : ''
      const { text } = await generateText({
        model: gateway('openai/gpt-4o-mini'),
        temperature: 0.3,
        maxTokens: 120,
        prompt: `You are the Divine Manager. Given thread scan and three reply styles, pick ONE persona for the creator to use for the next reply. Reply with exactly two lines:
Line 1: one word: CIRCE or VENUS or FLIRT
Line 2: one short sentence why (e.g. "Retention risk; Circe keeps them subscribed.")

${scanSummary}

Circe reply sample: ${circeSample || 'none'}
Venus reply sample: ${venusSample || 'none'}
Flirt reply sample: ${flirtSample || 'none'}`,
      })
      const firstLine = (text || '').trim().split('\n')[0]?.toUpperCase() || ''
      if (firstLine.includes('CIRCE')) recommendation = 'circe'
      else if (firstLine.includes('VENUS')) recommendation = 'venus'
      else if (firstLine.includes('FLIRT')) recommendation = 'flirt'
      const secondLine = (text || '').trim().split('\n').slice(1).join(' ').trim()
      if (secondLine) recommendationReason = secondLine.slice(0, 200)
    } catch {
      // ignore recommendation failure
    }
  }

  return {
    scan,
    circeSuggestions,
    venusSuggestions,
    flirtSuggestions,
    recommendation,
    recommendationReason,
    fan: { id: String(fanId), username: fan.username, name: fan.name },
    threadPreview,
  }
}
