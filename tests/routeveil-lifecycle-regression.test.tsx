import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'
import {
  Link,
  RouterProvider,
  createMemoryRouter,
  useLocation,
} from 'react-router-dom'
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { OverlayRendererProps } from '../src/core'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
} from '../src/react-router'
import {
  useRouteveilContext,
  type TransitionRequest,
} from '../src/react-router/RouteveilContext'
import type {
  RouteveilNavigate,
  RouteveilPlay,
} from '../src/react-router/types'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type Deferred = {
  promise: Promise<void>
  reject: (error?: unknown) => void
  resolve: () => void
  readonly settled: boolean
}

type TrackedPromise = {
  promise: Promise<void>
  readonly status: 'fulfilled' | 'pending' | 'rejected'
}

type OverlayMode = 'controlled' | 'never-ready' | 'throw'

type HarnessOptions = {
  focusIncoming?: boolean
  initialEntries?: string[]
  initialIndex?: number
  overlayMode?: OverlayMode
  replaceView?: boolean
}

type Bridge = {
  navigate: RouteveilNavigate
  play: RouteveilPlay
  transitionTo: (request: TransitionRequest) => Promise<void>
}

type LifecycleHarness = ReturnType<typeof createLifecycleHarness>

function createDeferred(): Deferred {
  let rejectPromise!: (error: unknown) => void
  let resolvePromise!: () => void
  let settled = false
  const promise = new Promise<void>((resolve, reject) => {
    rejectPromise = reject
    resolvePromise = resolve
  })

  return {
    promise,
    reject(error = new Error('Controlled phase failed')) {
      if (!settled) {
        settled = true
        rejectPromise(error)
      }
    },
    resolve() {
      if (!settled) {
        settled = true
        resolvePromise()
      }
    },
    get settled() {
      return settled
    },
  }
}

function trackPromise(promise: Promise<void>): TrackedPromise {
  let status: TrackedPromise['status'] = 'pending'
  void promise.then(
    () => {
      status = 'fulfilled'
    },
    () => {
      status = 'rejected'
    },
  )

  return {
    promise,
    get status() {
      return status
    },
  }
}

async function settleReact(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve()
    }
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(0)
    }
  })
}

async function flushPaint(harness: LifecycleHarness): Promise<void> {
  for (let index = 0; index < 2; index += 1) {
    await act(async () => {
      harness.browser.flushFrame()
      await Promise.resolve()
    })
  }
  await settleReact()
}

function runningAnimation(harness: LifecycleHarness): ControlledAnimation {
  const animation = harness.browser.animations.findLast(
    (candidate) => candidate.status === 'running',
  )
  expect(animation).toBeDefined()
  return animation!
}

async function finishNextAnimation(
  harness: LifecycleHarness,
): Promise<ControlledAnimation> {
  const animation = runningAnimation(harness)
  await act(async () => {
    animation.finish()
    await Promise.resolve()
    await Promise.resolve()
  })
  return animation
}

async function completePageRun(
  harness: LifecycleHarness,
  tracked: TrackedPromise,
): Promise<void> {
  await finishNextAnimation(harness)
  await flushPaint(harness)
  await finishNextAnimation(harness)
  await act(async () => tracked.promise)
}

async function startOverlayCover(harness: LifecycleHarness): Promise<void> {
  await settleReact()
  await flushPaint(harness)
  expect(harness.overlay.coverCalls).toBe(1)
  expect(harness.phase()).toBe('covering')
}

