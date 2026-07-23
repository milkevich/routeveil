import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  UNSAFE_DataRouterContext,
  UNSAFE_NavigationContext,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
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

type CommitState = 'pending' | 'committing' | 'committed' | 'abandoned'

type CancellationReason = 'external-location' | 'provider-unmount'

type LifecycleFailureKind =
  | 'animation-timeout'
  | 'location-timeout'
  | 'navigation-timeout'
  | 'overlay-ready-timeout'

type ViewOwnership = {
  element: HTMLElement
  originalInert: boolean
  inertOwned: boolean
  inertMutated: boolean
  transitionAttributeOwned: boolean
  transitionAttributeMutated: boolean
  observer: MutationObserver | null
}

type TransitionRun = {
  id: number
  request: TransitionRequest
  controller: AbortController
  cleanups: Set<() => void>
  animations: Set<Animation>
  commitState: CommitState
  acceptedLocation: LocationSnapshot
  committedLocation: LocationSnapshot | null
  externalLocation: LocationSnapshot | null
  cancellationReason: CancellationReason | null
  viewOwnerships: ViewOwnership[]
  overlayHandle: OverlayAnimationHandle | null
  overlayReset: boolean
  previousFocus: HTMLElement | null
  finalized: boolean
  workReleased: boolean
  invokingCommit: boolean
}

type LocationWaiter = {
  snapshot: LocationSnapshot
  settle: (location: LocationSnapshot | null) => void
}

type PreparedLocationWait = {
  promise: Promise<LocationSnapshot | null>
  cancel: () => void
}

type OverlayReady = {
  id: number
  resolve: (handle: OverlayAnimationHandle) => void
}

const LOCATION_WATCHDOG_MS = 10_000
const ANIMATION_WATCHDOG_MS = 15_000
const OVERLAY_READY_WATCHDOG_MS = 2_000
const HISTORY_CHANGE_EVENT = 'routeveil:historychange'

let historyInstrumentationUsers = 0
let releaseHistoryInstrumentation: (() => void) | null = null

class TransitionCancelledError extends Error {}

class TransitionLifecycleError extends Error {
  kind: LifecycleFailureKind

  constructor(kind: LifecycleFailureKind, message: string) {
    super(message)
    this.kind = kind
  }
}

function retainHistoryInstrumentation(): () => void {
  historyInstrumentationUsers += 1

  if (historyInstrumentationUsers === 1 && typeof window !== 'undefined') {
    const history = window.history
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    const notify = (action: 'PUSH' | 'REPLACE') => {
      window.dispatchEvent(new CustomEvent(HISTORY_CHANGE_EVENT, {
        detail: action,
      }))
    }
    const pushState: History['pushState'] = function pushState(
      this: History,
      data,
      unused,
      url,
    ) {
      originalPushState.call(this, data, unused, url)
      notify('PUSH')
    }
    const replaceState: History['replaceState'] = function replaceState(
      this: History,
      data,
      unused,
      url,
    ) {
      originalReplaceState.call(this, data, unused, url)
      notify('REPLACE')
    }

    history.pushState = pushState
    history.replaceState = replaceState
    releaseHistoryInstrumentation = () => {
      if (history.pushState === pushState) {
        history.pushState = originalPushState
      }

      if (history.replaceState === replaceState) {
        history.replaceState = originalReplaceState
      }
    }
  }

  let released = false

  return () => {
    if (released) {
      return
    }

    released = true
    historyInstrumentationUsers -= 1

    if (historyInstrumentationUsers === 0) {
      releaseHistoryInstrumentation?.()
      releaseHistoryInstrumentation = null
    }
  }
}

function getPath(location: {
  pathname: string
  search: string
  hash: string
}): string {
  return `${location.pathname}${location.search}${location.hash}`
}

function getLocationSnapshot(location: {
  key: string
  pathname: string
  search: string
  hash: string
}): LocationSnapshot {
  return {
    key: location.key,
    path: getPath(location),
  }
}

function locationsMatch(
  first: LocationSnapshot,
  second: LocationSnapshot,
): boolean {
  return first.key === second.key && first.path === second.path
}

function registerCleanup(
  run: TransitionRun,
  cleanup: () => void,
): () => void {
  run.cleanups.add(cleanup)
  return () => {
    run.cleanups.delete(cleanup)
  }
}

