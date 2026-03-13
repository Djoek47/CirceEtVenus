'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getSettings,
  upsertSettings,
  getTasks,
  updateTask,
  type DivineManagerSettingsRow,
  type DivineManagerMode,
  type DivineManagerPersona,
  type DivineManagerGoals,
  type DivineManagerAutomationRules,
  type DivineManagerTaskRow,
} from '@/lib/divine-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Crown, Loader2, ChevronRight, ChevronLeft, Check, Sparkles, Pause, Settings2, ThumbsUp, X, Pencil } from 'lucide-react'

type WizardStep = 1 | 2 | 3 | 4

const MODE_LABELS: Record<DivineManagerMode, string> = {
  off: 'Off',
  suggest_only: 'Suggest only',
  semi_auto: 'Semi-automatic',
}

export default function DivineManagerPage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<DivineManagerSettingsRow | null>(null)
  const [tasks, setTasks] = useState<DivineManagerTaskRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [saving, setSaving] = useState(false)
  const [runningBrain, setRunningBrain] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingPayload, setEditingPayload] = useState<{ suggestedText?: string } | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Wizard form state
  const [persona, setPersona] = useState<DivineManagerPersona>({
    tone: 'friendly',
    flirtyLevel: 'mild',
    boundaries: [],
    examplePhrases: [],
  })
  const [boundaryInput, setBoundaryInput] = useState('')
  const [goals, setGoals] = useState<DivineManagerGoals>({
    qualitativeGoals: [],
    targetSubscribers: undefined,
    targetRetention: undefined,
    targetARPU: undefined,
  })
  const [goalInput, setGoalInput] = useState('')
  const [automationRules, setAutomationRules] = useState<DivineManagerAutomationRules>({
    autoPostSchedule: { enabled: false, maxPerDay: 2 },
    autoWelcomeDm: { enabled: false, maxPerDay: 50 },
    autoFollowUpAfterTips: { enabled: false, maxPerDay: 20 },
  })
  const [selectedMode, setSelectedMode] = useState<DivineManagerMode>('suggest_only')
  const [managerArchetype, setManagerArchetype] = useState<string>('hermes')
  const [notifyLevel, setNotifyLevel] = useState<'none' | 'only_issues' | 'daily_digest' | 'all'>('daily_digest')
  const [betaAcknowledged, setBetaAcknowledged] = useState(false)
  const [voiceScript, setVoiceScript] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState<'intro' | 'ongoing' | 'what_next' | null>(null)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [ongoingCoachEnabled, setOngoingCoachEnabled] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      try {
        const s = await getSettings(supabase, user.id)
        setSettings(s ?? null)
        if (s) {
          setPersona(s.persona ?? {})
          setGoals(s.goals ?? {})
          setAutomationRules(s.automation_rules ?? {})
          setSelectedMode(s.mode)
          setManagerArchetype(s.manager_archetype || 'hermes')
          if (s.notification_settings?.level) {
            setNotifyLevel(s.notification_settings.level as any)
          }
          if (typeof s.beta_acknowledged === 'boolean') {
            setBetaAcknowledged(s.beta_acknowledged)
          }
          const t = await getTasks(supabase, user.id, { limit: 20 })
          setTasks(t)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCompleteWizard = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const row = await upsertSettings(supabase, userId, {
        persona,
        goals,
        automation_rules: automationRules,
        manager_archetype: managerArchetype,
        notification_settings: { level: notifyLevel, channel: 'in_app' },
        beta_acknowledged: betaAcknowledged,
        mode: selectedMode,
      })
      setSettings(row)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMode = async (mode: DivineManagerMode) => {
    if (!userId) return
    try {
      const supabase = createClient()
      const row = await upsertSettings(supabase, userId, { mode })
      setSettings(row)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRunManager = async () => {
    if (!userId) return
    setRunningBrain(true)
    try {
      const res = await fetch('/api/ai/divine-manager', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to run manager')
      const supabase = createClient()
      const updated = await getTasks(supabase, userId, { limit: 20 })
      setTasks(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setRunningBrain(false)
    }
  }

  const refreshTasks = async () => {
    if (!userId) return
    const supabase = createClient()
    const updated = await getTasks(supabase, userId, { limit: 20 })
    setTasks(updated)
  }

  const handleApprove = async (t: DivineManagerTaskRow) => {
    if (actionLoadingId) return
    setActionLoadingId(t.id)
    try {
      const supabase = createClient()
      const updates: { status: 'executed'; payload?: Record<string, unknown> } = { status: 'executed' }
      if (editingPayload && Object.keys(editingPayload).length > 0) {
        updates.payload = { ...(t.payload ?? {}), ...editingPayload }
      }
      await updateTask(supabase, t.id, updates)
      setEditingTaskId(null)
      setEditingPayload(null)
      await refreshTasks()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDismiss = async (t: DivineManagerTaskRow) => {
    if (actionLoadingId) return
    setActionLoadingId(t.id)
    try {
      const supabase = createClient()
      await updateTask(supabase, t.id, { status: 'skipped' })
      setEditingTaskId(null)
      setEditingPayload(null)
      await refreshTasks()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const speak = (text: string) => {
    if (typeof window === 'undefined') return
    if (!('speechSynthesis' in window)) {
      // eslint-disable-next-line no-console
      console.warn('Speech synthesis not supported in this browser')
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const runVoiceMode = async (mode: 'intro' | 'ongoing' | 'what_next') => {
    setVoiceLoading(true)
    setVoiceMode(mode)
    try {
      const res = await fetch('/api/ai/divine-manager-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) throw new Error('Failed to get voice script')
      const data = (await res.json()) as { script?: string; error?: string }
      if (data.script) {
        setVoiceScript(data.script)
        speak(data.script)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setVoiceLoading(false)
    }
  }

  const sendChat = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return
    const nextMessages = [...chatMessages, { role: 'user' as const, content: trimmed }]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/divine-manager-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const data = (await res.json()) as { reply?: string; error?: string }
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply! }])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // First-run wizard: no settings row yet
  if (!settings) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Crown className="h-7 w-7 text-amber-500" />
            Divine Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Your full-time AI manager orchestrating posts, messages, pricing, and growth using all Circe & Venus powers.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setup wizard</CardTitle>
            <CardDescription>
              Step {wizardStep} of 4 — {wizardStep === 1 && 'Persona & boundaries'}
              {wizardStep === 2 && 'Archetype & notifications'}
              {wizardStep === 3 && 'Automation rules'}
              {wizardStep === 4 && 'Review & activate'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {wizardStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label>How do you talk to fans?</Label>
                  <Select value={persona.tone ?? 'friendly'} onValueChange={(v) => setPersona((p) => ({ ...p, tone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & warm</SelectItem>
                      <SelectItem value="playful">Playful & teasing</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual & laid-back</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Comfort level with flirty tone</Label>
                  <Select value={persona.flirtyLevel ?? 'mild'} onValueChange={(v: DivineManagerPersona['flirtyLevel']) => setPersona((p) => ({ ...p, flirtyLevel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Off-limits (add one at a time)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. No explicit content, no politics"
                      value={boundaryInput}
                      onChange={(e) => setBoundaryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && boundaryInput.trim()) {
                          setPersona((p) => ({ ...p, boundaries: [...(p.boundaries ?? []), boundaryInput.trim()] }))
                          setBoundaryInput('')
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (boundaryInput.trim()) {
                          setPersona((p) => ({ ...p, boundaries: [...(p.boundaries ?? []), boundaryInput.trim()] }))
                          setBoundaryInput('')
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {(persona.boundaries?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(persona.boundaries ?? []).map((b, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {wizardStep === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose your Divine Manager&apos;s style and how often it should ping you.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Manager archetype</Label>
                    <Select value={managerArchetype} onValueChange={(v) => setManagerArchetype(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hermes">Hermes – Messages & money focus</SelectItem>
                        <SelectItem value="hephaestus">Hephaestus – Systems & schedules</SelectItem>
                        <SelectItem value="hestia">Hestia – Retention & VIP care</SelectItem>
                        <SelectItem value="eros">Eros – Charm & script optimization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notification level</Label>
                    <Select value={notifyLevel} onValueChange={(v: any) => setNotifyLevel(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Never notify me</SelectItem>
                        <SelectItem value="only_issues">Only if something breaks or needs approval</SelectItem>
                        <SelectItem value="daily_digest">Daily summary of moves & money</SelectItem>
                        <SelectItem value="all">Notify for every action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {wizardStep === 3 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose what the manager can suggest or do automatically. You can change these later.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Auto-post schedule</p>
                      <p className="text-xs text-muted-foreground">Suggest or post on a schedule</p>
                    </div>
                    <Switch
                      checked={automationRules.autoPostSchedule?.enabled ?? false}
                      onCheckedChange={(c) =>
                        setAutomationRules((r) => ({
                          ...r,
                          autoPostSchedule: { ...r.autoPostSchedule, enabled: c, maxPerDay: r.autoPostSchedule?.maxPerDay ?? 2 },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Auto welcome DMs</p>
                      <p className="text-xs text-muted-foreground">Send welcome message to new subs</p>
                    </div>
                    <Switch
                      checked={automationRules.autoWelcomeDm?.enabled ?? false}
                      onCheckedChange={(c) =>
                        setAutomationRules((r) => ({
                          ...r,
                          autoWelcomeDm: { ...r.autoWelcomeDm, enabled: c, maxPerDay: r.autoWelcomeDm?.maxPerDay ?? 50 },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Follow-up after tips</p>
                      <p className="text-xs text-muted-foreground">Thank or follow up after tips</p>
                    </div>
                    <Switch
                      checked={automationRules.autoFollowUpAfterTips?.enabled ?? false}
                      onCheckedChange={(c) =>
                        setAutomationRules((r) => ({
                          ...r,
                          autoFollowUpAfterTips: { ...r.autoFollowUpAfterTips, enabled: c, maxPerDay: r.autoFollowUpAfterTips?.maxPerDay ?? 20 },
                        }))
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {wizardStep === 4 && (
              <>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="font-medium">Summary</p>
                  <p className="text-sm text-muted-foreground">Tone: {persona.tone}, Flirty: {persona.flirtyLevel}</p>
                  <p className="text-sm text-muted-foreground">Archetype: {managerArchetype}</p>
                  <p className="text-sm text-muted-foreground">
                    Automation: {[automationRules.autoPostSchedule?.enabled && 'Posts', automationRules.autoWelcomeDm?.enabled && 'Welcome DMs', automationRules.autoFollowUpAfterTips?.enabled && 'Tip follow-up'].filter(Boolean).join(', ') || 'None'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Notifications: {notifyLevel === 'none' ? 'Never' : notifyLevel === 'only_issues' ? 'Only issues' : notifyLevel === 'daily_digest' ? 'Daily digest' : 'All actions'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Divine Manager is <span className="font-semibold">BETA</span>. It can make mistakes. You remain responsible for all actions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={betaAcknowledged} onCheckedChange={setBetaAcknowledged} />
                  <span className="text-xs text-muted-foreground">
                    I understand this feature is beta and may make mistakes; I remain responsible for all actions.
                  </span>
                </div>
                <div className="space-y-2">
                  <Label>Manager mode</Label>
                  <Select value={selectedMode} onValueChange={(v: DivineManagerMode) => setSelectedMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off — No suggestions or actions</SelectItem>
                      <SelectItem value="suggest_only">Suggest only — Manager suggests; you approve</SelectItem>
                      <SelectItem value="semi_auto">Semi-automatic — Manager can run allowed rules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" disabled={wizardStep === 1} onClick={() => setWizardStep((s) => (s - 1) as WizardStep)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {wizardStep < 4 ? (
                <Button onClick={() => setWizardStep((s) => (s + 1) as WizardStep)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleCompleteWizard} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Activate Divine Manager
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Console: already set up
  const mode = settings.mode
  const today = new Date().toISOString().slice(0, 10)
  const todayTasks = tasks.filter((t) => t.scheduled_for?.startsWith(today) || (t.status === 'suggested' && !t.scheduled_for))

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-7 w-7 text-amber-500" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">Divine Manager</h1>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  BETA
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Archetype: {settings.manager_archetype || 'hermes'}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Your full-time AI manager orchestrating posts, messages, pricing, and growth using all Circe & Venus powers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mode === 'off' ? 'secondary' : mode === 'semi_auto' ? 'default' : 'outline'} className="text-sm">
            {MODE_LABELS[mode]}
          </Badge>
          {mode !== 'off' && (
            <Button variant="ghost" size="sm" onClick={() => handleUpdateMode('off')}>
              <Pause className="h-4 w-4 mr-1" /> Pause
            </Button>
          )}
          <Select value={mode} onValueChange={(v: DivineManagerMode) => handleUpdateMode(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="suggest_only">Suggest only</SelectItem>
              <SelectItem value="semi_auto">Semi-automatic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Today&apos;s Plan
              </CardTitle>
              <CardDescription>Suggested and scheduled tasks for today. Run the manager to generate suggestions.</CardDescription>
            </div>
            {mode !== 'off' && (
              <Button variant="outline" size="sm" onClick={handleRunManager} disabled={runningBrain}>
                {runningBrain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {runningBrain ? 'Running…' : 'Run manager'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No tasks yet. Enable Suggest only or Semi-automatic and the manager will start generating suggestions.
            </p>
          ) : (
            <ul className="space-y-3">
              {todayTasks.slice(0, 10).map((t) => (
                <li key={t.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm capitalize">{t.type.replace(/_/g, ' ')}</p>
                        {t.category && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {t.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.source ?? 'Manager'}
                        {t.payload?.segment ? ` · Segment: ${String(t.payload.segment)}` : null}
                      </p>
                      {editingTaskId === t.id ? (
                        <div className="mt-2">
                          <Label className="text-xs">Edit message / details</Label>
                          <Textarea
                            className="mt-1 min-h-[60px] text-sm"
                            value={editingPayload?.suggestedText ?? (t.payload?.suggestedText as string) ?? ''}
                            onChange={(e) => setEditingPayload({ suggestedText: e.target.value })}
                            placeholder="Suggested text..."
                          />
                        </div>
                      ) : (
                        t.payload?.suggestedText && (
                          <p className="text-xs mt-1 line-clamp-2">{String(t.payload.suggestedText)}</p>
                        )
                      )}
                    </div>
                    <Badge variant={t.status === 'executed' ? 'default' : t.status === 'suggested' ? 'secondary' : 'outline'}>
                      {t.status}
                    </Badge>
                  </div>
                  {t.status === 'suggested' && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        disabled={actionLoadingId === t.id}
                        onClick={() => handleApprove(t)}
                      >
                        {actionLoadingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={actionLoadingId === t.id}
                        onClick={() => {
                          if (editingTaskId === t.id) {
                            setEditingTaskId(null)
                            setEditingPayload(null)
                          } else {
                            setEditingTaskId(t.id)
                            setEditingPayload({ suggestedText: (t.payload?.suggestedText as string) ?? '' })
                          }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        {editingTaskId === t.id ? 'Cancel edit' : 'Edit'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={actionLoadingId === t.id}
                        onClick={() => handleDismiss(t)}
                      >
                        <X className="h-3 w-3" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {settings.beta_acknowledged && mode !== 'off' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Voice companion
            </CardTitle>
            <CardDescription>
              Let your Divine Manager speak a short briefing or tell you what to do next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={voiceLoading}
                onClick={() => runVoiceMode('intro')}
              >
                {voiceLoading && voiceMode === 'intro' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Play intro briefing
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={voiceLoading}
                onClick={() => runVoiceMode('what_next')}
              >
                {voiceLoading && voiceMode === 'what_next' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                What next, Divine Manager?
              </Button>
              <div className="flex items-center gap-2">
                <Switch
                  checked={ongoingCoachEnabled}
                  onCheckedChange={setOngoingCoachEnabled}
                  disabled={voiceLoading}
                />
                <span className="text-xs text-muted-foreground">
                  Ongoing coach while this page is open
                </span>
              </div>
            </div>
            {voiceScript && (
              <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                {voiceScript}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {settings.beta_acknowledged && mode !== 'off' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Talk to your Manager
            </CardTitle>
            <CardDescription>
              Ask questions about your fans, revenue, or which tasks to prioritize. Replies are based on your Divine Manager setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-48 w-full rounded-md border border-border bg-muted/30 p-2 overflow-y-auto space-y-2 text-sm">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Ask me about your fans, revenue, or which tasks to prioritize. I’ll answer based on your Divine Manager setup and plan.
                </p>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] rounded-lg px-2 py-1 ${
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto bg-muted text-foreground'
                    }`}
                  >
                    {m.content}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a question for your manager…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChat()
                  }
                }}
                disabled={chatLoading}
              />
              <Button size="sm" disabled={chatLoading || !chatInput.trim()} onClick={sendChat}>
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuration
          </CardTitle>
          <CardDescription>Persona, goals, and automation rules from your setup. Edit in a future update.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><span className="font-medium text-foreground">Tone:</span> {String(settings.persona?.tone ?? '—')} · Flirty: {String(settings.persona?.flirtyLevel ?? '—')}</p>
          <p><span className="font-medium text-foreground">Archetype:</span> {settings.manager_archetype || 'hermes'}</p>
          <p><span className="font-medium text-foreground">Notifications:</span> {settings.notification_settings?.level ?? 'daily_digest'}</p>
          <p><span className="font-medium text-foreground">Rules:</span> Auto-post {settings.automation_rules?.autoPostSchedule?.enabled ? 'on' : 'off'}, Welcome DM {settings.automation_rules?.autoWelcomeDm?.enabled ? 'on' : 'off'}, Tip follow-up {settings.automation_rules?.autoFollowUpAfterTips?.enabled ? 'on' : 'off'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