async function completeOverlayRun(
  harness: LifecycleHarness,
  tracked: TrackedPromise,
): Promise<void> {
  await startOverlayCover(harness)
  await act(async () => {
    harness.overlay.cover.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
  await flushPaint(harness)
  expect(harness.overlay.revealCalls).toBe(1)
  await act(async () => {
    harness.overlay.reveal.resolve()
    await tracked.promise
  })
}

function countDestination(
  harness: LifecycleHarness,
  destination: string,
): number {
  return harness.navigateSpy.mock.calls.filter(
    ([to]) => to === destination,
  ).length
}

function expectCleanLifecycle(
  harness: LifecycleHarness,
  expectedInert = false,
): void {
  expect(harness.phase()).toBe('idle')
  expect(harness.view()).not.toHaveAttribute('data-routeveil-transitioning')
  expect(harness.view().inert).toBe(expectedInert)
  expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
  expect(harness.browser.activeAnimations).toHaveLength(0)
  expect(harness.browser.pendingFrames).toBe(0)
  expect(harness.view()).not.toHaveAttribute('tabindex')
  if (vi.isFakeTimers()) {
    expect(vi.getTimerCount()).toBe(0)
  }
}

function createLifecycleHarness(options: HarnessOptions = {}) {
  const browser = installBrowserMocks()
  const overlay = {
    cover: createDeferred(),
    coverCalls: 0,
    reset: vi.fn(),
    reveal: createDeferred(),
    revealCalls: 0,
  }
  let bridge: Bridge | null = null

  function ControlledOverlay({ controllerRef }: OverlayRendererProps) {
    useImperativeHandle(controllerRef, () => ({
      cover: () => {
        overlay.coverCalls += 1
        return overlay.cover.promise
      },
      reset: overlay.reset,
      reveal: () => {
        overlay.revealCalls += 1
        return overlay.reveal.promise
      },
    }), [])

    return <div data-testid="controlled-overlay" />
  }

  function NeverReadyOverlay() {
    return <div data-testid="never-ready-overlay" />
  }

  function ThrowingOverlay(): never {
    throw new Error('Overlay renderer failed')
  }

  const OverlayRenderer = options.overlayMode === 'never-ready'
    ? NeverReadyOverlay
    : options.overlayMode === 'throw'
      ? ThrowingOverlay
      : ControlledOverlay

  function BridgeCapture() {
    const navigate = useRouteveilNavigate()
    const play = useRouteveilTransition()
    const { transitionTo } = useRouteveilContext()
    bridge = { navigate, play, transitionTo }
    return null
  }

  function RouteContent() {
    const location = useLocation()
    const incomingFocusRef = useRef<HTMLButtonElement | null>(null)

    useLayoutEffect(() => {
      if (options.focusIncoming && location.pathname === '/target') {
        incomingFocusRef.current?.focus()
      }
    }, [location.pathname])

    return (
      <main>
        <h1>{`${location.pathname}${location.search}${location.hash}`}</h1>
        {location.pathname === '/start' ? (
          <>
            <RouteveilLink
              data-testid="inside-page-link"
              to="/target"
              transition="controlled-page"
            >
              Inside page
            </RouteveilLink>
            <RouteveilLink
              data-testid="inside-overlay-link"
              to="/target"
              transition="controlled-overlay"
            >
              Inside overlay
            </RouteveilLink>
          </>
        ) : null}
        {location.pathname === '/target' ? (
          <button ref={incomingFocusRef}>Incoming action</button>
        ) : null}
        <div id="details">Details</div>
      </main>
    )
  }

  function HarnessApp() {
    const location = useLocation()
    return (
      <RouteveilProvider
        transitions={{
          'controlled-overlay': {
            type: 'overlay',
            renderer: OverlayRenderer,
          },
          'controlled-page': {
            type: 'page',
            exit: {
              keyframes: [{ opacity: 1 }, { opacity: 0 }],
              options: { duration: 100 },
            },
            enter: {
              keyframes: [{ opacity: 0 }, { opacity: 1 }],
              options: { duration: 100 },
            },
          },
        }}
      >
        <BridgeCapture />
        <nav>
          <RouteveilLink to="/target" transition="controlled-page">
            Persistent page
          </RouteveilLink>
          <RouteveilLink to="/second" transition="controlled-page">
            Persistent second
          </RouteveilLink>
          <RouteveilLink to="/target" transition="controlled-overlay">
            Persistent overlay
          </RouteveilLink>
          <RouteveilLink
            data-testid="self-link"
            target="_self"
            to="/target"
            transition="controlled-page"
          >
            Self target
          </RouteveilLink>
          <RouteveilLink
            data-testid="reload-link"
            reloadDocument
            to="/target"
            transition="controlled-page"
          >
            Reload document
          </RouteveilLink>
          <RouteveilLink
            data-testid="prevented-link"
            onClick={(event) => event.preventDefault()}
            to="/target"
            transition="controlled-page"
          >
            Prevented
          </RouteveilLink>
          <Link to="/external">Standard link</Link>
          <button>Persistent focus</button>
        </nav>
        <output data-testid="location">
          {`${location.pathname}${location.search}${location.hash}`}
        </output>
        <RouteveilView key={options.replaceView ? location.key : undefined}>
          <RouteContent />
        </RouteveilView>
      </RouteveilProvider>
    )
  }

  const router = createMemoryRouter([
    {
      path: '*',
      element: <HarnessApp />,
    },
  ], {
    initialEntries: options.initialEntries ?? ['/history', '/start'],
    initialIndex: options.initialIndex ?? 1,
  })
  const navigateSpy = vi.spyOn(router, 'navigate')
  const rendered = render(<RouterProvider router={router} />)

  if (!bridge) {
    throw new Error('Lifecycle bridge did not render')
  }

  const initialView = document.querySelector<HTMLElement>(
    '[data-routeveil-view]',
  )
  if (!initialView) {
    throw new Error('RouteveilView did not render')
  }
  initialView.inert = false

  return {
    browser,
    navigate(
      to: Parameters<RouteveilNavigate>[0],
      navigationOptions?: Parameters<RouteveilNavigate>[1],
    ) {
      let promise!: Promise<void>
      act(() => {
        promise = bridge!.navigate(to, navigationOptions)
      })
      return promise
    },
    navigateSpy,
    overlay,
    phase() {
      return this.view().dataset.routeveilPhase
    },
    play(
      transition: Parameters<RouteveilPlay>[0],
      playOptions?: Parameters<RouteveilPlay>[1],
    ) {
      let promise!: Promise<void>
      act(() => {
        promise = bridge!.play(transition, playOptions)
      })
      return promise
    },
    rendered,
    request(request: TransitionRequest) {
      let promise!: Promise<void>
      act(() => {
        promise = bridge!.transitionTo(request)
      })
      return promise
    },
    router,
    view() {
      const view = document.querySelector<HTMLElement>('[data-routeveil-view]')
      if (!view) {
        throw new Error('RouteveilView is not mounted')
      }
      return view
    },
  }
}

let harnesses: LifecycleHarness[] = []

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  for (const harness of harnesses) {
    harness.browser.restore()
  }
  harnesses = []
  if (vi.isFakeTimers()) {
    vi.clearAllTimers()
    vi.useRealTimers()
  }
})

