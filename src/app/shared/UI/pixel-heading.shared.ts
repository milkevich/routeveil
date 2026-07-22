export type PixelFont = 'square' | 'grid' | 'circle' | 'triangle' | 'line'

export const PIXEL_FONT_KEYS = [
  'square',
  'grid',
  'circle',
  'triangle',
  'line',
] as const satisfies readonly PixelFont[]

export const PIXEL_FONT_CLASSES: Record<PixelFont, string> = {
  square: 'font-pixel-square',
  grid: 'font-pixel-grid',
  circle: 'font-pixel-circle',
  triangle: 'font-pixel-triangle',
  line: 'font-pixel-line',
}

export const PIXEL_FONTS = PIXEL_FONT_KEYS.map(
  (font) => PIXEL_FONT_CLASSES[font],
)

export const PIXEL_FONT_LABELS = [
  'Square',
  'Grid',
  'Circle',
  'Triangle',
  'Line',
] as const

export const PIXEL_FONT_COUNT = PIXEL_FONTS.length

export function classNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ')
}

export function safeFontIndex(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const integer = Math.trunc(value)
  return ((integer % PIXEL_FONT_COUNT) + PIXEL_FONT_COUNT) % PIXEL_FONT_COUNT
}

export function safeMilliseconds(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.max(16, Math.min(10_000, value))
}
