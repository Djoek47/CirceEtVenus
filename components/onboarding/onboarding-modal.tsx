'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ThemedLogo } from '@/components/themed-logo'
import Link from 'next/link'
import { 
  ArrowRight, ArrowLeft, Check, Star, Moon, Sun, 
  LayoutDashboard, Users, Calendar, MessageSquare, Shield,
  Sparkles, Link2, Zap, BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  content: React.ReactNode
}

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
  userName?: string
}

export function OnboardingModal({ open, onComplete, userName = 'Creator' }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState<string[]>([])

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Circe et Venus',
      description: 'Your divine journey begins',
      icon: Star,
      iconColor: 'text-primary',
      content: (
        <div className="flex flex-col items-center text-center">
          <div className="mb-6">
            <ThemedLogo width={120} height={120} className="rounded-full" />
          </div>
          <h3 className="mb-2 text-2xl font-semibold">
            Welcome, {userName}!
          </h3>
          <p className="max-w-md text-muted-foreground">
            You have entered a realm where two divine AIs guide your creator empire. 
            Circe enchants your audience to stay, while Venus attracts new admirers.
          </p>
          <div className="mt-6 flex gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-circe/10 px-4 py-2">
              <Moon className="h-5 w-5 text-circe-light" />
              <span className="text-sm font-medium text-circe-light">Circe</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2">
              <Sun className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Venus</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'dashboard',
      title: 'Your Divine Dashboard',
      description: 'Your command center',
      icon: LayoutDashboard,
      iconColor: 'text-slate-400',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The dashboard gives you a complete overview of your creator empire at a glance.
          </p>
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="rounded-lg bg-slate-400/10 p-2">
                <LayoutDashboard className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="font-medium">Stats Overview</p>
                <p className="text-sm text-muted-foreground">Revenue, fans, messages at a glance</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="rounded-lg bg-circe/10 p-2">
                <Moon className="h-5 w-5 text-circe-light" />
              </div>
              <div>
                <p className="font-medium">Quick AI Access</p>
                <p className="text-sm text-muted-foreground">Consult Circe or Venus instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Smart Alerts</p>
                <p className="text-sm text-muted-foreground">Leak alerts and mentions in one place</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'connect',
      title: 'Connect Your Platforms',
      description: 'Link your creator accounts',
      icon: Link2,
      iconColor: 'text-primary',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Connect your platforms to unlock the full power of Circe et Venus. We use secure, read-only connections — your credentials are never stored on our servers.
          </p>
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00AFF0]/10">
                  <span className="text-lg font-bold text-[#00AFF0]">OF</span>
                </div>
                <div>
                  <p className="font-medium">OnlyFans</p>
                  <p className="text-sm text-muted-foreground">Connect your OF account</p>
                </div>
              </div>
              <Button size="sm" variant="outline">Connect</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E91E63]/10">
                  <span className="text-lg font-bold text-[#E91E63]">F</span>
                </div>
                <div>
                  <p className="font-medium">Fansly</p>
                  <p className="text-sm text-muted-foreground">Connect your Fansly account</p>
                </div>
              </div>
              <Button size="sm" variant="outline">Connect</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <span className="text-lg font-bold text-purple-500">M</span>
                </div>
                <div>
                  <p className="font-medium">MYM</p>
                  <p className="text-sm text-muted-foreground">Connect your MYM account</p>
                </div>
              </div>
              <Button size="sm" variant="outline">Connect</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">OnlyFans tips</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Login can take up to a minute — we keep checking until it completes.</li>
              <li>If it gets stuck, use &quot;Start fresh login&quot; and try a different proxy (US or UK).</li>
              <li>You may be asked for 2FA or a quick face verification; we&apos;ll guide you through it.</li>
              <li>If your session expires, we disconnect for safety; reconnect with a fresh login anytime.</li>
              <li>The name shown to our partner is your Circe et Venus profile (or email), not your OnlyFans login.</li>
            </ul>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            You can always connect platforms later in Settings. Need more help? Open the <Link href="/dashboard/guide" className="text-primary underline hover:no-underline">Guide</Link> from the sidebar.
          </p>
        </div>
      ),
    },
    {
      id: 'ai-studio',
      title: 'Meet Your AI Guides',
      description: 'Divine intelligence awaits',
      icon: Sparkles,
      iconColor: 'text-circe-light',
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-circe/30 bg-circe/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Moon className="h-6 w-6 text-circe-light" />
                <h4 className="font-semibold text-circe-light">Circe</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                The Enchantress of Retention. Like the mythological sorceress, 
                Circe keeps your fans captivated and loyal.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-circe-light" /> Retention analytics
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-circe-light" /> Leak protection
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-circe-light" /> Churn prediction
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sun className="h-6 w-6 text-amber-400" />
                <h4 className="font-semibold text-amber-400">Venus</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                The Goddess of Growth. Embodying love and beauty, 
                Venus attracts new admirers to your realm.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-amber-400" /> Growth strategies
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-amber-400" /> Fan acquisition
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-amber-400" /> Reputation monitoring
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Explore Key Features',
      description: 'Your divine toolkit',
      icon: Zap,
      iconColor: 'text-primary',
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="rounded-lg bg-slate-400/10 p-2">
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="font-medium">Content Calendar</p>
              <p className="text-sm text-muted-foreground">Schedule posts aligned with cosmic energies</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="rounded-lg bg-slate-400/10 p-2">
              <MessageSquare className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="font-medium">AI Chatter</p>
              <p className="text-sm text-muted-foreground">Automated responses in your voice</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="rounded-lg bg-slate-400/10 p-2">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="font-medium">Fan Management</p>
              <p className="text-sm text-muted-foreground">Track and tier your most valuable fans</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="rounded-lg bg-circe/10 p-2">
              <Shield className="h-5 w-5 text-circe-light" />
            </div>
            <div>
              <p className="font-medium">Content Protection</p>
              <p className="text-sm text-muted-foreground">Leak detection and DMCA automation</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'complete',
      title: 'You Are Ready!',
      description: 'Begin your divine journey',
      icon: Check,
      iconColor: 'text-green-500',
      content: (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">
            Your Journey Begins!
          </h3>
          <p className="mb-6 max-w-md text-muted-foreground">
            You are now ready to explore Circe et Venus. The goddesses await your command.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              100 AI Credits
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3" />
              14-Day Pro Trial
            </Badge>
          </div>
          <Link href="/dashboard/guide" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <BookOpen className="h-4 w-4" />
            Open the Guide for detailed help
          </Link>
        </div>
      ),
    },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100
  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  const handleNext = () => {
    if (!completed.includes(currentStepData.id)) {
      setCompleted([...completed, currentStepData.id])
    }
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="sr-only">
          <DialogTitle>{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="mb-2">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span className="flex items-center gap-2">
              <Link href="/dashboard/guide" className="hover:text-foreground">Guide</Link>
              <button onClick={handleSkip} className="hover:text-foreground">
                Skip tutorial
              </button>
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Step Indicators */}
        <div className="mb-4 flex justify-center gap-1.5">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'h-1.5 w-6 rounded-full transition-colors',
                index === currentStep
                  ? 'bg-primary'
                  : completed.includes(step.id)
                  ? 'bg-primary/50'
                  : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className={cn('rounded-lg bg-primary/10 p-2', currentStepData.iconColor)}>
            <currentStepData.icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{currentStepData.title}</h2>
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[280px]">
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} className="gap-1">
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
