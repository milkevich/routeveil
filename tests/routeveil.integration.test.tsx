import { createRef, useImperativeHandle, useState } from 'react'
import {
  Link,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  createMemoryRouter,
  useLocation,
} from 'react-router-dom'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilNavigate,
} from '../src/react-router'
import type { OverlayRendererProps } from '../src/core'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

let browser: BrowserMocks

beforeEach(() => {
  browser = installBrowserMocks()
})

afterEach(() => {
  browser.restore()
})

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function finish(animation: ControlledAnimation): Promise<void> {
  await act(async () => {
    animation.finish()
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function flushFrame(): Promise<void> {
  await act(async () => {
    browser.flushFrame()
    await Promise.resolve()
    await Promise.resolve()
  })
}

function Home() {
  return <h1>Home page</h1>
}

function About() {
  return <h1>About page</h1>
}

function Projects() {
  return <h1>Projects page</h1>
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function DeclarativeApp({
  preventScrollReset,
  smoothScrollToTop,
  transition = 'fade',
  transitionOptions,
}: {
  preventScrollReset?: boolean
  smoothScrollToTop?: boolean
  transition?: string
  transitionOptions?: unknown
}) {
  return (
    <RouteveilProvider>
      <header data-testid="header">
        Persistent header
        <RouteveilLink
          to="/about"
          preventScrollReset={preventScrollReset}
          smoothScrollToTop={smoothScrollToTop}
          transition={transition}
          transitionOptions={transitionOptions}
        >
          About
        </RouteveilLink>
        <RouteveilLink to="/projects" transition="fade">
          Projects
        </RouteveilLink>
      </header>
      <LocationProbe />
      <RouteveilView className="route-content" style={{ color: 'rgb(1, 2, 3)' }}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="projects" element={<Projects />} />
        </Routes>
      </RouteveilView>
      <footer data-testid="footer">Persistent footer</footer>
    </RouteveilProvider>
  )
}

describe('RouteveilView and page transitions', () => {
  it('renders supplied children and never animates an initial direct render', () => {
    const ref = createRef<HTMLDivElement>()

    render(
      <MemoryRouter initialEntries={['/about']}>
        <RouteveilProvider>
          <RouteveilView
            className="custom-view"
            ref={ref}
            style={{ paddingTop: 12 }}
          >
            <Routes>
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    const view = screen.getByText('About page').parentElement
    expect(view).toBe(ref.current)
    expect(view).toHaveAttribute('data-routeveil-view', '')
    expect(view).toHaveAttribute('data-routeveil-phase', 'idle')
    expect(view).toHaveClass('custom-view')
    expect(view).toHaveStyle({ paddingTop: '12px' })
    expect(browser.animations).toHaveLength(0)
  })

  it('renders an Outlet when children are omitted in a real data router', async () => {
    function RootLayout() {
      return (
        <RouteveilProvider>
          <header>Data header</header>
          <RouteveilView />
          <footer>Data footer</footer>
        </RouteveilProvider>
      )
    }

    const router = createMemoryRouter([
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'about', element: <About /> },
        ],
      },
    ], { initialEntries: ['/about'] })

    render(<RouterProvider router={router} />)

    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')
    expect(view).not.toBeNull()
    expect(within(view!).getByRole('heading', { name: 'About page' })).toBeVisible()

    await act(async () => {
      await router.navigate('/')
    })

    expect(within(view!).getByRole('heading', { name: 'Home page' })).toBeVisible()
    expect(browser.animations).toHaveLength(0)
  })

  it('orders exit, navigation, double RAF, enter, and restores the persistent view', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <DeclarativeApp />
      </MemoryRouter>,
    )

    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')!
    const header = screen.getByTestId('header')
    const footer = screen.getByTestId('footer')
    view.inert = false

    expect(browser.animations).toHaveLength(0)
    fireEvent.click(screen.getByRole('link', { name: 'About' }))

    expect(view).toHaveAttribute('data-routeveil-phase', 'exiting')
    expect(view).toHaveAttribute('data-routeveil-transitioning', '')
    expect(view.inert).toBe(true)
    expect(browser.animations).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'About page' })).not.toBeInTheDocument()

    await finish(browser.animations[0])

    expect(screen.getByTestId('location')).toHaveTextContent('/about')
    expect(within(view).getByRole('heading', { name: 'About page' })).toBeVisible()
    expect(view).toHaveAttribute('data-routeveil-phase', 'navigating')
    expect(browser.animations).toHaveLength(1)

    await flushFrame()
    expect(browser.animations).toHaveLength(1)
    expect(view).toHaveAttribute('data-routeveil-phase', 'navigating')

    await flushFrame()
    expect(browser.animations).toHaveLength(2)
    expect(view).toHaveAttribute('data-routeveil-phase', 'entering')
    expect(browser.animations[1].element).toBe(view)

    await finish(browser.animations[1])

    expect(document.querySelector('[data-routeveil-view]')).toBe(view)
    expect(screen.getByTestId('header')).toBe(header)
    expect(screen.getByTestId('footer')).toBe(footer)
    expect(view).toHaveAttribute('data-routeveil-phase', 'idle')
    expect(view).not.toHaveAttribute('data-routeveil-transitioning')
    expect(view.inert).toBe(false)
    expect(view).toHaveClass('route-content')
    expect(view).toHaveStyle({ color: 'rgb(1, 2, 3)' })
    expect(browser.animations[0].animation.cancel).toHaveBeenCalled()
    expect(browser.animations[1].animation.cancel).toHaveBeenCalled()
    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 0,
      top: 0,
    })
  })

  it('opts declarative navigation into smooth scroll without forwarding the prop', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <DeclarativeApp smoothScrollToTop />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'About' })
    expect(link).not.toHaveAttribute('smoothscrolltotop')

    fireEvent.click(link)
    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()

    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      left: 0,
      top: 0,
    })

    await finish(browser.animations[1])
  })

  it('resolves slide direction options for both exit and enter phases', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <DeclarativeApp
          transition="slide"
          transitionOptions={{ direction: 'right' }}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    expect(browser.animations[0].keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        opacity: 0,
        transform: 'translate3d(96px, 0, 0)',
      }),
    ]))

    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()

    expect(browser.animations[1].keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        opacity: 0,
        transform: 'translate3d(-96px, 0, 0)',
      }),
    ]))

    await finish(browser.animations[1])
    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()
  })

  it('resolves left rotate options as mirrored 2D wheel phases', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <DeclarativeApp
          transition="rotate"
          transitionOptions={{ direction: 'left' }}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    expect(browser.animations[0].keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        opacity: 0,
        transform: 'translate3d(-40%, 0, 0) rotate(-18deg)',
      }),
    ]))

    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()

    expect(browser.animations[1].keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        opacity: 0,
        transform: 'translate3d(40%, 0, 0) rotate(18deg)',
      }),
    ]))

    await finish(browser.animations[1])
    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()
  })

  it('ignores a second Routeveil request while the first transition is active', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <DeclarativeApp />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    fireEvent.click(screen.getByRole('link', { name: 'Projects' }))

    expect(browser.animations).toHaveLength(1)
    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()

    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Projects page' }))
      .not.toBeInTheDocument()

    await finish(browser.animations[1])
    expect(document.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
  })

  it('does not overwrite ordinary navigation that occurs during page exit', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <RouteveilLink to="/about" transition="fade">
            Animated about
          </RouteveilLink>
          <Link to="/projects">Immediate projects</Link>
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="projects" element={<Projects />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Animated about' }))
    fireEvent.click(screen.getByRole('link', { name: 'Immediate projects' }))
    expect(screen.getByRole('heading', { name: 'Projects page' })).toBeVisible()

    await finish(browser.animations[0])

    expect(screen.getByRole('heading', { name: 'Projects page' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'About page' }))
      .not.toBeInTheDocument()
    expect(browser.animations).toHaveLength(1)
    expect(document.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
  })
})

