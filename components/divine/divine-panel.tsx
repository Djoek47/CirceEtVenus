'use client'

import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { DivineWorkingLogo } from '@/components/divine/divine-working-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Crown, Loader2, Copy, ChevronRight, MessageSquare, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const VOICE_BAR_COUNT = 5

function VoiceWaveIcon({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-end gap-0.5', className)} aria-hidden>
      {Array.from({ length: VOICE_BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-current animate-divine-voice-bar"
          style={{
            height: '0.4em',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </span>
  )
}

export function DivinePanel() {
  const ctx = useDivinePanel()
  if (!ctx) return null

  const {
    panelOpen,
    setPanelOpen,
    panelCollapsed,
    setPanelCollapsed,
    focusedFan,
    chatMessages,
    setChatInput,
    chatInput,
    chatLoading,
    sendChat,
    generatedText,
    setGeneratedText,
    generatePrompt,
    setGeneratePrompt,
    generateLoading,
    requestGenerate,
    copyGenerated,
  } = ctx

  const expand = () => {
    setPanelCollapsed(false)
    setPanelOpen(true)
  }

  const collapse = () => {
    setPanelOpen(false)
    setPanelCollapsed(true)
  }

  const toggle = () => {
    if (panelOpen && !panelCollapsed) collapse()
    else expand()
  }

  return (
    <>
      {/* FAB: always visible when collapsed or as toggle when expanded */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary',
          panelOpen && !panelCollapsed && 'scale-0 opacity-0 pointer-events-none'
        )}
        aria-label={panelOpen ? 'Close Divine panel' : 'Open Divine'}
      >
        <span className="relative flex items-center justify-center">
          <Crown className="h-6 w-6 text-primary" />
          <VoiceWaveIcon className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-primary/80" />
        </span>
      </button>

      {/* Slide-in panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl transition-transform duration-300 ease-out md:max-w-sm',
          panelOpen && !panelCollapsed ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-serif text-sm font-semibold text-primary flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Divine
          </span>
          <Button variant="ghost" size="icon" onClick={collapse} aria-label="Collapse">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <DivineWorkingLogo
            working={chatLoading || generateLoading}
            className="mb-1"
          />
          {focusedFan && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>
                Focused fan:{' '}
                <span className="font-medium">
                  {focusedFan.name || focusedFan.username || focusedFan.id}
                </span>
              </span>
            </div>
          )}
          {/* Chat section */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Ask Divine
            </h3>
            <div className="h-40 rounded-md border border-border bg-muted/20 p-2 overflow-y-auto space-y-2 text-sm mb-2">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Ask about fans, content, or tasks. Same chat across the dashboard.
                </p>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'max-w-[85%] rounded-lg px-2 py-1',
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto bg-muted text-foreground'
                    )}
                  >
                    {m.content}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type a question…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChat()
                  }
                }}
                disabled={chatLoading}
                className="flex-1"
              />
              <Button size="sm" disabled={chatLoading || !chatInput.trim()} onClick={sendChat}>
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </section>

          {/* Generate text section */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5" />
              Generate message
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Describe what you need (e.g. reply to a fan, caption). Copy the result to paste elsewhere.
            </p>
            <Textarea
              placeholder="e.g. A flirty reply to a fan who said they love my content"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              disabled={generateLoading}
              className="min-h-[80px] resize-none mb-2"
            />
            <Button
              size="sm"
              className="w-full mb-2"
              disabled={generateLoading || !generatePrompt.trim()}
              onClick={requestGenerate}
            >
              {generateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
            {generatedText && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{generatedText}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={copyGenerated}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy to clipboard
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 w-full"
                  onClick={() => setGeneratedText(null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Backdrop when panel open (optional; only on small screens if we want tap-outside to close) */}
      {panelOpen && !panelCollapsed && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          aria-label="Close panel"
          onClick={collapse}
        />
      )}
    </>
  )
}
