import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadScanIdentityHandles } from '@/lib/scan-identity'

/**
 * Returns handles and recent content titles for reputation / leak scan pickers (RLS-scoped).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [handles, { data: contentRows }] = await Promise.all([
    loadScanIdentityHandles(supabase, user.id),
    supabase
      .from('content')
      .select('id,title')
      .eq('user_id', user.id)
      .in('status', ['published', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(80),
  ])

  const contentTitles = (contentRows || [])
    .filter((r: { title?: string | null }) => typeof r.title === 'string' && r.title.trim().length > 0)
    .map((r: { id: string; title: string }) => ({ id: r.id, title: r.title.trim() }))

  return NextResponse.json({ handles, contentTitles })
}