describe('RouteveilLink navigation semantics', () => {
  function LinkSemanticsApp() {
    return (
      <RouteveilProvider>
        <LocationProbe />
        <nav>
          <RouteveilLink to="/about">Plain</RouteveilLink>
          <RouteveilLink to="/" transition="fade">Current</RouteveilLink>
          <RouteveilLink to="/about" transition="fade">Modified</RouteveilLink>
          <Link to="/projects">Standard</Link>
        </nav>
        <RouteveilView>
          <Routes>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="projects" element={<Projects />} />
          </Routes>
        </RouteveilView>
      </RouteveilProvider>
    )
  }

  it('uses normal React Router navigation when transition is omitted', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LinkSemanticsApp />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Plain' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/about')
    })
    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()
    expect(browser.animations).toHaveLength(0)
  })

  it('does not intercept modifier clicks or animate same-location clicks', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LinkSemanticsApp />
      </MemoryRouter>,
    )

    const modified = screen.getByRole('link', { name: 'Modified' })
    const modifiedEvent = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      ctrlKey: true,
    })
    let preventedByReact: boolean | undefined
    document.body.addEventListener('click', (event) => {
      preventedByReact = event.defaultPrevented
      event.preventDefault()
    }, { once: true })
    modified.dispatchEvent(modifiedEvent)

    expect(preventedByReact).toBe(false)
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(browser.animations).toHaveLength(0)

    fireEvent.click(screen.getByRole('link', { name: 'Current' }))
    await settle()

    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible()
    expect(browser.animations).toHaveLength(0)
    expect(browser.pendingFrames).toBe(0)
  })

  it('leaves standard React Router links unanimated', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LinkSemanticsApp />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Standard' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/projects')
    })
    expect(browser.animations).toHaveLength(0)
  })

  it('preserves native behavior for external, download, and non-self links', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <nav>
            <RouteveilLink
              to="https://example.com"
              transition="fade"
            >
              External
            </RouteveilLink>
            <RouteveilLink
              download="guide.pdf"
              to="/guide.pdf"
              transition="fade"
            >
              Download
            </RouteveilLink>
            <RouteveilLink
              target="_blank"
              to="/about"
              transition="fade"
            >
              New tab
            </RouteveilLink>
          </nav>
          <RouteveilView><Home /></RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    for (const name of ['External', 'Download', 'New tab']) {
      const link = screen.getByRole('link', { name })
      let routeveilPrevented = true
      document.body.addEventListener('click', (event) => {
        routeveilPrevented = event.defaultPrevented
        event.preventDefault()
      }, { once: true })

      link.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0,
        cancelable: true,
      }))

      expect(routeveilPrevented).toBe(false)
    }

    expect(browser.animations).toHaveLength(0)
  })

  it('animates same-origin absolute URLs as internal React Router links', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <RouteveilLink
            to={`${window.location.origin}/about`}
            transition="fade"
          >
            Absolute about
          </RouteveilLink>
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Absolute about' }))
    expect(browser.animations).toHaveLength(1)

    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()
    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()

    await finish(browser.animations[1])
    expect(document.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
  })
})