function setup(options: HarnessOptions = {}): LifecycleHarness {
  const harness = createLifecycleHarness(options)
  harnesses.push(harness)
  return harness
}

describe('external location interruption', () => {
  it('abandons a pending commit after direct history manipulation', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    const exit = runningAnimation(harness)

    act(() => {
      window.history.pushState({ source: 'external' }, '', '/direct-history')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(window.location.pathname).toBe('/direct-history')
    expectCleanLifecycle(harness)

    exit.finish()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(0)

    act(() => {
      window.history.replaceState(null, '', '/')
    })
  })

  it('abandons a page commit when external navigation wins during exit', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      smoothScrollToTop: true,
      transition: 'controlled-page',
    }))
    const exit = runningAnimation(harness)

    expect(harness.phase()).toBe('exiting')
    await act(async () => {
      await harness.router.navigate('/external?mode=plain#latest')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.router.state.location).toMatchObject({
      hash: '#latest',
      pathname: '/external',
      search: '?mode=plain',
    })
    expect(harness.browser.scrollTo).not.toHaveBeenCalled()
    expectCleanLifecycle(harness)

    exit.finish()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/external')
  })

  it('abandons a page commit when location changes as exit settles', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    const exit = runningAnimation(harness)

    await act(async () => {
      exit.finish()
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/external')
    expectCleanLifecycle(harness)
  })

  it('respects external navigation while committed navigation is pending', async () => {
    const harness = setup()
    const navigationWork = createDeferred()
    const commit = vi.fn(() => {
      void harness.router.navigate('/target')
      return navigationWork.promise
    })
    const tracked = trackPromise(harness.request({
      commit,
      expectedPath: '/target',
      to: '/target',
      transition: 'controlled-page',
    }))

    await finishNextAnimation(harness)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/target')

    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/external')
    expectCleanLifecycle(harness)

    navigationWork.resolve()
    await settleReact()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/external')
  })

  it('keeps the latest external location when page enter resolves late', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await finishNextAnimation(harness)
    await flushPaint(harness)
    expect(harness.phase()).toBe('entering')
    const enter = runningAnimation(harness)

    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/external')
    expectCleanLifecycle(harness)

    enter.finish()
    await settleReact()
    expect(harness.router.state.location.pathname).toBe('/external')
    expect(countDestination(harness, '/target')).toBe(1)
  })

  it('respects Back during exit and Forward after cancellation', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await act(async () => {
      await harness.router.navigate(-1)
    })
    expect(harness.router.state.location.pathname).toBe('/history')
    await act(async () => {
      await harness.router.navigate(1)
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(harness.router.state.location.pathname).toBe('/start')
    expect(countDestination(harness, '/target')).toBe(0)
    expectCleanLifecycle(harness)
  })

  it('cancels an overlay that is still preparing', async () => {
    const harness = setup({ overlayMode: 'never-ready' })
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await settleReact()

    expect(document.querySelector('[data-routeveil-overlay-root]')).not.toBeNull()
    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/external')
    expectCleanLifecycle(harness)
  })

  it('abandons an overlay commit when external navigation wins during cover', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)

    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/external')
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expectCleanLifecycle(harness)

    harness.overlay.cover.resolve()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(0)
  })

  it('abandons an overlay commit when location changes as cover settles', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)

    await act(async () => {
      harness.overlay.cover.resolve()
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/external')
    expectCleanLifecycle(harness)
  })

  it('keeps the latest external location when reveal resolves late', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)
    await act(async () => {
      harness.overlay.cover.resolve()
      await Promise.resolve()
    })
    await flushPaint(harness)
    expect(harness.phase()).toBe('revealing')

    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/external')
    expectCleanLifecycle(harness)

    harness.overlay.reveal.resolve()
    await settleReact()
    expect(harness.router.state.location.pathname).toBe('/external')
    expect(countDestination(harness, '/target')).toBe(1)
  })
})

