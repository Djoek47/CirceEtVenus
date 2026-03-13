import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { runDivineManagerBrain, executeScheduledTasksForUser } from '@/lib/divine-manager-orchestration'

export const maxDuration = 120

/**
 * GET: Cron endpoint to run the Divine Manager brain for all users with mode !== 'off'.
 * Secure with CRON_SECRET or Vercel Cron secret header.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: rows } = await supabase
    .from('divine_manager_settings')
    .select('user_id')
    .neq('mode', 'off')

  const userIds = (rows ?? []).map((r: { user_id: string }) => r.user_id)
  const results: { userId: string; taskCount: number }[] = []

  for (const userId of userIds) {
    try {
      const tasks = await runDivineManagerBrain(supabase, userId)
      const exec = await executeScheduledTasksForUser(supabase, userId)
      results.push({
        userId,
        taskCount: tasks.length,
        executed: exec.executed,
        failed: exec.failed,
      })
    } catch (e) {
      results.push({ userId, taskCount: -1, executed: 0, failed: 0 })
    }
  }

  return NextResponse.json({ ran: userIds.length, results })
}
