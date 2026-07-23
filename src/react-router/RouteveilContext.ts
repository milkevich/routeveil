import { createContext, useContext } from 'react'
import type { NavigateOptions, To } from 'react-router-dom'
import type {
  ClickPosition,
  OverlayAnimationHandle,
  OverlayTransitionDefinition,
} from '../core/index.js'
import type { RouteveilPhase, TransitionName } from './types.js'

export type TransitionRequest = {
  to: To
  expectedPath: string
  transition: TransitionName
  commit: () => void | Promise<void>
  transitionOptions?: unknown
  navigateOptions?: NavigateOptions
  smoothScrollToTop?: boolean
  clickPosition?: ClickPosition
  waitForLocationChange?: boolean
}

export type ActiveOverlay = {
  id: number
  definition: OverlayTransitionDefinition
  options?: unknown
  clickPosition?: ClickPosition
}

export type RouteveilContextValue = {
  phase: RouteveilPhase
  activeOverlay: ActiveOverlay | null
  transitionTo: (request: TransitionRequest) => Promise<void>
  registerView: (
    element: HTMLElement | null,
    previousElement: HTMLElement | null,
  ) => void
  registerOverlayHandle: (
    id: number,
    handle: OverlayAnimationHandle | null,
  ) => void
}

export const RouteveilContext = createContext<RouteveilContextValue | null>(null)

export function useRouteveilContext(): RouteveilContextValue {
  const context = useContext(RouteveilContext)

  if (!context) {
    throw new Error(
      'Routeveil components must be used inside <RouteveilProvider>.',
    )
  }

  return context
}
