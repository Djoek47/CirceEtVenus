import { useMemo } from 'react'
import { PixelRatio, useWindowDimensions } from 'react-native'

/** Design baseline (iPhone 13/14 width). */
const BASE_WIDTH = 390
const MAX_SCALE = 1.18

/**
 * Scales typography and spacing for different phone widths; caps growth so tablets don’t explode.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions()
  const fontScale = PixelRatio.getFontScale()

  return useMemo(() => {
    const raw = width / BASE_WIDTH
    const scale = Math.min(Math.max(raw, 0.92), MAX_SCALE)
    return {
      width,
      height,
      scale,
      scaleFont: (n: number) => Math.round(n * scale * Math.min(fontScale, 1.1)),
      scaleSpace: (n: number) => Math.round(n * scale),
    }
  }, [width, height, fontScale])
}
