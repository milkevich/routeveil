import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  animatePhase,
  builtInTransitions,
  cancelAnimation,
  cancelAnimations,
  nextPaint,
  prefersReducedMotion,
} from '../core/index.js'
import type {
  OverlayAnimationHandle,
  OverlayTransitionDefinition,
  TransitionDefinition,
} from '../core/index.js'
import {
  RouteveilContext,
  type ActiveOverlay,
  type RouteveilContextValue,
  type TransitionRequest,
} from './RouteveilContext.js'
import { RouteveilOverlayPortal } from './RouteveilOverlayPortal.js'
import type {
  RouteveilPhase,
  RouteveilProviderProps,
} from './types.js'
import {
  isRouteveilDevelopment,
  warnOnce,
} from './warnings.js'

type LocationSnapshot = {
  key: string
  path: string
}

type LocationWaiter = {
  snapshot: LocationSnapshot
  resolve: (changed: boolean) => void
  timer: number
}

type PreparedLocationWait = {
  promise: Promise<boolean>
  cancel: () => void
}

type OverlayReady = {
  id: number
  resolve: (handle: OverlayAnimationHandle) => void
}

const LOCATION_WATCHDOG_MS = 10_000
const ANIMATION_WATCHDOG_MS = 15_000

function getPath(location: {
  pathname: string
  search: string
  hash: string
}): string {
  return `${location.pathname}${location.search}${location.hash}`
}

function isPromiseLike(value: unknown): value is Promise<void> {
  return (
    typeof value === 'object'
    && value !== null
    && 'then' in value
    && typeof value.then === 'function'
  )
}

function withTimeout<T>(
  promise: Promise<T>,
  duration: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message))
    }, duration)

    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function scrollAfterNavigation(
  preventScrollReset?: boolean,
  smoothScrollToTop = false,
): void {
  if (preventScrollReset || typeof window === 'undefined') {
    return
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: smoothScrollToTop ? 'smooth' : 'instant',
  })
}

function isOverlayDefinition(
  definition: TransitionDefinition,
): definition is OverlayTransitionDefinition {
  return definition.type === 'overlay'
}

function collectNewAnimations(
  element: Element,
  existing: ReadonlySet<Animation>,
  target: Animation[],
): void {
  if (typeof element.getAnimations !== 'function') {
    return
  }

  for (const animation of element.getAnimations()) {
    if (!existing.has(animation) && !target.includes(animation)) {
      target.push(animation)
    }
  }
}

