import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'

type Role = 'creator' | 'fan'
type Mode = 'scan' | 'circe' | 'venus' | 'flirt'

export type NormalizedChatMessage = {
  from: Role
  text: string
  createdAt: string
}

export type SuggestionGoal =
  | 'save_churn'
  | 'upsell'
  | 'reassure'
  | 'flirt'
  | 'convert_sale'
  | 'warmup'

export type SpiceLevel = 'soft' | 'medium' | 'intense'

export type MessageSuggestion = {
  id: string
  text: string
  goal: SuggestionGoal
  spiceLevel: SpiceLevel
}

export type ScanInsights = {
  insights: string[]
  riskFlags: string[]
  suggestedAngles: string[]
  behavior?: string
}

export type MessageSuggestionResult = {
  mode: Mode
  model: 'grok' | 'openai'
  insights?: ScanInsights
  suggestions?: MessageSuggestion[]
}

export type SuggestionRequestContext = {
  mode: Mode
  platform: 'onlyfans' | 'fansly'
  fan: { id: string | number; username?: string; name?: string }
  messages: NormalizedChatMessage[]
  /** Prepended to the thread preview for the model (e.g. fan AI summary + stored snapshot). */
  threadSupplement?: string
  tonePreferences?: string[]
  niches?: string[]
  boundaries?: string[]
  flirtControls?: {
    explicitnessLevel?: number
    inspirationKeywords?: string
  }
  creatorPronouns?: string
  creatorGenderIdentity?: string
}

function buildConversationPreview(ctx: SuggestionRequestContext): string {
  const recent = ctx.messages.slice(-20)
  const lines = recent.map((m) => {
    const who = m.from === 'creator' ? 'Creator' : 'Fan'
    return `${who}: ${m.text.replace(/\s+/g, ' ').trim()}`
  })
  const base = lines.join('\n')
  const sup = ctx.threadSupplement?.trim()
  if (sup) {
    return `${sup.slice(0, 1800)}\n---\n${base}`.slice(0, 4000)
  }
  return base.slice(0, 4000)
}

function buildBaseSafetyBlock() {
  return `SAFETY & COMPLIANCE RULES (MUST FOLLOW):
- NO minors, ageplay, incest, bestiality, non-consensual scenarios, or illegal content.
- NO explicit pornographic descriptions of genitals or sex acts; be suggestive, flirty, and adult, not graphic.
- ALWAYS respect consent and boundaries.
- Language should feel natural for an adult creator on platforms like OnlyFans/Fansly.`
}

