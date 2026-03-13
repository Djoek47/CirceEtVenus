import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDivineManagerBrain } from '@/lib/divine-manager-orchestration'

export const maxDuration = 60

/** POST: Run the Divine Manager brain for the current user; creates suggested tasks. */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tasks = await runDivineManagerBrain(supabase, user.id)
    return NextResponse.json({ tasks })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Divine Manager failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
