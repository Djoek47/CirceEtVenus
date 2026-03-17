/**
 * Utilities for formatting text for OnlyFans posts and messages
 * following https://docs.onlyfansapi.com/introduction/guides/text-formatting
 */

type TextSize = 'default' | 'small' | 'smallest' | 'large' | 'largest'
type TextColor = 'default' | 'gray' | 'blue1' | 'blue2'

interface OnlyFansTextOptions {
  size?: TextSize
  color?: TextColor
  bold?: boolean
  italic?: boolean
}

function sizeClass(size: TextSize | undefined): string | null {
  switch (size) {
    case 'smallest':
      return 'm-editor-fs__sm'
    case 'small':
      return 'm-editor-fs__s'
    case 'large':
      return 'm-editor-fs__l'
    case 'largest':
      return 'm-editor-fs__lg'
    default:
      return 'm-editor-fs__default'
  }
}

function colorClass(color: TextColor | undefined): string | null {
  switch (color) {
    case 'gray':
      return 'm-editor-fc__gray'
    case 'blue1':
      return 'm-editor-fc__blue-1'
    case 'blue2':
      return 'm-editor-fc__blue-2'
    default:
      return null
  }
}

/**
 * Wrap plain text into a single <p> with optional size/color and bold/italic.
 * This keeps formatting within the constraints of OnlyFans' editor classes.
 */
export function formatOnlyFansText(text: string, options: OnlyFansTextOptions = {}): string {
  const safe = (text ?? '').toString()
  if (!safe.trim()) return '<p></p>'

  const sizeCls = sizeClass(options.size ?? 'default')
  const colorCls = colorClass(options.color ?? 'default')

  const spanClasses = [sizeCls, colorCls].filter(Boolean).join(' ')
  const openSpan = spanClasses ? `<span class="${spanClasses}">` : ''
  const closeSpan = spanClasses ? '</span>' : ''

  let inner = safe
  if (options.bold) inner = `<strong>${inner}</strong>`
  if (options.italic) inner = `<em>${inner}</em>`

  const content = openSpan ? `${openSpan}${inner}${closeSpan}` : inner
  return `<p>${content}</p>`
}

