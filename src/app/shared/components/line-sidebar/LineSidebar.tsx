import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import './LineSidebar.css'

type Falloff = 'linear' | 'smooth' | 'sharp'

export interface LineSidebarProps {
  items: string[]
  accentColor?: string
  textColor?: string
  markerColor?: string
  showIndex?: boolean
  showMarker?: boolean
  proximityRadius?: number
  maxShift?: number
  falloff?: Falloff
  markerLength?: number
  markerGap?: number
  tickScale?: number
  scaleTick?: boolean
  itemGap?: number
  fontSize?: number | string
  smoothing?: number
  activeIndex?: number | null
  defaultActive?: number | null
  onItemClick?: (index: number, label: string) => void
  className?: string
}

const falloffCurves: Record<Falloff, (progress: number) => number> = {
  linear: (progress) => progress,
  smooth: (progress) => progress * progress * (3 - 2 * progress),
  sharp: (progress) => progress * progress * progress,
}

export default function LineSidebar({
  items,
  accentColor = '#000000',
  textColor = '#6f6f6f',
  markerColor = '#a8a8a8',
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 18,
  falloff = 'smooth',
  markerLength = 44,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 14,
  fontSize = 12,
  smoothing = 120,
  activeIndex,
  defaultActive = 0,
  onItemClick,
  className = '',
}: LineSidebarProps) {
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])
  const [internalActive, setInternalActive] = useState<number | null>(defaultActive)
  const selectedIndex = activeIndex === undefined ? internalActive : activeIndex

  const clearEffects = useCallback(() => {
    itemRefs.current.forEach((item, index) => {
      item?.style.setProperty('--effect', selectedIndex === index ? '1' : '0')
    })
  }, [selectedIndex])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLUListElement>) => {
    const curve = falloffCurves[falloff]
    itemRefs.current.forEach((item, index) => {
      if (!item) return
      const bounds = item.getBoundingClientRect()
      const center = bounds.top + bounds.height / 2
      const proximity = Math.max(0, 1 - Math.abs(event.clientY - center) / proximityRadius)
      const effect = Math.max(curve(proximity), selectedIndex === index ? 1 : 0)
      item.style.setProperty('--effect', effect.toFixed(4))
    })
  }, [falloff, proximityRadius, selectedIndex])

  const handleItemClick = useCallback((index: number, label: string) => {
    if (activeIndex === undefined) setInternalActive(index)
    onItemClick?.(index, label)
  }, [activeIndex, onItemClick])

  const style = {
    '--accent-color': accentColor,
    '--text-color': textColor,
    '--marker-color': markerColor,
    '--marker-length': `${markerLength}px`,
    '--marker-gap': `${markerGap}px`,
    '--tick-scale': tickScale,
    '--max-shift': `${maxShift}px`,
    '--item-gap': `${itemGap}px`,
    '--font-size': fontSize,
    '--smoothing': `${smoothing}ms`,
  } as CSSProperties

  return (
    <nav
      aria-label="Documentation sections"
      className={[
        'line-sidebar',
        showMarker && 'line-sidebar--markers',
        scaleTick && 'line-sidebar--scale-tick',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
    >
      <ul
        className="line-sidebar__list"
        onPointerLeave={clearEffects}
        onPointerMove={handlePointerMove}
      >
        {items.map((label, index) => (
          <li
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            className="line-sidebar__item"
            key={label}
            style={{ '--effect': selectedIndex === index ? 1 : 0, fontWeight: selectedIndex === index ? 600 : 500, } as CSSProperties}
          >
            {showMarker && <span aria-hidden="true" className="line-sidebar__marker" />}
            <button
              aria-current={selectedIndex === index ? 'location' : undefined}
              className="line-sidebar__label"
              onClick={() => handleItemClick(index, label)}
              type="button"
            >
              {showIndex && (
                <span className="line-sidebar__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
              )}
              <span className="line-sidebar__text">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
