'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseVoiceInputOptions {
  onResult?: (transcript: string) => void
  onInterim?: (transcript: string) => void
  continuous?: boolean
  language?: string
}

interface UseVoiceInputReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  resetTranscript: () => void
  error: string | null
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    onResult,
    onInterim,
    continuous = false,
    language = 'en-US',
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setIsSupported(true)
      const recognition = new SpeechRecognition()
      
      recognition.continuous = continuous
      recognition.interimResults = true
      recognition.lang = language
      
      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
      }
      
      recognition.onend = () => {
        setIsListening(false)
        if (continuous && recognitionRef.current) {
          // Restart if continuous mode
          try {
            recognitionRef.current.start()
          } catch {
            // Ignore if already started
          }
        }
      }
      
      recognition.onerror = (event) => {
        setIsListening(false)
        switch (event.error) {
          case 'no-speech':
            setError('No speech detected. Please try again.')
            break
          case 'audio-capture':
            setError('No microphone found. Please check your device.')
            break
          case 'not-allowed':
            setError('Microphone access denied. Please allow microphone access.')
            break
          case 'network':
            setError('Network error. Please check your connection.')
            break
          default:
            setError(`Speech recognition error: ${event.error}`)
        }
      }
      
      recognition.onresult = (event) => {
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
          setTranscript(prev => prev + finalTranscript)
          onResult?.(finalTranscript)
        }
        
        if (interim) {
          setInterimTranscript(interim)
          onInterim?.(interim)
        }
      }
      
      recognitionRef.current = recognition
    } else {
      setIsSupported(false)
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [continuous, language, onResult, onInterim])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setError(null)
      setInterimTranscript('')
      try {
        recognitionRef.current.start()
      } catch {
        // Already started
      }
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    error,
  }
}

// Add types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
