'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

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

  // During SSR and hydration, show dark logo by default
  if (!mounted) {
    return (
      <Image
        src="/logo.png"
        alt="Circe et Venus"
        width={width}
        height={height}
        className={className}
        priority={priority}
      />
    )
  }

  const logoSrc = resolvedTheme === 'light' ? '/logo-light.png' : '/logo.png'

  return (
    <Image
      src={logoSrc}
      alt="Circe et Venus"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
