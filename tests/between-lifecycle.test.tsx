import {
  useImperativeHandle,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  OverlayAnimationHandle,
  OverlayRendererProps,
  PageTransitionDefinition,
  PageTransitionPhases,
  TransitionDefinition,
} from '../src/core'
import {
  RouteveilBetween,
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
} from '../src/react-router'
import type {
  RouteveilBetweenInput,
  RouteveilTransition,
} from '../src/react-router'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

type Deferred = {
  promise: Promise<void>
  resolve: () => void
}

type OverlayControl = {
  cover: ReturnType<typeof vi.fn<() => Promise<void>>>
  coverDeferred: Deferred
  reset: ReturnType<typeof vi.fn<() => void>>
  reveal: ReturnType<typeof vi.fn<() => Promise<void>>>
}

type Registry = {
  overlay: OverlayControl
  transitions: Record<string, TransitionDefinition>
}

type FixtureOptions = {
  between?: RouteveilBetweenInput
  destinationBetween?: ReactNode
  shared?: boolean
  transition: RouteveilTransition
}

const fadePhases = createPhases(0.11, 0.12)
const slidePhases = createPhases(0.21, 0.22)

let browser: BrowserMocks

function createDeferred(): Deferred {
  let resolve!: () => void
  const promise = new Promise<void>((settle) => {
    resolve = settle
  })

  return { promise, resolve }
}

function createPhases(
  exitOpacity: number,
  enterOpacity: number,
): PageTransitionPhases {
  return {
    exit: {
      keyframes: [{ opacity: 1 }, { opacity: exitOpacity }],
      options: { duration: 10 },
    },
    enter: {
      keyframes: [{ opacity: enterOpacity }, { opacity: 1 }],
      options: { duration: 10 },
    },
  }
}

function createRegistry(): Registry {
  const coverDeferred = createDeferred()
  const overlay: OverlayControl = {
    cover: vi.fn(() => coverDeferred.promise),
    coverDeferred,
    reset: vi.fn(),
    reveal: vi.fn(() => Promise.resolve()),
  }

  function TestOverlay({
    controllerRef,
  }: OverlayRendererProps<Record<string, unknown>>) {
    useImperativeHandle(controllerRef, (): OverlayAnimationHandle => ({
      cover: overlay.cover,
      reset: overlay.reset,
      reveal: overlay.reveal,
    }), [])

    return <div data-test-overlay="" />
  }

  const fade = {
    type: 'page',
    ...fadePhases,
  } satisfies PageTransitionDefinition
  const slide = {
    type: 'page',
    ...slidePhases,
  } satisfies PageTransitionDefinition
  const testOverlay = {
    type: 'overlay',
    renderer: TestOverlay,
  } satisfies TransitionDefinition<Record<string, unknown>>

  return {
    overlay,
    transitions: {
      fade,
      slide,
      'test-overlay': testOverlay,
    },
  }
}

function Page({ shared = false }: { shared?: boolean }) {
  const location = useLocation()
  const content = (
    <main data-page="">
      {location.pathname}
    </main>
  )

  return shared
    ? (
        <RouteveilSharedElement name="page">
          {content}
        </RouteveilSharedElement>
      )
    : content
}

function Fixture({
  between,
  destinationBetween,
  shared = false,
  transition,
  transitions,
}: FixtureOptions & {
  transitions: Record<string, TransitionDefinition>
}) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <RouteveilProvider transitions={transitions}>
        <RouteveilLink
          between={between}
          sharedElements={shared ? 'all' : undefined}
          to="/next"
          transition={transition}
        >
          Next
        </RouteveilLink>
        <div data-testid="stage" style={{ overflowY: 'auto' }}>
          <RouteveilView style={{ visibility: 'visible' }}>
            <Routes>
              <Route path="/" element={<Page shared={shared} />} />
              <Route
                path="/next"
                element={(
                  <>
                    {destinationBetween}
                    <Page shared={shared} />
                  </>
                )}
              />
            </Routes>
          </RouteveilView>
        </div>
      </RouteveilProvider>
    </MemoryRouter>
  )
}

