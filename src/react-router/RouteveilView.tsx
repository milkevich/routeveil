import {
  forwardRef,
  useCallback,
  useRef,
} from 'react'
import type { ForwardedRef } from 'react'
import { Outlet } from 'react-router-dom'
import { useRouteveilContext } from './RouteveilContext.js'
import type { RouteveilViewProps } from './types.js'

function setForwardedRef(
  ref: ForwardedRef<HTMLDivElement>,
  value: HTMLDivElement | null,
): void {
  if (typeof ref === 'function') {
    ref(value)
    return
  }

  if (ref) {
    ref.current = value
  }
}

export const RouteveilView = forwardRef<HTMLDivElement, RouteveilViewProps>(
  function RouteveilView(
    { children, className, style },
    forwardedRef,
  ) {
    const { phase, registerView } = useRouteveilContext()
    const nodeRef = useRef<HTMLDivElement | null>(null)

    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        nodeRef.current = node
        registerView(node)
        setForwardedRef(forwardedRef, node)
      },
      [forwardedRef, registerView],
    )

    return (
      <div
        ref={mergedRef}
        aria-busy={phase === 'idle' ? undefined : true}
        className={className}
        data-routeveil-phase={phase}
        data-routeveil-view=""
        style={style}
      >
        {children === undefined ? <Outlet /> : children}
      </div>
    )
  },
)
