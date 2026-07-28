import { useLayoutEffect, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { PageTransitionDefinition } from '../src/core'
import type { RouteveilPhase } from '../src/react-router'
import { useRouteveilContext } from '../src/react-router/RouteveilContext'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  useRouteveilPendingWork,
} from '../src/react-router'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

type ControlledViewTransition = {
  finish: () => void
  skipTransition: ReturnType<typeof vi.fn>
  transition: ViewTransition
}

type ViewTransitionMocks = {
  isUpdating: () => boolean
  restore: () => void
  startViewTransition: ReturnType<typeof vi.fn>
  transitions: ControlledViewTransition[]
}

const exitKeyframes: Keyframe[] = [
  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
  { opacity: 0, transform: 'translate3d(0, -40px, 0)' },
]

const enterKeyframes: Keyframe[] = [
  { opacity: 0, transform: 'translate3d(0, 40px, 0)' },
  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
]

const viewportTransition: PageTransitionDefinition = {
  type: 'page',
  exit: {
    keyframes: exitKeyframes,
    options: { duration: 80, fill: 'forwards' },
  },
  enter: {
    keyframes: enterKeyframes,
    options: { duration: 90, fill: 'both' },
  },
}

let browser: BrowserMocks
let restoreViewTransitions: (() => void) | null = null

function installViewTransitionMocks(): ViewTransitionMocks {
  const descriptor = Object.getOwnPropertyDescriptor(
    document,
    'startViewTransition',
  )
  const transitions: ControlledViewTransition[] = []
  let updating = false
  const startViewTransition = vi.fn((
    options: (() => void | Promise<void>) | {
      update: () => void | Promise<void>
    },
  ) => {
    const update = typeof options === 'function' ? options : options.update
    let resolveFinished!: () => void
    let finished = false
    const updateCallbackDone = Promise.resolve().then(async () => {
      updating = true

      try {
        await update()
      } finally {
        updating = false
      }
    })
    const ready = updateCallbackDone.then(() => undefined)
    const transitionFinished = new Promise<void>((resolve) => {
      resolveFinished = resolve
    })
    const finish = () => {
      if (finished) {
        return
      }

      finished = true
      resolveFinished()
    }
    const skipTransition = vi.fn(finish)
    const transition = {
      finished: transitionFinished,
      ready,
      skipTransition,
      updateCallbackDone,
    } as ViewTransition

    transitions.push({ finish, skipTransition, transition })
    return transition
  })

  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: startViewTransition,
    writable: true,
  })

  return {
    isUpdating: () => updating,
    restore() {
      if (descriptor) {
        Object.defineProperty(document, 'startViewTransition', descriptor)
      } else {
        Reflect.deleteProperty(document, 'startViewTransition')
      }
    },
    startViewTransition,
    transitions,
  }
}

function animationPseudoElement(animation: ControlledAnimation): string {
  if (!animation.options || typeof animation.options === 'number') {
    return ''
  }

  return String(animation.options.pseudoElement ?? '')
}

function findAnimation(
  pseudoElement: string,
  keyframes: readonly Keyframe[],
): ControlledAnimation | undefined {
  const serializedKeyframes = JSON.stringify(keyframes)

  return browser.animations.find((animation) => (
    animation.element === document.documentElement
    && animationPseudoElement(animation) === pseudoElement
    && JSON.stringify(animation.keyframes) === serializedKeyframes
  ))
}

function findLiveAnimation(
  element: Element,
  keyframes: readonly Keyframe[],
): ControlledAnimation | undefined {
  const serializedKeyframes = JSON.stringify(keyframes)

  return browser.animations.find((animation) => (
    animation.element === element
    && animationPseudoElement(animation) === ''
    && JSON.stringify(animation.keyframes) === serializedKeyframes
  ))
}

function expectPersistentSnapshotOpacity(
  style: HTMLStyleElement,
  name: string,
  oldOpacity: 0 | 1,
  newOpacity: 0 | 1,
): void {
  expect(style.textContent).toContain(
    `::view-transition-old(${name}) { opacity: ${String(oldOpacity)} !important;`,
  )
  expect(style.textContent).toContain(
    `::view-transition-new(${name}) { opacity: ${String(newOpacity)} !important;`,
  )
}

