import { Suspense } from 'react'
import {
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom'
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
} from '../src/react-router'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type RenderGate = {
  promise: Promise<void>
  release: () => void
  readonly ready: boolean
}

function createRenderGate(): RenderGate {
  let resolvePromise!: () => void
  let ready = false
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    release() {
      ready = true
      resolvePromise()
    },
    get ready() {
      return ready
    },
  }
}

function runningViewAnimations(
  animations: readonly ControlledAnimation[],
): ControlledAnimation[] {
  return animations.filter((animation) => (
    animation.status === 'running'
    && animation.element.hasAttribute('data-routeveil-view')
  ))
}

let restoreBrowser: (() => void) | null = null

afterEach(() => {
  restoreBrowser?.()
  restoreBrowser = null
})

describe('rendered location commits', () => {
  it('does not enter the outgoing route while the destination render is suspended', async () => {
    const browser = installBrowserMocks()
    restoreBrowser = browser.restore
    const gate = createRenderGate()

    function Documentation() {
      if (!gate.ready) {
        throw gate.promise
      }

      return <h1>Documentation</h1>
    }

    function Layout() {
      return (
        <RouteveilProvider
          transitions={{
            controlled: {
              type: 'page',
              exit: {
                keyframes: [{ opacity: 1 }, { opacity: 0 }],
                options: { duration: 100, fill: 'forwards' },
              },
              enter: {
                keyframes: [{ opacity: 0 }, { opacity: 1 }],
                options: { duration: 100, fill: 'both' },
              },
            },
          }}
        >
          <RouteveilLink
            data-testid="docs-link"
            to="/docs"
            transition="controlled"
          >
            Docs
          </RouteveilLink>
          <RouteveilView />
        </RouteveilProvider>
      )
    }

    const router = createMemoryRouter([
      {
        path: '/',
        element: <Layout />,
        children: [
          {
            path: 'lab',
            element: <h1>Laboratory</h1>,
          },
          {
            path: 'docs',
            element: <Documentation />,
          },
        ],
      },
    ], {
      initialEntries: ['/lab'],
    })

    render(
      <Suspense fallback={<div>Loading documentation</div>}>
        <RouterProvider router={router} />
      </Suspense>,
    )

    fireEvent.click(screen.getByTestId('docs-link'))
    const [exit] = runningViewAnimations(browser.animations)

    expect(exit).toBeDefined()

    await act(async () => {
      exit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(router.state.location.pathname).toBe('/docs')
    expect(screen.getByRole('heading', { name: 'Laboratory' })).toBeInTheDocument()

    await act(async () => {
      browser.flushFrames(4)
      await Promise.resolve()
      await Promise.resolve()
    })

    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')

    expect(view?.dataset.routeveilPhase).toBe('navigating')
    expect(runningViewAnimations(browser.animations)).toHaveLength(0)
    expect(exit!.animation.cancel).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Laboratory' })).toBeInTheDocument()

    await act(async () => {
      gate.release()
      await gate.promise
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.queryByRole('heading', { name: 'Laboratory' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument()
    expect(view?.dataset.routeveilPhase).toBe('navigating')
    expect(runningViewAnimations(browser.animations)).toHaveLength(0)

    await act(async () => {
      browser.flushFrames(2)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(view?.dataset.routeveilPhase).toBe('entering')

    const [enter] = runningViewAnimations(browser.animations)

    expect(enter).toBeDefined()

    await act(async () => {
      enter!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(view?.dataset.routeveilPhase).toBe('idle')
  })
})
