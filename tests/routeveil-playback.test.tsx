import { useEffect } from 'react'
import {
  Route,
  RouterProvider,
  Routes,
  createMemoryRouter,
  useLocation,
} from 'react-router-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilTransition,
} from '../src/react-router'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

type PlaybackAppProps = {
  onMount?: () => void
  onStarted: (promise: Promise<void>) => void
  onUnmount?: () => void
}

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

function PlaybackControls({
  onStarted,
}: Pick<PlaybackAppProps, 'onStarted'>) {
  const playTransition = useRouteveilTransition()

  return (
    <nav>
      <button
        onClick={() => {
          onStarted(playTransition('fade'))
        }}
      >
        Play fade
      </button>
      <button
        onClick={() => {
          onStarted(playTransition('slide', {
            transitionOptions: { direction: 'right' },
          }))
        }}
      >
        Play slide
      </button>
      <button
        onClick={() => {
          onStarted(playTransition('tunnel', {
            clickPosition: { x: 73, y: 41 },
            transitionOptions: {
              color: '#234567',
              coverDuration: 120,
              origin: 'cursor',
              revealDuration: 180,
            },
          }))
        }}
      >
        Play tunnel
      </button>
    </nav>
  )
}

function PersistentLabPage({
  onMount,
  onUnmount,
}: Pick<PlaybackAppProps, 'onMount' | 'onUnmount'>) {
  useEffect(() => {
    onMount?.()
    return () => onUnmount?.()
  }, [onMount, onUnmount])

  return <h1>Routeveil Lab</h1>
}

function PlaybackApp({ onMount, onStarted, onUnmount }: PlaybackAppProps) {
  return (
    <RouteveilProvider>
      <PlaybackControls onStarted={onStarted} />
      <RouteveilView>
        <PersistentLabPage onMount={onMount} onUnmount={onUnmount} />
      </RouteveilView>
    </RouteveilProvider>
  )
}

function renderPlaybackApp(props: PlaybackAppProps) {
  const locationState = {
    filter: 'page',
    source: 'test',
  }
  const router = createMemoryRouter([
    {
      path: '*',
      element: <PlaybackApp {...props} />,
    },
  ], {
    initialEntries: [{
      hash: '#catalog',
      key: 'lab-entry',
      pathname: '/lab',
      search: '?group=page',
      state: locationState,
    }],
  })

  render(<RouterProvider router={router} />)

  return { locationState, router }
}

