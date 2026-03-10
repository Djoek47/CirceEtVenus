'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ThemedLogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function ThemedLogo({ width = 40, height = 40, className = '', priority = false }: ThemedLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Treat the initial (SSR) render as light mode for stable hydration
  const isLight = !mounted || resolvedTheme === 'light'

  // Gold glow in light mode, purple glow in dark mode
  const glowClass = isLight
    ? 'shadow-[0_0_35px_rgba(212,175,55,0.7)]'
    : 'shadow-[0_0_35px_rgba(128,90,213,0.8)]'

  const wrapperClass = cn(
    'inline-flex items-center justify-center rounded-full transition-shadow duration-300',
    glowClass,
    className,
  )

  return (
    <div className={wrapperClass}>
      <Image
        src="/logo.png"
        alt="Circe et Venus"
        width={width}
        height={height}
        className="h-auto w-auto rounded-full"
        priority={priority}
      />
    </div>
  )
}
