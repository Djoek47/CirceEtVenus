import type { SupabaseClient } from '@supabase/supabase-js'

export type DivineManagerMode = 'off' | 'suggest_only' | 'semi_auto'
export type DivineManagerTaskStatus = 'suggested' | 'scheduled' | 'executed' | 'skipped' | 'failed'

export interface DivineManagerPersona {
  tone?: string
  boundaries?: string[]
  examplePhrases?: string[]
  flirtyLevel?: 'none' | 'mild' | 'moderate' | 'high'
  [key: string]: unknown
}

export interface DivineManagerGoals {
  targetSubscribers?: number
  targetRetention?: number
  targetARPU?: number
  qualitativeGoals?: string[]
  [key: string]: unknown
}

export interface AutomationRule {
  enabled?: boolean
  timeWindows?: { start: string; end: string }[]
  maxPerDay?: number
  messageStyle?: string
  [key: string]: unknown
}

/** Per-intent voice automation: when true, Divine can execute without asking. Analytics (get_stats) is always safe and never requires confirmation. */
export interface DivineManagerVoiceAuto {
  mass_dm?: boolean
  pricing_changes?: boolean
  content_publish?: boolean
  /** Analytics-only intents (e.g. get_stats) are always allowed; this flag is for future use. */
  analytics_only?: boolean
  [key: string]: boolean | undefined
}

/** Optional alerts + job hints stored in automation_rules JSONB. */
export interface DivineManagerAutomationAlerts {
  /** Create a Divine Manager task when a tip exceeds the threshold (default on). */
  tasks_for_whale_tips?: boolean
  /** Minimum tip (USD) to create an urgent task (default 100). */
  whale_tip_min_dollars?: number
  /** If true, DMCA / leak workflows only create drafts until you confirm (default true). */
  dmca_draft_requires_confirmation?: boolean
  [key: string]: unknown
}

export interface DivineManagerAutomationJobs {
  /** Future: schedule vault resale campaigns via tasks (off by default). */
  vault_resale_enabled?: boolean
  /** Future: batch mass DM segments (off by default). */
  mass_dm_batch_enabled?: boolean
  [key: string]: unknown
}

export interface DivineManagerAutomationRules {
  autoPostSchedule?: AutomationRule
  autoWelcomeDm?: AutomationRule
  autoFollowUpAfterTips?: AutomationRule
  /** Voice control: allow auto-execute for these intents (otherwise requires confirmation). */
  voice_auto?: DivineManagerVoiceAuto
  alerts?: DivineManagerAutomationAlerts
  jobs?: DivineManagerAutomationJobs
  [key: string]: AutomationRule | DivineManagerVoiceAuto | DivineManagerAutomationAlerts | DivineManagerAutomationJobs | undefined
}

/** OF user-list housekeeping: optional auto-create + per-segment list overrides. */
export type HousekeepingSegmentKey = 'whale_spend' | 'active_chatter' | 'cold'

export interface HousekeepingSegmentRule {
  segment: HousekeepingSegmentKey
  /** OnlyFans user list id (skips name lookup when set). */
  listId?: string
  /** Display name for auto-create or matching existing list. */
  listName?: string
  spendMin?: number
  chatDays?: number
  /** For cold segment: max total spend to qualify. */
  coldSpendMax?: number
}

export interface HousekeepingListsConfig {
  enabled?: boolean
  auto_create_lists?: boolean
  segments?: HousekeepingSegmentRule[]
  last_sync_at?: string
}