export async function generateMessageSuggestionsWithGrok(
  apiKey: string,
  ctx: SuggestionRequestContext
): Promise<MessageSuggestionResult> {
  const conversation = buildConversationPreview(ctx)
  const safety = buildBaseSafetyBlock()

  const nicheLine =
    ctx.niches && ctx.niches.length
      ? `Creator content niche: ${ctx.niches.join(', ')}. Boundaries: ${
          ctx.boundaries && ctx.boundaries.length ? ctx.boundaries.join(', ') : 'none specified'
        }.`
      : 'Creator content niche: generic adult creator (respect all boundaries).'

  const persona =
    ctx.mode === 'circe'
      ? 'You are Circe, goddess of retention and enchantment, focused on keeping paying fans engaged and preventing churn.'
      : ctx.mode === 'venus'
        ? 'You are Venus, goddess of love and attraction, focused on seduction, flirtation, and gently steering fans toward paid interactions.'
        : ctx.mode === 'flirt'
          ? 'You are a pure flirting persona for an adult creator: your role is to generate natural, seductive, emotionally tuned replies without mentioning business, conversion, or retention strategy.'
          : 'You are an analyst helping a creator understand a fan conversation and how best to respond.'

  let task: string
  if (ctx.mode === 'scan') {
    task = `Read the recent chat between creator and fan and return ONLY JSON:
{
  "insights": [ "short bullet insight", ... ],
  "riskFlags": [ "short risk or boundary to watch", ... ],
  "suggestedAngles": [ "recommended tone or approach", ... ],
  "behavior": "likes_praise | masochist | bratty | service_top | unknown"
}

Focus on:
- fan mood (needy, submissive, bratty, bored, etc.),
- buy intent (likely to buy more, hesitant, bargain-hunting),
- boundaries/kinks you can safely infer (without inventing extreme or illegal stuff),
- what tone the creator should AVOID.`
  } else {
    const flavor =
      ctx.mode === 'circe'
        ? 'Retention, upsells, reassurance, and preventing churn.'
        : ctx.mode === 'venus'
          ? 'Attraction, flirtation, and gently steering towards paid content and tips.'
          : 'Natural flirting, chemistry, and emotional connection only (no explicit sales or business language).'

    const flirtControlText =
      ctx.mode === 'flirt'
        ? `
Flirt controls for this request:
- explicitnessLevel: ${typeof ctx.flirtControls?.explicitnessLevel === 'number' ? ctx.flirtControls.explicitnessLevel : 2}
- inspirationKeywords: ${ctx.flirtControls?.inspirationKeywords?.trim() || 'none provided'}
Use these to steer tone and style only. Do NOT repeat the keywords; just embody them.`
        : ''

    task = `Using the recent conversation, generate 2-3 candidate replies the creator could send next.
Return ONLY JSON:
{
  "behavior": "likes_praise | masochist | bratty | service_top | unknown",
  "suggestions": [
    {
      "id": "short-stable-id",
      "text": "full reply text in first person from the creator",
      "goal": "save_churn | upsell | reassure | flirt | convert_sale | warmup",
      "spiceLevel": "soft | medium | intense"
    }
  ]
}

Focus on: ${flavor}
- Keep replies in the same language/register as the chat.
- \"soft\" = playful and light, \"medium\" = more teasing and sultry, \"intense\" = very spicy but still within the safety rules.${ctx.mode === 'flirt' ? flirtControlText : ''}`
  }

  const identityLine =
    ctx.creatorPronouns || ctx.creatorGenderIdentity
      ? `Creator identity:
- Pronouns: ${ctx.creatorPronouns || 'not specified'}
- Gender identity: ${ctx.creatorGenderIdentity || 'not specified'}
Always use these pronouns for the creator and never misgender them.`
      : ''

  const prompt = `${persona}

Platform: ${ctx.platform}
Fan handle: @${ctx.fan.username || 'fan'}

${identityLine}

${nicheLine}
${safety}

Recent conversation:
${conversation}

${task}`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Updated to current Grok chat model; old grok-2-* models are deprecated
      model: 'grok-4-1-fast-reasoning',
      temperature: 0.65,
      messages: [
        { role: 'system', content: 'Return ONLY JSON. Do not include any commentary.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Grok message suggestions error (${res.status}): ${text.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    return { mode: ctx.mode, model: 'grok' }
  }

  try {
    const parsed = JSON.parse(content)
    if (ctx.mode === 'scan') {
      const insights: ScanInsights = {
        insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.map(String) : [],
        suggestedAngles: Array.isArray(parsed.suggestedAngles) ? parsed.suggestedAngles.map(String) : [],
        behavior: typeof parsed.behavior === 'string' ? parsed.behavior : undefined,
      }
      return { mode: ctx.mode, model: 'grok', insights }
    }

    const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const suggestions: MessageSuggestion[] = suggestionsRaw
      .filter((s: any) => s && typeof s.text === 'string')
      .map((s: any, idx: number) => ({
        id: typeof s.id === 'string' && s.id ? s.id : `sugg-${idx + 1}`,
        text: s.text,
        goal: (s.goal as SuggestionGoal) || 'warmup',
        spiceLevel: (s.spiceLevel as SpiceLevel) || 'soft',
      }))

    return {
      mode: ctx.mode,
      model: 'grok',
      suggestions,
    }
  } catch {
    return { mode: ctx.mode, model: 'grok' }
  }
}

export async function generateMessageSuggestionsWithOpenAI(
  ctx: SuggestionRequestContext
): Promise<MessageSuggestionResult> {
  const conversation = buildConversationPreview(ctx)
  const safety = buildBaseSafetyBlock()

  const nicheLine =
    ctx.niches && ctx.niches.length
      ? `Creator content niche: ${ctx.niches.join(', ')}. Boundaries: ${
          ctx.boundaries && ctx.boundaries.length ? ctx.boundaries.join(', ') : 'none specified'
        }.`
      : 'Creator content niche: generic adult creator (respect all boundaries).'

  const persona =
    ctx.mode === 'circe'
      ? 'You are Circe, a retention strategist for creators.'
      : ctx.mode === 'venus'
        ? 'You are Venus, a flirtatious growth strategist for creators, mixing seduction with gentle sales instincts.'
        : ctx.mode === 'flirt'
          ? 'You are a pure flirting companion for an adult creator. Your only job is to generate natural, seductive, emotionally tuned replies without sounding like a marketer or strategist.'
          : 'You are an analyst helping a creator understand a fan conversation.'

  let instruction: string
  if (ctx.mode === 'scan') {
    instruction = `Read the recent chat between creator and fan and return ONLY JSON:
{
  "insights": [ "short bullet insight", ... ],
  "riskFlags": [ "short risk or boundary to watch", ... ],
  "suggestedAngles": [ "recommended tone or approach", ... ],
  "behavior": "likes_praise | masochist | bratty | service_top | unknown"
}`
  } else {
    const flavor =
      ctx.mode === 'circe'
        ? 'Retention, upsells, reassurance, and preventing churn.'
        : ctx.mode === 'venus'
          ? 'Attraction, flirtation, and gently steering towards paid content and tips.'
          : 'Attraction, flirtation, emotional chemistry, and keeping the fan eager to talk more – without explicit sales language.'

    instruction = `Using the recent conversation, generate 2-3 candidate replies the creator could send next.
Return ONLY JSON:
{
  "behavior": "likes_praise | masochist | bratty | service_top | unknown",
  "suggestions": [
    {
      "id": "short-stable-id",
      "text": "full reply text in first person from the creator",
      "goal": "save_churn | upsell | reassure | flirt | convert_sale | warmup",
      "spiceLevel": "soft | medium | intense"
    }
  ]
}

Focus on: ${flavor}`
  }

  const userPrompt = `${persona}

Platform: ${ctx.platform}
Fan handle: @${ctx.fan.username || 'fan'}

${nicheLine}
${safety}

Recent conversation:
${conversation}

${instruction}`

  const { text } = await generateText({
    // Use Vercel AI Gateway model alias (this is what you had working before)
    model: gateway('openai/gpt-4o-mini'),
    temperature: 0.5,
    maxTokens: 800,
    prompt: userPrompt,
  })

  try {
    const match = text.match(/\{[\s\S]*\}/)
    const jsonStr = match ? match[0] : text
    const parsed: any = JSON.parse(jsonStr)

    if (ctx.mode === 'scan') {
      const insights: ScanInsights = {
        insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.map(String) : [],
        suggestedAngles: Array.isArray(parsed.suggestedAngles) ? parsed.suggestedAngles.map(String) : [],
        behavior: typeof parsed.behavior === 'string' ? parsed.behavior : undefined,
      }
      return { mode: ctx.mode, model: 'openai', insights }
    }

    const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const suggestions: MessageSuggestion[] = suggestionsRaw
      .filter((s: any) => s && typeof s.text === 'string')
      .map((s: any, idx: number) => ({
        id: typeof s.id === 'string' && s.id ? s.id : `sugg-${idx + 1}`,
        text: s.text,
        goal: (s.goal as SuggestionGoal) || 'warmup',
        spiceLevel: (s.spiceLevel as SpiceLevel) || 'soft',
      }))

    return { mode: ctx.mode, model: 'openai', suggestions }
  } catch {
    return { mode: ctx.mode, model: 'openai' }
  }
}