function ControlledBetweenFixture({
  fallback = true,
  minDuration = 0,
  shared = false,
  startMounted = true,
  startWhile = true,
  transition = 'fade',
}: {
  fallback?: boolean
  minDuration?: number
  shared?: boolean
  startMounted?: boolean
  startWhile?: boolean
  transition?: RouteveilTransition
}) {
  const [registry] = useState(createRegistry)
  const [mounted, setMounted] = useState(startMounted)
  const [hold, setHold] = useState(startWhile)

  return (
    <>
      <button onClick={() => setHold(false)} type="button">
        Release between
      </button>
      <button onClick={() => setHold(true)} type="button">
        Hold between
      </button>
      <button onClick={() => setMounted(false)} type="button">
        Unmount between
      </button>
      <button onClick={() => setMounted(true)} type="button">
        Mount between
      </button>
      <Fixture
        between={fallback
          ? <span data-between-fallback="">Fallback</span>
          : undefined}
        destinationBetween={mounted
          ? (
              <RouteveilBetween
                content={<span data-between-incoming="">Incoming</span>}
                minDuration={minDuration}
                while={hold}
              />
            )
          : null}
        shared={shared}
        transition={transition}
        transitions={registry.transitions}
      />
    </>
  )
}

function renderFixture(options: FixtureOptions): {
  registry: Registry
  view: RenderResult
} {
  const registry = createRegistry()
  const view = render(
    <Fixture {...options} transitions={registry.transitions} />,
  )

  return { registry, view }
}

function installTestBrowser(reducedMotion = false): BrowserMocks {
  const installed = installBrowserMocks({ reducedMotion })

  installed.setAnimationObserver(() => {
    queueMicrotask(() => {
      installed.animations.find((animation) => (
        animation.status === 'running'
      ))?.finish()
    })
  })
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => window.setTimeout(
      () => callback(performance.now()),
      0,
    ),
  })
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    value: (handle: number) => window.clearTimeout(handle),
  })

  return installed
}

function runningAnimations(
  predicate: (animation: ControlledAnimation) => boolean = () => true,
): ControlledAnimation[] {
  return browser.animations.filter((animation) => (
    animation.status === 'running' && predicate(animation)
  ))
}

async function finishRunningAnimations(
  predicate: (animation: ControlledAnimation) => boolean = () => true,
): Promise<void> {
  await waitFor(() => {
    expect(runningAnimations(predicate).length).toBeGreaterThan(0)
  })

  await act(async () => {
    for (const animation of runningAnimations(predicate)) {
      animation.finish()
    }

    await Promise.resolve()
  })
}

function isBetweenAnimation(animation: ControlledAnimation): boolean {
  return animation.element.hasAttribute('data-routeveil-between-motion')
}

function keyframesFor(animation: ControlledAnimation): Keyframe[] {
  return Array.isArray(animation.keyframes)
    ? animation.keyframes as Keyframe[]
    : []
}

function lifecycleAnimations(animations: ControlledAnimation[]): Array<{
  firstOpacity: number | string | undefined
  kind: 'between' | 'enter' | 'exit'
  lastOpacity: number | string | undefined
}> {
  return animations.flatMap((animation) => {
    const keyframes = keyframesFor(animation)
    const kind = animation.element.localName === 'routeveil-page-snapshot'
      ? 'exit'
      : animation.element.hasAttribute('data-routeveil-between-motion')
        ? 'between'
        : animation.element.hasAttribute('data-routeveil-view')
          ? 'enter'
          : null

    return kind
      ? [{
          firstOpacity: keyframes[0]?.opacity,
          kind,
          lastOpacity: keyframes.at(-1)?.opacity,
        }]
      : []
  })
}

async function waitForIdle(view: RenderResult): Promise<void> {
  await waitFor(() => {
    expect(view.container.querySelector('[data-page]')).toHaveTextContent('/next')
    expect(view.container.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
    expect(document.querySelector('[data-routeveil-between-root]')).toBeNull()
  })
}

function expectClean(view: RenderResult): void {
  const routeView = view.container.querySelector<HTMLElement>(
    '[data-routeveil-view]',
  )!

  expect(routeView).toHaveAttribute('data-routeveil-phase', 'idle')
  expect(routeView).not.toHaveAttribute('aria-busy')
  expect(routeView.inert).toBe(false)
  expect(routeView.style.visibility).toBe('visible')
  expect(view.getByTestId('stage').style.overflowY).toBe('auto')
  expect(document.querySelector('routeveil-page-snapshot')).toBeNull()
  expect(document.querySelector('[data-routeveil-between-root]')).toBeNull()
  expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
  expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
}

beforeEach(() => {
  browser = installTestBrowser()
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 620,
    height: 600,
    left: 10,
    right: 810,
    top: 20,
    width: 800,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  } as DOMRect)
})

afterEach(() => {
  cleanup()
  browser.restore()
  vi.restoreAllMocks()
})

