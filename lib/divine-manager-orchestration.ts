import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSettings, getTasks, createTask, updateTask, type DivineManagerSettingsRow, type DivineManagerTaskRow } from '@/lib/divine-manager'

/** Build system prompt for the Divine Manager brain. Preference hints from past approve/skip behavior. */
function buildSystemPrompt(settings: DivineManagerSettingsRow, preferenceHint: string): string {
  const persona = settings.persona ?? {}
  const goals = settings.goals ?? {}
  const rules = settings.automation_rules ?? {}
  return `You are the Divine Manager (Big Pimping) for a creator. You coordinate posts, DMs, pricing, and growth using Circe & Venus tools. You never role-play as the creator; you always speak as their manager.

Creator persona: tone ${persona.tone ?? 'friendly'}, flirty level ${persona.flirtyLevel ?? 'mild'}. Boundaries: ${(persona.boundaries ?? []).join('; ') || 'none specified'}.
Goals: ${(goals.qualitativeGoals ?? []).join(', ') || 'general growth'}.
Automation allowed: auto-post ${rules.autoPostSchedule?.enabled ? 'yes' : 'no'}, welcome DM ${rules.autoWelcomeDm?.enabled ? 'yes' : 'no'}, tip follow-up ${rules.autoFollowUpAfterTips?.enabled ? 'yes' : 'no'}.
${preferenceHint ? `Preference learning (prioritize types they often approve, avoid types they often dismiss): ${preferenceHint}` : ''}

Given recent tasks and context, suggest 1-5 concrete next tasks. Types: post_suggestion, dm_welcome, dm_followup, pricing_change, content_idea, churn_review, engagement_reminder.
Return a JSON object with a "tasks" array. Each task: type, summary, optional suggestedText, platform, source (e.g. "churn_predictor", "content_ideas", "manager").`
}

/**
 * Run the Divine Manager brain for a user: load settings and recent tasks, call AI to suggest tasks, create them in DB.
 * Use with user-scoped supabase (POST from app) or service-role supabase (cron) for the given userId.
 */
export async function runDivineManagerBrain(
  supabase: SupabaseClient,
  userId: string
): Promise<DivineManagerTaskRow[]> {
  const settings = await getSettings(supabase, userId)
  if (!settings || settings.mode === 'off') return []

  const recentTasks = await getTasks(supabase, userId, { limit: 15 })
  const recentSummary = recentTasks
    .slice(0, 10)
    .map((t) => `[${t.status}] ${t.type}: ${JSON.stringify(t.payload).slice(0, 80)}...`)
    .join('\n')

  // Preference learning: from all tasks, count approved (executed) vs dismissed (skipped) by type
  const allTasks = await getTasks(supabase, userId, { limit: 100 })
  const byType: Record<string, { approved: number; dismissed: number }> = {}
  for (const t of allTasks) {
    if (t.status !== 'executed' && t.status !== 'skipped') continue
    if (!byType[t.type]) byType[t.type] = { approved: 0, dismissed: 0 }
    if (t.status === 'executed') byType[t.type].approved += 1
    else byType[t.type].dismissed += 1
  }
  const preferenceHint = Object.entries(byType)
    .filter(([, v]) => v.approved > 0 || v.dismissed > 0)
    .map(([type, v]) => `${type}: ${v.approved} approved, ${v.dismissed} dismissed`)
    .join('; ') || ''

  const systemPrompt = buildSystemPrompt(settings, preferenceHint)
  const userPrompt = `Recent tasks:\n${recentSummary || 'None yet.'}\n\nSuggest the next 1-5 tasks as JSON: { "tasks": [ { "type": "...", "summary": "...", "suggestedText": "optional", "platform": "onlyfans|fansly", "source": "manager" } ] }`

  const { text } = await generateText({
    model: gateway('openai/gpt-4o-mini'),
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 1500,
  })

  const created: DivineManagerTaskRow[] = []
  try {
    const match = text.match(/\{[\s\S]*\}/)
    const json = match ? JSON.parse(match[0]) : null
    const tasks = json?.tasks
    if (!Array.isArray(tasks) || tasks.length === 0) return created

    const rules = settings.automation_rules ?? {}
    const isSemiAuto = settings.mode === 'semi_auto'
    const ruleEnabled = (type: string) => {
      if (type === 'dm_welcome') return rules.autoWelcomeDm?.enabled
      if (type === 'dm_followup') return rules.autoFollowUpAfterTips?.enabled
      if (type === 'post_suggestion') return rules.autoPostSchedule?.enabled
      return false
    }

    for (const t of tasks.slice(0, 5)) {
      const type = typeof t.type === 'string' ? t.type : 'content_idea'
      const summary = typeof t.summary === 'string' ? t.summary : ''
      const payload: Record<string, unknown> = { summary }
      if (typeof t.suggestedText === 'string') payload.suggestedText = t.suggestedText
      const status = isSemiAuto && ruleEnabled(type) ? 'scheduled' : 'suggested'
      const row = await createTask(supabase, {
        user_id: userId,
        type,
        status,
        payload,
        source: typeof t.source === 'string' ? t.source : 'manager',
      })
      created.push(row)
    }
  } catch {
    // If JSON parse or insert fails, still return what we have
  }
  return created
}

/**
 * Execute scheduled tasks for a user (semi_auto). For now, marks them executed as a placeholder.
 * Real execution (e.g. send welcome DM via platform API) can be wired when fan lists and APIs are ready.
 */
export async function executeScheduledTasksForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ executed: number; failed: number }> {
  const { data: scheduled } = await supabase
    .from('divine_manager_tasks')
    .select('id, type, payload')
    .eq('user_id', userId)
    .eq('status', 'scheduled')

  let executed = 0
  let failed = 0
  for (const t of scheduled ?? []) {
    try {
      // Placeholder: real execution would call OnlyFans/Fansly API to send DM or create post
      await updateTask(supabase, t.id, { status: 'executed', executed_at: new Date().toISOString() })
      executed += 1
    } catch {
      await updateTask(supabase, t.id, { status: 'failed' }).catch(() => {})
      failed += 1
    }
  }
  return { executed, failed }
}