async function flushFramesUntil(
  condition: () => boolean,
  maximumFrames = 40,
): Promise<void> {
  for (let frame = 0; frame < maximumFrames; frame += 1) {
    await act(async () => {
      browser.flushFrame()
      await Promise.resolve()
      await Promise.resolve()
    })

    if (condition()) {
      return
    }
  }

  throw new Error('Expected Routeveil work did not become ready.')
}

function DirectPageTransition({
  commit,
  onStart,
}: {
  commit: () => void
  onStart: (promise: Promise<void>) => void
}) {
  const { transitionTo } = useRouteveilContext()

  return (
    <button
      type="button"
      onClick={() => {
        onStart(transitionTo({
          to: '/destination',
          expectedPath: '/destination',
          transition: 'viewport-test',
          commit,
          waitForLocationChange: false,
        }))
      }}
    >
      Navigate
    </button>
  )
}

function PhaseObserver({
  onPhase,
}: {
  onPhase: (phase: RouteveilPhase) => void
}) {
  const { phase } = useRouteveilContext()

  useLayoutEffect(() => {
    onPhase(phase)
  }, [onPhase, phase])

  return null
}

function TransitionFixture({
  commitSpy,
  onStart,
}: {
  commitSpy: () => void
  onStart: (promise: Promise<void>) => void
}) {
  const [destination, setDestination] = useState(false)
  const commit = () => {
    commitSpy()
    setDestination(true)
  }

  return (
    <>
      <header data-persistent-shell="" style={{ zIndex: 50 }}>
        Persistent shell
      </header>
      <aside data-backdrop-shell="" style={{ zIndex: 30 }}>
        <div data-backdrop-filter="" style={{ backdropFilter: 'blur(8px)' }}>
          Backdrop shell
        </div>
        <div
          data-authored-backdrop=""
          style={{
            backdropFilter: 'blur(4px)',
            viewTransitionName: 'authored-backdrop',
          }}
        >
          Authored backdrop
        </div>
      </aside>
      <aside
        data-user-transition-name=""
        style={{ viewTransitionName: 'user-owned-shell', zIndex: 30 }}
      >
        User-owned shell
      </aside>
      <RouteveilView
        key={destination ? 'destination' : 'source'}
        style={{ minHeight: destination ? '9000px' : '12000px' }}
      >
        {destination
          ? <main data-route="destination">Destination</main>
          : (
              <main data-route="source">
                Source
                <DirectPageTransition commit={commit} onStart={onStart} />
              </main>
            )}
      </RouteveilView>
    </>
  )
}

function PendingRoute({
  pending,
  onRegistered,
}: {
  pending: Promise<void>
  onRegistered: () => void
}) {
  const registerPendingWork = useRouteveilPendingWork()

  useLayoutEffect(() => {
    onRegistered()
    return registerPendingWork(pending)
  }, [onRegistered, pending, registerPendingWork])

  return <main data-route="destination">Destination</main>
}

function PendingRouteFixture({
  pending,
  onRegistered,
}: {
  pending: Promise<void>
  onRegistered: () => void
}) {
  return (
    <>
      <header data-pending-shell="">Pending shell</header>
      <RouteveilView>
        <Routes>
          <Route
            path="/"
            element={(
              <main data-route="source">
                <RouteveilLink
                  to="/destination"
                  transition="viewport-test"
                >
                  Navigate pending route
                </RouteveilLink>
              </main>
            )}
          />
          <Route
            path="/destination"
            element={(
              <PendingRoute
                pending={pending}
                onRegistered={onRegistered}
              />
            )}
          />
        </Routes>
      </RouteveilView>
    </>
  )
}

function renderFixture(
  commitSpy: () => void,
  onStart: (promise: Promise<void>) => void,
  onPhase?: (phase: RouteveilPhase) => void,
) {
  return render(
    <MemoryRouter>
      <RouteveilProvider transitions={{ 'viewport-test': viewportTransition }}>
        {onPhase ? <PhaseObserver onPhase={onPhase} /> : null}
        <TransitionFixture
          commitSpy={commitSpy}
          onStart={onStart}
        />
      </RouteveilProvider>
    </MemoryRouter>,
  )
}

