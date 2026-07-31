import {
  useImperativeHandle,
  useLayoutEffect,
} from 'react'
import type { ComponentProps } from 'react'
import {
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
  useNavigate,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ClickPosition,
  OverlayAnimationHandle,
  OverlayRendererProps,
  PageTransitionDefinition,
  PageTransitionPhases,
  TransitionDefinition,
} from '../src/core'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
} from '../src/react-router'
import { useRouteveilContext } from '../src/react-router/RouteveilContext'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>
type LinkTransition = NonNullable<
  ComponentProps<typeof RouteveilLink>['transition']
>

type OverlayState = {
  cover: ReturnType<typeof vi.fn<() => Promise<void>>>
  rendered: {
    clickPosition?: ClickPosition
    options?: Record<string, unknown>
  } | null
  reset: ReturnType<typeof vi.fn<() => void>>
  reveal: ReturnType<typeof vi.fn<() => Promise<void>>>
}

type TransitionFixture = {
  browser: BrowserMocks
  fadeResolver: ReturnType<typeof vi.fn>
  overlay: OverlayState
  slideResolver: ReturnType<typeof vi.fn>
  view: RenderResult
}

const fadePhases = createPhases(0.11, 0.12)
const slideDefaultPhases = createPhases(0.21, 0.22)
const slideLeftPhases = createPhases(0.31, 0.32)
const slideRightPhases = createPhases(0.41, 0.42)

let browser: BrowserMocks

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

function readDirection(options: unknown): unknown {
  return typeof options === 'object' && options !== null
    ? Reflect.get(options, 'direction')
    : undefined
}

function createTransitionRegistry() {
  const fadeResolver = vi.fn(() => fadePhases)
  const slideResolver = vi.fn((options?: unknown) => {
    const direction = readDirection(options)

    return direction === 'left'
      ? slideLeftPhases
      : direction === 'right'
        ? slideRightPhases
        : slideDefaultPhases
  })
  const fade = {
    type: 'page',
    ...fadePhases,
    resolve: fadeResolver,
  } satisfies PageTransitionDefinition
  const slide = {
    type: 'page',
    ...slideDefaultPhases,
    resolve: slideResolver,
  } satisfies PageTransitionDefinition
  const overlay: OverlayState = {
    cover: vi.fn(() => Promise.resolve()),
    rendered: null,
    reset: vi.fn(),
    reveal: vi.fn(() => Promise.resolve()),
  }

  function TestOverlay({
    clickPosition,
    controllerRef,
    options,
  }: OverlayRendererProps<Record<string, unknown>>) {
    useImperativeHandle(controllerRef, (): OverlayAnimationHandle => ({
      cover: overlay.cover,
      reset: overlay.reset,
      reveal: overlay.reveal,
    }), [])
    useLayoutEffect(() => {
      overlay.rendered = { clickPosition, options }
    }, [clickPosition, options])

    return <div data-test-overlay="" />
  }

  const customOverlay = {
    type: 'overlay',
    renderer: TestOverlay,
  } satisfies TransitionDefinition<Record<string, unknown>>
  const transitions = {
    'custom-overlay': customOverlay,
    fade,
    slide,
  } satisfies Record<string, TransitionDefinition>

  return { fadeResolver, overlay, slideResolver, transitions }
}

function LocationPage() {
  const location = useLocation()

  return (
    <main>
      <output data-testid="location">{location.pathname}</output>
    </main>
  )
}

function PreloadedTransitionButton({
  preload,
  transition,
}: {
  preload: () => Promise<void>
  transition: LinkTransition
}) {
  const navigate = useNavigate()
  const { transitionTo } = useRouteveilContext()

  return (
    <button
      onClick={() => {
        void transitionTo({
          to: '/about',
          expectedPath: '/about',
          transition,
          commit: () => navigate('/about'),
          preload,
        })
      }}
      type="button"
    >
      About
    </button>
  )
}

