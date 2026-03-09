'use client'

import { useState, useEffect } from 'react'
import { OnboardingModal } from './onboarding-modal'
import { createClient } from '@/lib/supabase/client'

interface OnboardingProviderProps {
  children: React.ReactNode
  userId: string
  userName?: string
  onboardingCompleted?: boolean
}

export function OnboardingProvider({ 
  children, 
  userId, 
  userName,
  onboardingCompleted = false 
}: OnboardingProviderProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    // Only show onboarding if not completed
    if (!onboardingCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [onboardingCompleted])

  const handleComplete = async () => {
    setShowOnboarding(false)
    // Update profile to mark onboarding as completed
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId)
    } catch (error) {
      console.error('Failed to update onboarding status:', error)
    }
  }

  return (
    <>
      {children}
      {mounted && (
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={handleComplete}
          userName={userName}
        />
      )}
    </>
  )
}
