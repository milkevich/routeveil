import {
  useCallback,
  type Ref,
} from 'react'
import {
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
import type { RenderResult } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  useRouteveilNavigate,
} from '../src/react-router'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

type TrackedPromise = {
  promise: Promise<void>
  readonly status: 'fulfilled' | 'pending' | 'rejected'
}

type HarnessOptions = {
  incomingFailure?: boolean
  names?: string[]
  targetPending?: boolean
  targets?: boolean
}

type InterruptionHarness = {
  activePromise: () => Promise<void>
  browser: BrowserMocks
  commitCount: () => number
  location: () => string
  rendered: RenderResult
  router: ReturnType<typeof createMemoryRouter>
  view: () => HTMLElement
}

function createRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect
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

function SharedVisual({
  index,
  name,
  pending = false,
  position,
}: {
  index: number
  name: string
  pending?: boolean
  position: 'source' | 'target'
}) {
  const setRect = useCallback((element: HTMLDivElement | null) => {
    if (!element) {
      return
    }

    const source = position === 'source'
    const left = source ? 24 + index * 18 : 190 + index * 32
    const top = source ? 350 + index * 72 : 42 + index * 86
    const width = pending ? 0 : source ? 130 + index * 12 : 260 + index * 24
    const height = source ? 58 + index * 8 : 94 + index * 12
    element.getBoundingClientRect = () => createRect(left, top, width, height)
  }, [index, pending, position])

  return (
    <RouteveilSharedElement name={name}>
      <div
        ref={setRect as Ref<HTMLDivElement>}
        data-routeveil-interruption-real={`${position}-${name}`}
        style={{ borderRadius: '6px' }}
      >
        {`Shared ${name}`}
      </div>
    </RouteveilSharedElement>
  )
}

function createHarness({
  incomingFailure = false,
  names = ['interruption-primary'],
  targetPending = false,
  targets = true,
}: HarnessOptions = {}): InterruptionHarness {
  const browser = installBrowserMocks()
  let activePromise: Promise<void> | null = null

  function RouteContent({ pathname }: { pathname: string }) {
    const navigate = useRouteveilNavigate()

    if (pathname === '/start') {
      return (
        <main data-testid="source-route">
          <button
            data-testid="navigate-trigger"
            onClick={(event) => {
              event.currentTarget.focus()
              activePromise = navigate('/target', {
                sharedElements: 'all',
                transition: 'controlled-page',
              })
            }}
            type="button"
          >
            {names.map((name, index) => (
              <SharedVisual
                key={name}
                index={index}
                name={name}
                position="source"
              />
            ))}
          </button>
        </main>
      )
    }

    if (pathname === '/target') {
      if (incomingFailure) {
        throw new Error('Incoming shared route failed')
      }

      return (
        <main data-testid="target-route">
          {targets
            ? names.map((name, index) => (
                <SharedVisual
                  key={name}
                  index={index}
                  name={name}
                  pending={targetPending}
                  position="target"
                />
              ))
            : null}
        </main>
      )
    }

    return <main data-testid="external-route">{pathname}</main>
  }

  function App() {
    const location = useLocation()

    return (
      <RouteveilProvider
        transitions={{
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
        <output data-testid="location">{location.pathname}</output>
        <RouteveilView>
          <RouteContent pathname={location.pathname} />
        </RouteveilView>
      </RouteveilProvider>
    )
  }

  const router = createMemoryRouter([
    {
      path: '*',
      element: <App />,
      errorElement: (
        <main data-testid="route-error">Incoming route failed</main>
      ),
    },
  ], {
    initialEntries: ['/history', '/start'],
    initialIndex: 1,
  })
  const navigateSpy = vi.spyOn(router, 'navigate')
  const rendered = render(<RouterProvider router={router} />)

  return {
    activePromise() {
      if (!activePromise) {
        throw new Error('No shared-element transition promise was captured')
      }

      return activePromise
    },
    browser,
    commitCount() {
      return navigateSpy.mock.calls.filter(([to]) => to === '/target').length
    },
    location() {
      return screen.getByTestId('location').textContent ?? ''
    },
    rendered,
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

function runningViewAnimations(
  harness: InterruptionHarness,
): ControlledAnimation[] {
  return harness.browser.animations.filter((animation) => (
    animation.status === 'running'
    && animation.element.hasAttribute('data-routeveil-view')
  ))
}

function runningSharedAnimations(
  harness: InterruptionHarness,
): ControlledAnimation[] {
  return harness.browser.animations.filter((animation) => (
    animation.status === 'running'
    && animation.element.closest('[data-routeveil-shared-portal]') !== null
  ))
}

async function settleReact(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve()
    }

    await vi.advanceTimersByTimeAsync(0)
  })
}

async function flushFrames(
  harness: InterruptionHarness,
  count: number,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      harness.browser.flushFrame()
      await Promise.resolve()
    })
  }

  await settleReact()
}

async function finishAnimations(
  animations: readonly ControlledAnimation[],
): Promise<void> {
  await act(async () => {
    for (const animation of animations) {
      animation.finish()
    }

    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve()
    }
  })
}

