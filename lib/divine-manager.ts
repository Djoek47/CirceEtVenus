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

export interface DivineManagerAutomationRules {
  autoPostSchedule?: AutomationRule
  autoWelcomeDm?: AutomationRule
  autoFollowUpAfterTips?: AutomationRule
  [key: string]: AutomationRule | undefined
}

export interface DivineManagerSettingsRow {
  user_id: string
  persona: DivineManagerPersona
  goals: DivineManagerGoals
  automation_rules: DivineManagerAutomationRules
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
  mode?: DivineManagerMode
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
