import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { act as reactDomAct } from 'react-dom/test-utils'
import {
  BrowserRouter,
  Route,
  RouterProvider,
  Routes,
  createMemoryRouter,
  useLocation,
} from 'react-router-dom'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
} from 'routeveil/react-router'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const runAct = (
  React as typeof React & { act?: typeof reactDomAct }
).act ?? reactDomAct

let reducedMotion = false
let animationCalls = 0
let animationCancellations = 0

function createAnimation(): Animation {
  return {
    cancel: () => {
      animationCancellations += 1
    },
    finished: Promise.resolve(),
  } as unknown as Animation
}

function LocationOutput() {
  const location = useLocation()

  return (
    <output data-location="true">
      {`${location.pathname}${location.search}${location.hash}|${JSON.stringify(location.state)}`}
    </output>
  )
}

function Page({ name }: { name: string }) {
  return (
    <main>
      <h1>{name}</h1>
      <LocationOutput />
    </main>
  )
}

function Controls() {
  const navigate = useRouteveilNavigate()
  const play = useRouteveilTransition()

  return (
    <nav>
      <RouteveilLink
        data-action="page"
        to="/page?tab=api#section"
        transition="fade"
      >
        Page
      </RouteveilLink>
      <RouteveilLink
        data-action="overlay"
        to="/overlay"
        transition="wipe"
        transitionOptions={{ direction: 'right', duration: 1 }}
      >
        Overlay
      </RouteveilLink>
      <RouteveilLink data-action="plain" to="/plain">
        Plain
      </RouteveilLink>
      <RouteveilLink
        data-action="modified"
        to="/modified"
        transition="fade"
      >
        Modified
      </RouteveilLink>
      <button
        data-action="programmatic"
        onClick={() => {
          void navigate('/programmatic?source=hook#done', {
            preventScrollReset: true,
            replace: true,
            state: { source: 'hook' },
            transition: 'slide',
            transitionOptions: { direction: 'left' },
          })
        }}
        type="button"
      >
        Programmatic
      </button>
      <button
        data-action="playback"
        onClick={() => {
          void play('wipe', {
            transitionOptions: { direction: 'left', duration: 1 },
          })
        }}
        type="button"
      >
        Playback
      </button>
    </nav>
  )
}

function DeclarativeApp() {
  return (
    <BrowserRouter>
      <RouteveilProvider>
        <Controls />
        <RouteveilView>
          <Routes>
            <Route element={<Page name="Home" />} path="/" />
            <Route element={<Page name="Page" />} path="/page" />
            <Route element={<Page name="Overlay" />} path="/overlay" />
            <Route element={<Page name="Plain" />} path="/plain" />
            <Route element={<Page name="Modified" />} path="/modified" />
            <Route element={<Page name="Programmatic" />} path="/programmatic" />
          </Routes>
        </RouteveilView>
      </RouteveilProvider>
    </BrowserRouter>
  )
}

function DataLayout() {
  return (
    <RouteveilProvider>
      <RouteveilLink
        data-action="data"
        to="/data?mode=router#outlet"
        transition="fade"
      >
        Data route
      </RouteveilLink>
      <RouteveilView />
    </RouteveilProvider>
  )
}

async function render(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  await runAct(async () => {
    root.render(element)
  })

  return {
    container,
    async unmount() {
      await runAct(async () => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function findElement<TElement extends Element>(
  container: ParentNode,
  selector: string,
): TElement {
  const element = container.querySelector<TElement>(selector)

  if (!element) {
    throw new Error(`Missing fixture element: ${selector}`)
  }

  return element
}

async function click(
  element: Element,
  init: MouseEventInit = {},
): Promise<MouseEvent> {
  const event = new MouseEvent('click', {
    bubbles: true,
    button: 0,
    cancelable: true,
    ...init,
  })

  await runAct(async () => {
    element.dispatchEvent(event)
  })

  return event
}

async function waitFor(assertion: () => void): Promise<void> {
  let latestError: unknown

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      latestError = error
      await runAct(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 5))
      })
    }
  }

  throw latestError
}

function expectClean(container: ParentNode): void {
  const view = findElement<HTMLElement>(container, '[data-routeveil-view]')

  expect(view.dataset.routeveilPhase).toBe('idle')
  expect(view.inert).toBe(false)
  expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
}