function Fixture({
  preload,
  transition,
  transitions,
}: {
  preload?: () => Promise<void>
  transition: unknown
  transitions: Record<string, TransitionDefinition>
}) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <RouteveilProvider transitions={transitions}>
        {preload
          ? (
              <PreloadedTransitionButton
                preload={preload}
                transition={transition as LinkTransition}
              />
            )
          : (
              <RouteveilLink
                to="/about"
                transition={transition as LinkTransition}
              >
                About
              </RouteveilLink>
            )}
        <div data-testid="stage" style={{ overflowY: 'auto' }}>
          <RouteveilView style={{ visibility: 'visible' }}>
            <Routes>
              <Route path="/" element={<LocationPage />} />
              <Route path="/about" element={<LocationPage />} />
            </Routes>
          </RouteveilView>
        </div>
      </RouteveilProvider>
    </MemoryRouter>
  )
}

function renderFixture(
  transition: unknown,
  preload?: () => Promise<void>,
): TransitionFixture {
  const registry = createTransitionRegistry()
  const view = render(
    <Fixture
      preload={preload}
      transition={transition}
      transitions={registry.transitions}
    />,
  )

  return { browser, view, ...registry }
}

function createDeferredPreload() {
  let resolve!: () => void
  const promise = new Promise<void>((settle) => {
    resolve = settle
  })
  const preload = vi.fn(() => promise)

  return { preload, resolve }
}

async function expectPreloadKeepsOutgoingViewVisible(
  fixture: TransitionFixture,
  preload: ReturnType<typeof vi.fn<() => Promise<void>>>,
): Promise<void> {
  fireEvent.click(fixture.view.getByRole('button', { name: 'About' }))

  await waitFor(() => {
    expect(preload).toHaveBeenCalledOnce()
  })

  const routeView = fixture.view.container.querySelector<HTMLElement>(
    '[data-routeveil-view]',
  )!

  expect(fixture.view.getByTestId('location')).toHaveTextContent(/^\/$/)
  expect(routeView.style.visibility).toBe('visible')
  expect(document.documentElement).not.toHaveAttribute(
    'data-routeveil-page-animations-paused',
  )
  expect(
    document.querySelector('[data-routeveil-page-animation-pause]'),
  ).toBeNull()
}

async function completeNavigation(
  view: RenderResult,
  clickOptions: MouseEventInit = {},
): Promise<void> {
  fireEvent.click(view.getByRole('link', { name: 'About' }), {
    detail: 1,
    ...clickOptions,
  })

  await waitForNavigationCompletion(view)
}

async function waitForNavigationCompletion(view: RenderResult): Promise<void> {
  await waitFor(() => {
    expect(view.getByTestId('location')).toHaveTextContent('/about')
    expect(
      view.container.querySelector('[data-routeveil-view]'),
    ).toHaveAttribute('data-routeveil-phase', 'idle')
  })
}

function keyframesFor(animation: ControlledAnimation): Keyframe[] {
  return Array.isArray(animation.keyframes)
    ? animation.keyframes as Keyframe[]
    : []
}

function expectPagePhases(
  animations: readonly ControlledAnimation[],
  exitOpacity: number | null,
  enterOpacity: number | null,
): void {
  const exitAnimations = animations.filter((animation) => (
    animation.element.localName === 'routeveil-page-snapshot'
  ))
  const enterAnimations = animations.filter((animation) => (
    animation.element instanceof HTMLElement
    && animation.element.hasAttribute('data-routeveil-view')
  ))

  expect(exitAnimations.map((animation) => (
    keyframesFor(animation).at(-1)?.opacity
  ))).toEqual(exitOpacity === null ? [] : [exitOpacity])
  expect(enterAnimations.map((animation) => (
    keyframesFor(animation)[0]?.opacity
  ))).toEqual(enterOpacity === null ? [] : [enterOpacity])
}

