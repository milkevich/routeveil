import { act, fireEvent, render, screen } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LabRuntime } from '../src/app/pages/lab/LabRuntime'
import {
  RouteveilProvider,
  RouteveilView,
} from '../src/react-router'
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

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function renderLab() {
  const router = createMemoryRouter([
    {
      path: '/lab',
      element: (
        <RouteveilProvider>
          <RouteveilView>
            <LabRuntime />
          </RouteveilView>
        </RouteveilProvider>
      ),
    },
  ], {
    initialEntries: ['/lab?group=all#catalog'],
  })

  render(<RouterProvider router={router} />)
  return router
}

describe('Lab card playback', () => {
  it('plays a page transition immediately without selecting or navigating', async () => {
    const router = renderLab()
    const initialLocation = router.state.location
    const initialHistoryAction = router.state.historyAction
    const initialHref = window.location.href
    const initialHistoryLength = window.history.length
    const initialHistoryState = window.history.state
    const initialScroll = { x: window.scrollX, y: window.scrollY }
    const view = document.querySelector<HTMLElement>('[data-routeveil-view]')!
    const lab = document.querySelector<HTMLElement>('.lab-page')!
    const slide = screen.getByRole('button', {
      name: 'Play slide transition',
    })

    expect(slide).not.toHaveAttribute('aria-pressed')
    expect(document.querySelector('.lab-controls')).toBeNull()

    fireEvent.click(slide)

    expect(slide).toBeDisabled()
    expect(slide).not.toHaveAttribute('aria-pressed')
    expect(browser.animations).toHaveLength(1)
    expect(browser.animations[0]?.element).toBe(view)
    expect(browser.animations[0]?.keyframes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        opacity: 0,
        transform: 'translate3d(-96px, 0, 0)',
      }),
    ]))
    expect(view).toHaveAttribute('data-routeveil-phase', 'exiting')

    await finish(browser.animations[0]!)
    await flushFrame()
    await flushFrame()

    expect(browser.animations[1]?.element).toBe(view)
    expect(view).toHaveAttribute('data-routeveil-phase', 'entering')
    expect(document.querySelector('.lab-page')).toBe(lab)

    await finish(browser.animations[1]!)
    await settle()

    expect(router.state.location).toBe(initialLocation)
    expect(router.state.historyAction).toBe(initialHistoryAction)
    expect(window.location.href).toBe(initialHref)
    expect(window.history.length).toBe(initialHistoryLength)
    expect(window.history.state).toBe(initialHistoryState)
    expect({ x: window.scrollX, y: window.scrollY }).toEqual(initialScroll)
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(slide).not.toBeDisabled()
    expect(slide).not.toHaveAttribute('aria-pressed')
    expect(slide).toHaveFocus()
  })

  it('uses the clicked card center for an origin-based overlay', async () => {
    const router = renderLab()
    const initialLocation = router.state.location
    const halo = screen.getByRole('button', {
      name: 'Play halo transition',
    })

    halo.getBoundingClientRect = () => ({
      bottom: 260,
      height: 40,
      left: 100,
      right: 180,
      top: 220,
      width: 80,
      x: 100,
      y: 220,
      toJSON: () => undefined,
    })

    fireEvent.click(halo)
    await settle()

    const circle = document.querySelector<SVGCircleElement>(
      '[data-routeveil-halo-circle]',
    )!
    expect(circle).toHaveAttribute('cx', '140')
    expect(circle).toHaveAttribute('cy', '240')

    await flushFrame()
    await flushFrame()
    await finish(browser.animations[0]!)
    await flushFrame()
    await flushFrame()
    await finish(browser.animations[1]!)
    await settle()

    expect(router.state.location).toBe(initialLocation)
    expect(document.querySelector('[data-routeveil-overlay-root]')).toBeNull()
    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(halo).not.toHaveAttribute('aria-pressed')
    expect(halo).not.toBeDisabled()
    expect(halo).toHaveFocus()
  })
})