describe('packed Routeveil compatibility', () => {
  beforeEach(() => {
    reducedMotion = false
    animationCalls = 0
    animationCancellations = 0
    window.history.replaceState(null, '', '/')

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: reducedMotion,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })

    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      value: () => {
        animationCalls += 1
        return createAnimation()
      },
    })

    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback) => window.setTimeout(
        () => callback(performance.now()),
        0,
      ),
    )
    vi.stubGlobal(
      'cancelAnimationFrame',
      (handle: number) => window.clearTimeout(handle),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('runs page and overlay transitions and restores owned state', async () => {
    const app = await render(<DeclarativeApp />)

    await click(findElement(app.container, '[data-action="page"]'))
    await waitFor(() => {
      expect(findElement(app.container, '[data-location]').textContent).toContain(
        '/page?tab=api#section',
      )
      expectClean(app.container)
    })

    window.history.replaceState(null, '', '/')
    await app.unmount()
    const overlayApp = await render(<DeclarativeApp />)

    await click(findElement(overlayApp.container, '[data-action="overlay"]'))
    await waitFor(() => {
      expect(findElement(overlayApp.container, '[data-location]').textContent).toContain(
        '/overlay',
      )
      expectClean(overlayApp.container)
    })

    expect(animationCalls).toBeGreaterThan(0)
    expect(animationCancellations).toBeGreaterThan(0)
    await overlayApp.unmount()
  })

  it('preserves ordinary navigation and native modifier clicks', async () => {
    const app = await render(<DeclarativeApp />)

    await click(findElement(app.container, '[data-action="plain"]'))
    await waitFor(() => {
      expect(findElement(app.container, '[data-location]').textContent).toContain('/plain')
    })

    expect(animationCalls).toBe(0)
    await app.unmount()
    window.history.replaceState(null, '', '/')
    const modifiedApp = await render(<DeclarativeApp />)
    let preventedByApplication = true
    const stopDocumentNavigation = (event: MouseEvent) => {
      preventedByApplication = event.defaultPrevented
      event.preventDefault()
    }
    document.addEventListener('click', stopDocumentNavigation, { once: true })
    await click(
      findElement(modifiedApp.container, '[data-action="modified"]'),
      { metaKey: true },
    )

    expect(preventedByApplication).toBe(false)
    expect(window.location.pathname).toBe('/')
    expect(animationCalls).toBe(0)
    await modifiedApp.unmount()
  })

  it('supports programmatic replace, state, search, and hash navigation', async () => {
    const app = await render(<DeclarativeApp />)
    const historyLength = window.history.length

    await click(findElement(app.container, '[data-action="programmatic"]'))
    await waitFor(() => {
      const output = findElement(app.container, '[data-location]').textContent
      expect(output).toContain('/programmatic?source=hook#done')
      expect(output).toContain('"source":"hook"')
      expectClean(app.container)
    })

    expect(window.history.length).toBe(historyLength)
    await app.unmount()
  })

  it('skips animation under reduced motion', async () => {
    reducedMotion = true
    const app = await render(<DeclarativeApp />)

    await click(findElement(app.container, '[data-action="page"]'))
    await waitFor(() => {
      expect(findElement(app.container, '[data-location]').textContent).toContain('/page')
      expectClean(app.container)
    })

    expect(animationCalls).toBe(0)
    await app.unmount()
  })

  it('plays transitions without navigating', async () => {
    const app = await render(<DeclarativeApp />)

    await click(findElement(app.container, '[data-action="playback"]'))
    await waitFor(() => {
      expect(animationCalls).toBeGreaterThan(0)
      expectClean(app.container)
    })

    expect(window.location.pathname).toBe('/')
    await app.unmount()
  })

  it('supports data-router navigation through the RouteveilView outlet', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: <DataLayout />,
        children: [
          { index: true, element: <Page name="Home" /> },
          { path: 'data', element: <Page name="Data" /> },
        ],
      },
    ])
    const app = await render(<RouterProvider router={router} />)

    await click(findElement(app.container, '[data-action="data"]'))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/data')
      expect(router.state.location.search).toBe('?mode=router')
      expect(router.state.location.hash).toBe('#outlet')
      expect(findElement(app.container, 'h1').textContent).toBe('Data')
      expectClean(app.container)
    })

    await app.unmount()
    router.dispose()
  })
})
