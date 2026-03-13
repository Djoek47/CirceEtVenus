'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Heart, Sparkles, Send, Loader2, SmilePlus } from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { useChat } from '@ai-sdk/react'

const FLIRT_LEVEL_LABELS: Record<number, string> = {
  1: 'Soft & playful',
  2: 'Warm & suggestive',
  3: 'Bold & spicy',
}

export function FlirtAssistant() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [flirtLevel, setFlirtLevel] = useState<number>(2)
  const [keywords, setKeywords] = useState('')
  const [input, setInput] = useState('')

  const { messages, sendMessage, status } = useChat({
    api: '/api/ai/flirt',
    body: {
      explicitnessLevel: flirtLevel,
      inspirationKeywords: keywords,
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "Mmm, hey there. I'm your Flirt mode – here just to tease, charm, and keep things deliciously fun with your fans. No strategy talk, no business voice… just natural, flowing flirting that matches the vibe you choose. What kind of energy are we playing with tonight?",
      },
    ],
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage(text)
    setInput('')
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const currentLabel = FLIRT_LEVEL_LABELS[flirtLevel] ?? 'Custom'

  return (
    <div className="space-y-6">
      <Card className="border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gradient-to-br from-pink-500/40 to-rose-500/30 p-4">
              <Heart className="h-8 w-8 text-pink-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-pink-200">Flirt Mode</CardTitle>
              <CardDescription className="text-pink-100/80">
                Pure flirting – playful, seductive, and tuned exactly to your comfort level.
              </CardDescription>
              <p className="mt-1 text-xs text-muted-foreground">
                Use this when you want ready-to-send flirty replies without business or retention talk.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-pink-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-pink-400" />
              Chat with Flirt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              ref={scrollRef}
              className="h-[300px] space-y-4 overflow-y-auto rounded-lg bg-gradient-to-b from-pink-500/10 to-transparent p-4"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary/20 text-foreground'
                        : 'border border-pink-500/30 bg-gradient-to-r from-pink-500/20 to-rose-500/10 text-foreground'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mb-1 text-xs font-medium text-pink-200">Flirt</div>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-pink-500/30 bg-pink-500/10 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-pink-300" />
                      <span className="text-xs text-pink-200">Flirt is thinking of the perfect line…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="flex flex-col gap-3 rounded-lg border border-pink-500/20 bg-pink-500/5 p-3 text-xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-pink-500/40 text-[10px] text-pink-200">
                      Flirt intensity
                    </Badge>
                    <span className="text-pink-100">{currentLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-pink-100/80">
                    <SmilePlus className="h-3 w-3" />
                    <span>1 = gentle teasing, 3 = spicier but still safe.</span>
                  </div>
                </div>
                <Slider
                  min={1}
                  max={3}
                  step={1}
                  value={[flirtLevel]}
                  onValueChange={([val]) => setFlirtLevel(val)}
                  className="w-full"
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-pink-100/90">
                      Inspiration keywords (optional)
                    </span>
                    <span className="text-[10px] text-pink-100/60">
                      e.g. praise kink, bratty, dominant, girlfriend experience
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Write a few words for the vibe you want. I’ll keep it natural."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="min-h-[60px] resize-none border-pink-500/20 bg-background/40 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Tell me what your fan wrote or what you want to say..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="border-pink-500/40 pr-10 focus-visible:ring-pink-400"
                    disabled={isLoading}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <VoiceInputButton
                      onTranscript={(text) => setInput((prev) => (prev ? prev + ' ' + text : text))}
                      size="sm"
                      variant="ghost"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-500/90 hover:to-rose-500/90"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-pink-300" />
                Suggested uses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>• Turn a boring fan opener into a playful tease.</p>
              <p>• Shift between sweet, seductive, or bratty depending on your mood.</p>
              <p>• Keep things flirty without sounding canned or salesy.</p>
            </CardContent>
          </Card>

          <Card className="border-pink-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-pink-300" />
                Tone safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                The flirt dial only changes intensity inside your existing safety boundaries. It will not
                break platform rules or your personal limits.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

