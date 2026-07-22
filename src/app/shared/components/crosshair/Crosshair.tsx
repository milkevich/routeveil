import { useEffect, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import './Crosshair.css'

interface CrosshairProps {
  color?: string
  containerRef?: RefObject<HTMLElement | null>
}

export default function Crosshair({
  color = '#000000',
  containerRef,
}: CrosshairProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const container = containerRef?.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const rendered = { ...pointer }
    let visible = false
    let frame = 0

    const handlePointerMove = (event: PointerEvent) => {
      if (container) {
        const bounds = container.getBoundingClientRect()
        pointer.x = event.clientX
        pointer.y = event.clientY
        visible = event.clientX >= bounds.left
          && event.clientX <= bounds.right
          && event.clientY >= bounds.top
          && event.clientY <= bounds.bottom
      } else {
        pointer.x = event.clientX
        pointer.y = event.clientY
        visible = true
      }
      root.dataset.visible = String(visible)
    }

    const render = () => {
      rendered.x += (pointer.x - rendered.x) * 0.16
      rendered.y += (pointer.y - rendered.y) * 0.16
      root.style.setProperty('--crosshair-x', `${rendered.x}px`)
      root.style.setProperty('--crosshair-y', `${rendered.y}px`)
      frame = window.requestAnimationFrame(render)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    frame = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.cancelAnimationFrame(frame)
    }
  }, [containerRef])

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="crosshair"
      data-visible="false"
      style={{ '--crosshair-color': color } as CSSProperties}
    >
      <span className="crosshair__horizontal" />
      <span className="crosshair__vertical" />
    </div>
  )
}
