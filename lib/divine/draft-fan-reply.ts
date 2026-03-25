import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchDmReplySuggestionsPackage } from '@/lib/divine/dm-reply-package'
import { type MimicProfileV1, parseMimicProfile, DEFAULT_MIMIC_PROFILE } from '@/lib/divine/mimic-types'

const OPENAI_MODEL = 'gpt-4o-mini'

export async function draftFanReplyWithMimic(opts: {
  supabase: SupabaseClient
  userId: string
  fanId: string
  mimicRaw: unknown
}): Promise<{ ok: true; text: string; note: string } | { ok: false; error: string }> {
  const mimic = parseMimicProfile(opts.mimicRaw) ?? DEFAULT_MIMIC_PROFILE

  if (!mimic.consentFanFacingDrafts) {
    return {
      ok: false,
      error:
        'Fan-facing drafts are off. Complete the Mimic Test on Divine Manager and enable “Allow fan-facing drafts”, or turn it on in Mimic settings.',
    }
  }

  const pkg = await fetchDmReplySuggestionsPackage(opts.supabase, opts.userId, { fanId: opts.fanId })
  if ('error' in pkg && pkg.error) {
    return { ok: false, error: pkg.error }
  }
  if ('message' in pkg && pkg.message === 'No messages in thread.') {
    return { ok: false, error: 'No messages in thread for this fan.' }
  }

  const thread = pkg.threadPreview || ''
  const scan = pkg.scan as { insights?: string[]; riskFlags?: string[] } | null
  const scanBits = scan?.insights?.length
    ? `Scan: ${scan.insights.slice(0, 3).join('; ')}`
    : ''

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'OPENAI_API_KEY is not configured.' }
  }

  const human = ['none', 'very rare small typos', 'occasional casual typos', 'more informal typos'][
    Math.min(3, Math.max(0, mimic.humanizationLevel ?? 1))
  ]

  const system = `You write a single reply message for a fan as if YOU are the creator, matching their voice.
Rules:
- Stay within the creator boundaries and taboo list; never violate banned phrases.
- Output ONLY the message text to send (no quotes, no preamble). Max ~600 characters unless thread needs more.
- Do not claim to be an AI in the message body.
- Humanization hint: ${human}.
- If "never send without review" is on, the app will still show this as a draft—the creator approves before sending.`

  const user = `Mimic profile (JSON):
${JSON.stringify(
  {
    toneWarmth: mimic.toneWarmth,
    flirtCeiling: mimic.flirtCeiling,
    humorLevel: mimic.humorLevel,
    tabooTopics: mimic.tabooTopics,
    bannedPhrases: mimic.bannedPhrases,
    signaturePhrases: mimic.signaturePhrases,
    exemplarReplies: (mimic.exemplarReplies ?? []).slice(0, 5),
    notes: mimic.notes,
  },
  null,
  2,
)}

Recent thread (newest context at end):
${thread.slice(0, 8000)}

${scanBits}

Write one reply that fits the thread and the mimic profile.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.75,
      max_tokens: 500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return { ok: false, error: `Draft failed: ${t.slice(0, 200)}` }
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (!text) {
    return { ok: false, error: 'Empty draft from model.' }
  }

  const note = mimic.neverSendWithoutReview !== false
    ? 'Draft only—review before sending. Fan-facing AI drafts require your approval.'
    : 'Review recommended before sending.'

  return { ok: true, text, note }
}
