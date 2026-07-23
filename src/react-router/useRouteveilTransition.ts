import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useRouteveilContext } from './RouteveilContext.js'
import type {
  RouteveilPlay,
  RouteveilPlayOptions,
} from './types.js'

export function useRouteveilTransition(): RouteveilPlay {
  const location = useLocation()
  const { transitionTo } = useRouteveilContext()

  return useCallback<RouteveilPlay>(
    (
      transition,
      options: RouteveilPlayOptions = {},
    ) => transitionTo({
      to: `${location.pathname}${location.search}${location.hash}`,
      expectedPath: `${location.pathname}${location.search}${location.hash}`,
      transition,
      transitionOptions: options.transitionOptions,
      clickPosition: options.clickPosition,
      commit: () => undefined,
      waitForLocationChange: false,
    }),
    [
      location.hash,
      location.pathname,
      location.search,
      transitionTo,
    ],
  )
}