describe('useRouteveilTransition playback', () => {
  it('runs page exit and enter on the same mounted view without changing navigation state or scroll', async () => {
    const promises: Promise<void>[] = []
    let mounts = 0
    let unmounts = 0
    const { locationState, router } = renderPlaybackApp({
      onMount: () => {
        mounts += 1
      },
      onStarted: (promise) => promises.push(promise),
      onUnmount: () => {
        unmounts += 1
      },
    })
    const initialLocation = router.state.location
    const initialHistoryAction = router.state.historyAction
    const initialBrowserHref = window.location.href
    const initialBrowserHistoryLength = window.history.length
    const initialBrowserHistoryState = window.history.state
    const initialScroll = { x: window.scrollX, y: window.scrollY }
    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')!
    const page = screen.getByRole('heading', { name: 'Routeveil Lab' })
    view.inert = false

    fireEvent.click(screen.getByRole('button', { name: 'Play slide' }))

    expect(promises).toHaveLength(1)
    expect(browser.animations).toHaveLength(1)
    expect(browser.animations[0].element).toBe(view)
    expect(browser.animations[0].keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        opacity: 0,
        transform: 'translate3d(96px, 0, 0)',
      }),
    ]))
    expect(view).toHaveAttribute('data-routeveil-phase', 'exiting')
    expect(view).toHaveAttribute('data-routeveil-transitioning', '')
    expect(view.inert).toBe(true)
    expect(screen.getByRole('heading', { name: 'Routeveil Lab' })).toBe(page)
    expect(mounts).toBe(1)
    expect(unmounts).toBe(0)

    await finish(browser.animations[0])

    expect(view).toHaveAttribute('data-routeveil-phase', 'navigating')
    expect(router.state.location).toBe(initialLocation)
    expect(browser.animations).toHaveLength(1)

    await flushFrame()
    expect(view).toHaveAttribute('data-routeveil-phase', 'navigating')
    await flushFrame()

    expect(browser.animations).toHaveLength(2)
    expect(browser.animations[1].element).toBe(view)
    expect(browser.animations[1].keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        opacity: 0,
        transform: 'translate3d(-96px, 0, 0)',
      }),
    ]))
    expect(view).toHaveAttribute('data-routeveil-phase', 'entering')
    expect(screen.getByRole('heading', { name: 'Routeveil Lab' })).toBe(page)
    expect(mounts).toBe(1)
    expect(unmounts).toBe(0)

    await finish(browser.animations[1])
    await act(async () => promises[0])

    expect(document.querySelector('[data-routeveil-view]')).toBe(view)
    expect(screen.getByRole('heading', { name: 'Routeveil Lab' })).toBe(page)
    expect(view).toHaveAttribute('data-routeveil-phase', 'idle')
    expect(view).not.toHaveAttribute('data-routeveil-transitioning')
    expect(view.inert).toBe(false)
    expect(mounts).toBe(1)
    expect(unmounts).toBe(0)
    expect(router.state.location).toBe(initialLocation)
    expect(router.state.location).toMatchObject({
      hash: '#catalog',
      key: 'lab-entry',
      pathname: '/lab',
      search: '?group=page',
      state: locationState,
    })
    expect(router.state.historyAction).toBe(initialHistoryAction)
    expect(window.location.href).toBe(initialBrowserHref)
    expect(window.history.length).toBe(initialBrowserHistoryLength)
    expect(window.history.state).toBe(initialBrowserHistoryState)
    expect({ x: window.scrollX, y: window.scrollY }).toEqual(initialScroll)
    expect(browser.scrollTo).not.toHaveBeenCalled()
  })

  it('covers and reveals the current page while forwarding overlay options and click position', async () => {
    const promises: Promise<void>[] = []
    let mounts = 0
    let unmounts = 0
    const { router } = renderPlaybackApp({
      onMount: () => {
        mounts += 1
      },
      onStarted: (promise) => promises.push(promise),
      onUnmount: () => {
        unmounts += 1
      },
    })
    const initialLocation = router.state.location
    const initialHistoryAction = router.state.historyAction
    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')!
    const page = screen.getByRole('heading', { name: 'Routeveil Lab' })

    fireEvent.click(screen.getByRole('button', { name: 'Play tunnel' }))
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
    expect(promises).toHaveLength(1)
    expect(overlayRoot).toHaveAttribute('data-active', 'true')
    expect(coverCircle).toHaveAttribute('cx', '73')
    expect(coverCircle).toHaveAttribute('cy', '41')
    expect(coverCircle).toHaveAttribute('fill', '#234567')
    expect(revealCircle).toHaveAttribute('cx', '73')
    expect(revealCircle).toHaveAttribute('cy', '41')
    expect(screen.getByRole('heading', { name: 'Routeveil Lab' })).toBe(page)
    expect(router.state.location).toBe(initialLocation)

    await flushFrame()
    await flushFrame()

    expect(browser.animations).toHaveLength(1)
    expect(browser.animations[0].element).toBe(coverCircle)
    expect(browser.animations[0].options).toMatchObject({ duration: 120 })
    expect(view).toHaveAttribute('data-routeveil-phase', 'covering')

    await finish(browser.animations[0])

    expect(view).toHaveAttribute('data-routeveil-phase', 'navigating')
    expect(router.state.location).toBe(initialLocation)
    expect(screen.getByRole('heading', { name: 'Routeveil Lab' })).toBe(page)

    await flushFrame()
    await flushFrame()

    expect(browser.animations).toHaveLength(2)
    expect(browser.animations[1].element).toBe(revealCircle)
    expect(browser.animations[1].options).toMatchObject({ duration: 180 })
    expect(view).toHaveAttribute('data-routeveil-phase', 'revealing')

    await finish(browser.animations[1])
    await act(async () => promises[0])

    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(view).toHaveAttribute('data-routeveil-phase', 'idle')
    expect(screen.getByRole('heading', { name: 'Routeveil Lab' })).toBe(page)
    expect(mounts).toBe(1)
    expect(unmounts).toBe(0)
    expect(router.state.location).toBe(initialLocation)
    expect(router.state.historyAction).toBe(initialHistoryAction)
    expect(browser.scrollTo).not.toHaveBeenCalled()
  })

  it('shares one active playback promise, then permits different and repeated transitions', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const promises: Promise<void>[] = []
    renderPlaybackApp({
      onStarted: (promise) => promises.push(promise),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Play fade' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play slide' }))

    expect(promises).toHaveLength(2)
    expect(promises[1]).toBe(promises[0])
    expect(browser.animations).toHaveLength(1)
    expect(browser.animations[0].keyframes).toEqual([
      { opacity: 1 },
      { opacity: 0 },
    ])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(
      'transition is already in progress',
    ))

    await finish(browser.animations[0])
    await flushFrame()
    await flushFrame()
    await finish(browser.animations[1])
    await act(async () => promises[0])

    fireEvent.click(screen.getByRole('button', { name: 'Play slide' }))

    expect(promises).toHaveLength(3)
    expect(promises[2]).not.toBe(promises[0])
    expect(browser.animations).toHaveLength(3)
    expect(browser.animations[2].keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({ transform: 'translate3d(96px, 0, 0)' }),
    ]))

    await finish(browser.animations[2])
    await flushFrame()
    await flushFrame()
    await finish(browser.animations[3])
    await act(async () => promises[2])

    fireEvent.click(screen.getByRole('button', { name: 'Play slide' }))

    expect(promises).toHaveLength(4)
    expect(promises[3]).not.toBe(promises[2])
    expect(browser.animations).toHaveLength(5)

    await finish(browser.animations[4])
    await flushFrame()
    await flushFrame()
    await finish(browser.animations[5])
    await act(async () => promises[3])

    expect(document.querySelector('[data-routeveil-view]'))
      .toHaveAttribute('data-routeveil-phase', 'idle')
  })
})

