'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronLeft, ChevronRight, Check, Sparkles, Wand2 } from 'lucide-react'
import {
  type MimicProfileV1,
  DEFAULT_MIMIC_PROFILE,
  parseMimicProfile,
} from '@/lib/divine/mimic-types'

const STEPS = 4

function splitLines(s: string): string[] {
  return s
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 40)
}

export function MimicTestWizard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<MimicProfileV1>(DEFAULT_MIMIC_PROFILE)
  const [tabooInput, setTabooInput] = useState('')
  const [bannedInput, setBannedInput] = useState('')
  const [sigInput, setSigInput] = useState('')
  const [escalateKwInput, setEscalateKwInput] = useState('')
  const [exemplarPaste, setExemplarPaste] = useState('')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const [aiGreet, setAiGreet] = useState('')
  const [aiTaboos, setAiTaboos] = useState('')
  const [aiEmoji, setAiEmoji] = useState('')
  const [aiPpv, setAiPpv] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState<string | null>(null)
  const [aiPreview, setAiPreview] = useState<string | null>(null)
  const [pendingPatch, setPendingPatch] = useState<Partial<MimicProfileV1> | null>(null)
  const [pendingTranscript, setPendingTranscript] = useState<{ q: string; a: string }[] | null>(null)
  const [sessionQs, setSessionQs] = useState<string[]>([])
  const [sessionAnswers, setSessionAnswers] = useState<string[]>([])
  const [adaptiveLoading, setAdaptiveLoading] = useState(false)
  const sessionQsRef = useRef<string[]>([])
  const sessionAnswersRef = useRef<string[]>([])
  sessionQsRef.current = sessionQs
  sessionAnswersRef.current = sessionAnswers

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/divine/mimic-session')
      if (!res.ok) return
      const data = (await res.json()) as {
        answers_json?: { adaptiveQuestions?: string[]; adaptiveAnswers?: string[] }
      }
      const aj = data.answers_json
      if (aj?.adaptiveQuestions?.length) {
        setSessionQs(aj.adaptiveQuestions)
        const ans = aj.adaptiveAnswers ?? []
        setSessionAnswers(
          aj.adaptiveQuestions.map((_, i) => (typeof ans[i] === 'string' ? ans[i] : '')),
        )
      }
    } catch {
      // ignore missing table or network
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/divine/mimic-profile')
      if (!res.ok) throw new Error('load failed')
      const data = (await res.json()) as { mimic_profile?: MimicProfileV1 }
      const p = parseMimicProfile(data.mimic_profile) ?? DEFAULT_MIMIC_PROFILE
      setProfile(p)
      setExemplarPaste((p.exemplarReplies ?? []).join('\n\n---\n\n'))
    } catch {
      setProfile(DEFAULT_MIMIC_PROFILE)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    void loadSession()
  }, [load, loadSession])

  const saveMimicSession = async (profileSnap: MimicProfileV1) => {
    const qs = sessionQsRef.current
    const ans = sessionAnswersRef.current
    try {
      await fetch('/api/divine/mimic-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_json: profileSnap,
          answers_json: {
            adaptiveQuestions: qs,
            adaptiveAnswers: qs.map((_, i) => ans[i] ?? ''),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    } catch {
      // ignore
    }
  }

  const runMimicInterview = async (payload: { messages?: { role: 'user' | 'assistant'; content: string }[]; answers?: Record<string, string> }) => {
    setAiBusy(true)
    setAiErr(null)
    setAiPreview(null)
    setPendingPatch(null)
    setPendingTranscript(null)
    try {
      const res = await fetch('/api/divine/mimic-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentProfile: profile, ...payload }),
      })
      const data = (await res.json()) as {
        error?: string
        mimic_profile_patch?: Partial<MimicProfileV1>
        aiInterviewSummary?: string
        interviewTranscript?: { q: string; a: string }[]
      }
      if (!res.ok) throw new Error(data.error || 'Interview failed')
      setPendingPatch(data.mimic_profile_patch ?? null)
      setPendingTranscript(data.interviewTranscript ?? null)
      setAiPreview(data.aiInterviewSummary ?? 'Suggestions ready — apply to update your draft profile.')
    } catch (e) {
      setAiErr(e instanceof Error ? e.message : 'Could not run AI tune')
    } finally {
      setAiBusy(false)
    }
  }

  const applyPendingInterview = () => {
    if (!pendingPatch) return
    const merged: MimicProfileV1 = {
      ...profile,
      ...pendingPatch,
      version: 1,
      aiInterviewSummary: aiPreview ?? profile.aiInterviewSummary,
      aiInterviewAt: new Date().toISOString(),
      interviewTranscript: pendingTranscript ?? profile.interviewTranscript,
    }
    setProfile(merged)
    if (merged.tabooTopics?.length) setTabooInput(merged.tabooTopics.join('\n'))
    if (merged.bannedPhrases?.length) setBannedInput(merged.bannedPhrases.join('\n'))
    if (merged.signaturePhrases?.length) setSigInput(merged.signaturePhrases.join('\n'))
    if (merged.escalateOnKeywords?.length) setEscalateKwInput(merged.escalateOnKeywords.join('\n'))
    if (merged.exemplarReplies?.length) setExemplarPaste(merged.exemplarReplies.join('\n\n---\n\n'))
    setPendingPatch(null)
    setPendingTranscript(null)
    setSavedMsg('Applied AI tune to draft — use Next/Save to persist to SQL.')
  }

  const generateAdaptive = async () => {
    setAdaptiveLoading(true)
    setSavedMsg(null)
    try {
      const res = await fetch('/api/divine/mimic-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftProfile: profile }),
      })
      const data = (await res.json()) as { questions?: string[]; error?: string }
      if (!res.ok) throw new Error(data.error || 'request failed')
      const qs = Array.isArray(data.questions) ? data.questions : []
      setSessionQs(qs)
      setSessionAnswers(qs.map(() => ''))
      setSavedMsg('New questions ready—answer and save with your profile.')
    } catch {
      setSavedMsg('Could not load AI questions. Check API key and try again.')
    } finally {
      setAdaptiveLoading(false)
    }
  }

  const persist = async (next: MimicProfileV1, stepsDone?: number[]) => {
    setSaving(true)
    setSavedMsg(null)
    try {
      const res = await fetch('/api/divine/mimic-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...next,
          completedSteps: stepsDone ?? next.completedSteps,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = (await res.json()) as { mimic_profile?: MimicProfileV1 }
      if (data.mimic_profile) setProfile(parseMimicProfile(data.mimic_profile) ?? next)
      setSavedMsg('Saved.')
      await saveMimicSession(parseMimicProfile(data.mimic_profile) ?? next)
    } catch {
      setSavedMsg('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const mergeExemplars = (): string[] => {
    const blocks = exemplarPaste
      .split(/\n---\n/g)
      .map((x) => x.trim())
      .filter(Boolean)
    return blocks.slice(0, 5)
  }

  const handleNext = async () => {
    const exemplars = mergeExemplars()
    let next: MimicProfileV1 = { ...profile, exemplarReplies: exemplars }

    if (step === 2) {
      next = {
        ...profile,
        tabooTopics: splitLines(tabooInput || (profile.tabooTopics ?? []).join('\n')),
        bannedPhrases: splitLines(bannedInput || (profile.bannedPhrases ?? []).join('\n')),
        signaturePhrases: splitLines(sigInput || (profile.signaturePhrases ?? []).join('\n')),
      }
    }
    if (step === 3) {
      next = {
        ...profile,
        exemplarReplies: exemplars,
        escalateOnKeywords: splitLines(escalateKwInput || (profile.escalateOnKeywords ?? []).join('\n')),
      }
    }

    setProfile(next)
    const stepsDone = Array.from(new Set([...(next.completedSteps ?? []), step]))
    await persist(
      {
        ...next,
        completedSteps: stepsDone,
      },
      stepsDone,
    )
    setStep((s) => Math.min(STEPS, s + 1))
  }

  const handleBack = () => setStep((s) => Math.max(1, s - 1))

  if (loading) {
    return (
      <Card className="divine-card">
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="divine-card border-primary/20">
      <CardHeader>
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Mimic Test
        </CardTitle>
        <CardDescription>
          Train fan-facing reply style, boundaries, and escalation. Divine uses this only for the{' '}
          <code className="text-xs">draft_fan_reply</code> tool—default is review before send.
        </CardDescription>
        <div className="flex gap-1 pt-1">
          {Array.from({ length: STEPS }, (_, i) => (
            <Badge
              key={i}
              variant={step > i ? 'default' : 'outline'}
              className="text-[10px]"
            >
              {i + 1}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Adaptive AI questions</p>
              <p className="text-xs text-muted-foreground">
                Optional follow-ups based on your mimic settings; saved with your profile to SQL.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={adaptiveLoading} onClick={() => void generateAdaptive()}>
              {adaptiveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-1.5">Generate questions</span>
            </Button>
          </div>
          {sessionQs.length > 0 && (
            <div className="space-y-2">
              {sessionQs.map((q, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{q}</Label>
                  <Textarea
                    rows={2}
                    value={sessionAnswers[i] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setSessionAnswers((prev) => {
                        const next = [...prev]
                        while (next.length < sessionQs.length) next.push('')
                        next[i] = v
                        return next
                      })
                    }}
                  />
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={aiBusy || !sessionAnswers.some((a) => a.trim())}
                onClick={() => {
                  const messages: { role: 'user' | 'assistant'; content: string }[] = []
                  sessionQs.forEach((q, i) => {
                    const a = (sessionAnswers[i] ?? '').trim()
                    if (!a) return
                    messages.push({ role: 'assistant', content: q })
                    messages.push({ role: 'user', content: a })
                  })
                  void runMimicInterview({ messages })
                }}
              >
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                <span className="ml-1.5">Tune profile from these answers</span>
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            Scripted AI tune
          </p>
          <p className="text-xs text-muted-foreground">Short answers; we suggest slider and list updates. Apply, then save your wizard.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">How do you usually greet fans?</Label>
              <Textarea value={aiGreet} onChange={(e) => setAiGreet(e.target.value)} rows={2} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Topics you avoid in DMs</Label>
              <Textarea value={aiTaboos} onChange={(e) => setAiTaboos(e.target.value)} rows={2} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Emoji / punctuation vibe</Label>
              <Textarea value={aiEmoji} onChange={(e) => setAiEmoji(e.target.value)} rows={2} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">PPV / tips — how direct?</Label>
              <Textarea value={aiPpv} onChange={(e) => setAiPpv(e.target.value)} rows={2} className="text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={aiBusy || (!aiGreet.trim() && !aiTaboos.trim() && !aiEmoji.trim() && !aiPpv.trim())}
              onClick={() =>
                void runMimicInterview({
                  answers: {
                    greet: aiGreet,
                    taboos: aiTaboos,
                    emoji_style: aiEmoji,
                    ppv_tone: aiPpv,
                  },
                })
              }
            >
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Generate suggestions
            </Button>
            {pendingPatch && (
              <Button type="button" size="sm" onClick={applyPendingInterview}>
                Apply to profile
              </Button>
            )}
          </div>
          {aiErr && <p className="text-xs text-destructive">{aiErr}</p>}
          {aiPreview && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{aiPreview}</p>}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Control whether Divine may draft messages that sound like you to fans. This never auto-sends unless you
              change policy elsewhere.
            </p>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <Label htmlFor="mimic-consent">Allow fan-facing AI drafts</Label>
                <p className="text-xs text-muted-foreground">Required for Mimic-based drafts.</p>
              </div>
              <Switch
                id="mimic-consent"
                checked={!!profile.consentFanFacingDrafts}
                onCheckedChange={(v) => setProfile((p) => ({ ...p, consentFanFacingDrafts: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <Label htmlFor="mimic-review">Never send without my review (recommended)</Label>
                <p className="text-xs text-muted-foreground">Keeps drafts in queue for you to approve.</p>
              </div>
              <Switch
                id="mimic-review"
                checked={profile.neverSendWithoutReview !== false}
                onCheckedChange={(v) => setProfile((p) => ({ ...p, neverSendWithoutReview: v }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tone warmth (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={profile.toneWarmth ?? 3}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, toneWarmth: Math.min(5, Math.max(1, Number(e.target.value) || 3)) }))
                  }
                />
              </div>
              <div>
                <Label>Flirt ceiling (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={profile.flirtCeiling ?? 2}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, flirtCeiling: Math.min(5, Math.max(1, Number(e.target.value) || 2)) }))
                  }
                />
              </div>
              <div>
                <Label>Humor (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={profile.humorLevel ?? 2}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, humorLevel: Math.min(5, Math.max(1, Number(e.target.value) || 2)) }))
                  }
                />
              </div>
              <div>
                <Label>Humanization / typos (0–3)</Label>
                <Input
                  type="number"
                  min={0}
                  max={3}
                  value={profile.humanizationLevel ?? 1}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      humanizationLevel: Math.min(3, Math.max(0, Number(e.target.value) || 1)),
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Taboo topics (one per line)</Label>
              <Textarea
                value={tabooInput || (profile.tabooTopics ?? []).join('\n')}
                onChange={(e) => setTabooInput(e.target.value)}
                placeholder="e.g. politics, meetups, minors"
                rows={3}
              />
            </div>
            <div>
              <Label>Phrases I never use (one per line)</Label>
              <Textarea
                value={bannedInput || (profile.bannedPhrases ?? []).join('\n')}
                onChange={(e) => setBannedInput(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Optional signature phrases</Label>
              <Textarea
                value={sigInput || (profile.signaturePhrases ?? []).join('\n')}
                onChange={(e) => setSigInput(e.target.value)}
                placeholder="Short lines you like to reuse"
                rows={2}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Label>Paste 3–5 example replies you wrote (separate with a line containing only ---)</Label>
            <Textarea
              value={exemplarPaste}
              onChange={(e) => setExemplarPaste(e.target.value)}
              rows={10}
              placeholder={'Hey love! Thanks for subbing…\n---\nThat means so much…'}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Max 5 blocks; each block is trimmed server-side.</p>
            <div>
              <Label>Escalate to human when message contains (one keyword/phrase per line)</Label>
              <Textarea
                value={escalateKwInput || (profile.escalateOnKeywords ?? []).join('\n')}
                onChange={(e) => setEscalateKwInput(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={profile.escalateFirstTimeDm !== false}
                  onCheckedChange={(v) => setProfile((p) => ({ ...p, escalateFirstTimeDm: v }))}
                />
                Escalate first-time DMs
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={profile.escalateWhale !== false}
                  onCheckedChange={(v) => setProfile((p) => ({ ...p, escalateWhale: v }))}
                />
                Escalate whale / high-value
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <p className="font-medium">Profile summary</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Fan-facing drafts:{' '}
                <strong>{profile.consentFanFacingDrafts ? 'allowed' : 'off'}</strong>; review gate:{' '}
                <strong>{profile.neverSendWithoutReview !== false ? 'on' : 'off'}</strong>
              </li>
              <li>
                Tone {profile.toneWarmth ?? 3} · Flirt {profile.flirtCeiling ?? 2} · Humor {profile.humorLevel ?? 2} ·
                Humanization {profile.humanizationLevel ?? 1}
              </li>
              <li>Taboo: {(profile.tabooTopics ?? []).join(', ') || '—'}</li>
              <li>Banned phrases: {(profile.bannedPhrases ?? []).join(', ') || '—'}</li>
              <li>Exemplar blocks: {mergeExemplars().length}</li>
              <li>Escalation keywords: {(profile.escalateOnKeywords ?? []).join(', ') || '—'}</li>
            </ul>
            <div>
              <Label>Notes (optional, private)</Label>
              <Textarea
                value={profile.notes ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" disabled={step === 1} onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS ? (
            <Button type="button" onClick={() => void handleNext()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ChevronRight className="h-4 w-4 ml-1" /></>}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void persist({ ...profile, notes: profile.notes }, profile.completedSteps)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Save summary
            </Button>
          )}
        </div>
        {savedMsg && <p className="text-xs text-muted-foreground">{savedMsg}</p>}
      </CardContent>
    </Card>
  )
}
