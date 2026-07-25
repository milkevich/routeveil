import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import type { Ref } from 'react'
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
import type { OverlayRendererProps } from '../src/core'
import {
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
} from '../src/react-router'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type Deferred = {
  promise: Promise<void>
  reject: (error?: unknown) => void
  resolve: () => void
}

type Rect = {
  left: number
  top: number
  width: number
  height: number
}

type SharedTag = 'button' | 'div' | 'h1' | 'img' | 'section' | 'span' | 'svg' | 'video'

type SharedSpec = {
  cloneThrows?: boolean
  documentPosition?: {
    left: number
    top: number
  }
  display?: 'none'
  inlineVisibility?: {
    priority?: string
    value: string
  }
  name: string
  rect: Rect
  tag: SharedTag
}

type HarnessOptions = {
  destination?: string
  hostTransform?: string
  persistentSiblings?: boolean
  preventScrollReset?: boolean
  reused?: {
    source: SharedSpec
    target: SharedSpec
  }
  scrollToSharedElement?: string
  sourceOutsideTrigger?: boolean
  sources: SharedSpec[]
  targetAncestorAnimation?: {
    currentOpacity: number
    terminalOpacity: number
  }
  targetAncestorTransition?: string
  targetDelayMs?: number
  targets: SharedSpec[]
  transition?: 'controlled-overlay' | 'controlled-page'
  smoothScrollToTop?: boolean
}

type BrowserMocks = ReturnType<typeof installBrowserMocks>

type SharedHarness = {
  activePromise: () => Promise<void>
  commitCount: () => number
  location: () => string
  overlay: {
    cover: Deferred
    coverCalls: number
    reset: ReturnType<typeof vi.fn>
    reveal: Deferred
    revealCalls: number
  }
  phase: () => string | undefined
  rendered: RenderResult
  router: ReturnType<typeof createMemoryRouter>
  view: () => HTMLElement
}

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
  }
}

function createDomRect(rect: Rect): DOMRect {
  return {
    bottom: rect.top + rect.height,
    height: rect.height,
    left: rect.left,
    right: rect.left + rect.width,
    top: rect.top,
    width: rect.width,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({ ...rect }),
  }
}

function SharedVisual({
  index,
  position,
  spec,
}: {
  index: number
  position: 'source' | 'target'
  spec: SharedSpec
}) {
  const setRect = useCallback((element: HTMLElement | SVGElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => createDomRect({
        ...spec.rect,
        left: spec.documentPosition
          ? spec.documentPosition.left - window.scrollX
          : spec.rect.left,
        top: spec.documentPosition
          ? spec.documentPosition.top - window.scrollY
          : spec.rect.top,
      })

      if (spec.cloneThrows) {
        Object.defineProperty(element, 'cloneNode', {
          configurable: true,
          value: () => {
            throw new Error('Target clone failed')
          },
        })
      }

      if (spec.inlineVisibility) {
        element.style.setProperty(
          'visibility',
          spec.inlineVisibility.value,
          spec.inlineVisibility.priority,
        )
      }
    }
  }, [
    spec.cloneThrows,
    spec.documentPosition,
    spec.inlineVisibility,
    spec.rect,
  ])
  const testId = `${position}-${spec.name}-${String(index)}`
  const style = {
    borderRadius: `${String(index + 4)}px`,
    display: spec.display,
  }

  const child = spec.tag === 'button'
    ? (
        <button
          ref={setRect as Ref<HTMLButtonElement>}
          data-testid={testId}
          style={style}
          type="button"
        >
          {`${position} ${spec.name}`}
        </button>
      )
    : spec.tag === 'div'
      ? (
          <div
            ref={setRect as Ref<HTMLDivElement>}
            data-testid={testId}
            style={style}
          >
            {`${position} ${spec.name}`}
          </div>
        )
      : spec.tag === 'img'
    ? (
        <img
          ref={setRect as Ref<HTMLImageElement>}
          alt={`${position} ${spec.name}`}
          data-testid={testId}
          src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
          style={style}
        />
      )
    : spec.tag === 'span'
      ? (
          <span
            ref={setRect as Ref<HTMLSpanElement>}
            data-testid={testId}
            style={style}
          >
            {`${position} ${spec.name}`}
          </span>
        )
      : spec.tag === 'section'
        ? (
            <section
              ref={setRect as Ref<HTMLElement>}
              data-testid={testId}
              style={style}
            >
              {`${position} ${spec.name}`}
            </section>
          )
        : spec.tag === 'svg'
          ? (
              <svg
                ref={setRect as Ref<SVGSVGElement>}
                aria-label={`${position} ${spec.name}`}
                data-testid={testId}
                style={style}
                viewBox="0 0 100 100"
              >
                <circle cx="50" cy="50" r="40" />
              </svg>
            )
          : spec.tag === 'video'
          ? (
              <video
                ref={setRect as Ref<HTMLVideoElement>}
                data-testid={testId}
                style={style}
              />
            )
          : (
              <h1
                ref={setRect as Ref<HTMLHeadingElement>}
                data-testid={testId}
                style={style}
              >
                {`${position} ${spec.name}`}
              </h1>
            )

  return (
    <RouteveilSharedElement name={spec.name}>
      {child}
    </RouteveilSharedElement>
  )
}

function DelayedTargets({ options }: { options: HarnessOptions }) {
  const [visible, setVisible] = useState(options.targetDelayMs === undefined)
  const setAnimatedAncestor = useCallback((element: HTMLDivElement | null) => {
    if (!element || !options.targetAncestorAnimation) {
      return
    }

    const { terminalOpacity } = options.targetAncestorAnimation
    element.getAnimations = () => [{
      effect: {
        getKeyframes: () => [
          { offset: 0, opacity: 0 },
          { offset: 1, opacity: terminalOpacity },
        ],
      },
    } as Animation]
  }, [options.targetAncestorAnimation])

  useEffect(() => {
    if (options.targetDelayMs === undefined) {
      return
    }

    const timer = window.setTimeout(() => {
      setVisible(true)
    }, options.targetDelayMs)

    return () => window.clearTimeout(timer)
  }, [options.targetDelayMs])

  if (!visible) {
    return null
  }

  const targets = options.targets.map((spec, index) => (
    <SharedVisual
      key={`target-${spec.name}-${String(index)}`}
      index={index}
      position="target"
      spec={spec}
    />
  ))

  return options.targetAncestorAnimation || options.targetAncestorTransition
    ? (
        <div
          ref={setAnimatedAncestor}
          data-testid="target-animation-ancestor"
          style={{
            opacity: options.targetAncestorAnimation?.currentOpacity,
            transition: options.targetAncestorTransition,
          }}
        >
          {targets}
        </div>
      )
    : targets
}