export interface DivineManagerSettingsRow {
  user_id: string
  persona: DivineManagerPersona
  goals: DivineManagerGoals
  automation_rules: DivineManagerAutomationRules
  /** OnlyFans list sync (cron + settings). See lib/housekeeping-fan-lists.ts */
  housekeeping_lists?: HousekeepingListsConfig
  /** Mimic Test profile (fan-facing draft style). See lib/divine/mimic-types.ts */
  mimic_profile?: unknown
  manager_archetype: string
  notification_settings: {
    level?: 'none' | 'only_issues' | 'daily_digest' | 'all'
    channel?: 'in_app' | 'email' | 'both'
    /** OpenAI TTS/Realtime voice id (e.g. marin, cedar, shimmer). Default: marin. */
    voice?: string
    [key: string]: unknown
  }
  beta_acknowledged?: boolean
  mode: DivineManagerMode
  created_at: string
  updated_at: string
}

export interface DivineManagerTaskPayload {
  suggestedText?: string
  targetFans?: string[]
  platform?: string
  scheduledTime?: string
  [key: string]: unknown
}

export interface DivineManagerTaskRow {
  id: string
  user_id: string
  type: string
  category?: string | null
  status: DivineManagerTaskStatus
  payload: DivineManagerTaskPayload
  source: string | null
  scheduled_for: string | null
  executed_at: string | null
  created_at: string
  updated_at: string
}

export interface DivineManagerSettingsInsert {
  persona?: DivineManagerPersona
  goals?: DivineManagerGoals
  automation_rules?: DivineManagerAutomationRules
  housekeeping_lists?: HousekeepingListsConfig
  manager_archetype?: string
  notification_settings?: DivineManagerSettingsRow['notification_settings']
  beta_acknowledged?: boolean
  mode?: DivineManagerMode
}

/** OpenAI TTS/Realtime voice IDs. Default: marin. */
export const DIVINE_VOICES = [
  'marin',
  'cedar',
  'shimmer',
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'verse',
] as const

export type DivineVoiceId = (typeof DIVINE_VOICES)[number]

/** Resolve stored voice preference to a valid OpenAI voice; default marin. */
export function getDivineVoice(stored: string | undefined): DivineVoiceId {
  if (stored && DIVINE_VOICES.includes(stored as DivineVoiceId)) return stored as DivineVoiceId
  return 'marin'
}

export interface DivineManagerTaskInsert {
  user_id: string
  type: string
  status?: DivineManagerTaskStatus
  payload?: DivineManagerTaskPayload
  source?: string | null
  scheduled_for?: string | null
}

/** Get settings for a user. Returns null if none (first-run). */
export async function getSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<DivineManagerSettingsRow | null> {
  const { data, error } = await supabase
    .from('divine_manager_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as DivineManagerSettingsRow | null
}

/** Create or update settings. */
export async function upsertSettings(
  supabase: SupabaseClient,
  userId: string,
  payload: DivineManagerSettingsInsert
): Promise<DivineManagerSettingsRow> {
  const { data, error } = await supabase
    .from('divine_manager_settings')
    .upsert(
      {
        user_id: userId,
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as DivineManagerSettingsRow
}

/** Get tasks for a user. Optional filters: status, from date, limit. */
export async function getTasks(
  supabase: SupabaseClient,
  userId: string,
  opts?: { status?: DivineManagerTaskStatus; fromDate?: string; limit?: number }
): Promise<DivineManagerTaskRow[]> {
  let q = supabase
    .from('divine_manager_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.fromDate) q = q.gte('scheduled_for', opts.fromDate)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as DivineManagerTaskRow[]
}

/** Create a task. */
export async function createTask(
  supabase: SupabaseClient,
  task: DivineManagerTaskInsert
): Promise<DivineManagerTaskRow> {
  const { data, error } = await supabase
    .from('divine_manager_tasks')
    .insert({
      ...task,
      status: task.status ?? 'suggested',
      payload: task.payload ?? {},
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data as DivineManagerTaskRow
}

/** Update a task (e.g. status, executed_at). */
export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  updates: Partial<Pick<DivineManagerTaskRow, 'status' | 'payload' | 'executed_at' | 'scheduled_for'>>
): Promise<DivineManagerTaskRow> {
  const { data, error } = await supabase
    .from('divine_manager_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data as DivineManagerTaskRow
}