function SharedTransitionFixture() {
  return (
    <RouteveilView>
      <Routes>
        <Route
          path="/"
          element={(
            <RouteveilLink
              to="/destination"
              transition="viewport-test"
              sharedElements="all"
            >
              <RouteveilSharedElement name="poster">
                <div data-shared-source="">Shared source</div>
              </RouteveilSharedElement>
            </RouteveilLink>
          )}
        />
        <Route
          path="/destination"
          element={(
            <RouteveilSharedElement name="poster">
              <div data-shared-target="">Shared target</div>
            </RouteveilSharedElement>
          )}
        />
      </Routes>
    </RouteveilView>
  )
}

function UnrelatedSharedTransitionFixture() {
  return (
    <>
      <header>
        <RouteveilLink to="/destination" transition="viewport-test">
          Navigate outside shared element
        </RouteveilLink>
      </header>
      <RouteveilView>
        <Routes>
          <Route
            path="/"
            element={(
              <RouteveilSharedElement name="poster">
                <div data-unrelated-shared-source="">Unrelated shared source</div>
              </RouteveilSharedElement>
            )}
          />
          <Route
            path="/destination"
            element={<main data-route="destination">Destination</main>}
          />
        </Routes>
      </RouteveilView>
    </>
  )
}

function SmoothScrollFixture() {
  return (
    <RouteveilView>
      <Routes>
        <Route
          path="/"
          element={(
            <RouteveilLink
              smoothScrollToTop
              to="/destination"
              transition="viewport-test"
            >
              Navigate with smooth scroll
            </RouteveilLink>
          )}
        />
        <Route
          path="/destination"
          element={<main data-route="destination">Destination</main>}
        />
      </Routes>
    </RouteveilView>
  )
}

beforeEach(() => {
  browser = installBrowserMocks({ settleAnimationOnCancel: true })
})

afterEach(() => {
  restoreViewTransitions?.()
  restoreViewTransitions = null
  browser.restore()
  vi.restoreAllMocks()
  document.documentElement.style.removeProperty('view-transition-name')
})

