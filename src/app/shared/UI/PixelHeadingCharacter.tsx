import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  ComponentProps,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
} from 'react'
import './PixelHeading.css'
import {
  PIXEL_FONT_CLASSES,
  PIXEL_FONT_COUNT,
  PIXEL_FONT_LABELS,
  PIXEL_FONTS,
  classNames,
  safeFontIndex,
  safeMilliseconds,
} from './pixel-heading.shared'
import type { PixelFont } from './pixel-heading.shared'

export type PixelHeadingCharacterMode = 'uniform' | 'multi' | 'wave' | 'random'

export interface PixelHeadingCharacterProps extends ComponentProps<'h1'> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  cycleInterval?: number
  defaultFontIndex?: number
  onFontIndexChange?: (index: number) => void
  showLabel?: boolean
  mode?: PixelHeadingCharacterMode
  staggerDelay?: number
  autoPlay?: boolean
  prefix?: string
  prefixFont?: PixelFont | 'none'
  isolate?: Record<string, string>
}

const PHI = (1 + Math.sqrt(5)) / 2
const TICK_MS = 50

function goldenBase(index: number): number {
  return Math.floor((index * PHI * PIXEL_FONT_COUNT) % PIXEL_FONT_COUNT)
}

function pseudoRandom(tick: number, index: number): number {
  return (
    ((tick * 2_654_435_761 + index * 340_573_321) >>> 0)
    % PIXEL_FONT_COUNT
  )
}

function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (
    children !== null
    && children !== undefined
    && typeof children === 'object'
    && 'props' in children
  ) {
    return extractText(
      (children as ReactElement<{ children?: ReactNode }>).props.children,
    )
  }
  return ''
}

function resolveIsolateFont(value: string): string {
  if (value === 'sans') return 'pixel-heading__font-sans'
  if (value === 'mono') return 'pixel-heading__font-mono'
  return value
}

