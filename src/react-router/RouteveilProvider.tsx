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
  matchRoutes,
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
import {
  captureSharedElementHandoffs,
  clearSharedElementHandoffs,
  createSharedElementSession,
  resolveSharedElementScrollTarget,
  selectSharedElementRegistrations,
} from './shared-elements.js'
import type {
  SharedElementRegistration,
  SharedElementRegistrationToken,
  SharedElementSession,
  SharedScrollTargetResolution,
} from './shared-elements.js'
import {
  animateViewportBackgroundPhase,
  animateViewportElementPhase,
  animateViewportSnapshotPhase,
  createViewportSnapshot,
  pausePageViewAnimations,
  retainViewportBackground,
  containViewportElementOverflow,
  suppressPageView,
} from './page-view-transition.js'
import {
  normalizeTransition,
  type NormalizedTransition,
  type TransitionNormalizationIssue,
} from './normalize-transition.js'

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
  | 'preload-timeout'
  | 'readiness-timeout'

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
  sharedSession: SharedElementSession | null
  sharedScrollFallback: boolean
  sharedTargetDeadline: number | null
  suppressIncomingView: boolean
  acceptingPendingWork: boolean
  pendingWork: Set<Promise<void>>
  preloadPromise: Promise<void> | null
  previousSharedHandoffsCleanup: () => void
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

type LazyRouteLoader = () => Promise<unknown>

function getLazyRouteLoaders(lazy: unknown): LazyRouteLoader[] {
  if (typeof lazy === 'function') {
    return [lazy as LazyRouteLoader]
  }

  if (!lazy || typeof lazy !== 'object') {
    return []
  }

  return Object.values(lazy).filter(
    (value): value is LazyRouteLoader => typeof value === 'function',
  )
}

type SharedScrollTargetWaitResult = SharedScrollTargetResolution

const LOCATION_WATCHDOG_MS = 10_000
const ANIMATION_WATCHDOG_MS = 15_000
const OVERLAY_READY_WATCHDOG_MS = 2_000
const PRELOAD_WATCHDOG_MS = 10_000
const READINESS_WATCHDOG_MS = 10_000
const SHARED_TARGET_WATCHDOG_MS = 600
const SHARED_TARGET_POLL_MS = 50
const SHARED_SCROLL_WATCHDOG_MS = 1_200
const SHARED_EXIT_LEAD_MS = 150
const SHARED_SCROLL_STABILIZATION_FRAMES = 6
const SHARED_SCROLL_STABLE_FRAMES = 2
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

function getSharedScrollTargetName(
  request: TransitionRequest,
): string | null {
  const name = request.scrollToSharedElement?.trim()
  return name || null
}

function shouldWaitForSharedScroll(
  request: TransitionRequest,
  allowSharedFallback = false,
): boolean {
  const hasHash = request.expectedPath.includes('#')
  const hasSharedScrollTarget = getSharedScrollTargetName(request) !== null

  return hasHash || (
    request.smoothScrollToTop === true
    && !request.navigateOptions?.preventScrollReset
    && !hasHash
    && (!hasSharedScrollTarget || allowSharedFallback)
  )
}

function waitForSharedScroll(
  request: TransitionRequest,
  signal: AbortSignal,
  allowSharedFallback = false,
): Promise<void> {
  const hasHash = request.expectedPath.includes('#')

  if (
    !shouldWaitForSharedScroll(request, allowSharedFallback)
    || typeof window === 'undefined'
    || typeof window.requestAnimationFrame !== 'function'
  ) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    let settled = false
    let stableFrames = 0
    let frame = 0
    let timer = 0
    let lastX = window.scrollX || 0
    let lastY = window.scrollY || 0

    const cleanup = () => {
      window.clearTimeout(timer)

      if (frame) {
        window.cancelAnimationFrame(frame)
      }

      signal.removeEventListener('abort', abort)
      window.removeEventListener('scrollend', finish)
    }
    const finish = () => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      resolve()
    }
    const abort = () => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      reject(new TransitionCancelledError())
    }
    const check = () => {
      const currentX = window.scrollX || 0
      const currentY = window.scrollY || 0
      const isStable = hasHash
        ? currentX === lastX && currentY === lastY
        : currentX === 0 && currentY === 0

      if (isStable) {
        stableFrames += 1
      } else {
        stableFrames = 0
      }

      lastX = currentX
      lastY = currentY

      if (stableFrames >= (hasHash ? 4 : 2)) {
        finish()
        return
      }

      frame = window.requestAnimationFrame(check)
    }

    if (signal.aborted) {
      abort()
      return
    }

    signal.addEventListener('abort', abort, { once: true })
    window.addEventListener('scrollend', finish, { once: true })
    timer = window.setTimeout(finish, SHARED_SCROLL_WATCHDOG_MS)
    frame = window.requestAnimationFrame(check)
  })
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

function releasePreviousSharedHandoffs(run: TransitionRun): void {
  const cleanup = run.previousSharedHandoffsCleanup
  run.previousSharedHandoffsCleanup = () => undefined
  cleanup()
}

