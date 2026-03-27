'use client'

import type { User } from '@supabase/supabase-js'
import { DivinePanel } from '@/components/divine/divine-panel'
import { DivinePanelProvider } from '@/components/divine/divine-panel-context'
import { DmChatOverlay } from '@/components/divine/dm-chat-overlay'

export function DivinePanelWrapper({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  return (
    <DivinePanelProvider user={user}>
      {children}
      <DivinePanel />
      <DmChatOverlay />
    </DivinePanelProvider>
  )
}
