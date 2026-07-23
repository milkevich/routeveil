import { useCallback } from 'react'
import {
  resolvePath,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useRouteveilContext } from './RouteveilContext.js'
import type {
  RouteveilNavigate,
  RouteveilNavigateOptions,
} from './types.js'
import { warnOnce } from './warnings.js'

export function useRouteveilNavigate(): RouteveilNavigate {
  const navigate = useNavigate()
  const location = useLocation()
  const { transitionTo } = useRouteveilContext()

  return useCallback<RouteveilNavigate>(
    (to, options: RouteveilNavigateOptions = {}) => {
      const {
        transition,
        transitionOptions,
        smoothScrollToTop,
        ...navigateOptions
      } = options

      const resolved = resolvePath(to, location.pathname)
      const isCurrentLocation =
        resolved.pathname === location.pathname
        && resolved.search === location.search
        && resolved.hash === location.hash

      if (!transition || isCurrentLocation) {
        return Promise.resolve(navigate(to, navigateOptions))
      }

      if (navigateOptions.viewTransition) {
        warnOnce(
          'native-view-transition',
          'Routeveil: React Router’s viewTransition option is ignored when a Routeveil transition is selected.',
        )
      }

      const routeveilNavigateOptions = {
        ...navigateOptions,
        viewTransition: false,
      }

      return transitionTo({
        to,
        expectedPath: `${resolved.pathname}${resolved.search}${resolved.hash}`,
        transition,
        commit: () => {
          return navigate(to, routeveilNavigateOptions)
        },
        transitionOptions,
        smoothScrollToTop,
        navigateOptions: routeveilNavigateOptions,
      })
    },
    [location.hash, location.pathname, location.search, navigate, transitionTo],
  )
}