function startTransition(harness: InterruptionHarness): TrackedPromise {
  fireEvent.click(screen.getByTestId('navigate-trigger'))
  return trackPromise(harness.activePromise())
}

async function reachTargetWait(
  harness: InterruptionHarness,
): Promise<TrackedPromise> {
  const tracked = startTransition(harness)
  const [exit] = runningViewAnimations(harness)
  expect(exit).toBeDefined()
  await finishAnimations([exit!])
  await flushFrames(harness, 2)
  return tracked
}

async function reachSharedMovement(
  harness: InterruptionHarness,
): Promise<{
  movements: ControlledAnimation[]
  tracked: TrackedPromise
}> {
  const tracked = await reachTargetWait(harness)
  await flushFrames(harness, 4)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500)
  })
  await settleReact()
  const movements = runningSharedAnimations(harness)
  expect(movements.length).toBeGreaterThan(0)
  return { movements, tracked }
}

function expectConnectedVisualsVisible(): void {
  for (const element of document.querySelectorAll<HTMLElement>(
    '[data-routeveil-interruption-real]',
  )) {
    expect(element.style.getPropertyValue('visibility')).not.toBe('hidden')
  }
}

function expectConnectedTargetsHidden(): void {
  const elements = document.querySelectorAll<HTMLElement>(
    '[data-routeveil-interruption-real]',
  )

  expect(elements.length).toBeGreaterThan(0)

  for (const element of elements) {
    expect(element.style.getPropertyValue('visibility')).toBe('hidden')
  }
}

function expectCleanHarness(
  harness: InterruptionHarness,
  pathname: string,
): void {
  const view = harness.view()
  expect(harness.location()).toBe(pathname)
  expect(view.dataset.routeveilPhase).toBe('idle')
  expect(view.style.getPropertyValue('opacity')).toBe('')
  expect(view.inert).toBe(false)
  expect(view).not.toHaveAttribute('data-routeveil-transitioning')
  expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
  expectConnectedVisualsVisible()
  expect(harness.browser.activeAnimations).toHaveLength(0)
  expect(harness.browser.pendingFrames).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
}

let activeHarness: InterruptionHarness | null = null

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  activeHarness?.rendered.unmount()
  activeHarness?.browser.restore()
  activeHarness = null
  vi.clearAllTimers()
  vi.useRealTimers()
})

function setup(options: HarnessOptions = {}): InterruptionHarness {
  activeHarness = createHarness(options)
  return activeHarness
}