describe('page view transitions', () => {
  it('animates viewport snapshots without cloning or transforming long live views', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    const commit = vi.fn(() => {
      expect(native.isUpdating()).toBe(false)
    })
    let completed: Promise<void> | null = null
    const view = renderFixture(commit, (promise) => {
      completed = promise
    })
    const outgoingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!
    const persistentShell = screen.getByText('Persistent shell')
    const backdropShell = screen.getByText('Backdrop shell').parentElement!
    const backdropFilter = screen.getByText('Backdrop shell')
    const authoredBackdrop = screen.getByText('Authored backdrop')
    const userOwnedShell = screen.getByText('User-owned shell')
    const cloneNode = vi.spyOn(outgoingView, 'cloneNode')
    const importNode = vi.spyOn(document, 'importNode')

    document.documentElement.style.setProperty(
      'view-transition-name',
      'none',
    )

    Object.defineProperty(outgoingView, 'scrollHeight', {
      configurable: true,
      value: 12_000,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }))

    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-old(root)', exitKeyframes),
    ))

    const exit = findAnimation(
      '::view-transition-old(root)',
      exitKeyframes,
    )!
    const incomingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!
    const runtimeStyle = document.querySelector<HTMLStyleElement>(
      '[data-routeveil-page-transition]',
    )!
    const generatedPersistentName = persistentShell.style.getPropertyValue(
      'view-transition-name',
    )
    const generatedBackdropName = backdropFilter.style.getPropertyValue(
      'view-transition-name',
    )

    expect(native.startViewTransition).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(incomingView).not.toBe(outgoingView)
    expect(exit.element).toBe(document.documentElement)
    expect(browser.animations.some((animation) => (
      animation.element === outgoingView || animation.element === incomingView
    ))).toBe(false)
    expect(cloneNode).not.toHaveBeenCalled()
    expect(importNode).not.toHaveBeenCalled()
    expect(view.container.querySelectorAll('[data-routeveil-view]')).toHaveLength(1)
    expect(outgoingView.style.transform).toBe('')
    expect(outgoingView.style.filter).toBe('')
    expect(outgoingView.style.clipPath).toBe('')
    expect(outgoingView.style.getPropertyValue('will-change')).toBe('auto')
    expect(outgoingView.style.getPropertyPriority('will-change')).toBe(
      'important',
    )
    expect(
      persistentShell.style.getPropertyValue('view-transition-name'),
    ).not.toBe('')
    expect(persistentShell).toHaveAttribute(
      'data-routeveil-page-persistent',
    )
    expect(backdropShell).toHaveAttribute(
      'data-routeveil-page-persistent',
    )
    expect(backdropShell.style.getPropertyValue(
      'view-transition-name',
    )).toBe('')
    expect(generatedBackdropName).not.toBe('')
    expect(authoredBackdrop.style.getPropertyValue(
      'view-transition-name',
    )).toBe('authored-backdrop')
    expect(authoredBackdrop.style.getPropertyPriority(
      'view-transition-name',
    )).toBe('important')
    expect(
      userOwnedShell.style.getPropertyValue('view-transition-name'),
    ).toBe('user-owned-shell')
    expectPersistentSnapshotOpacity(
      runtimeStyle,
      generatedPersistentName,
      0,
      1,
    )
    expectPersistentSnapshotOpacity(
      runtimeStyle,
      'user-owned-shell',
      0,
      1,
    )
    expect(runtimeStyle.textContent).toContain(
      ':root::view-transition-group(root) { z-index: 0 !important; }',
    )
    expect(runtimeStyle.textContent).toContain(
      `:root::view-transition-group(${generatedPersistentName}) { z-index: 50 !important; }`,
    )
    expect(runtimeStyle.textContent).toContain(
      `:root::view-transition-group(${generatedBackdropName}) { z-index: 30 !important; }`,
    )
    expect(runtimeStyle.textContent).toContain(
      ':root::view-transition-group(authored-backdrop) { z-index: 30 !important; }',
    )
    expect(runtimeStyle.textContent).toContain(
      ':root::view-transition-group(user-owned-shell) { z-index: 30 !important; }',
    )
    expect(document.documentElement.style.getPropertyValue(
      'view-transition-name',
    )).toBe('root')
    expect(document.documentElement.style.getPropertyPriority(
      'view-transition-name',
    )).toBe('important')
    expect(document.documentElement).not.toHaveAttribute(
      'data-routeveil-page-paused',
    )

    await act(async () => {
      exit.finish()
      await Promise.resolve()
      await Promise.resolve()
    })

    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-new(root)', enterKeyframes),
    ))

    const enter = findAnimation(
      '::view-transition-new(root)',
      enterKeyframes,
    )!

    expect(native.startViewTransition).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(incomingView).not.toBe(outgoingView)
    expect(browser.animations.some((animation) => (
      animation.element === outgoingView || animation.element === incomingView
    ))).toBe(false)
    expect(cloneNode).not.toHaveBeenCalled()
    expect(importNode).not.toHaveBeenCalled()
    expect(view.container.querySelectorAll('[data-routeveil-view]')).toHaveLength(1)
    expectPersistentSnapshotOpacity(
      runtimeStyle,
      generatedPersistentName,
      0,
      1,
    )
    expectPersistentSnapshotOpacity(
      runtimeStyle,
      'user-owned-shell',
      0,
      1,
    )
    expect(document.documentElement).not.toHaveAttribute(
      'data-routeveil-page-paused',
    )

    await act(async () => {
      enter.finish()
      await Promise.resolve()
      await completed
    })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(
      persistentShell.style.getPropertyValue('view-transition-name'),
    ).toBe('')
    expect(backdropFilter.style.getPropertyValue(
      'view-transition-name',
    )).toBe('')
    expect(authoredBackdrop.style.getPropertyValue(
      'view-transition-name',
    )).toBe('authored-backdrop')
    expect(authoredBackdrop.style.getPropertyPriority(
      'view-transition-name',
    )).toBe('')
    expect(persistentShell).not.toHaveAttribute(
      'data-routeveil-page-persistent',
    )
    expect(
      userOwnedShell.style.getPropertyValue('view-transition-name'),
    ).toBe('user-owned-shell')
    expect(document.documentElement.style.getPropertyValue(
      'view-transition-name',
    )).toBe('none')
    expect(native.transitions[0]!.skipTransition).toHaveBeenCalledTimes(1)
    expect(incomingView).not.toHaveAttribute('data-routeveil-transitioning')
    expect(incomingView.inert).toBe(false)
    expect(incomingView.style.getPropertyValue('will-change')).toBe('')
    expect(
      document.querySelector('[data-routeveil-page-transition]'),
    ).not.toBeInTheDocument()
  })

  it('preserves direct page animations for viewport-bounded views without native support', async () => {
    const commit = vi.fn()
    let completed: Promise<void> | null = null
    const view = renderFixture(commit, (promise) => {
      completed = promise
    })
    const outgoingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }))
    await flushFramesUntil(() => Boolean(
      findLiveAnimation(outgoingView, exitKeyframes),
    ))

    await act(async () => {
      findLiveAnimation(outgoingView, exitKeyframes)!.finish()
      await Promise.resolve()
    })
    await flushFramesUntil(() => commit.mock.calls.length === 1)
    await flushFramesUntil(() => Boolean(screen.queryByText('Destination')))

    const incomingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!

    await flushFramesUntil(() => Boolean(
      findLiveAnimation(incomingView, enterKeyframes),
    ))
    await act(async () => {
      findLiveAnimation(incomingView, enterKeyframes)!.finish()
      await completed
    })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(outgoingView).not.toBe(incomingView)
    expect(
      document.querySelector('[data-routeveil-page-transition]'),
    ).not.toBeInTheDocument()
  })

  it('exposes a monotonic phase lifecycle for a native page transition', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    const phases: RouteveilPhase[] = []
    let completed: Promise<void> | null = null

    renderFixture(
      vi.fn(),
      (promise) => {
        completed = promise
      },
      (phase) => phases.push(phase),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }))
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-old(root)', exitKeyframes),
    ))
    await act(async () => {
      findAnimation('::view-transition-old(root)', exitKeyframes)!.finish()
      await Promise.resolve()
    })
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-new(root)', enterKeyframes),
    ))
    await act(async () => {
      findAnimation('::view-transition-new(root)', enterKeyframes)!.finish()
      await completed
    })

    expect(phases).toEqual([
      'idle',
      'exiting',
      'navigating',
      'entering',
      'idle',
    ])
  })

  it('waits for incoming route work before starting the exit snapshot animation', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    const registered = vi.fn()
    let resolvePending!: () => void
    const pending = new Promise<void>((resolve) => {
      resolvePending = resolve
    })
    const view = render(
      <MemoryRouter>
        <RouteveilProvider transitions={{ 'viewport-test': viewportTransition }}>
          <PendingRouteFixture
            pending={pending}
            onRegistered={registered}
          />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', {
      name: 'Navigate pending route',
    }))
    await flushFramesUntil(() => (
      registered.mock.calls.length === 1
      && screen.queryByText('Destination') !== null
    ))

    expect(native.startViewTransition).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(findAnimation(
      '::view-transition-old(root)',
      exitKeyframes,
    )).toBeUndefined()

    await act(async () => {
      browser.flushFrames(8)
      await Promise.resolve()
    })

    expect(findAnimation(
      '::view-transition-old(root)',
      exitKeyframes,
    )).toBeUndefined()

    await act(async () => {
      resolvePending()
      await Promise.resolve()
    })
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-old(root)', exitKeyframes),
    ))

    expect(document.documentElement).toHaveAttribute(
      'data-routeveil-page-paused',
    )

    await act(async () => {
      findAnimation('::view-transition-old(root)', exitKeyframes)!.finish()
      await Promise.resolve()
    })
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-new(root)', enterKeyframes),
    ))

    await act(async () => {
      findAnimation('::view-transition-new(root)', enterKeyframes)!.finish()
      await Promise.resolve()
    })

    await flushFramesUntil(() => (
      view.container.querySelector('[data-routeveil-view]')
        ?.getAttribute('data-routeveil-phase') === 'idle'
    ))

    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(native.startViewTransition).toHaveBeenCalledTimes(1)
  })

  it('commits exactly once without touching the long live view when native transitions are unavailable', async () => {
    const commit = vi.fn()
    let completed: Promise<void> | null = null
    const view = renderFixture(commit, (promise) => {
      completed = promise
    })
    const outgoingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!
    const cloneNode = vi.spyOn(outgoingView, 'cloneNode')
    const importNode = vi.spyOn(document, 'importNode')

    Object.defineProperty(outgoingView, 'scrollHeight', {
      configurable: true,
      value: 12_000,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }))
    await flushFramesUntil(() => commit.mock.calls.length === 1)
    await flushFramesUntil(() => screen.queryByText('Destination') !== null)

    await act(async () => {
      await completed
    })

    const incomingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!

    expect(commit).toHaveBeenCalledTimes(1)
    expect(browser.animations).toHaveLength(0)
    expect(cloneNode).not.toHaveBeenCalled()
    expect(importNode).not.toHaveBeenCalled()
    expect(outgoingView.style.transform).toBe('')
    expect(outgoingView.style.filter).toBe('')
    expect(outgoingView.style.clipPath).toBe('')
    expect(incomingView).not.toHaveAttribute('data-routeveil-transitioning')
    expect(incomingView.inert).toBe(false)
  })

  it('preserves smooth scroll behavior before animating the snapshots', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    const view = render(
      <MemoryRouter>
        <RouteveilProvider transitions={{ 'viewport-test': viewportTransition }}>
          <SmoothScrollFixture />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', {
      name: 'Navigate with smooth scroll',
    }))
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-old(root)', exitKeyframes),
    ))

    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      left: 0,
      top: 0,
    })

    await act(async () => {
      findAnimation('::view-transition-old(root)', exitKeyframes)!.finish()
      await Promise.resolve()
    })
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-new(root)', enterKeyframes),
    ))

    await act(async () => {
      findAnimation('::view-transition-new(root)', enterKeyframes)!.finish()
      await Promise.resolve()
    })
    await flushFramesUntil(() => (
      view.container.querySelector('[data-routeveil-view]')
        ?.getAttribute('data-routeveil-phase') === 'idle'
    ))
  })

  it('cancels native snapshots and removes temporary state on unmount', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    let completed: Promise<void> | null = null
    const view = renderFixture(vi.fn(), (promise) => {
      completed = promise
    })

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }))
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-old(root)', exitKeyframes),
    ))

    const incomingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!
    const persistentShell = screen.getByText('Persistent shell')
    const userOwnedShell = screen.getByText('User-owned shell')

    view.unmount()

    expect(native.transitions[0]!.skipTransition).toHaveBeenCalled()
    expect(browser.activeAnimations).toHaveLength(0)
    expect(
      document.querySelector('[data-routeveil-page-transition]'),
    ).not.toBeInTheDocument()
    expect(
      persistentShell.style.getPropertyValue('view-transition-name'),
    ).toBe('')
    expect(persistentShell).not.toHaveAttribute(
      'data-routeveil-page-persistent',
    )
    expect(
      userOwnedShell.style.getPropertyValue('view-transition-name'),
    ).toBe('user-owned-shell')
    expect(incomingView).not.toHaveAttribute('data-routeveil-page-view')
    expect(incomingView.style.getPropertyValue('will-change')).toBe('')
    expect(incomingView.style.getPropertyValue('opacity')).toBe('')

    await act(async () => {
      await completed
    })
  })

  it('restores the live page if the browser ends a snapshot during preparation', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    const registered = vi.fn()
    let resolvePending!: () => void
    const pending = new Promise<void>((resolve) => {
      resolvePending = resolve
    })
    const view = render(
      <MemoryRouter>
        <RouteveilProvider transitions={{ 'viewport-test': viewportTransition }}>
          <PendingRouteFixture
            pending={pending}
            onRegistered={registered}
          />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', {
      name: 'Navigate pending route',
    }))
    await flushFramesUntil(() => (
      registered.mock.calls.length === 1
      && screen.queryByText('Destination') !== null
    ))

    expect(document.querySelector(
      '[data-routeveil-page-transition]',
    )).toBeInTheDocument()

    await act(async () => {
      native.transitions[0]!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.querySelector(
      '[data-routeveil-page-transition]',
    )).not.toBeInTheDocument()
    expect(document.documentElement).not.toHaveAttribute(
      'data-routeveil-page-paused',
    )
    expect(browser.activeAnimations).toHaveLength(0)

    await flushFramesUntil(() => (
      view.container.querySelector('[data-routeveil-view]')
        ?.getAttribute('data-routeveil-phase') === 'idle'
    ))

    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(native.startViewTransition).toHaveBeenCalledTimes(1)

    resolvePending()
  })

  it('commits once and restores temporary state when pseudo-element animation fails', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    const commit = vi.fn()
    let completed: Promise<void> | null = null
    const view = renderFixture(commit, (promise) => {
      completed = promise
    })
    const outgoingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!
    const persistentShell = screen.getByText('Persistent shell')

    vi.spyOn(document.documentElement, 'animate').mockImplementation(() => {
      throw new Error('Pseudo-element animations are unavailable.')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }))
    await flushFramesUntil(() => commit.mock.calls.length === 1)

    for (const transition of native.transitions) {
      transition.finish()
    }

    await act(async () => {
      await Promise.resolve()
      await completed
    })

    const incomingView = view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!

    expect(commit).toHaveBeenCalledTimes(1)
    expect(outgoingView.style.transform).toBe('')
    expect(outgoingView.style.filter).toBe('')
    expect(outgoingView.style.clipPath).toBe('')
    expect(
      persistentShell.style.getPropertyValue('view-transition-name'),
    ).toBe('')
    expect(incomingView).not.toHaveAttribute('data-routeveil-transitioning')
    expect(incomingView.inert).toBe(false)
  })

  it('keeps matched shared elements on the existing shared snapshot path', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(24, 32, 180, 120),
    )
    const view = render(
      <MemoryRouter>
        <RouteveilProvider transitions={{ 'viewport-test': viewportTransition }}>
          <SharedTransitionFixture />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Shared source' }))

    expect(
      document.querySelector('[data-routeveil-shared-portal]'),
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-routeveil-shared-view]'),
    ).toBeInTheDocument()
    expect(native.startViewTransition).not.toHaveBeenCalled()

    view.unmount()
    await act(async () => {
      await Promise.resolve()
    })

    expect(
      document.querySelector('[data-routeveil-shared-portal]'),
    ).not.toBeInTheDocument()
  })

  it('uses the page transition path for links unrelated to registered shared elements', async () => {
    const native = installViewTransitionMocks()
    restoreViewTransitions = native.restore
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(24, 32, 180, 120),
    )
    const view = render(
      <MemoryRouter>
        <RouteveilProvider transitions={{ 'viewport-test': viewportTransition }}>
          <UnrelatedSharedTransitionFixture />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', {
      name: 'Navigate outside shared element',
    }))

    expect(
      document.querySelector('[data-routeveil-shared-portal]'),
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-routeveil-shared-view]'),
    ).not.toBeInTheDocument()

    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-old(root)', exitKeyframes),
    ))

    expect(native.startViewTransition).toHaveBeenCalledTimes(1)

    await act(async () => {
      findAnimation('::view-transition-old(root)', exitKeyframes)!.finish()
      await Promise.resolve()
    })
    await flushFramesUntil(() => Boolean(
      findAnimation('::view-transition-new(root)', enterKeyframes),
    ))
    await act(async () => {
      findAnimation('::view-transition-new(root)', enterKeyframes)!.finish()
      await Promise.resolve()
    })
    await flushFramesUntil(() => (
      view.container.querySelector('[data-routeveil-view]')
        ?.getAttribute('data-routeveil-phase') === 'idle'
    ))

    expect(screen.getByText('Destination')).toBeInTheDocument()
  })
})