function NormalDestination() {
  const location = useLocation()

  return (
    <h1>
      About from {String(location.state?.source)}
    </h1>
  )
}

function NormalNavigationApp() {
  return (
    <RouteveilProvider>
      <RouteveilLink
        state={{ source: 'lab' }}
        to="/about?mode=normal#details"
        transition="fade"
      >
        Navigate normally
      </RouteveilLink>
      <RouteveilView>
        <Routes>
          <Route path="lab" element={<h1>Routeveil Lab</h1>} />
          <Route path="about" element={<NormalDestination />} />
        </Routes>
      </RouteveilView>
    </RouteveilProvider>
  )
}

describe('normal navigation after adding playback', () => {
  it('still commits a new location between the page exit and enter phases', async () => {
    const router = createMemoryRouter([
      {
        path: '*',
        element: <NormalNavigationApp />,
      },
    ], { initialEntries: ['/lab'] })
    render(<RouterProvider router={router} />)
    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')!

    fireEvent.click(screen.getByRole('link', { name: 'Navigate normally' }))

    expect(browser.animations).toHaveLength(1)
    expect(view).toHaveAttribute('data-routeveil-phase', 'exiting')
    expect(router.state.location.pathname).toBe('/lab')

    await finish(browser.animations[0])

    expect(router.state.location).toMatchObject({
      hash: '#details',
      pathname: '/about',
      search: '?mode=normal',
      state: { source: 'lab' },
    })
    expect(router.state.historyAction).toBe('PUSH')
    expect(screen.getByRole('heading')).toHaveTextContent('About from lab')
    expect(view).toHaveAttribute('data-routeveil-phase', 'navigating')

    await flushFrame()
    await flushFrame()

    expect(browser.animations).toHaveLength(2)
    expect(view).toHaveAttribute('data-routeveil-phase', 'entering')
    expect(browser.scrollTo).not.toHaveBeenCalled()

    await finish(browser.animations[1])

    expect(view).toHaveAttribute('data-routeveil-phase', 'idle')
    expect(screen.getByRole('heading')).toHaveTextContent('About from lab')
  })
})