function expectClean(view: RenderResult): void {
  const routeView = view.container.querySelector<HTMLElement>(
    '[data-routeveil-view]',
  )!
  const stage = view.getByTestId('stage')

  expect(routeView).toHaveAttribute('data-routeveil-phase', 'idle')
  expect(routeView).not.toHaveAttribute('aria-busy')
  expect(routeView).not.toHaveAttribute('data-routeveil-transitioning')
  expect(routeView.inert).toBe(false)
  expect(routeView.style.visibility).toBe('visible')
  expect(stage.style.overflowY).toBe('auto')
  expect(document.querySelector('routeveil-page-snapshot')).toBeNull()
  expect(document.querySelector('[data-routeveil-viewport-background]')).toBeNull()
  expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
  expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
  expect(document.documentElement).not.toHaveAttribute(
    'data-routeveil-page-animations-paused',
  )
  expect(
    document.querySelector('[data-routeveil-page-animation-pause]'),
  ).toBeNull()
}

beforeEach(() => {
  browser = installBrowserMocks()
  browser.setAnimationObserver(() => {
    queueMicrotask(() => {
      browser.animations.find((animation) => (
        animation.status === 'running'
      ))?.finish()
    })
  })
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
})

afterEach(() => {
  browser.restore()
  vi.restoreAllMocks()
})

