import { createClient } from '@/lib/supabase/server'
import { MessagesLayout } from '@/components/messages/messages-layout'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch conversations with fan details
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      fan:fans(*)
    `)
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false })

  return <MessagesLayout conversations={conversations || []} userId={user.id} />
}