function waitForTask<T>(
  run: TransitionRun,
  promise: Promise<T>,
  duration: number,
  failure: TransitionLifecycleError,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    let timer = 0

    const cleanup = () => {
      window.clearTimeout(timer)
      run.controller.signal.removeEventListener('abort', handleAbort)
      run.cleanups.delete(cleanup)
    }

    const prepareToSettle = (): boolean => {
      if (settled) {
        return false
      }

      settled = true
      cleanup()
      return true
    }

    const settleResolved = (value: T) => {
      if (prepareToSettle()) {
        resolve(value)
      }
    }

    const settleRejected = (error: unknown) => {
      if (prepareToSettle()) {
        reject(error)
      }
    }

    const handleAbort = () => {
      settleRejected(new TransitionCancelledError())
    }

    if (run.controller.signal.aborted) {
      handleAbort()
      return
    }

    registerCleanup(run, cleanup)
    run.controller.signal.addEventListener('abort', handleAbort, { once: true })
    timer = window.setTimeout(() => {
      try {
        onTimeout?.()
      } finally {
        settleRejected(failure)
      }
    }, duration)

    promise.then(
      settleResolved,
      settleRejected,
    )
  })
}

function cancelRun(
  run: TransitionRun,
  reason: CancellationReason,
  location?: LocationSnapshot,
): void {
  if (run.controller.signal.aborted || run.finalized) {
    return
  }

  run.cancellationReason = reason

  if (reason === 'external-location' && location) {
    run.externalLocation = location
  }

  if (run.commitState === 'pending' || run.commitState === 'committing') {
    run.commitState = 'abandoned'
  }

  run.controller.abort()
}

function recordOwnershipMutations(
  ownership: ViewOwnership,
  records: MutationRecord[],
): void {
  for (const record of records) {
    if (record.attributeName === 'inert') {
      ownership.inertMutated = true
    }

    if (record.attributeName === 'data-routeveil-transitioning') {
      ownership.transitionAttributeMutated = true
    }
  }
}

function claimView(run: TransitionRun, element: HTMLElement): void {
  if (run.viewOwnerships.some((ownership) => ownership.element === element)) {
    return
  }

  const ownership: ViewOwnership = {
    element,
    originalInert: element.inert,
    inertOwned: !element.inert,
    inertMutated: false,
    transitionAttributeOwned: !element.hasAttribute(
      'data-routeveil-transitioning',
    ),
    transitionAttributeMutated: false,
    observer: null,
  }

  if (ownership.inertOwned) {
    element.inert = true
  }

  if (ownership.transitionAttributeOwned) {
    element.setAttribute('data-routeveil-transitioning', '')
  }

  if (typeof MutationObserver !== 'undefined') {
    ownership.observer = new MutationObserver((records) => {
      recordOwnershipMutations(ownership, records)
    })
    ownership.observer.observe(element, {
      attributes: true,
      attributeFilter: ['inert', 'data-routeveil-transitioning'],
    })
  }

  run.viewOwnerships.push(ownership)
}

function restoreOwnedViews(run: TransitionRun): void {
  for (const ownership of run.viewOwnerships) {
    if (ownership.observer) {
      recordOwnershipMutations(
        ownership,
        ownership.observer.takeRecords(),
      )
      ownership.observer.disconnect()
    }

    if (
      ownership.inertOwned
      && !ownership.inertMutated
      && ownership.element.inert
    ) {
      ownership.element.inert = ownership.originalInert
    }

    if (
      ownership.transitionAttributeOwned
      && !ownership.transitionAttributeMutated
      && ownership.element.getAttribute('data-routeveil-transitioning') === ''
    ) {
      ownership.element.removeAttribute('data-routeveil-transitioning')
    }
  }

  run.viewOwnerships = []
}

function resetOverlay(run: TransitionRun): void {
  if (run.overlayReset) {
    return
  }

  run.overlayReset = true

  try {
    run.overlayHandle?.reset()
  } catch (error) {
    if (isRouteveilDevelopment()) {
      console.error(error)
    }
  }
}

function releaseRunWork(run: TransitionRun): void {
  if (run.workReleased) {
    return
  }

  run.workReleased = true

  if (!run.controller.signal.aborted) {
    run.controller.abort()
  }

  for (const cleanup of [...run.cleanups]) {
    cleanup()
  }

  run.cleanups.clear()
  cancelAnimations([...run.animations])
  run.animations.clear()
  restoreOwnedViews(run)
  resetOverlay(run)
}

