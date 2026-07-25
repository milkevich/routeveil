import {
  useCallback,
  type ReactNode,
} from 'react'
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import {
  MemoryRouter,
  useLocation,
} from 'react-router-dom'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
} from '../src/react-router'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type NestedOutcome = 'duplicate' | 'failure' | 'missing'

type Readiness = {
  ready: boolean
}

function rect(
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

function Shell({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <RouteveilProvider>
        <RouteveilView>{children}</RouteveilView>
      </RouteveilProvider>
    </MemoryRouter>
  )
}

function requireElement<T extends Element>(
  parent: ParentNode,
  selector: string,
): T {
  const element = parent.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Missing ${selector}`)
  }

  return element
}

function runningAnimations(): ControlledAnimation[] {
  return browser.animations.filter((animation) => (
    animation.status === 'running'
  ))
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

async function finishAnimations(
  animations: readonly ControlledAnimation[],
): Promise<void> {
  await act(async () => {
    for (const animation of animations) {
      animation.finish()
    }

    await Promise.all(animations.map((animation) => (
      animation.animation.finished
    )))

    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve()
    }
  })
}

async function flushFrames(count = 8): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      browser.flushFrame()

      if (vi.isFakeTimers()) {
        await vi.advanceTimersByTimeAsync(16)
      }

      await Promise.resolve()
      await Promise.resolve()
    })
  }

  await settleReact()
}

async function finishExit(): Promise<void> {
  const [exit] = runningViewAnimations()
  expect(exit).toBeDefined()
  await finishAnimations([exit!])
  await settleReact()
}

function MeasuredImage({
  position,
  readiness,
}: {
  position: 'source' | 'target'
  readiness?: Readiness
}) {
  const setImage = useCallback((element: HTMLImageElement | null) => {
    if (!element) {
      return
    }

    element.getBoundingClientRect = () => position === 'source'
      ? rect(24, 320, 120, 80)
      : rect(180, 40, 240, 160)

    if (readiness) {
      Object.defineProperty(element, 'complete', {
        configurable: true,
        get: () => readiness.ready,
      })
      Object.defineProperty(element, 'naturalWidth', {
        configurable: true,
        get: () => readiness.ready ? 100 : 0,
      })
    }
  }, [position, readiness])

  return (
    <RouteveilSharedElement name="readiness-image">
      <img
        ref={setImage}
        alt={`${position} readiness`}
        data-testid={`${position}-readiness-image`}
        src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
      />
    </RouteveilSharedElement>
  )
}

function ImageRoutes({ readiness }: { readiness: Readiness }) {
  const location = useLocation()

  return (
    <RouteveilProvider>
      <RouteveilView>
        {location.pathname === '/'
          ? (
              <RouteveilLink to="/target" transition="fade">
                <MeasuredImage position="source" />
              </RouteveilLink>
            )
          : <MeasuredImage position="target" readiness={readiness} />}
      </RouteveilView>
    </RouteveilProvider>
  )
}

function NestedChild({
  cloneFailure = false,
  label,
}: {
  cloneFailure?: boolean
  label: string
}) {
  const setChild = useCallback((element: HTMLSpanElement | null) => {
    if (!element) {
      return
    }

    element.getBoundingClientRect = () => label === 'Source child'
      ? rect(48, 352, 84, 28)
      : rect(224, 92, 140, 40)

    if (cloneFailure) {
      Object.defineProperty(element, 'cloneNode', {
        configurable: true,
        value: () => {
          throw new Error('Nested clone failed')
        },
      })
    }
  }, [cloneFailure, label])

  return (
    <RouteveilSharedElement name="nested-child">
      <span ref={setChild}>{label}</span>
    </RouteveilSharedElement>
  )
}

function TargetNestedChildren({ outcome }: { outcome: NestedOutcome }) {
  if (outcome === 'missing') {
    return <span>Target fallback child</span>
  }

  if (outcome === 'duplicate') {
    return (
      <>
        <NestedChild label="Target child one" />
        <NestedChild label="Target child two" />
      </>
    )
  }

  return <NestedChild cloneFailure label="Target child failure" />
}

function NestedRoutes({ outcome }: { outcome: NestedOutcome }) {
  const location = useLocation()
  const setParent = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => location.pathname === '/'
        ? rect(20, 300, 180, 120)
        : rect(160, 30, 320, 220)
    }
  }, [location.pathname])

  return (
    <RouteveilProvider>
      <RouteveilView>
        {location.pathname === '/'
          ? (
              <RouteveilLink to="/target" transition="fade">
                <RouteveilSharedElement name="nested-parent">
                  <article ref={setParent}>
                    <NestedChild label="Source child" />
                  </article>
                </RouteveilSharedElement>
              </RouteveilLink>
            )
          : (
              <RouteveilSharedElement name="nested-parent">
                <section ref={setParent}>
                  <TargetNestedChildren outcome={outcome} />
                </section>
              </RouteveilSharedElement>
            )}
      </RouteveilView>
    </RouteveilProvider>
  )
}

let browser: ReturnType<typeof installBrowserMocks>
let rendered: RenderResult | null = null
let stylesheet: HTMLStyleElement | null = null
let customContainer: HTMLElement | null = null

beforeEach(() => {
  browser = installBrowserMocks({ settleAnimationOnCancel: true })
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  rendered?.unmount()
  rendered = null
  stylesheet?.remove()
  stylesheet = null
  customContainer?.remove()
  customContainer = null
  browser.restore()

  if (vi.isFakeTimers()) {
    vi.clearAllTimers()
    vi.useRealTimers()
  }
})

describe('shared-element clone runtime guards', () => {
  it('retains nonzero ancestor opacity, transforms, and filters', () => {
    const setSource = (element: HTMLSpanElement | null) => {
      if (!element) {
        return
      }

      element.getBoundingClientRect = () => rect(20, 30, 300, 150)
      Object.defineProperty(element, 'offsetWidth', {
        configurable: true,
        value: 100,
      })
      Object.defineProperty(element, 'offsetHeight', {
        configurable: true,
        value: 50,
      })
    }

    rendered = render(
      <Shell>
        <div style={{ filter: 'blur(2px)', opacity: 0.5, transform: 'matrix(1.5, 0, 0, 1.5, 0, 0)' }}>
          <section style={{ filter: 'grayscale(0.5)', opacity: 0.8, transform: 'matrix(2, 0, 0, 2, 0, 0)' }}>
            <RouteveilLink to="/target" transition="fade">
              <RouteveilSharedElement name="ancestor-context">
                <span ref={setSource}>Ancestor context</span>
              </RouteveilSharedElement>
            </RouteveilLink>
          </section>
        </div>
      </Shell>,
    )

    fireEvent.click(screen.getByRole('link'))

    const wrapper = requireElement<HTMLElement>(
      document,
      '[data-routeveil-shared-element="ancestor-context"]',
    )
    const clone = requireElement<HTMLElement>(wrapper, 'span')
    expect(Number.parseFloat(clone.style.opacity)).toBeCloseTo(0.4)
    expect(clone.style.filter).toContain('grayscale(0.5)')
    expect(clone.style.filter).toContain('blur(2px)')
    expect(clone.style.transform).toBe('matrix(3, 0, 0, 3, 0, 0)')
  })

  it('isolates portal scaffolding and the root clone from hostile selectors', () => {
    stylesheet = document.createElement('style')
    stylesheet.textContent = `
      body > div {
        display: none !important;
        position: static !important;
        left: 999px !important;
        top: 999px !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: scale(0) !important;
        filter: blur(99px) !important;
        overflow: visible !important;
        pointer-events: auto !important;
      }
      [aria-hidden="true"] {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: scale(0) !important;
        filter: blur(99px) !important;
        pointer-events: auto !important;
      }
    `
    document.head.append(stylesheet)
    customContainer = document.createElement('main')
    document.body.append(customContainer)
    const setSource = (element: HTMLSpanElement | null) => {
      if (element) {
        element.getBoundingClientRect = () => rect(30, 40, 120, 48)
      }
    }

    rendered = render(
      <Shell>
        <RouteveilLink to="/target" transition="fade">
          <RouteveilSharedElement name="hostile-css">
            <span ref={setSource}>Hostile CSS</span>
          </RouteveilSharedElement>
        </RouteveilLink>
      </Shell>,
      { container: customContainer },
    )

    fireEvent.click(screen.getByRole('link'))

    const portal = requireElement<HTMLElement>(
      document,
      '[data-routeveil-shared-portal]',
    )
    const wrapper = requireElement<HTMLElement>(
      portal,
      '[data-routeveil-shared-element="hostile-css"]',
    )
    const clone = requireElement<HTMLElement>(wrapper, 'span')
    expect(window.getComputedStyle(portal).display).toBe('block')
    expect(window.getComputedStyle(portal).position).toBe('fixed')
    expect(window.getComputedStyle(portal).opacity).toBe('1')
    expect(window.getComputedStyle(portal).visibility).toBe('visible')
    expect(window.getComputedStyle(portal).transform).toBe('none')
    expect(window.getComputedStyle(portal).filter).toBe('none')
    expect(window.getComputedStyle(wrapper).display).toBe('block')
    expect(window.getComputedStyle(wrapper).position).toBe('fixed')
    expect(window.getComputedStyle(wrapper).left).toBe('30px')
    expect(window.getComputedStyle(wrapper).top).toBe('40px')
    expect(window.getComputedStyle(wrapper).width).toBe('120px')
    expect(window.getComputedStyle(wrapper).height).toBe('48px')
    expect(window.getComputedStyle(wrapper).opacity).toBe('1')
    expect(window.getComputedStyle(wrapper).visibility).toBe('visible')
    expect(window.getComputedStyle(wrapper).transform).toBe('none')
    expect(window.getComputedStyle(wrapper).filter).toBe('none')
    expect(window.getComputedStyle(clone).display).not.toBe('none')
    expect(window.getComputedStyle(clone).opacity).toBe('1')
    expect(window.getComputedStyle(clone).visibility).toBe('visible')
    expect(window.getComputedStyle(clone).transform).toBe('none')
    expect(window.getComputedStyle(clone).filter).toBe('none')
    expect(window.getComputedStyle(clone).pointerEvents).toBe('none')
  })

  it.each<NestedOutcome>(['missing', 'duplicate', 'failure'])(
    'reveals a nested shared child in its valid parent clone after a %s target',
    async (outcome) => {
      vi.useFakeTimers()
      rendered = render(
        <MemoryRouter>
          <NestedRoutes outcome={outcome} />
        </MemoryRouter>,
      )

      fireEvent.click(screen.getByRole('link'))
      await finishExit()
      await flushFrames()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700)
      })
      await settleReact()
      await flushFrames()

      const parentWrapper = requireElement<HTMLElement>(
        document,
        '[data-routeveil-shared-element="nested-parent"]',
      )
      const sourceParentClone = requireElement<HTMLElement>(
        parentWrapper,
        'article',
      )
      const sourceChildClone = [...sourceParentClone.querySelectorAll('span')]
        .find((element) => element.textContent === 'Source child')
      expect(sourceChildClone).toBeDefined()
      expect(window.getComputedStyle(sourceChildClone!).visibility)
        .toBe('visible')
      expect(document.querySelector(
        '[data-routeveil-shared-element="nested-child"]',
      )).toBeNull()
      expect(runningSharedAnimations().some((animation) => (
        animation.element === parentWrapper
      ))).toBe(true)
    },
  )

  it('does not hand off to an image that remains unloaded', async () => {
    vi.useFakeTimers()
    const readiness = { ready: false }
    rendered = render(
      <MemoryRouter>
        <ImageRoutes readiness={readiness} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link'))
    await finishExit()
    await flushFrames()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    await settleReact()
    await flushFrames()

    expect(screen.getByTestId('target-readiness-image').style.visibility)
      .toBe('')
    expect(document.querySelector(
      '[data-routeveil-shared-element="readiness-image"]',
    )).toBeNull()
    expect(runningSharedAnimations()).toHaveLength(0)
    expect(runningViewAnimations()).toHaveLength(1)
    await finishAnimations(runningViewAnimations())
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
  })

  it('hands off to an image that becomes ready before the watchdog', async () => {
    vi.useFakeTimers()
    const readiness = { ready: false }
    rendered = render(
      <MemoryRouter>
        <ImageRoutes readiness={readiness} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link'))
    await finishExit()
    await flushFrames()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(199)
    })
    await settleReact()
    expect(runningSharedAnimations()).toHaveLength(0)

    readiness.ready = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    await settleReact()
    await flushFrames()

    const target = screen.getByTestId('target-readiness-image')
    const wrapper = requireElement<HTMLElement>(
      document,
      '[data-routeveil-shared-element="readiness-image"]',
    )
    expect(target.style.visibility).toBe('hidden')
    const movement = runningSharedAnimations()
    expect(movement.some((animation) => (
      animation.element === wrapper
    ))).toBe(true)
    await finishAnimations(movement)
    await settleReact()

    const enter = runningViewAnimations()
    expect(enter).toHaveLength(1)
    expect(document.querySelector('[data-routeveil-shared-portal]'))
      .not.toBeNull()
    expect(target.style.visibility).toBe('hidden')
    await finishAnimations(enter)
    await settleReact()
    expect(target.style.visibility).toBe('')
    await finishAnimations(runningSharedAnimations())
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(target.style.visibility).toBe('')
  })
})
