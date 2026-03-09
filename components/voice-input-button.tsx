'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  onInterim?: (text: string) => void
  className?: string
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  showTooltip?: boolean
  continuous?: boolean
}

export function VoiceInputButton({
  onTranscript,
  onInterim,
  className,
  size = 'icon',
  variant = 'ghost',
  showTooltip = true,
  continuous = false,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setIsSupported(true)
      const rec = new SpeechRecognition()
      
      rec.continuous = continuous
      rec.interimResults = true
      rec.lang = 'en-US'
      
      rec.onstart = () => {
        setIsListening(true)
        setError(null)
      }
      
      rec.onend = () => {
        setIsListening(false)
      }
      
      rec.onerror = (event) => {
        setIsListening(false)
        if (event.error === 'no-speech') {
          setError('No speech detected')
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied')
        } else {
          setError(`Error: ${event.error}`)
        }
      }
      
      rec.onresult = (event) => {
        let finalTranscript = ''
        let interim = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interim += result[0].transcript
          }
        }
        
        if (finalTranscript) {
          onTranscript(finalTranscript.trim())
        }
        
        if (interim && onInterim) {
          onInterim(interim)
        }
      }
      
      setRecognition(rec)
    }
    
    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous])

  const toggleListening = () => {
    if (!recognition) return
    
    if (isListening) {
      recognition.stop()
    } else {
      setError(null)
      try {
        recognition.start()
      } catch {
        // Already started
      }
    }
  }

  if (!isSupported) {
    return null
  }

  const button = (
    <Button
      type="button"
      variant={isListening ? 'default' : variant}
      size={size}
      onClick={toggleListening}
      className={cn(
        'relative transition-all',
        isListening && 'bg-destructive text-destructive-foreground animate-pulse',
        className
      )}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {isListening && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
        </span>
      )}
    </Button>
  )

  if (!showTooltip) {
    return button
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : isListening ? (
            <p>Listening... Click to stop</p>
          ) : (
            <p>Click to speak</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Declare global types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
