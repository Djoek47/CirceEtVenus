import { createClient } from '@/lib/supabase/server'
import { MessagesLayout } from '@/components/messages/messages-layout'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ fanId?: string; chat?: string; platform?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const sp = searchParams ? await searchParams : {}
  /** Voice/Divine + notifications use `fanId`; dashboard widgets use `chat` + optional `platform`. */
  const initialFanId = sp.fanId ?? sp.chat
  return (
    <MessagesLayout
      userId={user.id}
      initialFanId={initialFanId}
      initialPlatform={sp.platform}
    />
  )
}