describe('browser history interruption matrix', () => {
  it('detects an external key change when the URL text is unchanged', async () => {
    const harness = setup()
    const startingKey = harness.router.state.location.key
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await act(async () => {
      await harness.router.navigate('/start', {
        replace: true,
        state: { source: 'external' },
      })
    })
    await settleReact()

    expect(harness.router.state.location.key).not.toBe(startingKey)
    expect(harness.router.state.location.pathname).toBe('/start')
    expect(harness.router.state.location.state).toEqual({ source: 'external' })
    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expectCleanLifecycle(harness)
  })

  it('detects external search and hash changes on the same pathname', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await act(async () => {
      await harness.router.navigate('/start?mode=external#latest', {
        replace: true,
      })
    })
    await settleReact()

    expect(harness.router.state.location).toMatchObject({
      hash: '#latest',
      pathname: '/start',
      search: '?mode=external',
    })
    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expectCleanLifecycle(harness)
  })

  it('respects Back during page enter', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    await finishNextAnimation(harness)
    await flushPaint(harness)
    const enter = runningAnimation(harness)

    await act(async () => {
      await harness.router.navigate(-1)
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(harness.router.state.location.pathname).toBe('/start')
    expect(countDestination(harness, '/target')).toBe(1)
    expect(enter.animation.cancel).toHaveBeenCalled()
    expectCleanLifecycle(harness)
  })

  it('respects Back during overlay cover', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)

    await act(async () => {
      await harness.router.navigate(-1)
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(harness.router.state.location.pathname).toBe('/history')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expectCleanLifecycle(harness)
  })

  it('respects Back during overlay reveal', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)
    await act(async () => {
      harness.overlay.cover.resolve()
      await Promise.resolve()
    })
    await flushPaint(harness)
    expect(harness.phase()).toBe('revealing')

    await act(async () => {
      await harness.router.navigate(-1)
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(harness.router.state.location.pathname).toBe('/start')
    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expectCleanLifecycle(harness)
  })

  it('cancels pending overlay navigation work after commit', async () => {
    const harness = setup()
    const navigationWork = createDeferred()
    const commit = vi.fn(() => {
      void harness.router.navigate('/target')
      return navigationWork.promise
    })
    const tracked = trackPromise(harness.request({
      commit,
      expectedPath: '/target',
      to: '/target',
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)
    await act(async () => {
      harness.overlay.cover.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/external')
    expectCleanLifecycle(harness)

    navigationWork.resolve()
    await settleReact()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/external')
  })
})

describe('ignore while active', () => {
  it('reuses the active promise for programmatic requests', async () => {
    const harness = setup()
    const first = harness.navigate('/target', {
      transition: 'controlled-page',
    })
    const second = harness.navigate('/second', {
      transition: 'controlled-page',
    })
    const tracked = trackPromise(first)

    expect(second).toBe(first)
    await completePageRun(harness, tracked)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(countDestination(harness, '/second')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('ignores a programmatic request after a link request', async () => {
    const harness = setup()
    fireEvent.click(screen.getByRole('link', { name: 'Persistent page' }))
    const tracked = trackPromise(harness.navigate('/second', {
      transition: 'controlled-page',
    }))

    await completePageRun(harness, tracked)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(countDestination(harness, '/second')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('ignores a link request after a programmatic request', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    fireEvent.click(screen.getByRole('link', { name: 'Persistent second' }))

    await completePageRun(harness, tracked)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(countDestination(harness, '/second')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('ignores navigation while same-page playback is active', async () => {
    const harness = setup()
    const playback = harness.play('controlled-page')
    const navigation = harness.navigate('/target', {
      transition: 'controlled-page',
    })
    const tracked = trackPromise(playback)

    expect(navigation).toBe(playback)
    await completePageRun(harness, tracked)

    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/start')
    expectCleanLifecycle(harness)
  })

  it('ignores playback while navigation is active', async () => {
    const harness = setup()
    const navigation = harness.navigate('/target', {
      transition: 'controlled-page',
    })
    const playback = harness.play('controlled-page')
    const tracked = trackPromise(navigation)

    expect(playback).toBe(navigation)
    await completePageRun(harness, tracked)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('ignores a second link while an overlay is active', async () => {
    const harness = setup()
    fireEvent.click(screen.getByRole('link', { name: 'Persistent overlay' }))
    fireEvent.click(screen.getByRole('link', { name: 'Persistent second' }))
    const tracked = trackPromise(harness.play('controlled-page'))

    await completeOverlayRun(harness, tracked)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(countDestination(harness, '/second')).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })
})

describe('commit and failure guarantees', () => {
  it('commits exactly once when a page animation rejects', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await act(async () => {
      runningAnimation(harness).fail(new Error('Exit failed'))
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushPaint(harness)
    await finishNextAnimation(harness)
    await act(async () => tracked.promise)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('does not retry a rejected navigation commit', async () => {
    const harness = setup()
    harness.navigateSpy.mockRejectedValueOnce(new Error('Navigation failed'))
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await finishNextAnimation(harness)
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/start')
    expectCleanLifecycle(harness)
  })

  it('recovers from cover rejection with one navigation commit', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)

    await act(async () => {
      harness.overlay.cover.reject(new Error('Cover failed'))
      await Promise.resolve()
    })
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('does not recommit when reveal rejects', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)
    await act(async () => {
      harness.overlay.cover.resolve()
      await Promise.resolve()
    })
    await flushPaint(harness)

    await act(async () => {
      harness.overlay.reveal.reject(new Error('Reveal failed'))
      await tracked.promise
    })

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('removes the overlay root after a renderer error', async () => {
    const harness = setup({ overlayMode: 'throw' })
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await settleReact()
    await flushPaint(harness)
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('cancels a timed-out page animation and ignores late completion', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    const exit = runningAnimation(harness)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    await settleReact()
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(exit.animation.cancel).toHaveBeenCalled()
    expect(countDestination(harness, '/target')).toBe(1)
    expectCleanLifecycle(harness)

    exit.finish()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.phase()).toBe('idle')
  })

  it('cleans up an overlay-ready timeout and ignores late registration', async () => {
    vi.useFakeTimers()
    const harness = setup({ overlayMode: 'never-ready' })
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await settleReact()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    await settleReact()
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })

  it('cleans up a cover timeout and ignores the deferred phase', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    await settleReact()
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expectCleanLifecycle(harness)

    harness.overlay.cover.resolve()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.phase()).toBe('idle')
  })

  it('settles a navigation timeout without a duplicate commit', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const navigationWork = createDeferred()
    const commit = vi.fn(() => navigationWork.promise)
    const tracked = trackPromise(harness.request({
      commit,
      expectedPath: '/target',
      to: '/target',
      transition: 'controlled-page',
    }))

    await finishNextAnimation(harness)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/start')
    expectCleanLifecycle(harness)

    navigationWork.resolve()
    await settleReact()
    expect(commit).toHaveBeenCalledTimes(1)
  })
})

describe('provider unmount cleanup', () => {
  it('settles and abandons an uncommitted page run', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    const exit = runningAnimation(harness)

    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(exit.animation.cancel).toHaveBeenCalled()
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(harness.browser.activeAnimations).toHaveLength(0)
    expect(harness.browser.pendingFrames).toBe(0)
    expect(vi.getTimerCount()).toBe(0)

    exit.finish()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(0)
  })

  it('settles while committed navigation work remains pending', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const navigationWork = createDeferred()
    const commit = vi.fn(() => {
      void harness.router.navigate('/target')
      return navigationWork.promise
    })
    const tracked = trackPromise(harness.request({
      commit,
      expectedPath: '/target',
      to: '/target',
      transition: 'controlled-page',
    }))

    await finishNextAnimation(harness)
    expect(commit).toHaveBeenCalledTimes(1)
    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(commit).toHaveBeenCalledTimes(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expect(vi.getTimerCount()).toBe(0)

    navigationWork.resolve()
    await settleReact()
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('cancels enter work without reverting the committed route', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await finishNextAnimation(harness)
    await flushPaint(harness)
    const enter = runningAnimation(harness)
    expect(harness.phase()).toBe('entering')

    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(harness.router.state.location.pathname).toBe('/target')
    expect(enter.animation.cancel).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)

    enter.finish()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(1)
  })

  it('removes an overlay that has not become ready', async () => {
    vi.useFakeTimers()
    const harness = setup({ overlayMode: 'never-ready' })
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await settleReact()

    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('resets and removes an overlay during cover', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)

    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(0)
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)

    harness.overlay.cover.resolve()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(0)
  })

  it('resets and removes an overlay during reveal', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)
    await act(async () => {
      harness.overlay.cover.resolve()
      await Promise.resolve()
    })
    await flushPaint(harness)
    expect(harness.phase()).toBe('revealing')

    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)

    harness.overlay.reveal.resolve()
    await settleReact()
    expect(countDestination(harness, '/target')).toBe(1)
  })

  it('stays settled when unmounted after timeout but before late work', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-overlay',
    }))
    await startOverlayCover(harness)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(countDestination(harness, '/target')).toBeLessThanOrEqual(1)
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)

    harness.overlay.cover.resolve()
    await settleReact()
    expect(countDestination(harness, '/target')).toBeLessThanOrEqual(1)
  })
})

describe('focus and inert ownership', () => {
  it.each([
    ['controlled-page', 'inside-page-link'],
    ['controlled-overlay', 'inside-overlay-link'],
  ] as const)(
    'focuses the incoming view after successful %s navigation',
    async (transition, testId) => {
      const harness = setup()
      const trigger = screen.getByTestId(testId)
      trigger.focus()
      fireEvent.click(trigger)
      const tracked = trackPromise(harness.play('controlled-page'))

      if (transition === 'controlled-page') {
        await completePageRun(harness, tracked)
      } else {
        await completeOverlayRun(harness, tracked)
      }

      expect(trigger.isConnected).toBe(false)
      expect(document.activeElement).toBe(harness.view())
      expect(harness.browser.focus).toHaveBeenLastCalledWith({
        preventScroll: true,
      })
      expect(harness.browser.scrollTo).toHaveBeenCalledTimes(1)
      expect(harness.browser.scrollTo).toHaveBeenCalledWith({
        behavior: 'instant',
        left: 0,
        top: 0,
      })
      expectCleanLifecycle(harness)
    },
  )

  it('preserves meaningful focus moved by the incoming application', async () => {
    const harness = setup({ focusIncoming: true })
    const trigger = screen.getByTestId('inside-page-link')
    trigger.focus()
    fireEvent.click(trigger)
    const tracked = trackPromise(harness.play('controlled-page'))

    await completePageRun(harness, tracked)

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Incoming action' }),
    )
    expectCleanLifecycle(harness)
  })

  it('preserves focus and scroll during same-page playback', async () => {
    const harness = setup()
    const focused = screen.getByRole('button', { name: 'Persistent focus' })
    focused.focus()
    const tracked = trackPromise(harness.play('controlled-page'))

    await completePageRun(harness, tracked)

    expect(document.activeElement).toBe(focused)
    expect(harness.browser.scrollTo).not.toHaveBeenCalled()
    expectCleanLifecycle(harness)
  })

  it('does not overwrite focus intentionally moved during abandonment', async () => {
    const harness = setup()
    const original = screen.getByRole('button', { name: 'Persistent focus' })
    const intentional = screen.getByRole('link', { name: 'Persistent second' })
    original.focus()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    intentional.focus()

    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(document.activeElement).toBe(intentional)
    expectCleanLifecycle(harness)
  })

  it('applies the same fallback focus policy under reduced motion', async () => {
    const harness = setup()
    harness.browser.setReducedMotion(true)
    const trigger = screen.getByTestId('inside-page-link')
    trigger.focus()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(harness.browser.animations).toHaveLength(0)
    expect(document.activeElement).toBe(harness.view())
    expect(harness.browser.focus).toHaveBeenLastCalledWith({
      preventScroll: true,
    })
    expectCleanLifecycle(harness)
  })

  it('restores an originally inert view after playback', async () => {
    const harness = setup()
    harness.view().inert = true
    const tracked = trackPromise(harness.play('controlled-page'))

    await completePageRun(harness, tracked)

    expectCleanLifecycle(harness, true)
  })

  it('preserves an application-owned transition attribute', async () => {
    const harness = setup()
    harness.view().setAttribute('data-routeveil-transitioning', '')
    const tracked = trackPromise(harness.play('controlled-page'))

    await completePageRun(harness, tracked)

    expect(harness.view()).toHaveAttribute('data-routeveil-transitioning', '')
    expect(harness.phase()).toBe('idle')
    expect(harness.view().inert).toBe(false)
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
  })

  it('does not restore stale inert state over an application change', async () => {
    const harness = setup()
    harness.view().inert = true
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))
    harness.view().inert = false

    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expectCleanLifecycle(harness, false)
  })

  it('cleans the outgoing view when navigation replaces RouteveilView', async () => {
    const harness = setup({ replaceView: true })
    const outgoing = harness.view()
    const tracked = trackPromise(harness.navigate('/target', {
      transition: 'controlled-page',
    }))

    await completePageRun(harness, tracked)

    expect(outgoing.isConnected).toBe(false)
    expect(outgoing.inert).toBe(false)
    expect(outgoing).not.toHaveAttribute('data-routeveil-transitioning')
    expect(harness.view()).not.toBe(outgoing)
    expectCleanLifecycle(harness)
  })
})

describe('programmatic navigation semantics', () => {
  it('supports no-transition and same-destination navigation', async () => {
    const harness = setup()
    const first = trackPromise(harness.navigate('/target?mode=plain#details', {
      state: { source: 'plain' },
    }))
    await act(async () => first.promise)

    expect(harness.browser.animations).toHaveLength(0)
    expect(harness.router.state.location).toMatchObject({
      hash: '#details',
      pathname: '/target',
      search: '?mode=plain',
      state: { source: 'plain' },
    })

    const repeated = trackPromise(harness.navigate('/target?mode=plain#details', {
      transition: 'controlled-page',
    }))
    await act(async () => repeated.promise)

    expect(harness.browser.animations).toHaveLength(0)
    expect(repeated.status).toBe('fulfilled')
    expectCleanLifecycle(harness)
  })

  it('preserves replace, state, search, and hash without forced top scroll', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.navigate('/target?mode=replace#details', {
      replace: true,
      state: { source: 'programmatic' },
      transition: 'controlled-page',
    }))

    await completePageRun(harness, tracked)

    expect(harness.router.state.historyAction).toBe('REPLACE')
    expect(harness.router.state.location).toMatchObject({
      hash: '#details',
      pathname: '/target',
      search: '?mode=replace',
      state: { source: 'programmatic' },
    })
    expect(harness.browser.scrollTo).not.toHaveBeenCalled()
    expect(countDestination(harness, '/target?mode=replace#details')).toBe(1)
    expectCleanLifecycle(harness)

    await act(async () => {
      await harness.router.navigate(-1)
    })
    expect(harness.router.state.location.pathname).toBe('/history')
  })
})