describe('between transition lifecycle', () => {
  it.each([
    {
      action: 'Release between',
      name: 'while becomes false',
    },
    {
      action: 'Unmount between',
      name: 'the registration unmounts',
    },
  ])('holds enter until $name', async ({ action }) => {
    const view = render(<ControlledBetweenFixture />)

    fireEvent.click(view.getByRole('link', { name: 'Next' }))

    await waitFor(() => {
      expect(view.container.querySelector('[data-page]')).toHaveTextContent('/next')
      expect(document.querySelector('[data-routeveil-between-root]'))
        .not.toBeNull()
      expect(view.container.querySelector('[data-routeveil-view]'))
        .toHaveAttribute('data-routeveil-phase', 'between')
    })

    expect(browser.animations.some((animation) => (
      animation.element.hasAttribute('data-routeveil-view')
    ))).toBe(false)

    fireEvent.click(view.getByRole('button', { name: action }))
    await waitForIdle(view)

    expect(browser.animations.some((animation) => (
      animation.element.hasAttribute('data-routeveil-view')
    ))).toBe(true)
    expectClean(view)
  })

  it('does not restart between when a released hold becomes true again', async () => {
    const view = render(<ControlledBetweenFixture />)

    fireEvent.click(view.getByRole('link', { name: 'Next' }))
    await waitFor(() => {
      expect(view.container.querySelector('[data-page]')).toHaveTextContent('/next')
      expect(view.container.querySelector('[data-routeveil-view]'))
        .toHaveAttribute('data-routeveil-phase', 'between')
    })

    browser.setAnimationObserver(null)
    fireEvent.click(view.getByRole('button', { name: 'Release between' }))
    await waitFor(() => {
      expect(runningAnimations(isBetweenAnimation)).toHaveLength(1)
    })
    fireEvent.click(view.getByRole('button', { name: 'Hold between' }))

    browser.setAnimationObserver(() => {
      queueMicrotask(() => {
        browser.animations.find((animation) => (
          animation.status === 'running'
        ))?.finish()
      })
    })
    await finishRunningAnimations(isBetweenAnimation)
    await waitForIdle(view)

    expect(browser.animations.filter(isBetweenAnimation)).toHaveLength(2)
    expectClean(view)
  })

  it('enforces the configured minimum before disappearance', async () => {
    const minimum = 120
    const startedAt = Date.now()
    const fixture = renderFixture({
      between: {
        content: <span data-between-fallback="">Fallback</span>,
        minDuration: minimum,
      },
      transition: 'fade',
    })

    fireEvent.click(fixture.view.getByRole('link', { name: 'Next' }))
    await waitForIdle(fixture.view)

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(minimum)
    expect(lifecycleAnimations(browser.animations).filter(({ kind }) => (
      kind === 'between'
    ))).toHaveLength(2)
    expectClean(fixture.view)
  })

  it('keeps between content and waiting rules under reduced motion', async () => {
    browser.restore()
    browser = installTestBrowser(true)
    const view = render(<ControlledBetweenFixture />)

    fireEvent.click(view.getByRole('link', { name: 'Next' }))

    await waitFor(() => {
      expect(view.container.querySelector('[data-page]')).toHaveTextContent('/next')
      expect(document.querySelector('[data-routeveil-between-root]'))
        .not.toBeNull()
    })
    expect(browser.animations).toHaveLength(0)

    fireEvent.click(view.getByRole('button', { name: 'Release between' }))
    await waitForIdle(view)

    expect(browser.animations).toHaveLength(0)
    expectClean(view)
  })

  it('maps complementary phases across a split page transition', async () => {
    const fixture = renderFixture({
      between: <span>Between</span>,
      transition: { exit: 'fade', enter: 'slide' },
    })

    fireEvent.click(fixture.view.getByRole('link', { name: 'Next' }))
    await waitForIdle(fixture.view)

    expect(lifecycleAnimations(browser.animations)).toEqual([
      { firstOpacity: 1, kind: 'exit', lastOpacity: 0.11 },
      { firstOpacity: 0.12, kind: 'between', lastOpacity: 1 },
      { firstOpacity: 1, kind: 'between', lastOpacity: 0.21 },
      { firstOpacity: 0.22, kind: 'enter', lastOpacity: 1 },
    ])
    expectClean(fixture.view)
  })

  it('uses a fallback disappearance for an exit-only page transition', async () => {
    const fixture = renderFixture({
      between: <span>Between</span>,
      transition: { exit: 'fade' },
    })

    fireEvent.click(fixture.view.getByRole('link', { name: 'Next' }))
    await waitForIdle(fixture.view)

    expect(lifecycleAnimations(browser.animations)).toEqual([
      { firstOpacity: 1, kind: 'exit', lastOpacity: 0.11 },
      { firstOpacity: 0.12, kind: 'between', lastOpacity: 1 },
      { firstOpacity: 1, kind: 'between', lastOpacity: 0 },
    ])
    expectClean(fixture.view)
  })

  it('uses a fallback appearance for an enter-only page transition', async () => {
    const fixture = renderFixture({
      between: <span>Between</span>,
      transition: { enter: 'slide' },
    })

    fireEvent.click(fixture.view.getByRole('link', { name: 'Next' }))
    await waitForIdle(fixture.view)

    expect(lifecycleAnimations(browser.animations)).toEqual([
      { firstOpacity: 0, kind: 'between', lastOpacity: 1 },
      { firstOpacity: 1, kind: 'between', lastOpacity: 0.21 },
      { firstOpacity: 0.22, kind: 'enter', lastOpacity: 1 },
    ])
    expectClean(fixture.view)
  })

  it('finishes cover before between and removes between before reveal', async () => {
    const fixture = renderFixture({
      between: <span data-between-fallback="">Between</span>,
      transition: 'test-overlay',
    })

    browser.setAnimationObserver(null)
    fireEvent.click(fixture.view.getByRole('link', { name: 'Next' }))

    await waitFor(() => {
      expect(fixture.registry.overlay.cover).toHaveBeenCalledOnce()
    })
    expect(document.querySelector('[data-routeveil-between-root]')).toBeNull()
    expect(fixture.view.container.querySelector('[data-page]'))
      .toHaveTextContent(/^\/$/)

    await act(async () => {
      fixture.registry.overlay.coverDeferred.resolve()
      await Promise.resolve()
    })
    await finishRunningAnimations(isBetweenAnimation)

    await waitFor(() => {
      expect(fixture.view.container.querySelector('[data-page]'))
        .toHaveTextContent('/next')
      expect(runningAnimations(isBetweenAnimation)).toHaveLength(1)
    })
    expect(fixture.registry.overlay.reveal).not.toHaveBeenCalled()
    expect(document.querySelector('[data-routeveil-between-root]'))
      .not.toBeNull()

    await finishRunningAnimations(isBetweenAnimation)
    await waitFor(() => {
      expect(fixture.registry.overlay.reveal).toHaveBeenCalledOnce()
    })
    await waitForIdle(fixture.view)

    expect(fixture.registry.overlay.reset).toHaveBeenCalledOnce()
    expectClean(fixture.view)
  })

  it('lets navigation-level between content disable shared movement', async () => {
    const fixture = renderFixture({
      between: <span>Between</span>,
      shared: true,
      transition: 'fade',
    })

    fireEvent.click(fixture.view.getByRole('link', { name: 'Next' }))
    await waitForIdle(fixture.view)

    expect(browser.animations.some((animation) => (
      animation.element.hasAttribute('data-routeveil-shared-element')
    ))).toBe(false)
    expect(browser.animations.filter(isBetweenAnimation)).toHaveLength(2)
    expectClean(fixture.view)
  })

  it('skips an incoming between registration after shared movement starts', async () => {
    const view = render(
      <ControlledBetweenFixture
        fallback={false}
        shared
        startMounted={false}
        startWhile={false}
      />,
    )

    browser.setAnimationObserver(null)
    fireEvent.click(view.getByRole('link', { name: 'Next' }))

    await finishRunningAnimations((animation) => (
      !animation.element.hasAttribute('data-routeveil-shared-element')
    ))
    await waitFor(() => {
      expect(runningAnimations((animation) => (
        animation.element.hasAttribute('data-routeveil-shared-element')
      )).length).toBeGreaterThan(0)
    })
    fireEvent.click(view.getByRole('button', { name: 'Mount between' }))

    await act(async () => Promise.resolve())
    expect(document.querySelector('[data-routeveil-between-root]')).toBeNull()

    browser.setAnimationObserver(() => {
      queueMicrotask(() => {
        browser.animations.find((animation) => (
          animation.status === 'running'
        ))?.finish()
      })
    })
    await act(async () => {
      for (const animation of runningAnimations()) {
        animation.finish()
      }

      await Promise.resolve()
    })
    await waitForIdle(view)

    expect(browser.animations.some((animation) => (
      animation.element.hasAttribute('data-routeveil-shared-element')
    ))).toBe(true)
    expect(browser.animations.some(isBetweenAnimation)).toBe(false)
    expectClean(view)
  })
})