describe('shared-element interruption matrix', () => {
  it('lets browser Back win during page exit without committing', async () => {
    const harness = setup()
    const tracked = startTransition(harness)
    const source = document.querySelector<HTMLElement>(
      '[data-routeveil-interruption-real^="source-"]',
    )
    const [exit] = runningViewAnimations(harness)

    expect(exit).toBeDefined()
    expect(source?.style.getPropertyValue('visibility')).toBe('hidden')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()

    await act(async () => {
      await harness.router.navigate(-1)
    })
    await settleReact()
    await act(async () => tracked.promise)

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(0)
    expect(source?.style.getPropertyValue('visibility')).toBe('')
    expect(exit?.animation.cancel).toHaveBeenCalled()
    expectCleanHarness(harness, '/history')

    exit?.finish()
    await settleReact()
    expect(harness.commitCount()).toBe(0)
    expectCleanHarness(harness, '/history')
  })

  it('clears target discovery when external navigation wins', async () => {
    const harness = setup({ targetPending: true })
    const tracked = await reachTargetWait(harness)

    expect(harness.location()).toBe('/target')
    expect(harness.commitCount()).toBe(1)
    expect(harness.view().dataset.routeveilPhase).toBe('navigating')
    expect(harness.view().style.getPropertyValue('opacity')).toBe('0')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()

    await act(async () => {
      await harness.router.navigate('/external-wait')
    })
    await settleReact()
    await act(async () => tracked.promise)

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(1)
    expectCleanHarness(harness, '/external-wait')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    await settleReact()
    expectCleanHarness(harness, '/external-wait')
  })

  it('keeps Back in control when shared movement resolves late', async () => {
    const harness = setup()
    const { movements, tracked } = await reachSharedMovement(harness)
    const [movement] = movements
    const target = document.querySelector<HTMLElement>(
      '[data-routeveil-interruption-real^="target-"]',
    )

    expect(movement).toBeDefined()
    expect(target?.style.getPropertyValue('visibility')).toBe('hidden')

    await act(async () => {
      await harness.router.navigate(-1)
    })
    await settleReact()
    await act(async () => tracked.promise)

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(1)
    expect(movement?.animation.cancel).toHaveBeenCalled()
    expect(target?.style.getPropertyValue('visibility')).toBe('')
    expectCleanHarness(harness, '/start')

    movement?.finish()
    await settleReact()
    expect(harness.commitCount()).toBe(1)
    expectCleanHarness(harness, '/start')
  })

  it('keeps external navigation in control while page enter resolves late', async () => {
    const harness = setup()
    const { movements, tracked } = await reachSharedMovement(harness)
    await finishAnimations(movements)
    const [enter] = runningViewAnimations(harness)

    expect(enter).toBeDefined()
    expect(harness.view().dataset.routeveilPhase).toBe('entering')
    expect(harness.view().style.getPropertyValue('opacity')).toBe('')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()
    expectConnectedTargetsHidden()

    await act(async () => {
      await harness.router.navigate('/external-enter')
    })
    await settleReact()
    await act(async () => tracked.promise)

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(1)
    expect(enter?.animation.cancel).toHaveBeenCalled()
    expectCleanHarness(harness, '/external-enter')

    enter?.finish()
    await settleReact()
    expect(harness.commitCount()).toBe(1)
    expectCleanHarness(harness, '/external-enter')
  })

  it('cleans up the final handoff when external navigation wins', async () => {
    const harness = setup()
    const { movements, tracked } = await reachSharedMovement(harness)
    await finishAnimations(movements)
    const [enter] = runningViewAnimations(harness)

    expect(enter).toBeDefined()
    await finishAnimations([enter!])
    await settleReact()

    const [handoff] = runningSharedAnimations(harness)
    const target = document.querySelector<HTMLElement>(
      '[data-routeveil-interruption-real^="target-"]',
    )

    expect(handoff).toBeDefined()
    expect(handoff?.options).toMatchObject({ duration: 64 })
    expect(target?.style.getPropertyValue('visibility')).toBe('')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()
    expect(tracked.status).toBe('pending')

    await act(async () => {
      await harness.router.navigate('/external-handoff')
    })
    await settleReact()
    await act(async () => tracked.promise)

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(1)
    expect(handoff?.animation.cancel).toHaveBeenCalled()
    expectCleanHarness(harness, '/external-handoff')

    handoff?.finish()
    await settleReact()
    expectCleanHarness(harness, '/external-handoff')
  })

  it('settles and restores target discovery when the provider unmounts', async () => {
    const harness = setup({ targetPending: true })
    const tracked = await reachTargetWait(harness)
    const view = harness.view()

    expect(view.style.getPropertyValue('opacity')).toBe('0')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()

    act(() => harness.rendered.unmount())
    await settleReact()
    await act(async () => tracked.promise)

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expect(view.style.getPropertyValue('opacity')).toBe('')
    expect(view.inert).toBe(false)
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(harness.browser.activeAnimations).toHaveLength(0)
    expect(harness.browser.pendingFrames).toBe(0)
    expect(vi.getTimerCount()).toBe(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    activeHarness = null
    harness.browser.restore()
  })

  it('settles through an incoming route render failure', async () => {
    const harness = setup({ incomingFailure: true })
    const tracked = startTransition(harness)
    const view = harness.view()
    const source = document.querySelector<HTMLElement>(
      '[data-routeveil-interruption-real^="source-"]',
    )
    const [exit] = runningViewAnimations(harness)

    expect(exit).toBeDefined()
    expect(source?.style.getPropertyValue('visibility')).toBe('hidden')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()

    await finishAnimations([exit!])
    await settleReact()
    await act(async () => tracked.promise)
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expect(screen.getByTestId('route-error')).toHaveTextContent(
      'Incoming route failed',
    )
    expect(document.querySelector('[data-routeveil-view]')).toBeNull()
    expect(document.querySelector(
      '[data-routeveil-interruption-real^="target-"]',
    )).toBeNull()
    expect(source?.style.getPropertyValue('visibility')).toBe('')
    expect(view.style.getPropertyValue('opacity')).toBe('')
    expect(view.inert).toBe(false)
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(harness.browser.activeAnimations).toHaveLength(0)
    expect(harness.browser.pendingFrames).toBe(0)
    expect(vi.getTimerCount()).toBe(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    await settleReact()
    expect(harness.commitCount()).toBe(1)
    expect(harness.router.state.location.pathname).toBe('/target')
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
  })

  it('waits for the remaining shared element after one movement rejects', async () => {
    const harness = setup({
      names: ['interruption-first', 'interruption-second'],
    })
    const { movements, tracked } = await reachSharedMovement(harness)

    expect(movements).toHaveLength(2)
    await act(async () => {
      movements[0].fail(new Error('First shared movement failed'))
      await Promise.resolve()
      await Promise.resolve()
    })
    await settleReact()

    expect(movements[0].status).toBe('rejected')
    expect(movements[1].status).toBe('running')
    expect(tracked.status).toBe('pending')
    expect(harness.view().dataset.routeveilPhase).toBe('navigating')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()

    await finishAnimations([movements[1]])
    const [enter] = runningViewAnimations(harness)
    expect(enter).toBeDefined()
    expect(harness.view().dataset.routeveilPhase).toBe('entering')
    expect(harness.view().style.getPropertyValue('opacity')).toBe('')
    expect(document.querySelector('[data-routeveil-shared-portal]')).not.toBeNull()
    expectConnectedTargetsHidden()

    await finishAnimations([enter!])
    await settleReact()
    await finishAnimations(runningSharedAnimations(harness))
    await act(async () => tracked.promise)
    await settleReact()

    expect(tracked.status).toBe('fulfilled')
    expect(harness.commitCount()).toBe(1)
    expectCleanHarness(harness, '/target')
  })
})
