import type { SupabaseClient } from '@supabase/supabase-js'
import type { DivineManagerAutomationRules } from '@/lib/divine-manager'

/**
 * Create an in-app Divine Manager task when a large tip arrives (OnlyFans webhook).
 * Respects automation_rules.alerts.tasks_for_whale_tips and whale_tip_min_dollars.
 */
export async function maybeCreateWhaleTipUrgentTask(
  supabase: SupabaseClient,
  userId: string,
  tipAmount: number,
  fromUser: { id: string; username: string; name: string },
  platform: 'onlyfans' | 'fansly' = 'onlyfans',
): Promise<void> {
  const { data: row } = await supabase
    .from('divine_manager_settings')
    .select('automation_rules')
    .eq('user_id', userId)
    .maybeSingle()

  const rules = (row?.automation_rules ?? {}) as DivineManagerAutomationRules
  const alerts = rules.alerts
  if (alerts?.tasks_for_whale_tips === false) return
  const min =
    typeof alerts?.whale_tip_min_dollars === 'number' && Number.isFinite(alerts.whale_tip_min_dollars)
      ? alerts.whale_tip_min_dollars
      : 100
  if (tipAmount < min) return

  await supabase.from('divine_manager_tasks').insert({
    user_id: userId,
    type: 'urgent_whale_tip',
    category: 'ops',
    status: 'suggested',
    payload: {
      summary: `Large tip: $${tipAmount.toFixed(2)} from ${fromUser.name} (@${fromUser.username})`,
      targetFans: [fromUser.id],
      platform,
      tipAmount,
    },
    source: 'webhook',
  })
}
