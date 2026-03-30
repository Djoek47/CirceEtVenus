import { createClient } from '@/lib/supabase/server'
import { SocialPromotion } from '@/components/social/social-promotion'

/** Shared server content for Social and Community dashboard routes. */
export async function SocialDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, platform_username, is_connected')
    .eq('user_id', user.id)
    .eq('is_connected', true)

  return <SocialPromotion connections={connections || []} />
}