export function RouteveilProvider({
  children,
  transitions,
}: RouteveilProviderProps) {
  const location = useLocation()
  const [phase, setPhase] = useState<RouteveilPhase>('idle')
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null)
  const viewRef = useRef<HTMLElement | null>(null)
  const locationRef = useRef(location)
  const locationWaitersRef = useRef<LocationWaiter[]>([])
  const activePromiseRef = useRef<Promise<void> | null>(null)
  const runIdRef = useRef(0)
  const overlayReadyRef = useRef<OverlayReady | null>(null)

  const resolvedTransitions = useMemo<Record<string, TransitionDefinition>>(
    () => ({
      ...builtInTransitions,
      ...transitions,
    }),
    [transitions],
  )

  useLayoutEffect(() => {
    locationRef.current = location

    if (locationWaitersRef.current.length === 0) {
      return
    }

    const currentPath = getPath(location)
    const remaining: LocationWaiter[] = []

    for (const waiter of locationWaitersRef.current) {
      const changed =
        waiter.snapshot.key !== location.key
        || waiter.snapshot.path !== currentPath

      if (changed) {
        window.clearTimeout(waiter.timer)
        waiter.resolve(true)
      } else {
        remaining.push(waiter)
      }
    }

    locationWaitersRef.current = remaining
  }, [location])

  useLayoutEffect(() => {
    return () => {
      for (const waiter of locationWaitersRef.current) {
        window.clearTimeout(waiter.timer)
        waiter.resolve(false)
      }

      locationWaitersRef.current = []
    }
  }, [])

  const prepareLocationWait = useCallback((): PreparedLocationWait => {
    const current = locationRef.current
    const snapshot: LocationSnapshot = {
      key: current.key,
      path: getPath(current),
    }

    let waiter: LocationWaiter
    let settled = false

    const promise = new Promise<boolean>((resolve) => {
      const settle = (changed: boolean) => {
        if (settled) {
          return
        }

        settled = true
        resolve(changed)
      }

      waiter = {
        snapshot,
        resolve: settle,
        timer: window.setTimeout(() => {
          locationWaitersRef.current = locationWaitersRef.current.filter(
            (candidate) => candidate !== waiter,
          )
          settle(false)
        }, LOCATION_WATCHDOG_MS),
      }

      locationWaitersRef.current.push(waiter)
    })

    return {
      promise,
      cancel: () => {
        if (settled) {
          return
        }

        locationWaitersRef.current = locationWaitersRef.current.filter(
          (candidate) => candidate !== waiter,
        )
        window.clearTimeout(waiter.timer)
        waiter.resolve(false)
      },
    }
  }, [])

  const commitAndWait = useCallback(
    async (
      request: TransitionRequest,
      markCommitted: () => void,
    ): Promise<void> => {
      const waiter = prepareLocationWait()

      try {
        markCommitted()
        const navigationResult = request.commit()
        const navigationPromise = isPromiseLike(navigationResult)
          ? navigationResult
          : Promise.resolve()
        const boundedNavigation = withTimeout(
          navigationPromise,
          LOCATION_WATCHDOG_MS,
          'Routeveil navigation did not settle.',
        )

        const changed = await Promise.race([
          waiter.promise,
          boundedNavigation.then(() => waiter.promise),
        ])

        await boundedNavigation

        if (!changed) {
          warnOnce(
            'location-timeout',
            'Routeveil: Navigation did not produce a location change. The transition was safely restored.',
          )
        }

        await nextPaint()
        scrollAfterNavigation(
          request.navigateOptions?.preventScrollReset,
          request.smoothScrollToTop,
        )
      } catch (error) {
        waiter.cancel()
        throw error
      }
    },
    [prepareLocationWait],
  )

  const commitTransition = useCallback(
    async (
      request: TransitionRequest,
      markCommitted: () => void,
    ): Promise<void> => {
      if (request.waitForLocationChange === false) {
        markCommitted()
        const result = request.commit()

        if (isPromiseLike(result)) {
          await result
        }

        await nextPaint()
        return
      }

      await commitAndWait(request, markCommitted)
    },
    [commitAndWait],
  )

  const registerView = useCallback((element: HTMLElement | null) => {
    if (
      element
      && viewRef.current
      && viewRef.current !== element
    ) {
      warnOnce(
        'multiple-views',
        'Routeveil: Multiple <RouteveilView> components were registered under one provider. Version one supports one active view per provider.',
      )
    }

    viewRef.current = element
  }, [])

  const registerOverlayHandle = useCallback(
    (id: number, handle: OverlayAnimationHandle | null) => {
      const ready = overlayReadyRef.current

      if (!ready || ready.id !== id) {
        return
      }

      if (handle) {
        ready.resolve(handle)
      }
    },
    [],
  )

  const prepareOverlay = useCallback((
    id: number,
    definition: OverlayTransitionDefinition,
    request: TransitionRequest,
  ): Promise<OverlayAnimationHandle> => {
    let resolveReady!: (handle: OverlayAnimationHandle) => void
    const promise = new Promise<OverlayAnimationHandle>((resolve) => {
      resolveReady = resolve
    })

    overlayReadyRef.current = {
      id,
      resolve: resolveReady,
    }

    setActiveOverlay({
      id,
      definition,
      options: request.transitionOptions,
      clickPosition: request.clickPosition,
    })

    return withTimeout(
      promise,
      2_000,
      'Routeveil overlay did not become ready.',
    )
  }, [])

  const executeTransition = useCallback(
    async (request: TransitionRequest): Promise<void> => {
      let navigationAttempted = false

      const markCommitted = () => {
        navigationAttempted = true
      }

      const commitRequest = () => commitTransition(request, markCommitted)
      const definition = resolvedTransitions[request.transition]

      if (!definition || (definition.type !== 'page' && definition.type !== 'overlay')) {
        warnOnce(
          `unknown-transition:${request.transition}`,
          `Routeveil: Unknown transition “${request.transition}”. Navigation continued without animation.`,
        )
        await commitRequest()
        return
      }

      if (prefersReducedMotion()) {
        await commitRequest()
        return
      }

      const runId = ++runIdRef.current
      const animations: Animation[] = []
      let pageView: HTMLElement | null = null
      let pageWasInert = false
      let overlayHandle: OverlayAnimationHandle | null = null
      const startingLocation: LocationSnapshot = {
        key: locationRef.current.key,
        path: getPath(locationRef.current),
      }

      try {
        if (definition.type === 'page') {
          pageView = viewRef.current

          if (!pageView) {
            warnOnce(
              `missing-view:${request.transition}`,
              `Routeveil: The “${request.transition}” page transition requires a <RouteveilView>. Navigation continued without animation.`,
            )
            await commitRequest()
            return
          }

          const phases = definition.resolve?.(
            request.transitionOptions,
          ) ?? definition

          pageWasInert = pageView.inert
          pageView.inert = true
          pageView.setAttribute('data-routeveil-transitioning', '')

          setPhase('exiting')
          const preexistingAnimations = new Set(
            typeof pageView.getAnimations === 'function'
              ? pageView.getAnimations()
              : [],
          )
          const exitPromise = animatePhase(pageView, phases.exit)
          collectNewAnimations(pageView, preexistingAnimations, animations)
          const exitAnimation = await withTimeout(
            exitPromise,
            ANIMATION_WATCHDOG_MS,
            'Routeveil page exit animation did not settle.',
          )

          if (exitAnimation && !animations.includes(exitAnimation)) {
            animations.push(exitAnimation)
          }

          const latestLocation = locationRef.current
          const locationChangedDuringExit =
            latestLocation.key !== startingLocation.key
            || getPath(latestLocation) !== startingLocation.path

          if (locationChangedDuringExit) {
            return
          }

          setPhase('navigating')
          await commitRequest()

          const enteringView = viewRef.current ?? pageView
          setPhase('entering')

          const beforeEnter = new Set(
            typeof enteringView.getAnimations === 'function'
              ? enteringView.getAnimations()
              : [],
          )
          const enterPromise = animatePhase(enteringView, phases.enter)
          collectNewAnimations(enteringView, beforeEnter, animations)
          cancelAnimation(exitAnimation)
          const enterAnimation = await withTimeout(
            enterPromise,
            ANIMATION_WATCHDOG_MS,
            'Routeveil page enter animation did not settle.',
          )

          if (enterAnimation && !animations.includes(enterAnimation)) {
            animations.push(enterAnimation)
          }

          return
        }

        if (isOverlayDefinition(definition)) {
          const ready = prepareOverlay(runId, definition, request)
          overlayHandle = await ready
          await nextPaint()

          setPhase('covering')
          await withTimeout(
            overlayHandle.cover(),
            ANIMATION_WATCHDOG_MS,
            'Routeveil overlay cover animation did not settle.',
          )

          setPhase('navigating')
          await commitRequest()

          setPhase('revealing')
          await withTimeout(
            overlayHandle.reveal(),
            ANIMATION_WATCHDOG_MS,
            'Routeveil overlay reveal animation did not settle.',
          )
        }
      } catch (error) {
        warnOnce(
          `transition-error:${request.transition}`,
          `Routeveil: The “${request.transition}” transition could not finish. Navigation and visual state were safely recovered.`,
        )

        if (isRouteveilDevelopment()) {
          console.error(error)
        }

        if (!navigationAttempted) {
          await commitRequest()
        }
      } finally {
        cancelAnimations(animations)

        if (pageView) {
          pageView.inert = pageWasInert
          pageView.removeAttribute('data-routeveil-transitioning')
        }

        try {
          overlayHandle?.reset()
        } catch (resetError) {
          if (isRouteveilDevelopment()) {
            console.error(resetError)
          }
        }

        if (overlayReadyRef.current?.id === runId) {
          overlayReadyRef.current = null
        }

        setActiveOverlay((current) => (
          current?.id === runId ? null : current
        ))
        setPhase('idle')
      }
    },
    [commitTransition, prepareOverlay, resolvedTransitions],
  )

  const transitionTo = useCallback(
    (request: TransitionRequest): Promise<void> => {
      const activePromise = activePromiseRef.current

      if (activePromise) {
        warnOnce(
          'transition-in-progress',
          'Routeveil: A transition is already in progress. The additional navigation request was ignored.',
        )
        return activePromise
      }

      const nextPromise = executeTransition(request)
      activePromiseRef.current = nextPromise

      void nextPromise.then(
        () => {
          if (activePromiseRef.current === nextPromise) {
            activePromiseRef.current = null
          }
        },
        () => {
          if (activePromiseRef.current === nextPromise) {
            activePromiseRef.current = null
          }
        },
      )

      return nextPromise
    },
    [executeTransition],
  )

  const contextValue = useMemo<RouteveilContextValue>(
    () => ({
      phase,
      activeOverlay,
      transitionTo,
      registerView,
      registerOverlayHandle,
    }),
    [
      activeOverlay,
      phase,
      registerOverlayHandle,
      registerView,
      transitionTo,
    ],
  )

  return (
    <RouteveilContext.Provider value={contextValue}>
      {children}
      <RouteveilOverlayPortal />
    </RouteveilContext.Provider>
  )
}
