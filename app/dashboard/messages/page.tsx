import { createClient } from '@/lib/supabase/server'
import { MessagesLayout } from '@/components/messages/messages-layout'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ fanId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const sp = searchParams ? await searchParams : {}
  return <MessagesLayout userId={user.id} initialFanId={sp.fanId} />
}
