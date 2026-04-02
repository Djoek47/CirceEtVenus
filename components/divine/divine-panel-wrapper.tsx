'use client'

import type { User } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const hideDivinePanel = pathname?.startsWith('/dashboard/messages') === true

  return (
    <DivinePanelProvider user={user}>
      {children}
      {!hideDivinePanel && <DivinePanel />}
      {!hideDivinePanel && <DmChatOverlay />}
    </DivinePanelProvider>
  )
}
