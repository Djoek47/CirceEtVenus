import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import {
  generateMessageSuggestionsWithGrok,
  generateMessageSuggestionsWithOpenAI,
} from '@/lib/ai/message-suggestions'
import type { NormalizedChatMessage } from '@/lib/ai/message-suggestions'

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

/**
 * POST: Get Scan Thread + Circe / Venus / Flirt reply suggestions for a fan, plus a recommendation.
 * Body: { fanId: string, username?: string, name?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const fanId = body.fanId ?? body.fan_id
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI(connection.access_token)
    const [threadRes, convRes] = await Promise.all([
      api.getMessages(String(fanId), { limit: 30 }),
      api.getConversations({ limit: 60 }),
    ])
    const fanFromConv = (convRes.conversations || []).find((c: any) => String(c.user?.id) === String(fanId))
    const fan = {
      id: fanId,
      username: body.username ?? fanFromConv?.user?.username ?? 'fan',
      name: body.name ?? fanFromConv?.user?.name ?? null,
    }
    const rawMessages = (threadRes.messages || []).sort((a: any, b: any) =>
      new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()
    )
    const messages: NormalizedChatMessage[] = rawMessages
      .filter((m: any) => m?.text?.trim())
      .map((m: any) => ({
        from: m.isSentByMe ? 'creator' as const : 'fan' as const,
        text: String(m.text || '').replace(/<[^>]+>/g, ' ').trim(),
        createdAt: m.createdAt || new Date().toISOString(),
      }))

    if (messages.length === 0) {
      return NextResponse.json({
        scan: null,
        circeSuggestions: [],
        venusSuggestions: [],
        flirtSuggestions: [],
        recommendation: null,
        recommendationReason: null,
        message: 'No messages in thread.',
      })
    }

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('persona')
      .eq('user_id', user.id)
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
      .eq('user_id', user.id)
      .maybeSingle()
    const isPro = !!subscription?.plan_id && ['venus-pro', 'circe-elite', 'divine-duo'].includes(String(subscription.plan_id).toLowerCase())
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
        Promise.all([
          runMode('scan'),
          runMode('circe'),
          runMode('venus'),
          runMode('flirt'),
        ]),
        MAX_AI_MS,
      )
    } catch (err) {
      if (err instanceof Error && err.message === 'AI_TIMEOUT') {
        return NextResponse.json({
          scan: null,
          circeSuggestions: [],
          venusSuggestions: [],
          flirtSuggestions: [],
          recommendation: null,
          recommendationReason: 'Divine took too long to generate suggestions; please try again.',
          fan: { id: fanId, username: fan.username, name: fan.name },
        })
      }
      throw err
    }

    const scan = scanResult && 'insights' in scanResult ? (scanResult as { insights?: { insights?: string[]; riskFlags?: string[]; suggestedAngles?: string[] } }).insights ?? null : null
    const circeSuggestions = (circeResult && 'suggestions' in circeResult ? (circeResult.suggestions || []) : []).map((s: { text?: string }) => s.text).filter(Boolean) as string[]
    const venusSuggestions = (venusResult && 'suggestions' in venusResult ? (venusResult.suggestions || []) : []).map((s: { text?: string }) => s.text).filter(Boolean) as string[]
    const flirtSuggestions = (flirtResult && 'suggestions' in flirtResult ? (flirtResult.suggestions || []) : []).map((s: { text?: string }) => s.text).filter(Boolean) as string[]

    let recommendation: 'circe' | 'venus' | 'flirt' | null = null
    let recommendationReason: string | null = null
    if (openaiKey && (circeSuggestions.length || venusSuggestions.length || flirtSuggestions.length)) {
      try {
        const { generateText } = await import('ai')
        const { gateway } = await import('@ai-sdk/gateway')
        const scanSummary = scan ? `Scan: ${(scan.insights || []).slice(0, 2).join('; ')}. Risks: ${(scan.riskFlags || []).slice(0, 2).join('; ')}.` : ''
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

    return NextResponse.json({
      scan,
      circeSuggestions,
      venusSuggestions,
      flirtSuggestions,
      recommendation,
      recommendationReason,
      fan: { id: fanId, username: fan.username, name: fan.name },
    })
  } catch (e) {
    console.error('[divine/dm-reply-suggestions]', e)
    return NextResponse.json({ error: 'Failed to generate reply suggestions' }, { status: 500 })
  }
}