describe('unified transition API provider execution', () => {
  it('uses both phases of a complete shorthand page transition', async () => {
    const fixture = renderFixture('fade')

    await completeNavigation(fixture.view)

    expect(fixture.fadeResolver).toHaveBeenCalledOnce()
    expect(fixture.fadeResolver).toHaveBeenCalledWith(undefined)
    expectPagePhases(fixture.browser.animations, 0.11, 0.12)
    expectClean(fixture.view)
  })

  it('passes flattened options to a complete page resolver and uses both phases', async () => {
    const fixture = renderFixture({
      name: 'slide',
      direction: 'left',
    })

    await completeNavigation(fixture.view)

    expect(fixture.slideResolver).toHaveBeenCalledOnce()
    expect(fixture.slideResolver).toHaveBeenCalledWith({ direction: 'left' })
    expectPagePhases(fixture.browser.animations, 0.31, 0.32)
    expectClean(fixture.view)
  })

  it('uses only the selected exit and enter phases from split shorthand', async () => {
    const fixture = renderFixture({
      exit: 'fade',
      enter: 'slide',
    })

    await completeNavigation(fixture.view)

    expect(fixture.fadeResolver).toHaveBeenCalledOnce()
    expect(fixture.slideResolver).toHaveBeenCalledOnce()
    expectPagePhases(fixture.browser.animations, 0.11, 0.22)
    expectClean(fixture.view)
  })

  it('uses independently configured split page phases', async () => {
    const fixture = renderFixture({
      exit: { name: 'slide', direction: 'left' },
      enter: { name: 'slide', direction: 'right' },
    })

    await completeNavigation(fixture.view)

    expect(fixture.slideResolver).toHaveBeenCalledTimes(2)
    expect(fixture.slideResolver).toHaveBeenNthCalledWith(1, {
      direction: 'left',
    })
    expect(fixture.slideResolver).toHaveBeenNthCalledWith(2, {
      direction: 'right',
    })
    expectPagePhases(fixture.browser.animations, 0.31, 0.42)
    expectClean(fixture.view)
  })

  it('runs an exit-only page transition and reveals without an enter animation', async () => {
    const fixture = renderFixture({ exit: 'fade' })

    await completeNavigation(fixture.view)

    expectPagePhases(fixture.browser.animations, 0.11, null)
    expectClean(fixture.view)
  })

  it('commits an enter-only page transition without an outgoing animation', async () => {
    const fixture = renderFixture({ enter: 'slide' })

    await completeNavigation(fixture.view)

    expectPagePhases(fixture.browser.animations, null, 0.22)
    expectClean(fixture.view)
  })

  it('keeps the outgoing page visible while an enter-only transition preloads', async () => {
    const deferred = createDeferredPreload()
    const fixture = renderFixture({ enter: 'slide' }, deferred.preload)

    await expectPreloadKeepsOutgoingViewVisible(fixture, deferred.preload)

    expect(fixture.browser.animations).toHaveLength(0)
    deferred.resolve()
    await waitForNavigationCompletion(fixture.view)

    expectPagePhases(fixture.browser.animations, null, 0.22)
    expectClean(fixture.view)
  })

  it('keeps the outgoing page visible while snapshot fallback preloads', async () => {
    const deferred = createDeferredPreload()
    const fixture = renderFixture(
      { exit: 'fade', enter: 'slide' },
      deferred.preload,
    )
    const routeView = fixture.view.container.querySelector<HTMLElement>(
      '[data-routeveil-view]',
    )!

    vi.spyOn(routeView, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    await expectPreloadKeepsOutgoingViewVisible(fixture, deferred.preload)

    expect(fixture.browser.animations).toHaveLength(0)
    expect(document.querySelector('routeveil-page-snapshot')).toBeNull()
    deferred.resolve()
    await waitForNavigationCompletion(fixture.view)

    expectPagePhases(fixture.browser.animations, null, 0.22)
    expectClean(fixture.view)
  })

  it('preserves cover and reveal for an overlay shorthand transition', async () => {
    const fixture = renderFixture('custom-overlay')

    await completeNavigation(fixture.view)

    expect(fixture.overlay.cover).toHaveBeenCalledOnce()
    expect(fixture.overlay.reveal).toHaveBeenCalledOnce()
    expect(fixture.overlay.reset).toHaveBeenCalledOnce()
    expect(fixture.overlay.rendered).toEqual({
      clickPosition: { x: 0, y: 0 },
      options: undefined,
    })
    expectPagePhases(fixture.browser.animations, null, null)
    expectClean(fixture.view)
  })

  it('passes flattened overlay options and click coordinates through cover and reveal', async () => {
    const fixture = renderFixture({
      name: 'custom-overlay',
      intensity: 0.75,
      color: '#111',
    })

    await completeNavigation(fixture.view, { clientX: 27, clientY: 43 })

    expect(fixture.overlay.cover).toHaveBeenCalledOnce()
    expect(fixture.overlay.reveal).toHaveBeenCalledOnce()
    expect(fixture.overlay.reset).toHaveBeenCalledOnce()
    expect(fixture.overlay.rendered).toEqual({
      clickPosition: { x: 27, y: 43 },
      options: { color: '#111', intensity: 0.75 },
    })
    expectClean(fixture.view)
  })

  it('navigates safely for unknown and invalid complete or split inputs', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const cases = [
      {
        enterOpacity: null,
        exitOpacity: null,
        transition: 'missing-complete',
        warning: 'missing-complete',
      },
      {
        enterOpacity: 0.22,
        exitOpacity: null,
        transition: { exit: 'missing-exit-runtime', enter: 'slide' },
        warning: 'missing-exit-runtime',
      },
      {
        enterOpacity: null,
        exitOpacity: 0.11,
        transition: { exit: 'fade', enter: 'missing-enter-runtime' },
        warning: 'missing-enter-runtime',
      },
      {
        enterOpacity: 0.22,
        exitOpacity: null,
        transition: { exit: 'custom-overlay', enter: 'slide' },
        warning: 'custom-overlay',
      },
      {
        enterOpacity: null,
        exitOpacity: 0.11,
        transition: { exit: 'fade', enter: 'custom-overlay' },
        warning: 'custom-overlay',
      },
      {
        enterOpacity: null,
        exitOpacity: null,
        transition: { exit: 'missing-both-runtime', enter: 'custom-overlay' },
        warning: 'missing-both-runtime',
      },
      {
        enterOpacity: null,
        exitOpacity: null,
        transition: {},
        warning: 'invalid',
      },
    ] as const

    for (const testCase of cases) {
      const animationStart = browser.animations.length
      const warningStart = warning.mock.calls.length
      const fixture = renderFixture(testCase.transition)

      await completeNavigation(fixture.view)

      expectPagePhases(
        browser.animations.slice(animationStart),
        testCase.exitOpacity,
        testCase.enterOpacity,
      )
      expect(
        warning.mock.calls.slice(warningStart).flat().join(' '),
      ).toContain(testCase.warning)
      expectClean(fixture.view)
      fixture.view.unmount()
    }
  })
})
