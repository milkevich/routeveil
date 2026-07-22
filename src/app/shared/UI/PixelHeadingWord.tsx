import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type {
  ComponentProps,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react'
import './PixelHeading.css'
import {
  PIXEL_FONT_CLASSES,
  PIXEL_FONT_KEYS,
  PIXEL_FONTS,
  classNames,
  safeFontIndex,
  safeMilliseconds,
} from './pixel-heading.shared'
import type { PixelFont } from './pixel-heading.shared'

export interface PixelHeadingWordProps extends ComponentProps<'h1'> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  initialFont?: PixelFont
  hoverFont?: PixelFont
  cycleInterval?: number
  defaultFontIndex?: number
  onFontIndexChange?: (index: number) => void
  showLabel?: boolean
  disableHover?: boolean
  disableCycling?: boolean
}

export function PixelHeadingWord({
  children,
  as: Tag = 'h1',
  className,
  initialFont,
  hoverFont,
  cycleInterval = 300,
  defaultFontIndex = 0,
  onFontIndexChange,
  showLabel = false,
  disableHover = false,
  disableCycling = false,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: PixelHeadingWordProps) {
  const resolvedDefaultIndex = initialFont
    ? PIXEL_FONT_KEYS.indexOf(initialFont)
    : safeFontIndex(defaultFontIndex)
  const hoverIndex = hoverFont
    ? PIXEL_FONT_KEYS.indexOf(hoverFont)
    : null
  const isSwapMode = hoverIndex !== null
  const interval = safeMilliseconds(cycleInterval, 300)
  const [fontIndex, setFontIndex] = useState(resolvedDefaultIndex)
  const [isActive, setIsActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const selectFont = useCallback((index: number) => {
    setFontIndex(index)
    onFontIndexChange?.(index)
  }, [onFontIndexChange])

  const advanceFont = useCallback(() => {
    setFontIndex((current) => {
      const next = (current + 1) % PIXEL_FONTS.length
      onFontIndexChange?.(next)
      return next
    })
  }, [onFontIndexChange])

  const startInteraction = useCallback(() => {
    if (disableHover) return
    clearTimer()
    setIsActive(true)

    if (hoverIndex !== null) {
      selectFont(hoverIndex)
      return
    }

    if (!disableCycling) {
      intervalRef.current = setInterval(advanceFont, interval)
    }
  }, [
    advanceFont,
    clearTimer,
    disableCycling,
    disableHover,
    hoverIndex,
    interval,
    selectFont,
  ])

  const stopInteraction = useCallback(() => {
    clearTimer()
    setIsActive(false)
    if (!disableHover && hoverIndex !== null) {
      selectFont(resolvedDefaultIndex)
    }
  }, [clearTimer, disableHover, hoverIndex, resolvedDefaultIndex, selectFont])

  useEffect(() => clearTimer, [clearTimer])

  const handleMouseEnter = useCallback((event: MouseEvent<HTMLHeadingElement>) => {
    startInteraction()
    onMouseEnter?.(event)
  }, [onMouseEnter, startInteraction])

  const handleMouseLeave = useCallback((event: MouseEvent<HTMLHeadingElement>) => {
    stopInteraction()
    onMouseLeave?.(event)
  }, [onMouseLeave, stopInteraction])

  const handleFocus = useCallback((event: FocusEvent<HTMLHeadingElement>) => {
    startInteraction()
    onFocus?.(event)
  }, [onFocus, startInteraction])

  const handleBlur = useCallback((event: FocusEvent<HTMLHeadingElement>) => {
    stopInteraction()
    onBlur?.(event)
  }, [onBlur, stopInteraction])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLHeadingElement>) => {
    if (
      !disableHover
      && !disableCycling
      && !isSwapMode
      && (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault()
      advanceFont()
    }
    onKeyDown?.(event)
  }, [advanceFont, disableCycling, disableHover, isSwapMode, onKeyDown])

  const currentFont = PIXEL_FONT_KEYS[fontIndex]

  return (
    <div className="pixel-heading" data-slot="pixel-heading-word">
      <Tag
        {...props}
        className={classNames(
          'pixel-heading__text',
          PIXEL_FONT_CLASSES[currentFont],
          className,
        )}
        data-font={currentFont}
        data-state={isActive ? 'active' : 'idle'}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
      >
        {children}
      </Tag>
      {showLabel && (
        <output
          aria-live="polite"
          className="pixel-heading__label"
          data-slot="pixel-heading-label"
          data-visible={isActive}
        >
          {currentFont}
        </output>
      )}
    </div>
  )
}

export default PixelHeadingWord
