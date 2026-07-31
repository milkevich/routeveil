import {
  act,
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
import { useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  useRouteveilTransition,
} from '../src/react-router'
import { useRouteveilContext } from '../src/react-router/RouteveilContext'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

type Fixture = {
  locations: string[]
  staleCommit: ReturnType<typeof vi.fn<() => void>>
  view: RenderResult
}

let browser: BrowserMocks

function LocationObserver({
  onLocation,
}: {
  onLocation: (path: string) => void
}) {
  const location = useLocation()

  useLayoutEffect(() => {
    onLocation(`${location.pathname}${location.search}${location.hash}`)
  }, [
    location.hash,
    location.key,
    location.pathname,
    location.search,
    onLocation,
  ])

  return null
}

function Controls({
  shared,
  staleCommit,
}: {
  shared: boolean
  staleCommit: () => void
}) {
  const navigate = useNavigate()
  const playTransition = useRouteveilTransition()
  const { transitionTo } = useRouteveilContext()

  return (
    <nav>
      <RouteveilLink
        sharedElements={shared ? 'all' : undefined}
        to="/lab"
        transition="fade"
      >
        Lab
      </RouteveilLink>
      <RouteveilLink to="/other" transition="fade">
        Other
      </RouteveilLink>
      <RouteveilLink to="/lab" transition="halo">
        Lab overlay
      </RouteveilLink>
      <button
        onClick={() => {
          void transitionTo({
            to: '/lab',
            expectedPath: '/lab',
            transition: 'fade',
            commit: staleCommit,
          })
        }}
        type="button"
      >
        Stale Lab request
      </button>
      <button
        onClick={() => {
          void playTransition('fade')
        }}
        type="button"
      >
        Playback
      </button>
      <button onClick={() => navigate(-1)} type="button">
        Back
      </button>
    </nav>
  )
}

function Page({ shared }: { shared: boolean }) {
  const location = useLocation()
  const content = <div data-page-content="">{location.pathname}</div>

  return shared
    ? (
        <RouteveilSharedElement name="page-content">
          {content}
        </RouteveilSharedElement>
      )
    : content
}

function App({
  locations,
  shared,
  staleCommit,
}: {
  locations: string[]
  shared: boolean
  staleCommit: () => void
}) {
  return (
    <MemoryRouter initialEntries={['/docs']}>
      <RouteveilProvider>
        <LocationObserver onLocation={(path) => locations.push(path)} />
        <Controls shared={shared} staleCommit={staleCommit} />
        <div data-testid="stage" style={{ overflowY: 'auto' }}>
          <RouteveilView style={{ visibility: 'visible' }}>
            <Routes>
              <Route path="*" element={<Page shared={shared} />} />
            </Routes>
          </RouteveilView>
        </div>
      </RouteveilProvider>
    </MemoryRouter>
  )
}

function renderFixture(shared = false): Fixture {
  const locations: string[] = []
  const staleCommit = vi.fn<() => void>()
  const view = render(
    <App
      locations={locations}
      shared={shared}
      staleCommit={staleCommit}
    />,
  )

  return { locations, staleCommit, view }
}

function runningAnimations(): ControlledAnimation[] {
  return browser.animations.filter((animation) => (
    animation.status === 'running'
  ))
}

async function finishRunningAnimations(): Promise<void> {
  await waitFor(() => {
    expect(runningAnimations().length).toBeGreaterThan(0)
  })

  await act(async () => {
    for (const animation of runningAnimations()) {
      animation.finish()
    }

    await Promise.resolve()
  })
}

async function waitForIdle(view: RenderResult, path: string): Promise<void> {
  await waitFor(() => {
    expect(view.container.querySelector('[data-page-content]'))
      .toHaveTextContent(path)
    expect(view.container.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
  })
}

function expectClean(view: RenderResult): void {
  const routeView = view.container.querySelector<HTMLElement>(
    '[data-routeveil-view]',
  )!

  expect(routeView).toHaveAttribute('data-routeveil-phase', 'idle')
  expect(routeView).not.toHaveAttribute('aria-busy')
  expect(routeView).not.toHaveAttribute('data-routeveil-transitioning')
  expect(routeView.inert).toBe(false)
  expect(routeView.style.visibility).toBe('visible')
  expect(view.getByTestId('stage').style.overflowY).toBe('auto')
  expect(document.querySelector('routeveil-page-snapshot')).toBeNull()
  expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
  expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
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

describe('duplicate transition requests', () => {
  it('runs one lifecycle and creates one history entry for two rapid link clicks', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fixture = renderFixture()
    browser.setAnimationObserver(null)
    const link = fixture.view.getByRole('link', { name: 'Lab' })

    fireEvent.click(link, { button: 0, detail: 1 })
    fireEvent.click(link, { button: 0, detail: 2 })
    await waitFor(() => {
      expect(document.querySelectorAll('routeveil-page-snapshot')).toHaveLength(1)
    })

    expect(document.querySelectorAll('routeveil-page-snapshot')).toHaveLength(1)
    expect(fixture.locations).toEqual(['/docs', '/lab'])
    expect(warning.mock.calls.flat().join(' ')).not.toContain(
      'transition is already in progress',
    )

    await finishRunningAnimations()
    await waitFor(() => {
      expect(fixture.locations).toEqual(['/docs', '/lab'])
    })
    await finishRunningAnimations()
    await waitForIdle(fixture.view, '/lab')

    const exitAnimations = browser.animations.filter((animation) => (
      animation.element.localName === 'routeveil-page-snapshot'
    ))
    const enterAnimations = browser.animations.filter((animation) => (
      animation.element instanceof HTMLElement
      && animation.element.hasAttribute('data-routeveil-view')
    ))

    expect(exitAnimations).toHaveLength(1)
    expect(enterAnimations).toHaveLength(1)
    expectClean(fixture.view)

    const animationCount = browser.animations.length
    fireEvent.click(fixture.view.getByRole('button', { name: 'Back' }))
    await waitFor(() => {
      expect(fixture.locations.at(-1)).toBe('/docs')
    })
    expect(browser.animations).toHaveLength(animationCount)
  })

  it('rejects the committed destination during and after request finalization', async () => {
    const fixture = renderFixture()
    browser.setAnimationObserver(null)

    fireEvent.click(fixture.view.getByRole('link', { name: 'Lab' }), {
      button: 0,
      detail: 1,
    })
    await finishRunningAnimations()
    await waitFor(() => {
      expect(fixture.locations).toEqual(['/docs', '/lab'])
    })

    const animationCount = browser.animations.length
    fireEvent.click(fixture.view.getByRole('button', {
      name: 'Stale Lab request',
    }))
    expect(fixture.staleCommit).not.toHaveBeenCalled()
    expect(browser.animations).toHaveLength(animationCount)

    await finishRunningAnimations()
    await waitForIdle(fixture.view, '/lab')

    fireEvent.click(fixture.view.getByRole('button', {
      name: 'Stale Lab request',
    }))
    await act(async () => Promise.resolve())

    expect(fixture.staleCommit).not.toHaveBeenCalled()
    expect(browser.animations).toHaveLength(animationCount + 1)
    expect(fixture.locations).toEqual(['/docs', '/lab'])
    expectClean(fixture.view)
  })

  it('does not transition after the link rerenders at its destination', async () => {
    const fixture = renderFixture()

    fireEvent.click(fixture.view.getByRole('link', { name: 'Lab' }), {
      button: 0,
      detail: 1,
    })
    await waitForIdle(fixture.view, '/lab')
    const animationCount = browser.animations.length

    fireEvent.click(fixture.view.getByRole('link', { name: 'Lab' }), {
      button: 0,
      detail: 1,
    })
    await act(async () => Promise.resolve())

    expect(browser.animations).toHaveLength(animationCount)
    expectClean(fixture.view)
  })

  it('preserves ignore-while-active behavior for a different destination', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fixture = renderFixture()
    browser.setAnimationObserver(null)

    fireEvent.click(fixture.view.getByRole('link', { name: 'Lab' }), {
      button: 0,
      detail: 1,
    })
    await waitFor(() => {
      expect(document.querySelectorAll('routeveil-page-snapshot')).toHaveLength(1)
    })
    fireEvent.click(fixture.view.getByRole('link', { name: 'Other' }), {
      button: 0,
      detail: 1,
    })

    expect(warning.mock.calls.flat().join(' ')).toContain(
      'transition is already in progress',
    )

    await finishRunningAnimations()
    await waitFor(() => {
      expect(fixture.locations).toEqual(['/docs', '/lab'])
    })
    await finishRunningAnimations()
    await waitForIdle(fixture.view, '/lab')

    expect(fixture.locations).toEqual(['/docs', '/lab'])
    expectClean(fixture.view)
  })

  it('allows same-location playback without navigation', async () => {
    const fixture = renderFixture()

    fireEvent.click(fixture.view.getByRole('button', { name: 'Playback' }))
    await waitFor(() => {
      expect(browser.animations.length).toBeGreaterThanOrEqual(2)
    })
    await waitForIdle(fixture.view, '/docs')

    expect(fixture.locations).toEqual(['/docs'])
    expectClean(fixture.view)
  })

  it('cleans up an overlay after a duplicate activation', async () => {
    const fixture = renderFixture()
    browser.setAnimationObserver(null)
    const link = fixture.view.getByRole('link', { name: 'Lab overlay' })

    fireEvent.click(link, { button: 0, detail: 1 })
    await waitFor(() => {
      expect(document.querySelectorAll('[data-routeveil-overlay-root]'))
        .toHaveLength(1)
      expect(runningAnimations()).toHaveLength(1)
    })
    fireEvent.click(link, { button: 0, detail: 2 })

    expect(document.querySelectorAll('[data-routeveil-overlay-root]'))
      .toHaveLength(1)
    expect(runningAnimations()).toHaveLength(1)

    await finishRunningAnimations()
    await waitFor(() => {
      expect(fixture.locations).toEqual(['/docs', '/lab'])
    })
    await finishRunningAnimations()
    await waitForIdle(fixture.view, '/lab')

    expect(browser.animations).toHaveLength(2)
    expectClean(fixture.view)
  })

  it('cleans up shared elements after a duplicate activation', async () => {
    const fixture = renderFixture(true)
    const link = fixture.view.getByRole('link', { name: 'Lab' })

    fireEvent.click(link, { button: 0, detail: 1 })
    fireEvent.click(link, { button: 0, detail: 2 })
    await waitForIdle(fixture.view, '/lab')

    expect(fixture.locations).toEqual(['/docs', '/lab'])
    expect(browser.animations.some((animation) => (
      animation.element.hasAttribute('data-routeveil-shared-element')
    ))).toBe(true)
    expectClean(fixture.view)
  })
})