export function PixelHeadingCharacter({
  children,
  as: Tag = 'h1',
  className,
  cycleInterval = 150,
  defaultFontIndex = 0,
  onFontIndexChange,
  showLabel = false,
  mode = 'multi',
  staggerDelay = 50,
  autoPlay = false,
  prefix,
  prefixFont = 'none',
  isolate,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: PixelHeadingCharacterProps) {
  const text = useMemo(() => extractText(children), [children])
  const interval = safeMilliseconds(cycleInterval, 150)
  const stagger = safeMilliseconds(staggerDelay, 50)
  const initialIndex = safeFontIndex(defaultFontIndex)
  const [msElapsed, setMsElapsed] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousUniformIndex = useRef(initialIndex)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startCycling = useCallback(() => {
    clearTimer()
    setIsActive(true)
    setMsElapsed(0)
    intervalRef.current = setInterval(() => {
      setMsElapsed((current) => current + TICK_MS)
    }, TICK_MS)
  }, [clearTimer])

  const stopCycling = useCallback(() => {
    setIsActive(false)
    if (!autoPlay) clearTimer()
  }, [autoPlay, clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  useEffect(() => {
    if (!autoPlay) {
      clearTimer()
      return
    }

    clearTimer()
    intervalRef.current = setInterval(() => {
      setMsElapsed((current) => current + TICK_MS)
    }, TICK_MS)
    return clearTimer
  }, [autoPlay, clearTimer])

  const characterFonts = useMemo(() => {
    const fonts: number[] = []
    let visibleIndex = 0

    for (let index = 0; index < text.length; index += 1) {
      if (/\s/.test(text[index] ?? '')) {
        fonts.push(-1)
        continue
      }

      const characterElapsed = Math.max(
        0,
        msElapsed - visibleIndex * stagger,
      )
      const cycles = Math.floor(characterElapsed / interval)

      switch (mode) {
        case 'uniform':
          fonts.push((initialIndex + Math.floor(msElapsed / interval)) % PIXEL_FONT_COUNT)
          break
        case 'wave':
          fonts.push((visibleIndex + cycles) % PIXEL_FONT_COUNT)
          break
        case 'random':
          fonts.push(
            cycles > 0
              ? pseudoRandom(cycles, visibleIndex)
              : goldenBase(visibleIndex),
          )
          break
        case 'multi':
          fonts.push((goldenBase(visibleIndex) + cycles) % PIXEL_FONT_COUNT)
          break
      }

      visibleIndex += 1
    }

    return fonts
  }, [initialIndex, interval, mode, msElapsed, stagger, text])

  useEffect(() => {
    if (mode !== 'uniform') return
    const index = characterFonts.find((font) => font >= 0) ?? initialIndex
    if (index !== previousUniformIndex.current) {
      previousUniformIndex.current = index
      onFontIndexChange?.(index)
    }
  }, [characterFonts, initialIndex, mode, onFontIndexChange])

  const activeLabel = useMemo(() => {
    if (mode === 'uniform') {
      const index = characterFonts.find((font) => font >= 0) ?? initialIndex
      return PIXEL_FONT_LABELS[index]
    }
    return mode[0]?.toUpperCase() + mode.slice(1)
  }, [characterFonts, initialIndex, mode])

  const handleFocus = useCallback((event: FocusEvent<HTMLHeadingElement>) => {
    startCycling()
    onFocus?.(event)
  }, [onFocus, startCycling])

  const handleMouseEnter = useCallback((event: MouseEvent<HTMLHeadingElement>) => {
    startCycling()
    onMouseEnter?.(event)
  }, [onMouseEnter, startCycling])

  const handleBlur = useCallback((event: FocusEvent<HTMLHeadingElement>) => {
    stopCycling()
    onBlur?.(event)
  }, [onBlur, stopCycling])

  const handleMouseLeave = useCallback((event: MouseEvent<HTMLHeadingElement>) => {
    stopCycling()
    onMouseLeave?.(event)
  }, [onMouseLeave, stopCycling])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLHeadingElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setMsElapsed((current) => current + interval)
    }
    onKeyDown?.(event)
  }, [interval, onKeyDown])

  const uniformIndex = mode === 'uniform'
    ? (characterFonts.find((font) => font >= 0) ?? initialIndex)
    : 0

  return (
    <div className="pixel-heading" data-slot="pixel-heading-character">
      <Tag
        {...props}
        aria-label={prefix ? `${prefix} ${text}` : text}
        className={classNames(
          'pixel-heading__text',
          mode === 'uniform' && PIXEL_FONTS[uniformIndex],
          className,
        )}
        data-mode={mode}
        data-state={isActive || autoPlay ? 'active' : 'idle'}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
      >
        {prefix && (
          <>
            <span aria-hidden="true" data-slot="pixel-heading-prefix">
              {isolate
                ? prefix.split('').map((character, index) => (
                    <span
                      className={classNames(
                        prefixFont !== 'none'
                          && PIXEL_FONT_CLASSES[prefixFont],
                        isolate[character]
                          && resolveIsolateFont(isolate[character]),
                      )}
                      key={`prefix-${index}`}
                    >
                      {character}
                    </span>
                  ))
                : (
                    <span
                      className={prefixFont === 'none'
                        ? undefined
                        : PIXEL_FONT_CLASSES[prefixFont]}
                    >
                      {prefix}
                    </span>
                  )}
            </span>
            <span aria-hidden="true"> </span>
          </>
        )}
        {mode === 'uniform'
          ? children
          : text.split('').map((character, index) => {
              if (/\s/.test(character)) {
                return <span aria-hidden="true" key={index}>{character}</span>
              }

              const isolatedFont = isolate?.[character]
              return (
                <span
                  aria-hidden="true"
                  className={isolatedFont
                    ? resolveIsolateFont(isolatedFont)
                    : PIXEL_FONTS[characterFonts[index]]}
                  key={index}
                >
                  {character}
                </span>
              )
            })}
      </Tag>
      {showLabel && (
        <output
          aria-live="polite"
          className="pixel-heading__label"
          data-slot="pixel-heading-label"
          data-visible={isActive || autoPlay}
        >
          {activeLabel}
        </output>
      )}
    </div>
  )
}

export default PixelHeadingCharacter