describe('programmatic and fallback navigation', () => {
  function ProgrammaticButton({
    preventScrollReset = true,
    smoothScrollToTop,
    transition = 'fade',
  }: {
    preventScrollReset?: boolean
    smoothScrollToTop?: boolean
    transition?: string
  }) {
    const navigate = useRouteveilNavigate()
    const [status, setStatus] = useState('ready')

    return (
      <>
        <button
          onClick={() => {
            setStatus('pending')
            void navigate('/about', {
              preventScrollReset,
              smoothScrollToTop,
              state: { source: 'programmatic' },
              transition,
            }).then(() => setStatus('done'))
          }}
        >
          Continue
        </button>
        <output data-testid="programmatic-status">{status}</output>
      </>
    )
  }

  function ProgrammaticAbout() {
    const location = useLocation()
    return (
      <h1>
        About from {String(location.state?.source)}
      </h1>
    )
  }

  it('resolves after the transition and lets preventScrollReset suppress smooth scroll', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <ProgrammaticButton smoothScrollToTop />
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<ProgrammaticAbout />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')
    expect(browser.animations).toHaveLength(1)

    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()

    expect(screen.getByRole('heading')).toHaveTextContent(
      'About from programmatic',
    )
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')
    expect(browser.animations).toHaveLength(2)

    await finish(browser.animations[1])

    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('done')
    expect(browser.scrollTo).not.toHaveBeenCalled()
  })

  it('opts programmatic navigation into smooth scroll', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <ProgrammaticButton
            preventScrollReset={false}
            smoothScrollToTop
          />
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<ProgrammaticAbout />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()

    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      left: 0,
      top: 0,
    })

    await finish(browser.animations[1])
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('done')
  })

  it('falls back to normal navigation when a page view is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <ProgrammaticButton
            preventScrollReset={false}
            transition="slide"
          />
          <Routes>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
          </Routes>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'About page' })).toBeVisible()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')
    expect(browser.animations).toHaveLength(0)
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(
      'requires a <RouteveilView>',
    ))

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')
    expect(browser.scrollTo).not.toHaveBeenCalled()

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('done')
    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 0,
      top: 0,
    })
  })

  it('falls back to normal navigation for an unknown transition', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <ProgrammaticButton
            preventScrollReset={false}
            smoothScrollToTop
            transition="test-unknown-wave"
          />
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'About page' })).toBeVisible()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')
    expect(browser.animations).toHaveLength(0)
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(
      'Unknown transition “test-unknown-wave”',
    ))

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('done')
    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      left: 0,
      top: 0,
    })
  })

  it('bypasses page and overlay animation under reduced motion', async () => {
    browser.restore()
    browser = installBrowserMocks({ reducedMotion: true })

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <ProgrammaticButton transition="wipe" />
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'About page' })).toBeVisible()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')
    expect(browser.animations).toHaveLength(0)
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('done')
    expect(browser.scrollTo).not.toHaveBeenCalled()
  })

  it('uses the same rendered-location path after an animation error', async () => {
    function RejectingOverlay({ controllerRef }: OverlayRendererProps) {
      useImperativeHandle(controllerRef, () => ({
        cover: () => Promise.reject(new Error('cover failed')),
        reveal: () => Promise.resolve(),
        reset: () => undefined,
      }), [])

      return <div data-testid="rejecting-overlay" />
    }

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider
          transitions={{
            'rejecting-overlay': {
              type: 'overlay',
              renderer: RejectingOverlay,
            },
          }}
        >
          <ProgrammaticButton
            preventScrollReset={false}
            transition="rejecting-overlay"
          />
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await settle()
    expect(screen.getByTestId('rejecting-overlay')).toBeInTheDocument()

    await flushFrame()
    await flushFrame()

    expect(await screen.findByRole('heading', { name: 'About page' })).toBeVisible()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')
    expect(browser.scrollTo).not.toHaveBeenCalled()

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('pending')

    await flushFrame()
    expect(screen.getByTestId('programmatic-status')).toHaveTextContent('done')
    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 0,
      top: 0,
    })
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(
      'transition could not finish',
    ))
    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'cover failed',
    }))
  })
})

