import type { SupabaseClient } from '@supabase/supabase-js'
import type { DivineManagerAutomationRules } from '@/lib/divine-manager'

/** Service-role and anon clients use dynamic row shapes for webhook helpers. */
type LooseSb = SupabaseClient<any, 'public', any, any>

export async function loadAutomationRules(
  supabase: LooseSb,
  userId: string,
): Promise<DivineManagerAutomationRules | null> {
  const { data } = await supabase
    .from('divine_manager_settings')
    .select('automation_rules')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.automation_rules ?? null) as DivineManagerAutomationRules | null
}
