import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <OnboardingProvider 
      userId={user.id} 
      userName={profile?.full_name || undefined}
      onboardingCompleted={profile?.onboarding_completed || false}
    >
      <div className="flex h-screen bg-background">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <DashboardSidebar user={user} profile={profile} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader user={user} profile={profile} />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </OnboardingProvider>
  )
}