function isBlockedFromFocus(element: HTMLElement): boolean {
  return Boolean(
    element.hidden
    || element.closest('[inert], [aria-hidden="true"]') !== null
    || ('disabled' in element && Boolean(element.disabled))
  )
}

function canReceiveFocus(
  element: HTMLElement | null,
): element is HTMLElement {
  return Boolean(
    element
    && element.isConnected
    && typeof element.focus === 'function'
    && !isBlockedFromFocus(element),
  )
}

function getFocusedElement(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
}

function isMeaningfulFocus(element: HTMLElement | null): boolean {
  return Boolean(
    canReceiveFocus(element)
    && element !== document.body
    && element !== document.documentElement,
  )
}

function focusWithoutScroll(element: HTMLElement): void {
  try {
    element.focus({ preventScroll: true })
  } catch {
    return
  }
}

function restorePreviousFocus(run: TransitionRun): void {
  const currentFocus = getFocusedElement()

  if (
    isMeaningfulFocus(currentFocus)
    && currentFocus !== run.previousFocus
  ) {
    return
  }

  if (
    canReceiveFocus(run.previousFocus)
    && currentFocus !== run.previousFocus
  ) {
    focusWithoutScroll(run.previousFocus)
  }
}

function focusIncomingView(
  run: TransitionRun,
  view: HTMLElement | null,
): void {
  const currentFocus = getFocusedElement()

  if (
    isMeaningfulFocus(currentFocus)
    && (
      currentFocus !== run.previousFocus
      || Boolean(view?.contains(currentFocus))
    )
  ) {
    return
  }

  if (!canReceiveFocus(view)) {
    return
  }

  const ownsTabIndex = !view.hasAttribute('tabindex')

  if (ownsTabIndex) {
    view.setAttribute('tabindex', '-1')
  }

  focusWithoutScroll(view)

  if (ownsTabIndex && view.getAttribute('tabindex') === '-1') {
    view.removeAttribute('tabindex')
  }
}

function applyFocusPolicy(
  run: TransitionRun,
  view: HTMLElement | null,
): void {
  if (run.request.waitForLocationChange === false) {
    restorePreviousFocus(run)
    return
  }

  if (
    run.committedLocation
    || (
      run.cancellationReason === 'external-location'
      && run.externalLocation
    )
  ) {
    focusIncomingView(run, view)
    return
  }

  restorePreviousFocus(run)
}

function scrollAfterNavigation(request: TransitionRequest): void {
  if (
    request.navigateOptions?.preventScrollReset
    || request.expectedPath.includes('#')
    || typeof window === 'undefined'
  ) {
    return
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: request.smoothScrollToTop ? 'smooth' : 'instant',
  })
}

function isOverlayDefinition(
  definition: TransitionDefinition,
): definition is OverlayTransitionDefinition {
  return definition.type === 'overlay'
}

function reportTransitionError(
  request: TransitionRequest,
  error: unknown,
): void {
  if (error instanceof TransitionCancelledError) {
    return
  }

  if (error instanceof TransitionLifecycleError) {
    const messages: Record<LifecycleFailureKind, string> = {
      'animation-timeout': `Routeveil: The “${request.transition}” animation did not settle and was safely stopped.`,
      'location-timeout': 'Routeveil: Navigation did not produce the expected location change. Visual state was safely restored.',
      'navigation-timeout': 'Routeveil: The navigation promise did not settle. Visual state was safely restored.',
      'overlay-ready-timeout': `Routeveil: The “${request.transition}” overlay did not become ready and was safely removed.`,
    }

    warnOnce(
      `${error.kind}:${request.transition}:${error.message}`,
      messages[error.kind],
    )
  } else {
    const errorIdentity = error instanceof Error
      ? `${error.name}:${error.message}`
      : String(error)

    warnOnce(
      `transition-error:${request.transition}:${errorIdentity}`,
      `Routeveil: The “${request.transition}” transition could not finish. Navigation and visual state were safely recovered.`,
    )
  }

  if (isRouteveilDevelopment()) {
    console.error(error)
  }
}

function captureFocusedElement(): HTMLElement | null {
  return getFocusedElement()
}