function renderHarness(options: HarnessOptions): SharedHarness {
  const overlay = {
    cover: createDeferred(),
    coverCalls: 0,
    reset: vi.fn(),
    reveal: createDeferred(),
    revealCalls: 0,
  }
  let activePromise: Promise<void> | null = null

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

  function RouteContent({ pathname }: { pathname: string }) {
    const navigate = useRouteveilNavigate()
    const play = useRouteveilTransition()

    if (options.reused) {
      const isSource = pathname === '/start'
      const spec = isSource ? options.reused.source : options.reused.target

      return (
        <main data-testid={isSource ? 'source-route' : 'target-route'}>
          <button
            data-testid="navigate-trigger"
            disabled={!isSource}
            type="button"
            onClick={(event) => {
              event.currentTarget.focus()
              activePromise = navigate(options.destination ?? '/target', {
                preventScrollReset: options.preventScrollReset,
                scrollToSharedElement: options.scrollToSharedElement,
                sharedElements: 'all',
                smoothScrollToTop: options.smoothScrollToTop,
                transition: options.transition ?? 'controlled-page',
              })
            }}
          >
            <SharedVisual
              index={0}
              position={isSource ? 'source' : 'target'}
              spec={spec}
            />
          </button>
        </main>
      )
    }

    if (pathname === '/start') {
      return (
        <main>
          {options.sourceOutsideTrigger
            ? options.sources.map((spec, index) => (
                <SharedVisual
                  key={`source-${spec.name}-${String(index)}`}
                  index={index}
                  position="source"
                  spec={spec}
                />
              ))
            : null}
          <button
            data-testid="navigate-trigger"
            type="button"
            onClick={(event) => {
              event.currentTarget.focus()
              activePromise = navigate(options.destination ?? '/target', {
                preventScrollReset: options.preventScrollReset,
                scrollToSharedElement: options.scrollToSharedElement,
                sharedElements: 'all',
                smoothScrollToTop: options.smoothScrollToTop,
                transition: options.transition ?? 'controlled-page',
              })
            }}
          >
            {options.sourceOutsideTrigger
              ? 'Navigate'
              : options.sources.map((spec, index) => (
                  <SharedVisual
                    key={`source-${spec.name}-${String(index)}`}
                    index={index}
                    position="source"
                    spec={spec}
                  />
                ))}
          </button>
          <button
            data-testid="play-trigger"
            type="button"
            onClick={() => {
              activePromise = play('controlled-page')
            }}
          >
            Play
          </button>
          <button
            data-testid="overlay-play-trigger"
            type="button"
            onClick={() => {
              activePromise = play('controlled-overlay')
            }}
          >
            Play overlay
          </button>
        </main>
      )
    }

    if (pathname === '/target') {
      return (
        <main data-testid="target-route">
          <DelayedTargets options={options} />
        </main>
      )
    }

    return <main data-testid="external-route">External route</main>
  }

  function App() {
    const location = useLocation()
    const routeLayer = (
      <>
        <output data-testid="location">{location.pathname}</output>
        {options.persistentSiblings
          ? (
              <header
                data-testid="persistent-header"
                style={{ position: 'relative', zIndex: 50 }}
              >
                Header
              </header>
            )
          : null}
        <RouteveilView
          style={options.persistentSiblings
            ? { position: 'relative', zIndex: 7 }
            : undefined}
        >
          <RouteContent pathname={location.pathname} />
        </RouteveilView>
        {options.persistentSiblings
          ? (
              <footer
                data-testid="persistent-footer"
                style={{ position: 'relative', zIndex: 50 }}
              >
                Footer
              </footer>
            )
          : null}
      </>
    )

    return (
      <RouteveilProvider
        transitions={{
          'controlled-overlay': {
            type: 'overlay',
            renderer: ControlledOverlay,
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
        {options.hostTransform
          ? <div style={{ transform: options.hostTransform }}>{routeLayer}</div>
          : routeLayer}
      </RouteveilProvider>
    )
  }

  const router = createMemoryRouter([
    {
      path: '*',
      element: <App />,
    },
  ], {
    initialEntries: ['/start'],
  })
  const navigateSpy = vi.spyOn(router, 'navigate')
  const rendered = render(<RouterProvider router={router} />)

  return {
    activePromise() {
      if (!activePromise) {
        throw new Error('No transition promise was captured')
      }

      return activePromise
    },
    commitCount() {
      return navigateSpy.mock.calls.filter(([to]) => (
        to === (options.destination ?? '/target')
      )).length
    },
    location() {
      return screen.getByTestId('location').textContent ?? ''
    },
    overlay,
    phase() {
      return this.view().dataset.routeveilPhase
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

let browser: BrowserMocks
let activeRender: RenderResult | null = null

beforeEach(() => {
  browser = installBrowserMocks({ settleAnimationOnCancel: true })
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  activeRender?.unmount()
  activeRender = null
  browser.restore()

  if (vi.isFakeTimers()) {
    vi.clearAllTimers()
    vi.useRealTimers()
  }
})

function setup(options: HarnessOptions): SharedHarness {
  const harness = renderHarness(options)
  activeRender = harness.rendered
  return harness
}

async function settleReact(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve()
    }

    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(0)
    }
  })
}

async function flushPaint(): Promise<void> {
  for (let index = 0; index < 2; index += 1) {
    await act(async () => {
      browser.flushFrame()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  await settleReact()
}

async function flushSingleFrame(): Promise<void> {
  await act(async () => {
    browser.flushFrame()

    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(16)
    }

    await Promise.resolve()
    await Promise.resolve()
  })
  await settleReact()
}

async function finishAnimations(
  animations: readonly ControlledAnimation[],
): Promise<void> {
  await act(async () => {
    for (const animation of animations) {
      animation.finish()
    }

    await Promise.all(animations.map(async (animation) => {
      try {
        await animation.animation.finished
      } catch {
        return
      }
    }))

    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve()
    }
  })
}

function runningAnimations(): ControlledAnimation[] {
  return browser.animations.filter((animation) => animation.status === 'running')
}

function runningViewAnimations(): ControlledAnimation[] {
  return runningAnimations().filter((animation) => (
    animation.element.hasAttribute('data-routeveil-view')
  ))
}

function runningSharedAnimations(): ControlledAnimation[] {
  return runningAnimations().filter((animation) => (
    animation.element.closest('[data-routeveil-shared-portal]') !== null
  ))
}

function sharedPortal(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-routeveil-shared-portal]')
}

function sharedWrapper(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-routeveil-shared-element="${name}"]`,
  )
}

function startNavigation(harness: SharedHarness): ControlledAnimation {
  fireEvent.click(screen.getByTestId('navigate-trigger'))
  const [exit] = runningViewAnimations()

  expect(exit).toBeDefined()
  expect(harness.phase()).toBe('exiting')
  return exit!
}

async function reachSharedMovement(
  harness: SharedHarness,
): Promise<ControlledAnimation[]> {
  const exit = startNavigation(harness)
  await finishAnimations([exit])
  await flushPaint()
  await flushPaint()
  await flushPaint()

  if (vi.isFakeTimers()) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    await settleReact()
  }

  return runningSharedAnimations()
}

async function finishEnter(harness: SharedHarness): Promise<void> {
  const [enter] = runningViewAnimations()
  expect(enter).toBeDefined()
  await finishAnimations([enter!])
  await settleReact()

  const handoffAnimations = runningSharedAnimations()

  if (handoffAnimations.length > 0) {
    await finishAnimations(handoffAnimations)
  }

  for (let index = 0; index < 20 && browser.pendingFrames === 0; index += 1) {
    await settleReact()
  }

  await flushSingleFrame()
  await flushSingleFrame()
  await act(async () => harness.activePromise())
  await settleReact()
  expect(harness.phase()).toBe('idle')
}

function expectCleanSharedState(harness: SharedHarness): void {
  expect(sharedPortal()).toBeNull()
  expect(harness.view().style.getPropertyValue('opacity')).toBe('')
  expect(harness.view()).not.toHaveAttribute('data-routeveil-transitioning')
  expect(harness.view().inert).toBe(false)
  expect(browser.activeAnimations).toHaveLength(0)
  expect(browser.pendingFrames).toBe(0)
}

describe('shared-element lifecycle', () => {
  it('keeps the shared portal inside the route view paint order', () => {
    const name = 'persistent-stack-image'
    const harness = setup({
      persistentSiblings: true,
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 180, top: 40, width: 280, height: 210 },
        tag: 'img',
      }],
    })

    startNavigation(harness)

    const view = harness.view()
    const portal = sharedPortal()
    const header = screen.getByTestId('persistent-header')
    const footer = screen.getByTestId('persistent-footer')

    if (!portal || !view.parentElement) {
      throw new Error('The shared portal did not start beside the route view')
    }

    expect(portal.parentElement).toBe(view.parentElement)
    expect(view.nextElementSibling).toBe(portal)
    expect(portal.nextElementSibling).toBe(footer)
    expect(header.compareDocumentPosition(view) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
    expect(view.compareDocumentPosition(portal) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
    expect(portal.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
    expect(portal.style.getPropertyValue('z-index')).toBe('7')
    expect(portal.style.getPropertyValue('z-index')).not.toBe('2147483646')
    expect(Number.parseInt(getComputedStyle(header).zIndex, 10))
      .toBeGreaterThan(Number.parseInt(getComputedStyle(portal).zIndex, 10))
    expect(Number.parseInt(getComputedStyle(footer).zIndex, 10))
      .toBeGreaterThan(Number.parseInt(getComputedStyle(portal).zIndex, 10))
  })

  it('rebases the initial clone against a nonzero portal origin', () => {
    const portalOrigin = {
      left: 80,
      top: 60,
    }
    const originalGetBoundingClientRect =
      HTMLElement.prototype.getBoundingClientRect

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingClientRect() {
        if (this.hasAttribute('data-routeveil-shared-portal')) {
          return createDomRect({
            height: 600,
            left: portalOrigin.left,
            top: portalOrigin.top,
            width: 800,
          })
        }

        return originalGetBoundingClientRect.call(this)
      })

    const name = 'offset-portal-image'
    const harness = setup({
      persistentSiblings: true,
      sources: [{
        name,
        rect: { left: 124, top: 220, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 180, top: 40, width: 280, height: 210 },
        tag: 'img',
      }],
    })

    startNavigation(harness)

    expect(sharedWrapper(name)).toHaveStyle({
      left: '44px',
      top: '160px',
    })
  })

  it('skips shared movement in an unsupported transformed host', () => {
    const name = 'transformed-host-image'
    const harness = setup({
      hostTransform: 'scale(1.5)',
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 180, top: 40, width: 280, height: 210 },
        tag: 'img',
      }],
    })

    startNavigation(harness)

    expect(sharedPortal()).toBeNull()
    expect(runningViewAnimations()).toHaveLength(1)
  })

  it('re-registers one reused DOM node as the incoming target', async () => {
    const name = 'reused-location-node'
    const harness = setup({
      reused: {
        source: {
          name,
          rect: { left: 24, top: 420, width: 120, height: 32 },
          tag: 'span',
        },
        target: {
          name,
          rect: { left: 180, top: 40, width: 280, height: 48 },
          tag: 'span',
        },
      },
      sources: [],
      targets: [],
    })
    const source = screen.getByTestId(`source-${name}-0`)
    const movements = await reachSharedMovement(harness)
    const target = harness.view().querySelector<HTMLElement>(
      `[data-testid="target-${name}-0"]`,
    )

    if (!target) {
      throw new Error('The reused target was not mounted')
    }

    expect(target).toBe(source)
    const [geometry] = movements.filter((animation) => (
      animation.element === sharedWrapper(name)
    ))
    expect(geometry).toBeDefined()
    expect(geometry!.keyframes).toEqual([
      {
        borderRadius: '4px',
        height: '32px',
        left: '24px',
        top: '420px',
        width: '120px',
      },
      {
        borderRadius: '4px',
        height: '48px',
        left: '180px',
        top: '40px',
        width: '280px',
      },
    ])

    await finishAnimations(movements)
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('orders exit, commit, stationary shared movement, handoff, and enter', async () => {
    const name = 'order-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 180, top: 40, width: 280, height: 210 },
        tag: 'img',
      }],
    })
    const source = screen.getByTestId(`source-${name}-0`)
    const exit = startNavigation(harness)
    const portal = sharedPortal()
    const wrapper = sharedWrapper(name)

    expect(portal).not.toBeNull()
    expect(wrapper).not.toBeNull()
    expect(source.style.getPropertyValue('visibility')).toBe('hidden')
    expect(source.style.getPropertyPriority('visibility')).toBe('important')
    expect(wrapper).toHaveStyle({
      height: '90px',
      left: '24px',
      top: '420px',
      width: '120px',
    })
    expect(harness.location()).toBe('/start')
    expect(harness.commitCount()).toBe(0)
    expect(runningSharedAnimations()).toHaveLength(0)

    await settleReact()

    expect(wrapper).toHaveStyle({ left: '24px', top: '420px' })
    expect(harness.location()).toBe('/start')
    expect(runningSharedAnimations()).toHaveLength(0)

    await finishAnimations([exit])

    expect(harness.location()).toBe('/target')
    expect(harness.commitCount()).toBe(1)
    expect(harness.phase()).toBe('navigating')
    expect(harness.view().style.getPropertyValue('opacity')).toBe('0')
    expect(screen.getByTestId(`target-${name}-0`).style.visibility).toBe('')
    expect(wrapper).toHaveStyle({ left: '24px', top: '420px' })
    expect(runningSharedAnimations()).toHaveLength(0)

    await flushPaint()

    const movements = runningSharedAnimations()
    const target = screen.getByTestId(`target-${name}-0`)
    expect(movements).toHaveLength(1)
    expect(movements[0].element).toBe(wrapper)
    expect(movements[0].keyframes).toEqual([
      {
        borderRadius: '4px',
        height: '90px',
        left: '24px',
        top: '420px',
        width: '120px',
      },
      {
        borderRadius: '4px',
        height: '210px',
        left: '180px',
        top: '40px',
        width: '280px',
      },
    ])
    expect(harness.phase()).toBe('navigating')
    expect(harness.view().style.getPropertyValue('opacity')).toBe('0')
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(runningViewAnimations()).toHaveLength(0)

    const view = harness.view()
    const enterCreationStates: Array<{
      portalConnected: boolean
      targetVisibility: string
      viewOpacity: string
    }> = []
    browser.setAnimationObserver((element) => {
      if (element !== view) {
        return
      }

      enterCreationStates.push({
        portalConnected: Boolean(sharedPortal()?.isConnected),
        targetVisibility: target.style.getPropertyValue('visibility'),
        viewOpacity: view.style.getPropertyValue('opacity'),
      })
    })

    await finishAnimations(movements)

    expect(movements[0].animation.cancel).not.toHaveBeenCalled()
    expect(harness.phase()).toBe('entering')
    expect(enterCreationStates).toEqual([{
      portalConnected: true,
      targetVisibility: 'hidden',
      viewOpacity: '0',
    }])
    expect(sharedPortal()).not.toBeNull()
    expect(harness.view().style.getPropertyValue('opacity')).toBe('')
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(wrapper).toHaveStyle({
      height: '90px',
      left: '24px',
      top: '420px',
      width: '120px',
    })
    expect(runningViewAnimations()).toHaveLength(1)

    const retainedPortal = sharedPortal()

    if (!retainedPortal) {
      throw new Error('The shared portal was not retained through enter')
    }

    const removePortal = retainedPortal.remove.bind(retainedPortal)
    const targetVisibilityAtPortalRemoval: string[] = []
    vi.spyOn(retainedPortal, 'remove').mockImplementation(() => {
      targetVisibilityAtPortalRemoval.push(
        target.style.getPropertyValue('visibility'),
      )
      removePortal()
    })

    const [enter] = runningViewAnimations()
    expect(enter).toBeDefined()
    await finishAnimations([enter!])

    expect(harness.commitCount()).toBe(1)
    expect(target.style.getPropertyValue('visibility')).toBe('')
    expect(sharedPortal()).not.toBeNull()
    expect(targetVisibilityAtPortalRemoval).toEqual([])

    const [handoff] = runningSharedAnimations()
    expect(handoff?.element).toBe(wrapper)
    expect(handoff?.keyframes).toEqual([
      { opacity: 1 },
      { opacity: 0 },
    ])
    expect(handoff?.options).toMatchObject({
      duration: 64,
      easing: 'linear',
      fill: 'forwards',
    })
    await finishAnimations([handoff!])
    await act(async () => harness.activePromise())
    await settleReact()

    expect(targetVisibilityAtPortalRemoval).toEqual([''])
    expect(movements[0].animation.cancel).toHaveBeenCalledTimes(1)
    expect(target.style.getPropertyValue('visibility')).toBe('')
    expectCleanSharedState(harness)
  })

  it('moves immediately to a target under a delayed opacity animation', async () => {
    const name = 'animated-opacity-target'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 32 },
        tag: 'span',
      }],
      targetAncestorAnimation: {
        currentOpacity: 0,
        terminalOpacity: 1,
      },
      targets: [{
        name,
        rect: { left: 180, top: 40, width: 280, height: 48 },
        tag: 'h1',
      }],
    })
    const movements = await reachSharedMovement(harness)
    const wrapper = sharedWrapper(name)
    const target = screen.getByTestId(`target-${name}-0`)

    expect(movements.some((animation) => animation.element === wrapper)).toBe(true)
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')

    await finishAnimations(movements)

    const targetClone = wrapper?.querySelector<HTMLElement>('h1')

    expect(harness.phase()).toBe('entering')
    expect(sharedPortal()).not.toBeNull()
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(targetClone?.style.opacity).toBe('0')
    expect(movements.find((animation) => animation.element === targetClone)
      ?.keyframes).toEqual([
        {
          borderRadius: '4px',
          offset: 0,
          opacity: 0,
        },
        {
          borderRadius: '4px',
          offset: 0.68,
          opacity: 0,
        },
        {
          borderRadius: '4px',
          offset: 1,
          opacity: 1,
        },
      ])

    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('does not toggle inherited visibility around a transition-all target ancestor', async () => {
    const name = 'transition-all-target'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 32 },
        tag: 'img',
      }],
      targetAncestorTransition: 'all 200ms ease',
      targets: [{
        name,
        rect: { left: 180, top: 40, width: 280, height: 48 },
        tag: 'img',
      }],
    })
    const exit = startNavigation(harness)

    await finishAnimations([exit])

    expect(harness.location()).toBe('/target')
    expect(screen.getByTestId('target-animation-ancestor')).toHaveStyle({
      transition: 'all 200ms ease',
    })
    expect(harness.view().style.getPropertyValue('opacity')).toBe('0')
    expect(harness.view().style.getPropertyValue('visibility')).toBe('')

    await flushPaint()

    const movements = runningSharedAnimations()
    expect(movements.some((animation) => (
      animation.element === sharedWrapper(name)
    ))).toBe(true)

    await finishAnimations(movements)
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('keeps the movement endpoint aligned while the document scrolls', async () => {
    let scrollX = 30
    let scrollY = 120
    vi.spyOn(window, 'scrollX', 'get').mockImplementation(() => scrollX)
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    const name = 'document-anchored-target'
    const documentLeft = 210
    const documentTop = 160
    const sourceDocumentLeft = 54
    const sourceDocumentTop = 540
    const rootDocumentLeft = 14
    const rootDocumentTop = 22
    const harness = setup({
      sources: [{
        documentPosition: {
          left: sourceDocumentLeft,
          top: sourceDocumentTop,
        },
        name,
        rect: { left: 24, top: 420, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        documentPosition: {
          left: documentLeft,
          top: documentTop,
        },
        name,
        rect: { left: 180, top: 40, width: 280, height: 210 },
        tag: 'img',
      }],
    })
    const exit = startNavigation(harness)
    const portal = sharedPortal()
    const wrapper = sharedWrapper(name)

    if (!portal || !wrapper) {
      throw new Error('The shared portal did not start')
    }

    portal.getBoundingClientRect = () => createDomRect({
      height: 0,
      left: rootDocumentLeft - scrollX,
      top: rootDocumentTop - scrollY,
      width: window.innerWidth,
    })

    expect(portal.style.position).toBe('fixed')
    expect(wrapper.style.position).toBe('fixed')

    scrollX = 48
    scrollY = 190
    window.dispatchEvent(new Event('scroll'))
    expect(wrapper.style.left).toBe('40px')
    expect(wrapper.style.top).toBe('518px')

    await finishAnimations([exit])
    await flushPaint()

    const movements = runningSharedAnimations()
    const target = screen.getByTestId(`target-${name}-0`)
    const geometry = movements.find((animation) => animation.element === wrapper)

    expect(geometry?.keyframes).toEqual([
      {
        borderRadius: '4px',
        height: '90px',
        left: '40px',
        top: '518px',
        width: '120px',
      },
      {
        borderRadius: '4px',
        height: '210px',
        left: '196px',
        top: '138px',
        width: '280px',
      },
    ])
    expect(portal.style.position).toBe('absolute')
    expect(portal.style.overflow).toBe('visible')
    expect(portal.style.contain).toBe('none')
    expect(wrapper.style.position).toBe('absolute')
    expect(wrapper.style.getPropertyPriority('left')).toBe('')
    expect(wrapper.style.getPropertyPriority('top')).toBe('')
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')

    const expectEndpointAligned = () => {
      const portalRect = portal.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const keyframes = geometry?.keyframes as Keyframe[] | undefined
      const endpoint = keyframes?.at(-1)

      expect(portalRect.left + Number.parseFloat(String(endpoint?.left)))
        .toBe(targetRect.left)
      expect(portalRect.top + Number.parseFloat(String(endpoint?.top)))
        .toBe(targetRect.top)
    }

    expectEndpointAligned()
    scrollX = 70
    scrollY = 230
    expectEndpointAligned()
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    await finishAnimations(movements)

    expect(harness.phase()).toBe('entering')
    expect(portal.style.position).toBe('absolute')
    expect(portal.style.overflow).toBe('visible')
    expect(portal.style.contain).toBe('none')
    expect(wrapper.style.position).toBe('absolute')
    expect(wrapper.style.left).toBe('40px')
    expect(wrapper.style.top).toBe('518px')
    expect(wrapper.style.width).toBe('120px')
    expect(wrapper.style.height).toBe('90px')
    expect(wrapper.style.getPropertyPriority('left')).toBe('')
    expect(wrapper.style.getPropertyPriority('top')).toBe('')
    expect(geometry?.animation.cancel).not.toHaveBeenCalled()
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')

    expectEndpointAligned()
    scrollX = 55
    scrollY = 260
    expectEndpointAligned()
    expect(portal.isConnected).toBe(true)
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')

    await finishEnter(harness)
    expectCleanSharedState(harness)
    expect(portal.isConnected).toBe(false)
    expect(target.style.getPropertyValue('visibility')).toBe('')
  })

  it.each([
    {
      label: 'button to image',
      sourceOutsideTrigger: true,
      sourceTag: 'button' as const,
      targetTag: 'img' as const,
    },
    {
      label: 'heading to container',
      sourceOutsideTrigger: false,
      sourceTag: 'h1' as const,
      targetTag: 'section' as const,
    },
    {
      label: 'same-type card to card',
      sourceOutsideTrigger: false,
      sourceTag: 'div' as const,
      targetTag: 'div' as const,
    },
    {
      label: 'SVG to SVG',
      sourceOutsideTrigger: false,
      sourceTag: 'svg' as const,
      targetTag: 'svg' as const,
    },
  ])('completes $label geometry and handoff', async ({
    label,
    sourceOutsideTrigger,
    sourceTag,
    targetTag,
  }) => {
    const name = `shape-${label.replaceAll(' ', '-').toLowerCase()}`
    const sourceRect = { left: 24, top: 360, width: 132, height: 76 }
    const targetRect = { left: 188, top: 48, width: 286, height: 194 }
    const harness = setup({
      sourceOutsideTrigger,
      sources: [{ name, rect: sourceRect, tag: sourceTag }],
      targets: [{ name, rect: targetRect, tag: targetTag }],
    })
    const movements = await reachSharedMovement(harness)
    const wrapper = sharedWrapper(name)
    const target = harness.view().querySelector<HTMLElement | SVGElement>(
      `[data-testid="target-${name}-0"]`,
    )

    if (!target) {
      throw new Error(`The ${label} target was not mounted`)
    }

    const geometry = movements.find((animation) => (
      animation.element === wrapper
    ))

    expect(geometry).toBeDefined()
    expect(geometry?.keyframes).toEqual([
      {
        borderRadius: '4px',
        height: '76px',
        left: '24px',
        top: '360px',
        width: '132px',
      },
      {
        borderRadius: '4px',
        height: '194px',
        left: '188px',
        top: '48px',
        width: '286px',
      },
    ])
    expect(wrapper?.querySelector(sourceTag)).not.toBeNull()
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(harness.phase()).toBe('navigating')
    expect(runningViewAnimations()).toHaveLength(0)

    await finishAnimations(movements)

    expect(sharedPortal()).not.toBeNull()
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(harness.phase()).toBe('entering')
    expect(runningViewAnimations()).toHaveLength(1)

    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('centers one named target before measuring every shared endpoint', async () => {
    browser.restore()
    browser = installBrowserMocks({
      retainFinishedAnimations: true,
      settleAnimationOnCancel: true,
    })
    let scrollX = 37
    let scrollY = 900
    vi.spyOn(window, 'scrollX', 'get').mockImplementation(() => scrollX)
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(4_000)
    browser.scrollTo.mockImplementation((options: ScrollToOptions) => {
      scrollX = options.left ?? scrollX
      scrollY = options.top ?? scrollY
    })
    const anchorName = 'centered-artwork'
    const distantName = 'distant-title'
    const harness = setup({
      preventScrollReset: true,
      scrollToSharedElement: ` ${anchorName} `,
      smoothScrollToTop: true,
      sources: [
        {
          documentPosition: { left: 44, top: 1_020 },
          name: anchorName,
          rect: { left: 44, top: 120, width: 120, height: 90 },
          tag: 'img',
        },
        {
          documentPosition: { left: 220, top: 1_180 },
          name: distantName,
          rect: { left: 220, top: 280, width: 180, height: 60 },
          tag: 'h1',
        },
      ],
      targets: [
        {
          documentPosition: { left: 180, top: 1_800 },
          name: anchorName,
          rect: { left: 180, top: 900, width: 280, height: 200 },
          tag: 'img',
        },
        {
          documentPosition: { left: 80, top: 2_800 },
          name: distantName,
          rect: { left: 80, top: 1_900, width: 360, height: 100 },
          tag: 'h1',
        },
      ],
    })
    const movements = await reachSharedMovement(harness)

    expect(browser.scrollTo).toHaveBeenCalledTimes(1)
    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 37,
      top: 1_500,
    })
    expect(scrollX).toBe(37)
    expect(scrollY).toBe(1_500)
    expect(movements.some((animation) => (
      animation.element === sharedWrapper(anchorName)
    ))).toBe(true)
    expect(movements.some((animation) => (
      animation.element === sharedWrapper(distantName)
    ))).toBe(true)
    expect(screen.getByTestId(`target-${anchorName}-0`).getBoundingClientRect().top)
      .toBe(300)
    expect(screen.getByTestId(`target-${distantName}-1`).getBoundingClientRect().top)
      .toBe(1_300)

    await finishAnimations(movements)
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('re-centers a named target after a delayed incoming layout shift', async () => {
    let scrollX = 23
    let scrollY = 900
    let layoutShiftScheduled = false
    const targetPosition = { left: 180, top: 1_800 }
    vi.spyOn(window, 'scrollX', 'get').mockImplementation(() => scrollX)
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(4_000)
    browser.scrollTo.mockImplementation((options: ScrollToOptions) => {
      scrollX = options.left ?? scrollX
      scrollY = options.top ?? scrollY

      if (!layoutShiftScheduled) {
        layoutShiftScheduled = true
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            targetPosition.top += 160
          })
        })
      }
    })
    const name = 'shifting-centered-artwork'
    const harness = setup({
      preventScrollReset: true,
      scrollToSharedElement: name,
      sources: [{
        documentPosition: { left: 44, top: 1_020 },
        name,
        rect: { left: 44, top: 120, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        documentPosition: targetPosition,
        name,
        rect: { left: 180, top: 900, width: 280, height: 200 },
        tag: 'img',
      }],
    })
    await reachSharedMovement(harness)
    await flushPaint()
    const movements = runningSharedAnimations()

    expect(movements).not.toHaveLength(0)
    expect(browser.scrollTo).toHaveBeenNthCalledWith(1, {
      behavior: 'instant',
      left: 23,
      top: 1_500,
    })
    expect(browser.scrollTo).toHaveBeenNthCalledWith(2, {
      behavior: 'instant',
      left: 23,
      top: 1_660,
    })
    expect(scrollY).toBe(1_660)
    expect(screen.getByTestId(`target-${name}-0`).getBoundingClientRect().top)
      .toBe(300)

    await finishAnimations(movements)
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('falls back safely when the named target is missing', async () => {
    vi.useFakeTimers()
    const warn = vi.mocked(console.warn)
    const name = 'available-scroll-target'
    const harness = setup({
      preventScrollReset: true,
      scrollToSharedElement: 'missing-scroll-target',
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 180, top: 40, width: 280, height: 210 },
        tag: 'img',
      }],
    })
    const exit = startNavigation(harness)

    await finishAnimations([exit])
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(121)
    })
    await settleReact()

    const movements = runningSharedAnimations()
    expect(movements).not.toHaveLength(0)
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(
      'No measurable incoming shared element named “missing-scroll-target”',
    ))

    await finishAnimations(movements)
    harness.rendered.unmount()
    activeRender = null
    await settleReact()
    expect(sharedPortal()).toBeNull()
    expect(browser.activeAnimations).toHaveLength(0)
    expect(browser.pendingFrames).toBe(0)
  })

  it('centers the named target without animation under reduced motion', async () => {
    browser.restore()
    browser = installBrowserMocks({ reducedMotion: true })
    let scrollX = 19
    let scrollY = 0
    vi.spyOn(window, 'scrollX', 'get').mockImplementation(() => scrollX)
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(3_000)
    browser.scrollTo.mockImplementation((options: ScrollToOptions) => {
      scrollX = options.left ?? scrollX
      scrollY = options.top ?? scrollY
    })
    const name = 'reduced-motion-anchor'
    const harness = setup({
      scrollToSharedElement: name,
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        documentPosition: { left: 180, top: 1_600 },
        name,
        rect: { left: 180, top: 1_600, width: 280, height: 200 },
        tag: 'img',
      }],
    })

    fireEvent.click(screen.getByTestId('navigate-trigger'))
    expect(runningAnimations()).toHaveLength(0)

    await flushPaint()
    await flushPaint()
    await act(async () => harness.activePromise())
    await settleReact()

    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 19,
      top: 1_300,
    })
    expect(scrollX).toBe(19)
    expect(scrollY).toBe(1_300)
    expect(runningAnimations()).toHaveLength(0)
    expectCleanSharedState(harness)
  })

  it('waits for hash scrolling to stabilize before measuring the target', async () => {
    vi.useFakeTimers()
    let scrollX = 0
    let scrollY = 0
    vi.spyOn(window, 'scrollX', 'get').mockImplementation(() => scrollX)
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    const name = 'hash-scroll-target'
    const harness = setup({
      destination: '/target#concept',
      scrollToSharedElement: name,
      sources: [{
        name,
        rect: { left: 24, top: 420, width: 120, height: 90 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 180, top: 240, width: 280, height: 210 },
        tag: 'img',
      }],
    })
    const source = screen.getByTestId(`source-${name}-0`)
    const exit = startNavigation(harness)

    await finishAnimations([exit])
    await flushPaint()

    const target = harness.view().querySelector<HTMLElement>(
      `[data-testid="target-${name}-0"]`,
    )

    if (!target) {
      throw new Error('The hash destination target was not mounted')
    }

    const measureTarget = vi.spyOn(target, 'getBoundingClientRect')

    expect(measureTarget).not.toHaveBeenCalled()
    expect(runningSharedAnimations()).toHaveLength(0)
    await flushSingleFrame()

    await flushSingleFrame()
    expect(measureTarget).not.toHaveBeenCalled()

    scrollX = 12
    scrollY = 240
    expect(source.isConnected).toBe(false)
    window.dispatchEvent(new Event('scroll'))
    expect(sharedWrapper(name)).toHaveStyle({
      left: '12px',
      top: '180px',
    })
    await flushSingleFrame()
    expect(measureTarget).not.toHaveBeenCalled()

    for (let stableFrame = 0; stableFrame < 3; stableFrame += 1) {
      await flushSingleFrame()
      expect(measureTarget).not.toHaveBeenCalled()
      expect(runningSharedAnimations()).toHaveLength(0)
    }

    await flushSingleFrame()
    expect(measureTarget).not.toHaveBeenCalled()
    expect(runningSharedAnimations()).toHaveLength(0)

    await flushSingleFrame()
    expect(measureTarget).not.toHaveBeenCalled()
    expect(runningSharedAnimations()).toHaveLength(0)

    await flushSingleFrame()
    await flushSingleFrame()

    const movements = runningSharedAnimations()
    expect(measureTarget).toHaveBeenCalledTimes(2)
    expect(movements).toHaveLength(1)
    expect(browser.pendingFrames).toBe(0)
    expect(harness.phase()).toBe('navigating')

    await finishAnimations(movements)
    await finishEnter(harness)
    expect(scrollX).toBe(12)
    expect(scrollY).toBe(240)
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expectCleanSharedState(harness)
  })

  it('crossfades an image into a muted nonsemantic video clone', async () => {
    const name = 'crossfade-video'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 16, top: 300, width: 96, height: 72 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 140, top: 32, width: 320, height: 180 },
        tag: 'video',
      }],
    })
    const movements = await reachSharedMovement(harness)
    const wrapper = sharedWrapper(name)
    const sourceClone = wrapper?.querySelector('img')
    const targetClone = wrapper?.querySelector('video')
    const target = harness.view().querySelector<HTMLVideoElement>(
      `[data-testid="target-${name}-0"]`,
    )

    if (!target) {
      throw new Error('The real video target was not mounted')
    }

    expect(movements).toHaveLength(3)
    expect(wrapper).not.toBeNull()
    expect(sourceClone).not.toBeNull()
    expect(targetClone).not.toBeNull()
    expect(sourceClone).not.toHaveAttribute('alt')
    expect(sourceClone).not.toHaveAttribute('role')
    expect(targetClone).not.toHaveAttribute('role')
    expect(targetClone).toHaveAttribute('tabindex', '-1')
    expect(targetClone?.muted).toBe(true)
    expect(targetClone?.defaultMuted).toBe(true)
    expect(targetClone?.autoplay).toBe(false)
    expect(targetClone).not.toHaveAttribute('autoplay')
    expect(sharedPortal()).toHaveAttribute('aria-hidden', 'true')
    expect(sharedPortal()?.inert).toBe(true)
    expect(target.muted).toBe(false)
    expect(target.defaultMuted).toBe(false)
    expect(target.autoplay).toBe(false)

    const geometry = movements.find((animation) => animation.element === wrapper)
    const sourceFade = movements.find((animation) => (
      animation.element.tagName.toLowerCase() === 'img'
    ))
    const targetFade = movements.find((animation) => (
      animation.element.tagName.toLowerCase() === 'video'
    ))

    expect(geometry).toBeDefined()
    expect(sourceFade?.keyframes).toEqual([
      { borderRadius: '4px', opacity: 1, offset: 0 },
      { borderRadius: '4px', opacity: 1, offset: 0.68 },
      { borderRadius: '4px', opacity: 0, offset: 1 },
    ])
    expect(targetFade?.keyframes).toEqual([
      { borderRadius: '4px', opacity: 0, offset: 0 },
      { borderRadius: '4px', opacity: 0, offset: 0.68 },
      { borderRadius: '4px', opacity: 1, offset: 1 },
    ])
    expect(harness.phase()).toBe('navigating')
    expect(runningViewAnimations()).toHaveLength(0)

    await finishAnimations(movements)

    expect(sharedPortal()).not.toBeNull()
    expect(target.style.visibility).toBe('hidden')
    expect(target.muted).toBe(false)
    expect(target.defaultMuted).toBe(false)
    expect(target.autoplay).toBe(false)
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('registers and clones an intrinsic SVG target', async () => {
    const name = 'svg-target'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 320, width: 120, height: 40 },
        tag: 'span',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 32, width: 240, height: 240 },
        tag: 'svg',
      }],
    })
    const movements = await reachSharedMovement(harness)
    const wrapper = sharedWrapper(name)
    const target = harness.view().querySelector<SVGSVGElement>(
      `[data-testid="target-${name}-0"]`,
    )
    const targetClone = wrapper?.querySelector('svg')

    if (!target) {
      throw new Error('The real SVG target was not mounted')
    }

    expect(target.tagName.toLowerCase()).toBe('svg')
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(targetClone).not.toBeNull()
    expect(targetClone).not.toBe(target)
    expect(targetClone).not.toHaveAttribute('role')
    expect(sharedPortal()).toHaveAttribute('aria-hidden', 'true')
    expect(sharedPortal()?.inert).toBe(true)
    expect(targetClone?.querySelector('circle')).not.toBeNull()
    expect(movements).toHaveLength(3)

    await finishAnimations(movements)
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(sharedPortal()).not.toBeNull()
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('continues into normal enter when target cloning throws', async () => {
    const name = 'target-clone-failure'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 320, width: 120, height: 40 },
        tag: 'span',
      }],
      targets: [{
        cloneThrows: true,
        name,
        rect: { left: 160, top: 32, width: 240, height: 240 },
        tag: 'svg',
      }],
    })
    const exit = startNavigation(harness)

    await finishAnimations([exit])
    await flushPaint()
    await flushPaint()

    expect(runningSharedAnimations()).toHaveLength(0)
    expect(sharedPortal()).toBeNull()
    expect(harness.phase()).toBe('entering')
    expect(screen.getByTestId(`target-${name}-0`).style.visibility).toBe('')
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`named “${name}”`),
    )

    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('does not wait for a target that registers after the incoming layout', async () => {
    vi.useFakeTimers()
    const name = 'target-before-watchdog'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 320, width: 120, height: 80 },
        tag: 'img',
      }],
      targetDelayMs: 400,
      targets: [{
        name,
        rect: { left: 160, top: 32, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const exit = startNavigation(harness)

    await finishAnimations([exit])
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(121)
    })
    await settleReact()
    expect(runningSharedAnimations()).toHaveLength(0)
    expect(harness.phase()).toBe('entering')
    expect(sharedPortal()).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    await settleReact()
    expect(screen.getByTestId(`target-${name}-0`).style.visibility).toBe('')
    expect(runningSharedAnimations()).toHaveLength(0)

    await finishEnter(harness)
    expect(vi.getTimerCount()).toBe(0)
    expectCleanSharedState(harness)
  })

  it('crossfades same-tag text when its content changes', async () => {
    const name = 'same-text'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 32, top: 340, width: 180, height: 28 },
        tag: 'span',
      }],
      targets: [{
        name,
        rect: { left: 200, top: 52, width: 260, height: 44 },
        tag: 'span',
      }],
    })
    const movements = await reachSharedMovement(harness)
    const wrapper = sharedWrapper(name)

    expect(movements).toHaveLength(3)
    expect(movements.filter((animation) => (
      animation.element === wrapper
    ))).toHaveLength(1)
    expect(wrapper?.querySelectorAll('span')).toHaveLength(2)

    await finishAnimations(movements)
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('moves multiple elements concurrently and waits for every handoff', async () => {
    vi.useFakeTimers()
    const imageName = 'multi-image'
    const titleName = 'multi-title'
    const harness = setup({
      sources: [
        {
          name: imageName,
          rect: { left: 20, top: 360, width: 100, height: 80 },
          tag: 'img',
        },
        {
          name: titleName,
          rect: { left: 28, top: 448, width: 160, height: 24 },
          tag: 'span',
        },
      ],
      targets: [
        {
          name: imageName,
          rect: { left: 220, top: 30, width: 300, height: 220 },
          tag: 'img',
        },
        {
          name: titleName,
          rect: { left: 220, top: 270, width: 260, height: 42 },
          tag: 'span',
        },
      ],
    })
    let movements = await reachSharedMovement(harness)
    const titleTarget = harness.view().querySelector<HTMLElement>(
      `[data-testid="target-${titleName}-1"]`,
    )

    if (!titleTarget) {
      throw new Error('The real title target was not mounted')
    }

    expect(titleTarget.getBoundingClientRect()).toMatchObject({
      height: 42,
      left: 220,
      top: 270,
      width: 260,
    })

    if (movements.length === 0) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })
      await settleReact()
      movements = runningSharedAnimations()
    }

    expect(movements).toHaveLength(4)
    const geometryMovements = movements.filter((animation) => (
      animation.element.hasAttribute('data-routeveil-shared-element')
    ))
    expect(geometryMovements).toHaveLength(2)
    expect(new Set(geometryMovements.map((animation) => (
      animation.element.getAttribute('data-routeveil-shared-element')
    )))).toEqual(new Set([imageName, titleName]))
    expect(harness.phase()).toBe('navigating')

    await finishAnimations(movements.slice(0, -1))

    expect(harness.phase()).toBe('navigating')
    expect(sharedPortal()).not.toBeNull()
    expect(runningViewAnimations()).toHaveLength(0)
    expect(runningSharedAnimations()).toEqual([movements.at(-1)])

    await finishAnimations([movements.at(-1)!])

    expect(harness.phase()).toBe('entering')
    expect(sharedPortal()).not.toBeNull()
    expect(screen.getByTestId(`target-${imageName}-0`).style.visibility).toBe('hidden')
    expect(screen.getByTestId(`target-${titleName}-1`).style.visibility).toBe('hidden')
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('animates a valid partial match without waiting for an absent target', async () => {
    vi.useFakeTimers()
    const validName = 'partial-valid'
    const missingName = 'partial-missing'
    const harness = setup({
      sources: [
        {
          name: validName,
          rect: { left: 20, top: 340, width: 120, height: 80 },
          tag: 'img',
        },
        {
          name: missingName,
          rect: { left: 32, top: 440, width: 180, height: 32 },
          tag: 'span',
        },
      ],
      targets: [{
        name: validName,
        rect: { left: 200, top: 44, width: 280, height: 180 },
        tag: 'img',
      }],
    })
    const validSource = screen.getByTestId(`source-${validName}-0`)
    const missingSource = screen.getByTestId(`source-${missingName}-1`)
    const exit = startNavigation(harness)

    expect(sharedWrapper(validName)).not.toBeNull()
    expect(sharedWrapper(missingName)).not.toBeNull()

    await finishAnimations([exit])
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(121)
    })
    await settleReact()

    const movements = runningSharedAnimations()
    const target = screen.getByTestId(`target-${validName}-0`)

    expect(movements).toHaveLength(1)
    expect(movements[0].element).toBe(sharedWrapper(validName))
    expect(sharedWrapper(missingName)).toBeNull()
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`named “${missingName}”`),
    )

    await finishAnimations(movements)

    expect(validSource.style.getPropertyValue('visibility')).toBe('hidden')
    expect(missingSource.style.getPropertyValue('visibility')).toBe('hidden')
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(sharedPortal()).not.toBeNull()
    await finishEnter(harness)
    expect(validSource.style.getPropertyValue('visibility')).toBe('')
    expect(missingSource.style.getPropertyValue('visibility')).toBe('')
    expect(target.style.getPropertyValue('visibility')).toBe('')
    expect(vi.getTimerCount()).toBe(0)
    expectCleanSharedState(harness)
  })

  it('falls back to enter immediately when no target is registered', async () => {
    vi.useFakeTimers()
    const name = 'missing-target'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 12, top: 260, width: 110, height: 70 },
        tag: 'img',
      }],
      targets: [],
    })
    const exit = startNavigation(harness)
    await finishAnimations([exit])
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await flushPaint()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(121)
    })
    await settleReact()

    expect(harness.phase()).toBe('entering')
    expect(sharedPortal()).toBeNull()
    expect(harness.view().style.getPropertyValue('opacity')).toBe('')
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`named “${name}”`),
    )
    await finishEnter(harness)
    expect(vi.getTimerCount()).toBe(0)
    expectCleanSharedState(harness)
  })

  it.each([
    {
      display: undefined,
      label: 'zero-size',
      rect: { left: 120, top: 40, width: 0, height: 80 },
    },
    {
      display: 'none' as const,
      label: 'display-none',
      rect: { left: 120, top: 40, width: 180, height: 80 },
    },
  ])('falls back when the target is $label', async ({ display, rect }) => {
    vi.useFakeTimers()
    const name = `invalid-${display ?? 'zero'}`
    const harness = setup({
      sources: [{
        name,
        rect: { left: 12, top: 260, width: 110, height: 70 },
        tag: 'img',
      }],
      targets: [{
        display,
        name,
        rect,
        tag: 'img',
      }],
    })
    const exit = startNavigation(harness)

    await finishAnimations([exit])
    await flushPaint()
    await flushPaint()
    await flushPaint()

    expect(runningSharedAnimations()).toHaveLength(0)
    expect(harness.phase()).toBe('navigating')
    expect(sharedPortal()).not.toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    await settleReact()

    expect(harness.phase()).toBe('entering')
    expect(sharedPortal()).toBeNull()
    expect(screen.getByTestId(`target-${name}-0`).style.visibility).toBe('')
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`named “${name}”`),
    )
    await finishEnter(harness)
    expect(vi.getTimerCount()).toBe(0)
    expectCleanSharedState(harness)
  })

  it('skips one duplicate target name and enters without shared movement', async () => {
    const name = 'duplicate-target'
    const harness = setup({
      preventScrollReset: true,
      scrollToSharedElement: name,
      sources: [{
        name,
        rect: { left: 12, top: 260, width: 110, height: 70 },
        tag: 'span',
      }],
      targets: [
        {
          name,
          rect: { left: 120, top: 40, width: 180, height: 32 },
          tag: 'span',
        },
        {
          name,
          rect: { left: 120, top: 90, width: 180, height: 32 },
          tag: 'span',
        },
      ],
    })
    const exit = startNavigation(harness)
    await finishAnimations([exit])
    await flushPaint()
    await flushPaint()

    expect(runningSharedAnimations()).toHaveLength(0)
    expect(harness.phase()).toBe('entering')
    expect(sharedPortal()).toBeNull()
    expect(screen.getByTestId(`target-${name}-0`).style.visibility).toBe('')
    expect(screen.getByTestId(`target-${name}-1`).style.visibility).toBe('')
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`incoming shared elements use the name “${name}”`),
    )
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('scrollToSharedElement was ignored'),
    )
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('moves a valid name while skipping duplicate incoming targets', async () => {
    const validName = 'duplicate-mix-valid'
    const duplicateName = 'duplicate-mix-skipped'
    const harness = setup({
      sources: [
        {
          name: validName,
          rect: { left: 20, top: 300, width: 120, height: 80 },
          tag: 'img',
        },
        {
          name: duplicateName,
          rect: { left: 28, top: 400, width: 160, height: 90 },
          tag: 'img',
        },
      ],
      targets: [
        {
          name: validName,
          rect: { left: 200, top: 40, width: 280, height: 180 },
          tag: 'img',
        },
        {
          name: duplicateName,
          rect: { left: 200, top: 240, width: 220, height: 120 },
          tag: 'img',
        },
        {
          name: duplicateName,
          rect: { left: 440, top: 240, width: 220, height: 120 },
          tag: 'img',
        },
      ],
    })
    const movements = await reachSharedMovement(harness)
    const validTarget = screen.getByTestId(`target-${validName}-0`)
    const firstDuplicateTarget = screen.getByTestId(
      `target-${duplicateName}-1`,
    )
    const secondDuplicateTarget = screen.getByTestId(
      `target-${duplicateName}-2`,
    )

    expect(movements).toHaveLength(1)
    expect(movements[0].element).toBe(sharedWrapper(validName))
    expect(sharedWrapper(duplicateName)).toBeNull()
    expect(validTarget.style.getPropertyValue('visibility')).toBe('hidden')
    expect(firstDuplicateTarget.style.getPropertyValue('visibility')).toBe('')
    expect(secondDuplicateTarget.style.getPropertyValue('visibility')).toBe('')
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `incoming shared elements use the name “${duplicateName}”`,
      ),
    )

    await finishAnimations(movements)

    expect(validTarget.style.getPropertyValue('visibility')).toBe('hidden')
    expect(sharedPortal()).not.toBeNull()
    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('bypasses shared work under reduced motion', async () => {
    const name = 'reduced-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const source = screen.getByTestId(`source-${name}-0`)
    browser.setReducedMotion(true)

    fireEvent.click(screen.getByTestId('navigate-trigger'))

    expect(sharedPortal()).toBeNull()
    expect(source.style.visibility).toBe('')
    expect(browser.animations).toHaveLength(0)
    expect(harness.phase()).toBe('navigating')

    await flushPaint()
    await act(async () => harness.activePromise())

    expect(harness.location()).toBe('/target')
    expect(harness.commitCount()).toBe(1)
    expect(browser.animations).toHaveLength(0)
    expectCleanSharedState(harness)
  })

  it('bypasses shared work for overlay transitions', async () => {
    const name = 'overlay-image'
    const harness = setup({
      preventScrollReset: false,
      scrollToSharedElement: name,
      smoothScrollToTop: true,
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 1000, width: 240, height: 160 },
        tag: 'img',
      }],
      transition: 'controlled-overlay',
    })
    const source = screen.getByTestId(`source-${name}-0`)

    fireEvent.click(screen.getByTestId('navigate-trigger'))
    await settleReact()

    expect(sharedPortal()).toBeNull()
    expect(source.style.visibility).toBe('')
    expect(document.querySelector('[data-routeveil-overlay-root]')).not.toBeNull()

    await flushPaint()

    expect(harness.overlay.coverCalls).toBe(1)
    expect(sharedPortal()).toBeNull()

    await act(async () => {
      harness.overlay.cover.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushPaint()

    expect(harness.overlay.revealCalls).toBe(1)
    expect(harness.location()).toBe('/target')
    expect(sharedPortal()).toBeNull()

    await act(async () => {
      harness.overlay.reveal.resolve()
      await harness.activePromise()
    })

    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      left: 0,
      top: 0,
    })
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(browser.animations).toHaveLength(0)
    expectCleanSharedState(harness)
  })

  it('ignores shared elements during overlay playback', async () => {
    const name = 'overlay-playback-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const source = screen.getByTestId(`source-${name}-0`)

    fireEvent.click(screen.getByTestId('overlay-play-trigger'))
    await settleReact()

    expect(sharedPortal()).toBeNull()
    expect(source.style.visibility).toBe('')
    expect(document.querySelector('[data-routeveil-overlay-root]')).not.toBeNull()

    await flushPaint()

    expect(harness.overlay.coverCalls).toBe(1)
    expect(sharedPortal()).toBeNull()

    await act(async () => {
      harness.overlay.cover.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushPaint()

    expect(harness.overlay.revealCalls).toBe(1)
    expect(harness.location()).toBe('/start')
    expect(harness.commitCount()).toBe(0)
    expect(sharedPortal()).toBeNull()

    await act(async () => {
      harness.overlay.reveal.resolve()
      await harness.activePromise()
    })

    expect(harness.overlay.reset).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(browser.animations).toHaveLength(0)
    expectCleanSharedState(harness)
  })

  it('bypasses shared work for same-page playback', async () => {
    const name = 'playback-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const source = screen.getByTestId(`source-${name}-0`)

    fireEvent.click(screen.getByTestId('play-trigger'))

    expect(sharedPortal()).toBeNull()
    expect(source.style.visibility).toBe('')
    expect(harness.phase()).toBe('exiting')
    const [exit] = runningViewAnimations()
    expect(exit).toBeDefined()

    await finishAnimations([exit!])
    await flushPaint()

    expect(harness.location()).toBe('/start')
    expect(harness.commitCount()).toBe(0)
    expect(sharedPortal()).toBeNull()
    expect(source.style.visibility).toBe('')
    expect(harness.phase()).toBe('entering')

    await finishEnter(harness)

    expect(browser.animations).toHaveLength(2)
    expectCleanSharedState(harness)
  })

  it('restores owned inline visibility without overwriting app changes', async () => {
    const name = 'visibility-ownership'
    const harness = setup({
      sources: [{
        inlineVisibility: { priority: 'important', value: 'visible' },
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        inlineVisibility: { value: 'visible' },
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const source = screen.getByTestId(`source-${name}-0`)
    const movements = await reachSharedMovement(harness)
    const target = screen.getByTestId(`target-${name}-0`)

    expect(source.style.getPropertyValue('visibility')).toBe('hidden')
    expect(source.style.getPropertyPriority('visibility')).toBe('important')
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(target.style.getPropertyPriority('visibility')).toBe('important')

    target.style.setProperty('visibility', 'collapse')
    await finishAnimations(movements)

    expect(source.style.getPropertyValue('visibility')).toBe('hidden')
    expect(source.style.getPropertyPriority('visibility')).toBe('important')
    expect(target.style.getPropertyValue('visibility')).toBe('collapse')
    expect(target.style.getPropertyPriority('visibility')).toBe('')
    expect(sharedPortal()).not.toBeNull()
    await finishEnter(harness)
    expect(source.style.getPropertyValue('visibility')).toBe('visible')
    expect(source.style.getPropertyPriority('visibility')).toBe('important')
    expect(target.style.getPropertyValue('visibility')).toBe('collapse')
    expectCleanSharedState(harness)
  })

  it('cleans movement when external navigation wins', async () => {
    vi.useFakeTimers()
    const name = 'external-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const movements = await reachSharedMovement(harness)
    const target = screen.getByTestId(`target-${name}-0`)
    const activePromise = harness.activePromise()

    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(sharedPortal()).not.toBeNull()

    await act(async () => {
      await harness.router.navigate('/external')
    })
    await settleReact()
    await act(async () => activePromise)

    expect(harness.location()).toBe('/external')
    expect(screen.getByTestId('external-route')).toBeInTheDocument()
    expect(movements[0].animation.cancel).toHaveBeenCalled()
    expect(target.style.getPropertyValue('visibility')).toBe('')
    expect(harness.phase()).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
    expectCleanSharedState(harness)
  })

  it('cleans portal, styles, animations, frames, and timers on unmount', async () => {
    vi.useFakeTimers()
    const name = 'unmount-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const movements = await reachSharedMovement(harness)
    const view = harness.view()
    const target = screen.getByTestId(`target-${name}-0`)
    const activePromise = harness.activePromise()

    expect(view.style.getPropertyValue('opacity')).toBe('0')
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')

    act(() => harness.rendered.unmount())
    activeRender = null
    await settleReact()
    await act(async () => activePromise)

    expect(sharedPortal()).toBeNull()
    expect(view.style.getPropertyValue('opacity')).toBe('')
    expect(target.style.getPropertyValue('visibility')).toBe('')
    expect(movements[0].animation.cancel).toHaveBeenCalled()
    expect(browser.activeAnimations).toHaveLength(0)
    expect(browser.pendingFrames).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels movement on resize and continues with normal enter', async () => {
    const name = 'resize-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const movements = await reachSharedMovement(harness)
    const target = screen.getByTestId(`target-${name}-0`)

    act(() => window.dispatchEvent(new Event('resize')))
    await settleReact()

    expect(movements[0].animation.cancel).toHaveBeenCalled()
    expect(sharedPortal()).toBeNull()
    expect(target.style.getPropertyValue('visibility')).toBe('')
    expect(harness.view().style.getPropertyValue('opacity')).toBe('')
    expect(harness.phase()).toBe('entering')
    expect(runningViewAnimations()).toHaveLength(1)

    await finishEnter(harness)
    expectCleanSharedState(harness)
  })

  it('recovers from a rejected shared animation before entering', async () => {
    const name = 'rejected-image'
    const harness = setup({
      sources: [{
        name,
        rect: { left: 20, top: 300, width: 120, height: 80 },
        tag: 'img',
      }],
      targets: [{
        name,
        rect: { left: 160, top: 40, width: 240, height: 160 },
        tag: 'img',
      }],
    })
    const [movement] = await reachSharedMovement(harness)
    const target = screen.getByTestId(`target-${name}-0`)
    const wrapper = sharedWrapper(name)

    await act(async () => {
      movement.fail(new Error('Shared movement failed'))
      await Promise.resolve()
      await Promise.resolve()
    })
    await settleReact()

    expect(movement.status).toBe('rejected')
    expect(sharedPortal()).not.toBeNull()
    expect(target.style.getPropertyValue('visibility')).toBe('hidden')
    expect(harness.view().style.getPropertyValue('opacity')).toBe('')
    expect(harness.phase()).toBe('entering')
    expect(runningViewAnimations()).toHaveLength(1)
    expect(wrapper).toHaveStyle({
      height: '160px',
      left: '160px',
      top: '40px',
      width: '240px',
    })
    expect(wrapper?.style.getPropertyPriority('left')).toBe('important')

    await finishEnter(harness)
    expectCleanSharedState(harness)
  })
})