describe('overlay transitions', () => {
  it('keeps the clock sweep mounted and opaque through its full lifecycle', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <RouteveilLink
            to="/about"
            transition="clock"
            transitionOptions={{
              color: '#345678',
              direction: 'counterclockwise',
              duration: 140,
              origin: 'cursor',
              startAngle: 35,
            }}
          >
            Clock to about
          </RouteveilLink>
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')!
    fireEvent.click(screen.getByRole('link', { name: 'Clock to about' }), {
      clientX: 91,
      clientY: 57,
      detail: 1,
    })
    await settle()

    const overlayRoot = document.querySelector<HTMLElement>(
      '[data-routeveil-overlay-root]',
    )!
    const clock = overlayRoot.querySelector<SVGSVGElement>(
      '[data-routeveil-clock]',
    )!
    const sweep = clock.querySelector<SVGCircleElement>(
      '[data-routeveil-clock-sweep]',
    )!
    expect(clock).toHaveAttribute('data-direction', 'counterclockwise')
    expect(clock).toHaveAttribute('data-origin', 'cursor')
    expect(sweep).toHaveAttribute('cx', '91')
    expect(sweep).toHaveAttribute('cy', '57')
    expect(sweep).toHaveAttribute('stroke', '#345678')
    expect(sweep).toHaveAttribute('stroke-dasharray', '1 1')
    expect(sweep).toHaveAttribute('transform', expect.stringContaining('rotate(35'))

    const [, , viewportWidth, viewportHeight] = clock
      .getAttribute('viewBox')!
      .split(' ')
      .map(Number)
    const sweepRadius = Number(sweep.getAttribute('r'))
    const sweepWidth = Number(sweep.getAttribute('stroke-width'))
    expect(sweepWidth).toBeCloseTo(sweepRadius * 2)
    expect(sweepRadius + sweepWidth / 2).toBeGreaterThan(
      Math.hypot(
        Math.max(91, viewportWidth - 91),
        Math.max(57, viewportHeight - 57),
      ),
    )

    await flushFrame()
    await flushFrame()

    expect(browser.animations).toHaveLength(1)
    expect(browser.animations[0].element).toBe(sweep)
    expect(browser.animations[0].keyframes).toEqual([
      { strokeDashoffset: -1 },
      { strokeDashoffset: 0 },
    ])
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible()
    expect(view).toHaveAttribute('data-routeveil-phase', 'covering')

    await finish(browser.animations[0])

    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()
    expect(overlayRoot).toBeInTheDocument()
    expect(overlayRoot).toHaveAttribute('data-active', 'true')
    expect(sweep.style.strokeDashoffset).toBe('0')
    expect(view).toHaveAttribute('data-routeveil-phase', 'navigating')

    await flushFrame()
    await flushFrame()

    expect(browser.animations).toHaveLength(2)
    expect(browser.animations[1].element).toBe(sweep)
    expect(browser.animations[1].keyframes).toEqual([
      { strokeDashoffset: 0 },
      { strokeDashoffset: 1 },
    ])
    expect(overlayRoot).toBeInTheDocument()
    expect(view).toHaveAttribute('data-routeveil-phase', 'revealing')

    await finish(browser.animations[1])

    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(view).toHaveAttribute('data-routeveil-phase', 'idle')
  })

  it('centers a cursor-origin clock for programmatic navigation without click data', async () => {
    function ProgrammaticClockButton() {
      const navigate = useRouteveilNavigate()

      return (
        <button
          onClick={() => {
            void navigate('/about', {
              transition: 'clock',
              transitionOptions: {
                origin: 'cursor',
                duration: 120,
              },
            })
          }}
        >
          Programmatic clock
        </button>
      )
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <ProgrammaticClockButton />
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Programmatic clock' }))
    await settle()

    const clock = document.querySelector<SVGSVGElement>(
      '[data-routeveil-clock]',
    )!
    const sweep = clock.querySelector<SVGCircleElement>(
      '[data-routeveil-clock-sweep]',
    )!
    const [, , viewportWidth, viewportHeight] = clock
      .getAttribute('viewBox')!
      .split(' ')
      .map(Number)
    const sweepRadius = Number(sweep.getAttribute('r'))
    const sweepWidth = Number(sweep.getAttribute('stroke-width'))

    expect(clock).toHaveAttribute('data-origin', 'cursor')
    expect(sweep).toHaveAttribute('cx', String(viewportWidth / 2))
    expect(sweep).toHaveAttribute('cy', String(viewportHeight / 2))
    expect(sweepRadius + sweepWidth / 2).toBeGreaterThan(
      Math.hypot(viewportWidth / 2, viewportHeight / 2),
    )

    await flushFrame()
    await flushFrame()
    await finish(browser.animations[0])
    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()

    await flushFrame()
    await flushFrame()
    await finish(browser.animations[1])
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
  })

  it('passes a link click origin through tunnel cover and reveal lifecycle', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <RouteveilLink
            to="/about"
            transition="tunnel"
            transitionOptions={{
              color: '#234567',
              origin: 'cursor',
              coverDuration: 120,
              revealDuration: 180,
            }}
          >
            Tunnel to about
          </RouteveilLink>
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Tunnel to about' }), {
      clientX: 73,
      clientY: 41,
      detail: 1,
    })
    await settle()

    const overlayRoot = document.querySelector<HTMLElement>(
      '[data-routeveil-overlay-root]',
    )!
    const coverCircle = overlayRoot.querySelector<SVGCircleElement>(
      '[data-routeveil-tunnel-cover] [data-routeveil-halo-circle]',
    )!
    const revealCircle = overlayRoot.querySelector<SVGCircleElement>(
      '[data-routeveil-tunnel-reveal] mask circle',
    )!
    expect(coverCircle).toHaveAttribute('cx', '73')
    expect(coverCircle).toHaveAttribute('cy', '41')
    expect(revealCircle).toHaveAttribute('cx', '73')
    expect(revealCircle).toHaveAttribute('cy', '41')

    await flushFrame()
    await flushFrame()

    expect(browser.animations).toHaveLength(1)
    expect(browser.animations[0].keyframes).toEqual([
      { transform: 'scale(0)' },
      { transform: 'scale(1)' },
    ])
    expect(browser.animations[0].options).toMatchObject({ duration: 120 })
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible()

    await finish(browser.animations[0])
    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()

    await flushFrame()
    await flushFrame()

    expect(browser.animations).toHaveLength(2)
    expect(browser.animations[1].keyframes).toEqual([
      { transform: 'scale(0)' },
      { transform: 'scale(1)' },
    ])
    expect(browser.animations[1].options).toMatchObject({ duration: 180 })

    await finish(browser.animations[1])
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(document.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
  })

  it('portals, covers, navigates, reveals, and removes the overlay in order', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider>
          <header data-testid="overlay-header">
            Header above the app tree
            <RouteveilLink
              to="/about"
              transition="wipe"
              transitionOptions={{ color: '#123456', direction: 'right' }}
            >
              Wipe to about
            </RouteveilLink>
          </header>
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    const header = screen.getByTestId('overlay-header')
    fireEvent.click(screen.getByRole('link', { name: 'Wipe to about' }), {
      clientX: 80,
      clientY: 120,
    })
    await settle()

    const overlayRoot = document.querySelector<HTMLElement>(
      '[data-routeveil-overlay-root]',
    )!
    expect(overlayRoot).not.toBeNull()
    expect(overlayRoot.parentElement).toBe(document.body)
    expect(overlayRoot).toHaveStyle({
      inset: '0',
      pointerEvents: 'auto',
      position: 'fixed',
      zIndex: '2147483647',
    })
    expect(overlayRoot).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible()
    expect(browser.animations).toHaveLength(0)

    await flushFrame()
    expect(browser.animations).toHaveLength(0)
    await flushFrame()

    const wipe = document.querySelector<HTMLElement>('[data-routeveil-wipe]')!
    expect(overlayRoot).toHaveAttribute('data-active', 'true')
    expect(overlayRoot).toHaveStyle({ pointerEvents: 'auto' })
    expect(wipe).toHaveStyle({ backgroundColor: '#123456' })
    expect(browser.animations).toHaveLength(1)
    expect(browser.animations[0].element).toBe(wipe)
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible()

    await finish(browser.animations[0])

    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()
    expect(browser.animations).toHaveLength(1)

    await flushFrame()
    expect(browser.animations).toHaveLength(1)
    await flushFrame()

    expect(browser.animations).toHaveLength(2)
    expect(browser.animations[1].element).toBe(wipe)
    expect(overlayRoot).toHaveAttribute('data-active', 'true')

    await finish(browser.animations[1])

    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(screen.getByTestId('overlay-header')).toBe(header)
    expect(document.querySelector('[data-routeveil-view]')).toHaveAttribute(
      'data-routeveil-phase',
      'idle',
    )
    expect(browser.animations[0].animation.cancel).toHaveBeenCalled()
    expect(browser.animations[1].animation.cancel).toHaveBeenCalled()
  })

  it('removes the portal and returns idle even when custom reset throws', async () => {
    function ThrowingResetOverlay({
      controllerRef,
    }: OverlayRendererProps) {
      useImperativeHandle(controllerRef, () => ({
        cover: () => Promise.resolve(),
        reveal: () => Promise.resolve(),
        reset: () => {
          throw new Error('reset failed')
        },
      }), [])

      return <div data-testid="throwing-reset-overlay" />
    }

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteveilProvider
          transitions={{
            'throwing-reset': {
              type: 'overlay',
              renderer: ThrowingResetOverlay,
            },
          }}
        >
          <RouteveilLink to="/about" transition="throwing-reset">
            Throwing reset
          </RouteveilLink>
          <RouteveilView>
            <Routes>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Throwing reset' }))
    await settle()
    expect(screen.getByTestId('throwing-reset-overlay')).toBeInTheDocument()

    await flushFrame()
    await flushFrame()
    await flushFrame()
    await flushFrame()
    await settle()

    expect(screen.getByRole('heading', { name: 'About page' })).toBeVisible()
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(document.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'reset failed',
    }))
  })
})