function releaseRunWork(run: TransitionRun): void {
  if (run.workReleased) {
    return
  }

  run.workReleased = true
  releasePreviousSharedHandoffs(run)

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
  run.sharedSession?.cleanup()
  run.acceptingPendingWork = false
  run.pendingWork.clear()
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

function scrollAfterNavigation(
  request: TransitionRequest,
  allowSharedFallback = false,
): void {
  if (
    request.navigateOptions?.preventScrollReset
    || request.expectedPath.includes('#')
    || (
      getSharedScrollTargetName(request) !== null
      && !allowSharedFallback
    )
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

function scrollToSharedTarget(rect: {
  top: number
  height: number
}): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const documentElement = document.documentElement
  const body = document.body
  const viewportHeight = window.innerHeight || documentElement.clientHeight

  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return false
  }

  const scrollHeight = Math.max(
    documentElement.scrollHeight,
    documentElement.offsetHeight,
    documentElement.clientHeight,
    body?.scrollHeight || 0,
    body?.offsetHeight || 0,
    body?.clientHeight || 0,
  )
  const currentX = Number.isFinite(window.scrollX) ? window.scrollX : 0
  const currentY = Number.isFinite(window.scrollY) ? window.scrollY : 0
  const maximumY = Math.max(0, scrollHeight - viewportHeight)
  const requestedY = currentY
    + rect.top
    + rect.height / 2
    - viewportHeight / 2
  const targetY = Math.min(maximumY, Math.max(0, requestedY))

  if (!Number.isFinite(targetY) || Math.abs(targetY - currentY) < 0.5) {
    return false
  }

  window.scrollTo({
    top: targetY,
    left: currentX,
    behavior: 'instant',
  })
  return true
}

function describeNormalizedTransition(
  transition: NormalizedTransition,
): string {
  const names = transition.type === 'page'
    ? [transition.exit?.name, transition.enter?.name]
    : transition.type === 'overlay'
      ? [transition.name]
      : transition.issues.map((issue) => (
          'name' in issue ? issue.name : undefined
        ))
  const uniqueNames = [...new Set(names.filter((name) => name !== undefined))]

  return uniqueNames.length > 0
    ? uniqueNames.join(' / ')
    : 'requested'
}

function reportTransitionNormalizationIssue(
  issue: TransitionNormalizationIssue,
): void {
  if (issue.type === 'invalid-input') {
    const phaseLabel = issue.phase === 'complete'
      ? 'transition configuration'
      : `${issue.phase} transition configuration`

    warnOnce(
      `invalid-transition-input:${issue.phase}`,
      `Routeveil: The ${phaseLabel} is invalid. Navigation continued without that animation.`,
    )
    return
  }

  if (issue.type === 'unknown-transition') {
    const phaseLabel = issue.phase === 'complete'
      ? ''
      : `${issue.phase} `

    warnOnce(
      `unknown-transition:${issue.phase}:${issue.name}`,
      `Routeveil: Unknown ${phaseLabel}transition “${issue.name}”. Navigation continued without that animation.`,
    )
    return
  }

  if (issue.type === 'overlay-page-phase') {
    warnOnce(
      `overlay-page-phase:${issue.phase}:${issue.name}`,
      `Routeveil: The overlay transition “${issue.name}” cannot be used as a page ${issue.phase} transition. That phase was skipped.`,
    )
    return
  }

  warnOnce(
    `transition-resolution-error:${issue.phase}:${issue.name}`,
    issue.phase === 'complete'
      ? `Routeveil: The “${issue.name}” transition could not be resolved. Navigation continued without animation.`
      : `Routeveil: The “${issue.name}” ${issue.phase} transition could not be resolved. That phase was skipped.`,
  )

  if (isRouteveilDevelopment()) {
    console.error(issue.error)
  }
}

function reportTransitionError(
  error: unknown,
  transitionLabel: string,
): void {
  if (error instanceof TransitionCancelledError) {
    return
  }

  if (error instanceof TransitionLifecycleError) {
    const messages: Record<LifecycleFailureKind, string> = {
      'animation-timeout': `Routeveil: The “${transitionLabel}” animation did not settle and was safely stopped.`,
      'location-timeout': 'Routeveil: Navigation did not produce the expected location change. Visual state was safely restored.',
      'navigation-timeout': 'Routeveil: The navigation promise did not settle. Visual state was safely restored.',
      'overlay-ready-timeout': `Routeveil: The “${transitionLabel}” overlay did not become ready and was safely removed.`,
      'preload-timeout': 'Routeveil: The destination route did not finish preloading. Navigation continued without a transition.',
      'readiness-timeout': 'Routeveil: The incoming route did not finish its registered pending work before the readiness timeout. The transition continued.',
    }

    warnOnce(
      `${error.kind}:${transitionLabel}:${error.message}`,
      messages[error.kind],
    )
  } else {
    const errorIdentity = error instanceof Error
      ? `${error.name}:${error.message}`
      : String(error)

    warnOnce(
      `transition-error:${transitionLabel}:${errorIdentity}`,
      `Routeveil: The “${transitionLabel}” transition could not finish. Navigation and visual state were safely recovered.`,
    )
  }

  if (isRouteveilDevelopment()) {
    console.error(error)
  }
}

function reportPreloadError(
  request: TransitionRequest,
  error: unknown,
): void {
  const errorIdentity = error instanceof Error
    ? `${error.name}:${error.message}`
    : String(error)

  warnOnce(
    `preload-error:${request.expectedPath}:${errorIdentity}`,
    'Routeveil: The destination route could not be preloaded. The transition continued while navigation loaded it normally.',
  )

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
  preload = false,
}: RouteveilProviderProps) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const dataRouterContext = useContext(UNSAFE_DataRouterContext)
  const navigationContext = useContext(UNSAFE_NavigationContext)
  const [phase, setPhase] = useState<RouteveilPhase>('idle')
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null)
  const viewRef = useRef<HTMLElement | null>(null)
  const sharedHandoffBoundaryRef = useRef<Element | null>(null)
  const observedLocationRef = useRef(getLocationSnapshot(location))
  const locationWaitersRef = useRef<LocationWaiter[]>([])
  const activePromiseRef = useRef<Promise<void> | null>(null)
  const activeRunRef = useRef<TransitionRun | null>(null)
  const mountedRef = useRef(true)
  const runIdRef = useRef(0)
  const overlayReadyRef = useRef<OverlayReady | null>(null)
  const sharedRegistrationsRef = useRef(new Map<
    SharedElementRegistrationToken,
    SharedElementRegistration
  >())
  const sharedRegistrationOrderRef = useRef(0)
  const sharedRegistrationListenersRef = useRef(new Set<() => void>())
  const lazyRoutePromisesRef = useRef(new WeakMap<object, Promise<void>>())

  const resolvedTransitions = useMemo<Record<string, TransitionDefinition>>(
    () => ({
      ...builtInTransitions,
      ...transitions,
    }),
    [transitions],
  )

  const preloadRoute = useCallback((path: string): Promise<void> => {
  const router = dataRouterContext?.router

  if (!router) {
    return Promise.resolve()
  }

  const matches = matchRoutes(router.routes, path)

  if (!matches) {
    return Promise.resolve()
  }

  const promises = matches.flatMap(({ route }) => {
    const loaders = getLazyRouteLoaders(route.lazy)

    return loaders.map((loader) => {
      const key = loader as object
      const cached = lazyRoutePromisesRef.current.get(key)

      if (cached) {
        return cached
      }

      const promise = Promise.resolve()
        .then(() => loader())
        .then(() => undefined)

      lazyRoutePromisesRef.current.set(key, promise)

      void promise.catch(() => {
        if (lazyRoutePromisesRef.current.get(key) === promise) {
          lazyRoutePromisesRef.current.delete(key)
        }
      })

      return promise
    })
  })

  return Promise.all(promises).then(() => undefined)
}, [dataRouterContext?.router])

  const isRunCurrent = useCallback((run: TransitionRun): boolean => (
    mountedRef.current
    && activeRunRef.current === run
    && !run.controller.signal.aborted
    && !run.finalized
  ), [])

  const registerPendingWork = useCallback((
    work: PromiseLike<unknown>,
  ): (() => void) => {
    const run = activeRunRef.current

    if (!run || !isRunCurrent(run) || !run.acceptingPendingWork) {
      return () => undefined
    }

    let released = false
    const trackedWork = Promise.resolve(work).then(
      () => undefined,
      () => undefined,
    )

    run.pendingWork.add(trackedWork)

    const release = () => {
      if (released) {
        return
      }

      released = true
      run.pendingWork.delete(trackedWork)
    }

    void trackedWork.then(release, release)
    return release
  }, [isRunCurrent])

  const assertRunCurrent = useCallback((run: TransitionRun): void => {
    if (!isRunCurrent(run)) {
      throw new TransitionCancelledError()
    }
  }, [isRunCurrent])

  const waitForIncomingReadiness = useCallback(async (
    run: TransitionRun,
  ): Promise<void> => {
    if (!run.acceptingPendingWork) {
      return
    }

    try {
      await nextPaint(run.controller.signal)
      assertRunCurrent(run)

      let quietPasses = 0

      while (quietPasses < 2) {
        const pendingWork = [...run.pendingWork]

        if (pendingWork.length === 0) {
          quietPasses += 1
        } else {
          quietPasses = 0

          await waitForTask(
            run,
            Promise.all(pendingWork).then(() => undefined),
            READINESS_WATCHDOG_MS,
            new TransitionLifecycleError(
              'readiness-timeout',
              'Routeveil incoming route pending work did not settle.',
            ),
          )
          assertRunCurrent(run)
        }

        if (quietPasses < 2) {
          await nextPaint(run.controller.signal)
          assertRunCurrent(run)
        }
      }

      await nextPaint(run.controller.signal)
      assertRunCurrent(run)
    } catch (error) {
      if (
        error instanceof TransitionCancelledError
        || run.controller.signal.aborted
      ) {
        throw error
      }

      if (error instanceof TransitionLifecycleError) {
        warnOnce(
          `readiness-timeout:${run.request.expectedPath}`,
          'Routeveil: The incoming route did not finish its registered pending work before the readiness timeout. The transition continued.',
        )
      } else if (isRouteveilDevelopment()) {
        console.error(error)
      }
    } finally {
      run.acceptingPendingWork = false
      run.pendingWork.clear()
    }
  }, [assertRunCurrent])

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

  const notifySharedRegistrationChange = useCallback(() => {
    for (const listener of [...sharedRegistrationListenersRef.current]) {
      listener()
    }
  }, [])

  const registerSharedElement = useCallback((
    token: SharedElementRegistrationToken,
    name: string,
    element: HTMLElement | SVGElement,
  ): (() => void) => {
    const registration: SharedElementRegistration = {
      token,
      name,
      element,
      order: ++sharedRegistrationOrderRef.current,
    }
    sharedRegistrationsRef.current.set(token, registration)
    notifySharedRegistrationChange()
    let released = false

    return () => {
      if (released) {
        return
      }

      released = true

      if (sharedRegistrationsRef.current.get(token) === registration) {
        sharedRegistrationsRef.current.delete(token)
        notifySharedRegistrationChange()
      }
    }
  }, [notifySharedRegistrationChange])

  const waitForSharedScrollTarget = useCallback((
    run: TransitionRun,
    name: string,
    targetCutoff: number,
  ): Promise<SharedScrollTargetWaitResult> => new Promise((resolve) => {
    const deadline = run.sharedTargetDeadline
      ?? Date.now() + SHARED_TARGET_WATCHDOG_MS
    run.sharedTargetDeadline = deadline
    let settled = false
    let pollTimer = 0
    let watchdogTimer = 0
    let removeRunCleanup: () => void = () => undefined

    const settle = (result: SharedScrollTargetWaitResult) => {
      if (settled) {
        return
      }

      settled = true
      window.clearTimeout(pollTimer)
      window.clearTimeout(watchdogTimer)
      run.controller.signal.removeEventListener('abort', abort)
      sharedRegistrationListenersRef.current.delete(check)
      removeRunCleanup()
      resolve(result)
    }
    const abort = () => settle({ status: 'missing' })
    const check = () => {
      const view = viewRef.current

      if (!view || settled) {
        return
      }

      let result: SharedScrollTargetResolution

      try {
        result = run.sharedSession
          ? run.sharedSession.resolveScrollTarget(
              sharedRegistrationsRef.current.values(),
              view,
              name,
            )
          : resolveSharedElementScrollTarget({
              registrations: sharedRegistrationsRef.current.values(),
              view,
              name,
              targetCutoff,
            })
      } catch {
        settle({ status: 'missing' })
        return
      }

      if (result.status !== 'pending') {
        settle(result)
      }
    }
    const poll = () => {
      pollTimer = 0
      check()

      if (!settled) {
        pollTimer = window.setTimeout(poll, SHARED_TARGET_POLL_MS)
      }
    }

    if (run.controller.signal.aborted) {
      abort()
      return
    }

    sharedRegistrationListenersRef.current.add(check)
    removeRunCleanup = registerCleanup(run, abort)
    run.controller.signal.addEventListener('abort', abort, { once: true })
    const remainingTime = Math.max(0, deadline - Date.now())
    watchdogTimer = window.setTimeout(
      () => settle({ status: 'missing' }),
      remainingTime,
    )
    check()

    if (!settled && remainingTime > 0) {
      pollTimer = window.setTimeout(poll, SHARED_TARGET_POLL_MS)
    } else if (!settled) {
      settle({ status: 'missing' })
    }
  }), [])

  const waitForSharedTargets = useCallback((
    run: TransitionRun,
    session: SharedElementSession,
    view: HTMLElement,
    deadline: number,
    measureGeometry: boolean,
  ): Promise<void> => new Promise((resolve) => {
    let settled = false
    let pollTimer = 0
    let watchdogTimer = 0
    let removeRunCleanup: () => void = () => undefined

    const settle = () => {
      if (settled) {
        return
      }

      settled = true
      window.clearTimeout(pollTimer)
      window.clearTimeout(watchdogTimer)

      run.controller.signal.removeEventListener('abort', settle)
      sharedRegistrationListenersRef.current.delete(check)
      removeRunCleanup()
      resolve()
    }
    const check = () => {
      try {
        if (session.targetsReady(
          sharedRegistrationsRef.current.values(),
          view,
          measureGeometry,
        )) {
          settle()
        }
      } catch {
        settle()
      }
    }
    const poll = () => {
      pollTimer = 0
      check()

      if (!settled) {
        pollTimer = window.setTimeout(poll, SHARED_TARGET_POLL_MS)
      }
    }

    if (run.controller.signal.aborted) {
      settle()
      return
    }

    sharedRegistrationListenersRef.current.add(check)
    removeRunCleanup = registerCleanup(run, settle)
    run.controller.signal.addEventListener('abort', settle, { once: true })
    const remainingTime = Math.max(0, deadline - Date.now())
    watchdogTimer = window.setTimeout(settle, remainingTime)
    check()

    if (!settled && remainingTime > 0) {
      pollTimer = window.setTimeout(poll, SHARED_TARGET_POLL_MS)
    } else if (!settled) {
      settle()
    }
  }), [])

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

  const observeRenderedLocation = useCallback((
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
    observeRenderedLocation(getLocationSnapshot(location), navigationType)
  }, [location, navigationType, observeRenderedLocation])

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

      const currentLocation = getLocationSnapshot(state.location)
      const expectedAction = run?.request.navigateOptions?.replace
        ? 'REPLACE'
        : 'PUSH'
      const awaitsRenderedLocation = Boolean(
        run
        && run.request.waitForLocationChange !== false
        && run.commitState === 'committing'
        && currentLocation.path === run.request.expectedPath
        && state.historyAction === expectedAction,
      )

      if (
        run
        && !run.finalized
        && !run.controller.signal.aborted
        && !locationsMatch(observedLocationRef.current, currentLocation)
        && !awaitsRenderedLocation
      ) {
        cancelRun(run, 'external-location', currentLocation)
      }
    })
  }, [dataRouterContext?.router])

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

      const currentLocation = {
        key,
        path: `${pathname}${window.location.search}${window.location.hash}`,
      }
      const expectedAction = run?.request.navigateOptions?.replace
        ? 'REPLACE'
        : 'PUSH'
      const awaitsRenderedLocation = Boolean(
        run
        && run.request.waitForLocationChange !== false
        && run.commitState === 'committing'
        && currentLocation.path === run.request.expectedPath
        && action === expectedAction,
      )

      if (awaitsRenderedLocation) {
        return
      }

      if (
        run
        && !run.finalized
        && !run.controller.signal.aborted
        && !locationsMatch(observedLocationRef.current, currentLocation)
      ) {
        cancelRun(run, 'external-location', currentLocation)
      }
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
  }, [navigationContext.basename])

  useLayoutEffect(() => {
    const sharedRegistrations = sharedRegistrationsRef.current
    const sharedRegistrationListeners = sharedRegistrationListenersRef.current
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      const sharedHandoffBoundary = sharedHandoffBoundaryRef.current

      if (sharedHandoffBoundary) {
        clearSharedElementHandoffs(sharedHandoffBoundary)
      }

      sharedHandoffBoundaryRef.current = null
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
      sharedRegistrations.clear()
      sharedRegistrationListeners.clear()
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
      sharedHandoffBoundaryRef.current = element.parentElement
      const run = activeRunRef.current

      if (
        run?.sharedSession
        && run.suppressIncomingView
        && !run.controller.signal.aborted
        && !run.finalized
      ) {
        claimView(run, element)
        run.sharedSession.suppressView(element)
      }

      notifySharedRegistrationChange()
      return
    }

    if (!previousElement || viewRef.current === previousElement) {
      viewRef.current = null
      notifySharedRegistrationChange()
    }
  }, [notifySharedRegistrationChange])

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
    options: unknown,
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
      options,
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

  const commitOnce = useCallback(async (
    run: TransitionRun,
    waitForPaint = true,
    allowSharedScroll = false,
    deferIncomingReadiness = false,
  ): Promise<void> => {
    assertRunCurrent(run)

    if (run.commitState !== 'pending') {
      return
    }

    if (run.preloadPromise) {
      await run.preloadPromise
      assertRunCurrent(run)
    }

    const waitsForLocation = run.request.waitForLocationChange !== false
    const locationWait = waitsForLocation
      ? prepareLocationWait(run)
      : null
    const sharedTargetCutoff = sharedRegistrationOrderRef.current
    run.commitState = 'committing'
    run.acceptingPendingWork = waitsForLocation

    let navigationResult: void | Promise<void>

    try {
      run.invokingCommit = true
      navigationResult = run.request.commit()
    } catch (error) {
      run.acceptingPendingWork = false
      run.pendingWork.clear()
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

      if (waitForPaint) {
        await nextPaint(run.controller.signal)
        assertRunCurrent(run)
      }

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

    if (waitForPaint) {
      await nextPaint(run.controller.signal)
      assertRunCurrent(run)
    }

    const sharedScrollTargetName = allowSharedScroll
      ? getSharedScrollTargetName(run.request)
      : null
    let handledSharedScroll = false

    if (
      sharedScrollTargetName
      && !run.request.expectedPath.includes('#')
    ) {
      const result = await waitForSharedScrollTarget(
        run,
        sharedScrollTargetName,
        sharedTargetCutoff,
      )
      assertRunCurrent(run)

      if (result.status === 'ready') {
        handledSharedScroll = true

        if (
          scrollToSharedTarget(result.rect)
          && !run.sharedSession
          && waitForPaint
        ) {
          await nextPaint(run.controller.signal)
          assertRunCurrent(run)
        }
      } else {
        run.sharedScrollFallback = true

        if (result.status === 'duplicate') {
          warnOnce(
            `shared-scroll-target-duplicate:${sharedScrollTargetName}`,
            `Routeveil: Multiple incoming shared elements use the name “${sharedScrollTargetName}”. scrollToSharedElement was ignored and existing scroll behavior was used.`,
          )
        } else {
          warnOnce(
            `shared-scroll-target-missing:${sharedScrollTargetName}`,
            `Routeveil: No measurable incoming shared element named “${sharedScrollTargetName}” was found. scrollToSharedElement was ignored and existing scroll behavior was used.`,
          )
        }
      }
    }

    if (!handledSharedScroll) {
      scrollAfterNavigation(
        run.request,
        run.sharedScrollFallback || !allowSharedScroll,
      )
    }

    if (waitForPaint) {
      await waitForIncomingReadiness(run)
    } else if (!deferIncomingReadiness) {
      run.acceptingPendingWork = false
      run.pendingWork.clear()
      await Promise.resolve()
    }

    assertRunCurrent(run)
  }, [
    assertRunCurrent,
    prepareLocationWait,
    waitForIncomingReadiness,
    waitForSharedScrollTarget,
  ])

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
    run.sharedSession?.cleanup()

    if (overlayReadyRef.current?.id === run.id) {
      overlayReadyRef.current = null
    }

    clearRunOverlay(run)
  }, [clearRunOverlay])

  const executeTransition = useCallback(async (
    run: TransitionRun,
  ): Promise<void> => {
    const { request } = run
    let transition: NormalizedTransition = {
      type: 'invalid',
      issues: [],
    }
    let transitionLabel = 'requested'

    try {
      transition = normalizeTransition(
        request.transition,
        resolvedTransitions,
      )
      transitionLabel = describeNormalizedTransition(transition)

      for (const issue of transition.issues) {
        reportTransitionNormalizationIssue(issue)
      }

      if (request.preload) {
        const preloadTask = Promise.resolve().then(() => request.preload!())

        run.preloadPromise = waitForTask(
          run,
          preloadTask,
          PRELOAD_WATCHDOG_MS,
          new TransitionLifecycleError(
            'preload-timeout',
            'Routeveil destination preloading did not settle.',
          ),
        ).catch((error) => {
          if (
            !(error instanceof TransitionCancelledError)
            && !run.controller.signal.aborted
          ) {
            reportPreloadError(request, error)
          }
        })
      }

      if (transition.type === 'invalid') {
        releasePreviousSharedHandoffs(run)
        setRunPhase(run, 'navigating')
        await commitOnce(run)
        assertRunCurrent(run)
        return
      }

      if (prefersReducedMotion()) {
        releasePreviousSharedHandoffs(run)
        setRunPhase(run, 'navigating')
        await commitOnce(run, true, transition.type === 'page')
        assertRunCurrent(run)
        return
      }

      if (transition.type === 'page') {
        const pageView = viewRef.current

        if (!pageView) {
          warnOnce(
            `missing-view:${transitionLabel}`,
            `Routeveil: The “${transitionLabel}” page transition requires a <RouteveilView>. Navigation continued without animation.`,
          )
          releasePreviousSharedHandoffs(run)
          setRunPhase(run, 'navigating')
          await commitOnce(run, true, true)
          assertRunCurrent(run)
          return
        }

        const exitPhase = transition.exit?.phase ?? null
        const enterPhase = transition.enter?.phase ?? null
        let incomingAnimationsPaused = false
        let incomingAnimationsReleased = false
        let releaseIncomingAnimations: () => void = () => undefined
        let removeIncomingAnimationsCleanup: () => void = () => undefined
        const pauseIncomingAnimations = () => {
          if (
            request.waitForLocationChange === false
            || incomingAnimationsPaused
            || incomingAnimationsReleased
          ) {
            return
          }

          incomingAnimationsPaused = true
          releaseIncomingAnimations = pausePageViewAnimations(
            pageView.ownerDocument,
          )
          removeIncomingAnimationsCleanup = registerCleanup(
            run,
            releaseIncomingAnimations,
          )
        }
        const startIncomingAnimations = () => {
          if (
            !incomingAnimationsPaused
            || incomingAnimationsReleased
          ) {
            return
          }

          incomingAnimationsReleased = true
          releaseIncomingAnimations()
          removeIncomingAnimationsCleanup()
        }
        const finishPreloadBeforePageSuppression = async () => {
          const preloadPromise = run.preloadPromise

          if (!preloadPromise) {
            return
          }

          await preloadPromise
          assertRunCurrent(run)

          if (run.preloadPromise === preloadPromise) {
            run.preloadPromise = null
          }
        }
        let sharedSession: SharedElementSession | null = null
        let releaseSharedSessionCleanup: () => void = () => undefined
        const sharedAnimations = new Set<Animation>()
        const cleanupSharedSession = () => {
          if (!sharedSession) {
            return
          }

          sharedSession.cleanup()

          for (const animation of sharedAnimations) {
            run.animations.delete(animation)
          }

          sharedAnimations.clear()
          releaseSharedSessionCleanup()
          run.sharedSession = null
          run.suppressIncomingView = false
          sharedSession = null
        }

        if (
          request.waitForLocationChange !== false
          && request.sharedElementSource
          && sharedRegistrationsRef.current.size > 0
        ) {
          const selection = selectSharedElementRegistrations({
            registrations: sharedRegistrationsRef.current.values(),
            scrollToSharedElement: request.scrollToSharedElement,
            sharedElements: request.sharedElements,
            view: pageView,
            trigger: request.sharedElementSource.trigger,
          })

          for (const name of selection.duplicateNames) {
            warnOnce(
              `shared-source-duplicate:${name}`,
              `Routeveil: Multiple outgoing shared elements use the name “${name}”. That name was skipped for this transition.`,
            )
          }

          try {
            sharedSession = createSharedElementSession(
              selection.registrations,
              pageView,
              sharedRegistrationOrderRef.current,
            )
          } catch {
            sharedSession = null
          }

          if (sharedSession) {
            run.sharedSession = sharedSession
            releaseSharedSessionCleanup = registerCleanup(
              run,
              () => sharedSession?.cleanup(),
            )
          } else if (selection.registrations.length > 0) {
            warnOnce(
              'shared-source-invalid-geometry',
              'Routeveil: The selected shared element could not be measured or cloned. The page transition continued without shared-element movement.',
            )
          }
        }

        if (sharedSession) {
          const activated = await sharedSession.activate(
            pageView,
            run.controller.signal,
          )
          assertRunCurrent(run)

          if (!activated) {
            cleanupSharedSession()
          } else {
            releasePreviousSharedHandoffs(run)
          }
        }

        if (!sharedSession) {
          claimView(run, pageView)
          const prepareIncomingPage = async (
            releaseOutgoingView: () => void,
            removeOutgoingViewCleanup: () => void,
          ) => {
            await commitOnce(run, false, true, true)
            assertRunCurrent(run)

            const enteringView = viewRef.current ?? pageView
            claimView(run, enteringView)
            const releaseIncomingView = enteringView === pageView
              ? releaseOutgoingView
              : suppressPageView(enteringView)
            const removeIncomingViewCleanup = enteringView === pageView
              ? removeOutgoingViewCleanup
              : registerCleanup(run, releaseIncomingView)

            await waitForSharedScroll(
              request,
              run.controller.signal,
              run.sharedScrollFallback,
            )
            assertRunCurrent(run)
            await waitForIncomingReadiness(run)
            assertRunCurrent(run)

            return {
              enteringView,
              releaseIncomingView,
              removeIncomingViewCleanup,
            }
          }

          const animateIncomingPage = async (
            incoming: Awaited<ReturnType<typeof prepareIncomingPage>>,
          ) => {
            const {
              enteringView,
              releaseIncomingView,
              removeIncomingViewCleanup,
            } = incoming

            if (!enterPhase) {
              startIncomingAnimations()
              releaseIncomingView()
              removeIncomingViewCleanup()
              return
            }

            const incomingBackground = retainViewportBackground(
              enteringView,
              enterPhase,
            )
            const removeIncomingBackgroundCleanup = registerCleanup(
              run,
              incomingBackground.cleanup,
            )

            setRunPhase(run, 'entering')
            const releaseIncomingOverflow = containViewportElementOverflow(
              enteringView,
            )
            const removeIncomingOverflowCleanup = registerCleanup(
              run,
              releaseIncomingOverflow,
            )
            const enterPromise = Promise.all([
              animateViewportElementPhase(
                enteringView,
                enterPhase,
                (animation) => run.animations.add(animation),
              ),
              animateViewportBackgroundPhase(
                incomingBackground,
                enterPhase,
                (animation) => run.animations.add(animation),
              ),
            ]).then(([animation]) => animation)

            startIncomingAnimations()
            releaseIncomingView()
            removeIncomingViewCleanup()

            const enterAnimation = await waitForTask(
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

            cancelAnimation(enterAnimation)
            releaseIncomingOverflow()
            removeIncomingOverflowCleanup()
            incomingBackground.cleanup()
            removeIncomingBackgroundCleanup()
          }

          if (!exitPhase) {
            await finishPreloadBeforePageSuppression()
            assertRunCurrent(run)
            pauseIncomingAnimations()
            const releaseOutgoingView = suppressPageView(pageView)
            const removeOutgoingViewCleanup = registerCleanup(
              run,
              releaseOutgoingView,
            )

            releasePreviousSharedHandoffs(run)
            setRunPhase(run, 'navigating')
            const incoming = await prepareIncomingPage(
              releaseOutgoingView,
              removeOutgoingViewCleanup,
            )
            assertRunCurrent(run)
            await animateIncomingPage(incoming)
            return
          }

          setRunPhase(run, 'exiting')
          const outgoingBackground = retainViewportBackground(
            pageView,
            exitPhase,
          )
          const removeOutgoingBackgroundCleanup = registerCleanup(
            run,
            outgoingBackground.cleanup,
          )
          const outgoingSnapshot = createViewportSnapshot(pageView)

          if (!outgoingSnapshot) {
            outgoingBackground.cleanup()
            removeOutgoingBackgroundCleanup()
            await finishPreloadBeforePageSuppression()
            assertRunCurrent(run)
            pauseIncomingAnimations()
            const releaseOutgoingView = suppressPageView(pageView)
            const removeOutgoingViewCleanup = registerCleanup(
              run,
              releaseOutgoingView,
            )

            releasePreviousSharedHandoffs(run)
            setRunPhase(run, 'navigating')
            const incoming = await prepareIncomingPage(
              releaseOutgoingView,
              removeOutgoingViewCleanup,
            )
            assertRunCurrent(run)
            await animateIncomingPage(incoming)
            return
          }

          const removeOutgoingSnapshotCleanup = registerCleanup(
            run,
            outgoingSnapshot.cleanup,
          )
          const releaseOutgoingView = suppressPageView(pageView)
          const removeOutgoingViewCleanup = registerCleanup(
            run,
            releaseOutgoingView,
          )

          releasePreviousSharedHandoffs(run)
          const exitPromise = waitForTask(
            run,
            Promise.all([
              animateViewportSnapshotPhase(
                outgoingSnapshot,
                exitPhase,
                (animation) => run.animations.add(animation),
              ),
              animateViewportBackgroundPhase(
                outgoingBackground,
                exitPhase,
                (animation) => run.animations.add(animation),
              ),
            ]).then(([animation]) => animation),
            ANIMATION_WATCHDOG_MS,
            new TransitionLifecycleError(
              'animation-timeout',
              'Routeveil page exit animation did not settle.',
            ),
            () => cancelAnimations([...run.animations]),
          )
          pauseIncomingAnimations()
          const incomingPreparation = prepareIncomingPage(
            releaseOutgoingView,
            removeOutgoingViewCleanup,
          )
          const exitAnimation = await exitPromise
          assertRunCurrent(run)
          await Promise.resolve()
          assertRunCurrent(run)
          setRunPhase(run, 'navigating')
          const incoming = await incomingPreparation
          assertRunCurrent(run)

          outgoingBackground.cleanup()
          removeOutgoingBackgroundCleanup()
          cancelAnimation(exitAnimation)
          outgoingSnapshot.cleanup()
          removeOutgoingSnapshotCleanup()
          await animateIncomingPage(incoming)
          return
        }

        claimView(run, pageView)
        run.suppressIncomingView = true
        sharedSession.setTargetCutoff(
          sharedRegistrationOrderRef.current,
          true,
        )
        setRunPhase(run, exitPhase ? 'exiting' : 'navigating')
        pauseIncomingAnimations()

        await commitOnce(run, true, true)
        assertRunCurrent(run)
        await nextPaint(run.controller.signal)
        assertRunCurrent(run)

        const enteringView = viewRef.current ?? pageView
        claimView(run, enteringView)
        sharedSession.suppressView(enteringView)
        const sharedTargetDeadline = run.sharedTargetDeadline
          ?? Date.now() + SHARED_TARGET_WATCHDOG_MS
        run.sharedTargetDeadline = sharedTargetDeadline
        await waitForSharedTargets(
          run,
          sharedSession,
          enteringView,
          sharedTargetDeadline,
          false,
        )
        assertRunCurrent(run)
        await waitForSharedScroll(
          request,
          run.controller.signal,
          run.sharedScrollFallback,
        )
        assertRunCurrent(run)

        if (shouldWaitForSharedScroll(
          request,
          run.sharedScrollFallback,
        )) {
          await nextPaint(run.controller.signal)
          assertRunCurrent(run)
        }

        await waitForSharedTargets(
          run,
          sharedSession,
          enteringView,
          sharedTargetDeadline,
          true,
        )
        assertRunCurrent(run)

        const sharedScrollTargetName = getSharedScrollTargetName(request)

        if (
          sharedScrollTargetName
          && !run.sharedScrollFallback
          && !request.expectedPath.includes('#')
        ) {
          let stableFrames = 0

          for (
            let frame = 0;
            frame < SHARED_SCROLL_STABILIZATION_FRAMES;
            frame += 1
          ) {
            const verification = sharedSession.resolveScrollTarget(
              sharedRegistrationsRef.current.values(),
              enteringView,
              sharedScrollTargetName,
            )

            if (verification.status !== 'ready') {
              break
            }

            if (scrollToSharedTarget(verification.rect)) {
              stableFrames = 0
            } else {
              stableFrames += 1

              if (stableFrames >= SHARED_SCROLL_STABLE_FRAMES) {
                break
              }
            }

            await nextPaint(run.controller.signal)
            assertRunCurrent(run)
          }
        }

        let preparation = {
          matchedNames: [] as string[],
          missingNames: [] as string[],
          duplicateNames: [] as string[],
        }

        try {
          preparation = sharedSession.prepareTargets(
            sharedRegistrationsRef.current.values(),
            enteringView,
          )
        } catch {
          warnOnce(
            'shared-target-preparation-failed',
            'Routeveil: Incoming shared elements could not be prepared. The page transition continued with its normal enter phase.',
          )
        }

        for (const name of preparation.duplicateNames) {
          warnOnce(
            `shared-target-duplicate:${name}`,
            `Routeveil: Multiple incoming shared elements use the name “${name}”. That name was skipped for this transition.`,
          )
        }

        for (const name of preparation.missingNames) {
          warnOnce(
            `shared-target-missing:${name}`,
            `Routeveil: No measurable incoming shared element named “${name}” was found. The page transition continued normally.`,
          )
        }

        let keepSharedSessionThroughEnter = false
        let movementReady = false

        if (preparation.matchedNames.length > 0) {
          movementReady = await sharedSession.prepareMovement(
            run.controller.signal,
          )
          assertRunCurrent(run)

          if (!movementReady) {
            warnOnce(
              'shared-element-paint-readiness-failed',
              'Routeveil: Shared-element media did not become paint-ready. The incoming page was safely restored and continued its normal enter transition.',
            )
          }
        }

        const activeSharedSession = sharedSession
        const runSharedMovement = () => waitForTask(
          run,
          activeSharedSession.animate(
            run.controller.signal,
            (animation) => {
              run.animations.add(animation)
              sharedAnimations.add(animation)
            },
            exitPhase ? SHARED_EXIT_LEAD_MS : 0,
          ),
          ANIMATION_WATCHDOG_MS,
          new TransitionLifecycleError(
            'animation-timeout',
            'Routeveil shared-element movement did not settle.',
          ),
          () => cancelAnimations([...sharedAnimations]),
        ).then(() => true).catch((error: unknown) => {
          if (
            error instanceof TransitionCancelledError
            || run.controller.signal.aborted
          ) {
            throw error
          }

          warnOnce(
            'shared-element-movement-failed',
            'Routeveil: Shared-element movement could not finish. The incoming page was safely restored and continued its normal enter transition.',
          )
          return false
        })
        let movementCompleted = false

        if (exitPhase) {
          const exitTask = waitForTask(
            run,
            animatePhase(
              activeSharedSession.getExitElement(),
              exitPhase,
              (animation) => run.animations.add(animation),
            ),
            ANIMATION_WATCHDOG_MS,
            new TransitionLifecycleError(
              'animation-timeout',
              'Routeveil page exit animation did not settle.',
            ),
            () => cancelAnimations([...run.animations]),
          ).then((animation) => {
            assertRunCurrent(run)
            activeSharedSession.removeSnapshot()
            cancelAnimation(animation)
            setRunPhase(run, 'navigating')
          })

          if (movementReady) {
            const results = await Promise.all([
              exitTask,
              runSharedMovement(),
            ])

            movementCompleted = results[1]
          } else {
            await exitTask
          }
        } else {
          activeSharedSession.removeSnapshot()

          if (movementReady) {
            movementCompleted = await runSharedMovement()
          }
        }

        assertRunCurrent(run)
        keepSharedSessionThroughEnter = movementCompleted

        for (const animation of sharedAnimations) {
          run.animations.delete(animation)
        }

        sharedAnimations.clear()

        if (!keepSharedSessionThroughEnter) {
          cleanupSharedSession()
        }

        assertRunCurrent(run)
        startIncomingAnimations()

        if (keepSharedSessionThroughEnter && sharedSession) {
          sharedSession.revealViews()
          run.suppressIncomingView = false
        }

        if (enterPhase) {
          setRunPhase(run, 'entering')
          await waitForTask(
            run,
            animatePhase(
              enteringView,
              enterPhase,
              (animation) => run.animations.add(animation),
            ),
            ANIMATION_WATCHDOG_MS,
            new TransitionLifecycleError(
              'animation-timeout',
              'Routeveil page enter animation did not settle.',
            ),
            () => cancelAnimations([...run.animations]),
          )
          assertRunCurrent(run)
        }

        if (sharedSession) {
          await waitForTask(
            run,
            sharedSession.handoff(
              run.controller.signal,
              (animation) => {
                run.animations.add(animation)
                sharedAnimations.add(animation)
              },
            ),
            ANIMATION_WATCHDOG_MS,
            new TransitionLifecycleError(
              'animation-timeout',
              'Routeveil shared-element handoff did not settle.',
            ),
            () => sharedSession?.cleanup(),
          )
          assertRunCurrent(run)
        }

        cleanupSharedSession()
        return
      }

      if (transition.type === 'overlay') {
        const overlayHandle = await prepareOverlay(
          run,
          transition.definition,
          transition.options,
        )
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

        releasePreviousSharedHandoffs(run)
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

      reportTransitionError(error, transitionLabel)
      stopVisualWork(run)
      releasePreviousSharedHandoffs(run)

      if (run.commitState === 'pending' && isRunCurrent(run)) {
        try {
          setRunPhase(run, 'navigating')
          await commitOnce(run, true, transition.type === 'page')
          assertRunCurrent(run)
        } catch (commitError) {
          if (
            !(commitError instanceof TransitionCancelledError)
            && !run.controller.signal.aborted
          ) {
            reportTransitionError(commitError, transitionLabel)
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
    waitForIncomingReadiness,
    waitForSharedTargets,
  ])

  const transitionTo = useCallback((
    request: TransitionRequest,
  ): Promise<void> => {
    const activePromise = activePromiseRef.current

    if (activePromise) {
      const activeRequest = activeRunRef.current?.request
      const isDuplicateNavigation = Boolean(
        activeRequest
        && activeRequest.waitForLocationChange !== false
        && request.waitForLocationChange !== false
        && activeRequest.expectedPath === request.expectedPath,
      )

      if (!isDuplicateNavigation) {
        warnOnce(
          'transition-in-progress',
          'Routeveil: A transition is already in progress. The additional navigation request was ignored and received the active transition promise.',
        )
      }

      return activePromise
    }

    if (
      request.waitForLocationChange !== false
      && observedLocationRef.current.path === request.expectedPath
    ) {
      return Promise.resolve()
    }

    const sharedHandoffBoundary = sharedHandoffBoundaryRef.current
    const previousSharedHandoffsCleanup = sharedHandoffBoundary
      ? captureSharedElementHandoffs(sharedHandoffBoundary)
      : () => undefined

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
      sharedSession: null,
      sharedScrollFallback: false,
      sharedTargetDeadline: null,
      suppressIncomingView: false,
      acceptingPendingWork: false,
      pendingWork: new Set(),
      preloadPromise: null,
      previousSharedHandoffsCleanup,
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
      defaultPreload: preload,
      preloadRoute,
      registerPendingWork,
      registerView,
      registerOverlayHandle,
      registerSharedElement,
    }),
    [
      activeOverlay,
      phase,
      preload,
      preloadRoute,
      registerOverlayHandle,
      registerPendingWork,
      registerSharedElement,
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
