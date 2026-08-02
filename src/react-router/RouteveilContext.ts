import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { NavigateOptions, To } from 'react-router-dom'
import type {
  ClickPosition,
  OverlayAnimationHandle,
  OverlayTransitionDefinition,
} from '../core/index.js'
import type {
  RouteveilBetweenInput,
  RouteveilPendingWorkRegistrar,
  RouteveilPhase,
  RouteveilPreload,
  RouteveilTransition,
  SharedElementsOption,
} from './types.js'
import type { SharedElementRegistrationToken } from './shared-elements.js'

export type SharedElementSource =
  | {
      kind: 'link'
      trigger: Element
    }
  | {
      kind: 'programmatic'
      trigger: Element | null
    }

export type TransitionRequest = {
  to: To
  expectedPath: string
  transition: RouteveilTransition
  between?: RouteveilBetweenInput
  commit: () => void | Promise<void>
  navigateOptions?: NavigateOptions
  smoothScrollToTop?: boolean
  scrollToSharedElement?: string
  sharedElements?: SharedElementsOption
  clickPosition?: ClickPosition
  waitForLocationChange?: boolean
  sharedElementSource?: SharedElementSource
  preload?: () => Promise<void>
}

export type BetweenLocationSnapshot = {
  key: string
  path: string
}

export type BetweenRegistrationInput = {
  host: HTMLElement
  location: BetweenLocationSnapshot
  while: boolean
  minDuration: number
  content: ReactNode
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
  defaultPreload: RouteveilPreload
  preloadRoute: (path: string) => Promise<void>
  captureBetween: (token: symbol) => void
  registerPendingWork: RouteveilPendingWorkRegistrar
  registerView: (
    element: HTMLElement | null,
    previousElement: HTMLElement | null,
  ) => void
  registerOverlayHandle: (
    id: number,
    handle: OverlayAnimationHandle | null,
  ) => void
  registerOverlayRoot: (
    id: number,
    element: HTMLElement | null,
  ) => void
  registerBetween: (
    token: symbol,
    host: HTMLElement,
  ) => () => void
  updateBetween: (
    token: symbol,
    input: BetweenRegistrationInput,
  ) => void
  registerSharedElement: (
    token: SharedElementRegistrationToken,
    name: string,
    element: HTMLElement | SVGElement,
  ) => () => void
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