describe('native link behavior', () => {
  it.each([
    ['middle', { button: 1 }],
    ['meta', { button: 0, metaKey: true }],
    ['shift', { button: 0, shiftKey: true }],
    ['alt', { altKey: true, button: 0 }],
  ])('does not intercept a %s click', (_name, init) => {
    const harness = setup()
    const link = screen.getByRole('link', { name: 'Persistent page' })
    let preventedByRouteveil = true
    document.body.addEventListener('click', (event) => {
      preventedByRouteveil = event.defaultPrevented
      event.preventDefault()
    }, { once: true })

    link.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...init,
    }))

    expect(preventedByRouteveil).toBe(false)
    expect(harness.browser.animations).toHaveLength(0)
    expect(harness.router.state.location.pathname).toBe('/start')
  })

  it('does not intercept reloadDocument or a prevented click', () => {
    const harness = setup()
    const reload = screen.getByTestId('reload-link')
    let preventedByRouteveil = true
    document.body.addEventListener('click', (event) => {
      preventedByRouteveil = event.defaultPrevented
      event.preventDefault()
    }, { once: true })
    reload.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
    }))

    expect(preventedByRouteveil).toBe(false)
    fireEvent.click(screen.getByTestId('prevented-link'))
    expect(harness.browser.animations).toHaveLength(0)
    expect(harness.router.state.location.pathname).toBe('/start')
  })

  it('intercepts an explicit self target', async () => {
    const harness = setup()
    fireEvent.click(screen.getByTestId('self-link'))
    const tracked = trackPromise(harness.play('controlled-page'))

    await completePageRun(harness, tracked)

    expect(countDestination(harness, '/target')).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expectCleanLifecycle(harness)
  })
})