function hasCommitted(run: TransitionRun): boolean {
  return run.commitState === 'committed'
}

export function RouteveilProvider({
  children,
  transitions,
}: RouteveilProviderProps) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const dataRouterContext = useContext(UNSAFE_DataRouterContext)
  const navigationContext = useContext(UNSAFE_NavigationContext)
  const [phase, setPhase] = useState<RouteveilPhase>('idle')
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null)
  const viewRef = useRef<HTMLElement | null>(null)
  const observedLocationRef = useRef(getLocationSnapshot(location))
  const locationWaitersRef = useRef<LocationWaiter[]>([])
  const activePromiseRef = useRef<Promise<void> | null>(null)
  const activeRunRef = useRef<TransitionRun | null>(null)
  const mountedRef = useRef(true)
  const runIdRef = useRef(0)
  const overlayReadyRef = useRef<OverlayReady | null>(null)

  const resolvedTransitions = useMemo<Record<string, TransitionDefinition>>(
    () => ({
      ...builtInTransitions,
      ...transitions,
    }),
    [transitions],
  )

  const isRunCurrent = useCallback((run: TransitionRun): boolean => (
    mountedRef.current
    && activeRunRef.current === run
    && !run.controller.signal.aborted
    && !run.finalized
  ), [])

  const assertRunCurrent = useCallback((run: TransitionRun): void => {
    if (!isRunCurrent(run)) {
      throw new TransitionCancelledError()
    }
  }, [isRunCurrent])

  const setRunPhase = useCallback((
    run: TransitionRun,
    nextPhase: RouteveilPhase,
  ): void => {
    assertRunCurrent(run)
    setPhase(nextPhase)
  }, [assertRunCurrent])

  const clearRunOverlay = useCallback((run: TransitionRun): void => {
    if (!mountedRef.current || activeRunRef.current !== run) {
      return
    }

    setActiveOverlay((current) => (
      current?.id === run.id ? null : current
    ))
  }, [])

  const prepareLocationWait = useCallback((
    run: TransitionRun,
  ): PreparedLocationWait => {
    let waiter!: LocationWaiter
    let settled = false
    let removeCleanup: () => void = () => undefined

    const promise = new Promise<LocationSnapshot | null>((resolve) => {
      const settle = (nextLocation: LocationSnapshot | null) => {
        if (settled) {
          return
        }

        settled = true
        locationWaitersRef.current = locationWaitersRef.current.filter(
          (candidate) => candidate !== waiter,
        )
        removeCleanup()
        resolve(nextLocation)
      }

      waiter = {
        snapshot: run.acceptedLocation,
        settle,
      }

      locationWaitersRef.current.push(waiter)
      removeCleanup = registerCleanup(run, () => settle(null))
    })

    return {
      promise,
      cancel: () => waiter.settle(null),
    }
  }, [])

  const observeLocation = useCallback((
    currentLocation: LocationSnapshot,
    action: string,
  ): void => {
    if (locationsMatch(observedLocationRef.current, currentLocation)) {
      return
    }

    observedLocationRef.current = currentLocation

    const run = activeRunRef.current

    if (run && !run.finalized && !run.controller.signal.aborted) {
      const expectedAction = run.request.navigateOptions?.replace
        ? 'REPLACE'
        : 'PUSH'
      const ownsLocationChange = (
        run.request.waitForLocationChange !== false
        && run.commitState === 'committing'
        && currentLocation.path === run.request.expectedPath
        && action === expectedAction
      )

      if (ownsLocationChange) {
        run.commitState = 'committed'
        run.committedLocation = currentLocation
        run.acceptedLocation = currentLocation
      } else {
        cancelRun(run, 'external-location', currentLocation)
      }
    }

    for (const waiter of [...locationWaitersRef.current]) {
      if (!locationsMatch(waiter.snapshot, currentLocation)) {
        waiter.settle(currentLocation)
      }
    }
  }, [])

  useLayoutEffect(() => {
    observeLocation(getLocationSnapshot(location), navigationType)
  }, [location, navigationType, observeLocation])

  useLayoutEffect(() => {
    const router = dataRouterContext?.router

    if (!router) {
      return
    }

    return router.subscribe((state) => {
      const pendingLocation = state.navigation.location
      const run = activeRunRef.current

      if (
        pendingLocation
        && run
        && !run.finalized
        && !run.controller.signal.aborted
        && !run.invokingCommit
      ) {
        const pendingSnapshot = getLocationSnapshot(pendingLocation)
        const pendingBelongsToRun = (
          run.commitState === 'committing'
          && pendingSnapshot.path === run.request.expectedPath
        )

        if (!pendingBelongsToRun) {
          cancelRun(run, 'external-location', pendingSnapshot)
        }
      }

      observeLocation(
        getLocationSnapshot(state.location),
        state.historyAction,
      )
    })
  }, [dataRouterContext?.router, observeLocation])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const observeBrowserHistory = (event: Event) => {
      const run = activeRunRef.current

      if (run?.invokingCommit) {
        return
      }

      const historyState = window.history.state as { key?: unknown } | null
      const key = typeof historyState?.key === 'string'
        ? historyState.key
        : observedLocationRef.current.key
      const basename = navigationContext.basename.replace(/\/$/u, '')
      const browserPathname = window.location.pathname
      const pathname = (
        basename
        && basename !== '/'
        && (
          browserPathname === basename
          || browserPathname.startsWith(`${basename}/`)
        )
      )
        ? browserPathname.slice(basename.length) || '/'
        : browserPathname
      const action = event instanceof CustomEvent
        && (event.detail === 'PUSH' || event.detail === 'REPLACE')
        ? event.detail
        : 'POP'

      observeLocation({
        key,
        path: `${pathname}${window.location.search}${window.location.hash}`,
      }, action)
    }

    const releaseInstrumentation = retainHistoryInstrumentation()
    window.addEventListener('popstate', observeBrowserHistory)
    window.addEventListener('hashchange', observeBrowserHistory)
    window.addEventListener(HISTORY_CHANGE_EVENT, observeBrowserHistory)

    return () => {
      window.removeEventListener('popstate', observeBrowserHistory)
      window.removeEventListener('hashchange', observeBrowserHistory)
      window.removeEventListener(HISTORY_CHANGE_EVENT, observeBrowserHistory)
      releaseInstrumentation()
    }
  }, [navigationContext.basename, observeLocation])

  useLayoutEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      const run = activeRunRef.current

      if (run) {
        cancelRun(run, 'provider-unmount')
        releaseRunWork(run)
      }

      for (const waiter of [...locationWaitersRef.current]) {
        waiter.settle(null)
      }

      locationWaitersRef.current = []
      overlayReadyRef.current = null
    }
  }, [])

  const registerView = useCallback((
    element: HTMLElement | null,
    previousElement: HTMLElement | null,
  ) => {
    if (element) {
      if (viewRef.current && viewRef.current !== element) {
        warnOnce(
          'multiple-views',
          'Routeveil: Multiple <RouteveilView> components were registered under one provider. Version one supports one active view per provider.',
        )
      }

      viewRef.current = element
      return
    }

    if (!previousElement || viewRef.current === previousElement) {
      viewRef.current = null
    }
  }, [])

  const registerOverlayHandle = useCallback((
    id: number,
    handle: OverlayAnimationHandle | null,
  ) => {
    const ready = overlayReadyRef.current
    const run = activeRunRef.current

    if (
      !handle
      || !ready
      || ready.id !== id
      || !run
      || run.id !== id
      || !isRunCurrent(run)
    ) {
      return
    }

    ready.resolve(handle)
  }, [isRunCurrent])

  const prepareOverlay = useCallback((
    run: TransitionRun,
    definition: OverlayTransitionDefinition,
  ): Promise<OverlayAnimationHandle> => {
    let resolveReady!: (handle: OverlayAnimationHandle) => void
    const promise = new Promise<OverlayAnimationHandle>((resolve) => {
      resolveReady = resolve
    })

    overlayReadyRef.current = {
      id: run.id,
      resolve: resolveReady,
    }

    setRunPhase(run, 'covering')
    setActiveOverlay({
      id: run.id,
      definition,
      options: run.request.transitionOptions,
      clickPosition: run.request.clickPosition,
    })

    return waitForTask(
      run,
      promise,
      OVERLAY_READY_WATCHDOG_MS,
      new TransitionLifecycleError(
        'overlay-ready-timeout',
        'Routeveil overlay did not become ready.',
      ),
    )
  }, [setRunPhase])

  const commitOnce = useCallback(async (run: TransitionRun): Promise<void> => {
    assertRunCurrent(run)

    if (run.commitState !== 'pending') {
      return
    }

    const waitsForLocation = run.request.waitForLocationChange !== false
    const locationWait = waitsForLocation
      ? prepareLocationWait(run)
      : null
    run.commitState = 'committing'

    let navigationResult: void | Promise<void>

    try {
      run.invokingCommit = true
      navigationResult = run.request.commit()
    } catch (error) {
      locationWait?.cancel()
      throw error
    } finally {
      run.invokingCommit = false
    }

    const navigationPromise = waitForTask(
      run,
      Promise.resolve(navigationResult),
      LOCATION_WATCHDOG_MS,
      new TransitionLifecycleError(
        'navigation-timeout',
        'Routeveil navigation did not settle.',
      ),
    )

    if (!locationWait) {
      await navigationPromise
      assertRunCurrent(run)
      run.commitState = 'committed'
      await nextPaint(run.controller.signal)
      assertRunCurrent(run)
      return
    }

    const [changedLocation] = await Promise.all([
      waitForTask(
        run,
        locationWait.promise,
        LOCATION_WATCHDOG_MS,
        new TransitionLifecycleError(
          'location-timeout',
          'Routeveil navigation did not produce a location change.',
        ),
      ),
      navigationPromise,
    ])
    assertRunCurrent(run)

    const committedLocation = run.committedLocation

    if (
      !changedLocation
      || !hasCommitted(run)
      || !committedLocation
      || !locationsMatch(changedLocation, committedLocation)
    ) {
      throw new TransitionLifecycleError(
        'location-timeout',
        'Routeveil navigation did not produce the expected location change.',
      )
    }

    await nextPaint(run.controller.signal)
    assertRunCurrent(run)
    scrollAfterNavigation(run.request)
  }, [assertRunCurrent, prepareLocationWait])

  const finalizeRun = useCallback((run: TransitionRun): void => {
    if (run.finalized) {
      return
    }

    run.finalized = true
    releaseRunWork(run)

    if (overlayReadyRef.current?.id === run.id) {
      overlayReadyRef.current = null
    }

    if (mountedRef.current && activeRunRef.current === run) {
      clearRunOverlay(run)
      setPhase('idle')
      applyFocusPolicy(run, viewRef.current)
    }
  }, [clearRunOverlay])

  const stopVisualWork = useCallback((run: TransitionRun): void => {
    cancelAnimations([...run.animations])
    resetOverlay(run)

    if (overlayReadyRef.current?.id === run.id) {
      overlayReadyRef.current = null
    }

    clearRunOverlay(run)
  }, [clearRunOverlay])

  const executeTransition = useCallback(async (
    run: TransitionRun,
  ): Promise<void> => {
    const { request } = run
    const definition = resolvedTransitions[request.transition]

    try {
      if (
        !definition
        || (definition.type !== 'page' && definition.type !== 'overlay')
      ) {
        warnOnce(
          `unknown-transition:${request.transition}`,
          `Routeveil: Unknown transition “${request.transition}”. Navigation continued without animation.`,
        )
        setRunPhase(run, 'navigating')
        await commitOnce(run)
        assertRunCurrent(run)
        return
      }

      if (prefersReducedMotion()) {
        setRunPhase(run, 'navigating')
        await commitOnce(run)
        assertRunCurrent(run)
        return
      }

      if (definition.type === 'page') {
        const pageView = viewRef.current

        if (!pageView) {
          warnOnce(
            `missing-view:${request.transition}`,
            `Routeveil: The “${request.transition}” page transition requires a <RouteveilView>. Navigation continued without animation.`,
          )
          setRunPhase(run, 'navigating')
          await commitOnce(run)
          assertRunCurrent(run)
          return
        }

        const phases = definition.resolve?.(
          request.transitionOptions,
        ) ?? definition
        claimView(run, pageView)
        setRunPhase(run, 'exiting')

        const exitAnimation = await waitForTask(
          run,
          animatePhase(
            pageView,
            phases.exit,
            (animation) => run.animations.add(animation),
          ),
          ANIMATION_WATCHDOG_MS,
          new TransitionLifecycleError(
            'animation-timeout',
            'Routeveil page exit animation did not settle.',
          ),
          () => cancelAnimations([...run.animations]),
        )
        assertRunCurrent(run)
        await Promise.resolve()
        assertRunCurrent(run)

        setRunPhase(run, 'navigating')
        await commitOnce(run)
        assertRunCurrent(run)

        const enteringView = viewRef.current ?? pageView
        claimView(run, enteringView)
        setRunPhase(run, 'entering')
        const enterPromise = animatePhase(
          enteringView,
          phases.enter,
          (animation) => run.animations.add(animation),
        )
        cancelAnimation(exitAnimation)

        await waitForTask(
          run,
          enterPromise,
          ANIMATION_WATCHDOG_MS,
          new TransitionLifecycleError(
            'animation-timeout',
            'Routeveil page enter animation did not settle.',
          ),
          () => cancelAnimations([...run.animations]),
        )
        assertRunCurrent(run)
        return
      }

      if (isOverlayDefinition(definition)) {
        const overlayHandle = await prepareOverlay(run, definition)
        assertRunCurrent(run)
        run.overlayHandle = overlayHandle
        await nextPaint(run.controller.signal)
        assertRunCurrent(run)

        await waitForTask(
          run,
          overlayHandle.cover(),
          ANIMATION_WATCHDOG_MS,
          new TransitionLifecycleError(
            'animation-timeout',
            'Routeveil overlay cover animation did not settle.',
          ),
          () => resetOverlay(run),
        )
        assertRunCurrent(run)
        await Promise.resolve()
        assertRunCurrent(run)

        setRunPhase(run, 'navigating')
        await commitOnce(run)
        assertRunCurrent(run)

        setRunPhase(run, 'revealing')
        await waitForTask(
          run,
          overlayHandle.reveal(),
          ANIMATION_WATCHDOG_MS,
          new TransitionLifecycleError(
            'animation-timeout',
            'Routeveil overlay reveal animation did not settle.',
          ),
          () => resetOverlay(run),
        )
        assertRunCurrent(run)
      }
    } catch (error) {
      if (
        error instanceof TransitionCancelledError
        || run.controller.signal.aborted
      ) {
        return
      }

      reportTransitionError(request, error)
      stopVisualWork(run)

      if (run.commitState === 'pending' && isRunCurrent(run)) {
        try {
          setRunPhase(run, 'navigating')
          await commitOnce(run)
          assertRunCurrent(run)
        } catch (commitError) {
          if (
            !(commitError instanceof TransitionCancelledError)
            && !run.controller.signal.aborted
          ) {
            reportTransitionError(request, commitError)
          }
        }
      }
    } finally {
      finalizeRun(run)
    }
  }, [
    assertRunCurrent,
    commitOnce,
    finalizeRun,
    isRunCurrent,
    prepareOverlay,
    resolvedTransitions,
    setRunPhase,
    stopVisualWork,
  ])

  const transitionTo = useCallback((
    request: TransitionRequest,
  ): Promise<void> => {
    const activePromise = activePromiseRef.current

    if (activePromise) {
      warnOnce(
        'transition-in-progress',
        'Routeveil: A transition is already in progress. The additional navigation request was ignored and received the active transition promise.',
      )
      return activePromise
    }

    let settlePublicPromise!: () => void
    const publicPromise = new Promise<void>((resolve) => {
      settlePublicPromise = resolve
    })
    const startingLocation = observedLocationRef.current
    const run: TransitionRun = {
      id: ++runIdRef.current,
      request,
      controller: new AbortController(),
      cleanups: new Set(),
      animations: new Set(),
      commitState: 'pending',
      acceptedLocation: startingLocation,
      committedLocation: null,
      externalLocation: null,
      cancellationReason: null,
      viewOwnerships: [],
      overlayHandle: null,
      overlayReset: false,
      previousFocus: captureFocusedElement(),
      finalized: false,
      workReleased: false,
      invokingCommit: false,
    }

    activeRunRef.current = run
    activePromiseRef.current = publicPromise

    const complete = () => {
      if (activeRunRef.current === run) {
        activeRunRef.current = null
      }

      if (activePromiseRef.current === publicPromise) {
        activePromiseRef.current = null
      }

      settlePublicPromise()
    }

    void executeTransition(run).then(complete, complete)
    return publicPromise
  }, [executeTransition])

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
