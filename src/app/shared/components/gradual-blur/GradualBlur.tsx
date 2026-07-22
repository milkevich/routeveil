import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'
import './GradualBlur.css'

type BlurPosition = 'top' | 'bottom' | 'left' | 'right'
type BlurCurve = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'
type BlurPreset =
  | BlurPosition
  | 'subtle'
  | 'intense'
  | 'smooth'
  | 'sharp'
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'page-header'
  | 'page-footer'

export type GradualBlurProps = {
  position?: BlurPosition
  strength?: number
  height?: string
  width?: string
  divCount?: number
  exponential?: boolean
  zIndex?: number
  animated?: boolean | 'scroll'
  duration?: string
  easing?: string
  opacity?: number
  curve?: BlurCurve
  responsive?: boolean
  mobileHeight?: string
  tabletHeight?: string
  desktopHeight?: string
  mobileWidth?: string
  tabletWidth?: string
  desktopWidth?: string
  preset?: BlurPreset
  hoverIntensity?: number
  target?: 'parent' | 'page'
  onAnimationComplete?: () => void
  className?: string
  style?: CSSProperties
}

type ResolvedConfig = Required<Pick<
  GradualBlurProps,
  | 'position'
  | 'strength'
  | 'height'
  | 'divCount'
  | 'exponential'
  | 'zIndex'
  | 'animated'
  | 'duration'
  | 'easing'
  | 'opacity'
  | 'curve'
  | 'responsive'
  | 'target'
  | 'className'
  | 'style'
>> & GradualBlurProps

const defaults: ResolvedConfig = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  className: '',
  style: {},
}

const presets: Record<BlurPreset, Partial<GradualBlurProps>> = {
  top: { position: 'top' },
  bottom: { position: 'bottom' },
  left: { position: 'left' },
  right: { position: 'right' },
  subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 4 },
  intense: { height: '10rem', strength: 4, divCount: 10, exponential: true },
  smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp: { height: '5rem', curve: 'linear', divCount: 4 },
  header: { position: 'top', height: '8rem', curve: 'ease-out' },
  footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar: { position: 'left', width: '6rem', strength: 2.5 },
  'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
}

const curves: Record<BlurCurve, (progress: number) => number> = {
  linear: (progress) => progress,
  bezier: (progress) => progress * progress * (3 - 2 * progress),
  'ease-in': (progress) => progress * progress,
  'ease-out': (progress) => 1 - (1 - progress) ** 2,
  'ease-in-out': (progress) => (
    progress < 0.5
      ? 2 * progress * progress
      : 1 - ((-2 * progress + 2) ** 2) / 2
  ),
}

function responsiveDimension(
  config: ResolvedConfig,
  dimension: 'height' | 'width',
  viewportWidth: number,
): string | undefined {
  const base = config[dimension]
  if (!config.responsive) return base

  if (viewportWidth <= 480) {
    return dimension === 'height'
      ? config.mobileHeight ?? base
      : config.mobileWidth ?? base
  }
  if (viewportWidth <= 768) {
    return dimension === 'height'
      ? config.tabletHeight ?? base
      : config.tabletWidth ?? base
  }
  return dimension === 'height'
    ? config.desktopHeight ?? base
    : config.desktopWidth ?? base
}

function durationMilliseconds(value: string): number {
  const duration = Number.parseFloat(value)
  if (!Number.isFinite(duration) || duration < 0) return 0
  return value.trim().toLowerCase().endsWith('ms')
    ? duration
    : duration * 1000
}

function GradualBlurComponent(props: PropsWithChildren<GradualBlurProps>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1280 : window.innerWidth
  ))
  const [visible, setVisible] = useState(props.animated !== 'scroll')
  const config = useMemo<ResolvedConfig>(() => ({
    ...defaults,
    ...(props.preset ? presets[props.preset] : {}),
    ...props,
  }), [props])

  useEffect(() => {
    if (!config.responsive) return
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [config.responsive])

  useEffect(() => {
    const node = containerRef.current
    if (config.animated !== 'scroll' || !node) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setVisible(true)
    }, { threshold: 0.1 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [config.animated])

  useEffect(() => {
    if (!visible || config.animated !== 'scroll' || !config.onAnimationComplete) return
    const duration = durationMilliseconds(config.duration)
    const timer = window.setTimeout(config.onAnimationComplete, duration)
    return () => window.clearTimeout(timer)
  }, [config.animated, config.duration, config.onAnimationComplete, visible])

  const height = responsiveDimension(config, 'height', viewportWidth)
  const width = responsiveDimension(config, 'width', viewportWidth)
  const vertical = config.position === 'top' || config.position === 'bottom'
  const intensity = hovered && config.hoverIntensity
    ? config.strength * config.hoverIntensity
    : config.strength
  const count = Math.max(1, Math.round(config.divCount))

  const containerStyle: CSSProperties = {
    position: config.target === 'page' ? 'fixed' : 'absolute',
    zIndex: config.target === 'page' ? config.zIndex + 100 : config.zIndex,
    opacity: visible ? 1 : 0,
    pointerEvents: config.hoverIntensity ? 'auto' : 'none',
    transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
    height: vertical ? height : '100%',
    width: vertical ? width ?? '100%' : width ?? height,
    top: config.position === 'top' || !vertical ? 0 : undefined,
    bottom: config.position === 'bottom' || !vertical ? 0 : undefined,
    left: config.position === 'left' || vertical ? 0 : undefined,
    right: config.position === 'right' || vertical ? 0 : undefined,
    ...config.style,
  }

  const direction = {
    top: 'to top',
    bottom: 'to bottom',
    left: 'to left',
    right: 'to right',
  }[config.position]

  return (
    <div
      ref={containerRef}
      className={['gradual-blur', config.className].filter(Boolean).join(' ')}
      onMouseEnter={config.hoverIntensity ? () => setHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setHovered(false) : undefined}
      style={containerStyle}
    >
      <div className="gradual-blur-inner">
        {Array.from({ length: count }, (_, index) => {
          const step = 100 / count
          const progress = curves[config.curve]((index + 1) / count)
          const blur = config.exponential
            ? 2 ** (progress * 4) * 0.0625 * intensity
            : 0.0625 * (progress * count + 1) * intensity
          const start = Math.round(index * step * 10) / 10
          const solid = Math.round((index + 1) * step * 10) / 10
          const end = Math.min(100, Math.round((index + 2) * step * 10) / 10)
          const mask = `linear-gradient(${direction}, transparent ${start}%, black ${solid}%, transparent ${end}%)`

          return (
            <div
              key={index}
              style={{
                WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`,
                WebkitMaskImage: mask,
                backdropFilter: `blur(${blur.toFixed(3)}rem)`,
                maskImage: mask,
                opacity: config.opacity,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const GradualBlur = memo(GradualBlurComponent)
GradualBlur.displayName = 'GradualBlur'

export default GradualBlur