describe('same-page playback guarantees', () => {
  it('bypasses visual work under reduced motion without navigation or scroll', async () => {
    const harness = setup()
    harness.browser.setReducedMotion(true)
    const tracked = trackPromise(harness.play('controlled-overlay'))
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(harness.browser.animations).toHaveLength(0)
    expect(harness.overlay.coverCalls).toBe(0)
    expect(harness.overlay.revealCalls).toBe(0)
    expect(harness.router.state.location.pathname).toBe('/start')
    expect(harness.browser.scrollTo).not.toHaveBeenCalled()
    expectCleanLifecycle(harness)
  })

  it('cleans up failed overlay playback without committing location', async () => {
    const harness = setup()
    const tracked = trackPromise(harness.play('controlled-overlay'))
    await startOverlayCover(harness)

    await act(async () => {
      harness.overlay.cover.reject(new Error('Playback cover failed'))
      await Promise.resolve()
    })
    await flushPaint(harness)
    await act(async () => tracked.promise)

    expect(harness.navigateSpy).not.toHaveBeenCalled()
    expect(harness.router.state.location.pathname).toBe('/start')
    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expect(harness.browser.scrollTo).not.toHaveBeenCalled()
    expectCleanLifecycle(harness)
  })

  it('settles playback when the provider unmounts', async () => {
    vi.useFakeTimers()
    const harness = setup()
    const focused = screen.getByRole('button', { name: 'Persistent focus' })
    focused.focus()
    const tracked = trackPromise(harness.play('controlled-page'))
    const animation = runningAnimation(harness)

    harness.rendered.unmount()
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(animation.animation.cancel).toHaveBeenCalled()
    expect(harness.navigateSpy).not.toHaveBeenCalled()
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(harness.browser.pendingFrames).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
