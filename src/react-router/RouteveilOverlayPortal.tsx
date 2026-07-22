import { Component } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { OverlayAnimationHandle } from '../core/index.js'
import { useRouteveilContext } from './RouteveilContext.js'

type OverlayErrorBoundaryProps = {
  children: ReactNode
  onError: (error: Error) => void
}

type OverlayErrorBoundaryState = {
  failed: boolean
}

class OverlayErrorBoundary extends Component<
  OverlayErrorBoundaryProps,
  OverlayErrorBoundaryState
> {
  state: OverlayErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): OverlayErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error): void {
    this.props.onError(error)
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

export function RouteveilOverlayPortal() {
  const {
    activeOverlay,
    registerOverlayHandle,
  } = useRouteveilContext()

  if (!activeOverlay || typeof document === 'undefined') {
    return null
  }

  const Renderer = activeOverlay.definition.renderer
  return createPortal(
    <div
      data-active="true"
      data-routeveil-overlay-root=""
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2_147_483_647,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <OverlayErrorBoundary
        key={activeOverlay.id}
        onError={(error) => {
          registerOverlayHandle(activeOverlay.id, {
            cover: () => Promise.reject(error),
            reveal: () => Promise.resolve(),
            reset: () => undefined,
          })
        }}
      >
        <Renderer
          options={activeOverlay.options}
          clickPosition={activeOverlay.clickPosition}
          controllerRef={(handle: OverlayAnimationHandle | null) => {
            registerOverlayHandle(activeOverlay.id, handle)
          }}
        />
      </OverlayErrorBoundary>
    </div>,
    document.body,
  )
}
