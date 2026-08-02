import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RouteveilBetweenLayer } from '../src/react-router/RouteveilBetweenLayer'
import type { BetweenLayerHandle } from '../src/react-router/RouteveilBetweenLayer'
import { installBrowserMocks } from './browser-mocks'

afterEach(() => {
  document.documentElement.style.removeProperty('overflow')
  document.body.style.removeProperty('overflow')
  document.querySelectorAll('[data-test-overlay-boundary]').forEach((element) => {
    element.remove()
  })
})

describe('between layer', () => {
  it('uses the centralized fallback timing for appearance and disappearance', async () => {
    const browser = installBrowserMocks()
    const boundary = document.createElement('div')
    boundary.setAttribute('data-test-overlay-boundary', '')
    document.body.append(boundary)
    let handle: BetweenLayerHandle | null = null
    const view = render(
      <RouteveilBetweenLayer
        appearancePhase={null}
        disappearancePhase={null}
        fallback={<div>Between content</div>}
        hasFallback
        id={1}
        reducedMotion={false}
        registerHandle={(_, nextHandle) => {
          handle = nextHandle
        }}
        scope={{ root: boundary, type: 'overlay' }}
      />,
    )

    try {
      await waitFor(() => expect(handle).not.toBeNull())
      const activeHandle = handle as unknown as BetweenLayerHandle
      let appearance!: Promise<void>

      act(() => {
        appearance = activeHandle.appear(() => undefined)
      })

      const appearanceAnimation = browser.animations.at(-1)!
      expect(appearanceAnimation.keyframes).toEqual([
        { opacity: 0 },
        { opacity: 1 },
      ])
      expect(appearanceAnimation.options).toMatchObject({
        duration: 180,
        easing: 'ease-out',
        fill: 'forwards',
      })

      await act(async () => {
        appearanceAnimation.finish()
        await appearance
      })

      let disappearance!: Promise<void>

      act(() => {
        disappearance = activeHandle.disappear(() => undefined)
      })

      const disappearanceAnimation = browser.animations.at(-1)!
      expect(disappearanceAnimation.keyframes).toEqual([
        { opacity: 1 },
        { opacity: 0 },
      ])
      expect(disappearanceAnimation.options).toMatchObject({
        duration: 180,
        easing: 'ease-in',
        fill: 'forwards',
      })

      await act(async () => {
        disappearanceAnimation.finish()
        await disappearance
      })
    } finally {
      view.unmount()
      browser.restore()
    }
  })

  it('stacks a reduced-motion viewport layer above application content', async () => {
    let handle: BetweenLayerHandle | null = null
    const view = render(
      <RouteveilBetweenLayer
        appearancePhase={null}
        disappearancePhase={null}
        fallback={<div>Reduced-motion overlay content</div>}
        hasFallback
        id={1}
        reducedMotion
        registerHandle={(_, nextHandle) => {
          handle = nextHandle
        }}
        scope={{ root: document.body, type: 'overlay' }}
      />,
    )

    await waitFor(() => expect(handle).not.toBeNull())
    const layer = document.body.querySelector<HTMLElement>(
      '[data-routeveil-between-root]',
    )!

    expect(layer.style.position).toBe('fixed')
    expect(layer.style.zIndex).toBe('2147483647')
    expect(layer.style.getPropertyPriority('z-index')).toBe('important')

    view.unmount()
  })

  it('preserves the page view layout for playback', async () => {
    const boundary = document.createElement('div')
    const routeView = document.createElement('div')

    boundary.setAttribute('data-test-overlay-boundary', '')
    routeView.style.setProperty('display', 'grid')
    boundary.append(routeView)
    document.body.append(boundary)
    let handle: BetweenLayerHandle | null = null
    const rendered = render(
      <RouteveilBetweenLayer
        appearancePhase={null}
        disappearancePhase={null}
        fallback={<div>Playback content</div>}
        hasFallback
        id={1}
        reducedMotion
        registerHandle={(_, nextHandle) => {
          handle = nextHandle
        }}
        scope={{
          preserveViewLayout: true,
          type: 'page',
          view: routeView,
        }}
      />,
    )

    await waitFor(() => expect(handle).not.toBeNull())
    const layer = boundary.querySelector<HTMLElement>(
      '[data-routeveil-between-root]',
    )!

    expect(routeView.style.display).toBe('grid')
    expect(layer.dataset.routeveilBetweenLayout).toBe('preserve')
    expect(layer.style.position).toBe('fixed')
    expect(layer.style.width).toBe('100vw')
    expect(layer.style.height).toBe('fit-content')

    rendered.unmount()

    await waitFor(() => {
      expect(routeView.style.display).toBe('grid')
    })
  })

  it('continues replacing the page view layout during navigation', async () => {
    const boundary = document.createElement('div')
    const routeView = document.createElement('div')

    boundary.setAttribute('data-test-overlay-boundary', '')
    routeView.style.setProperty('display', 'grid')
    boundary.append(routeView)
    document.body.append(boundary)
    let handle: BetweenLayerHandle | null = null
    const rendered = render(
      <RouteveilBetweenLayer
        appearancePhase={null}
        disappearancePhase={null}
        fallback={<div>Navigation content</div>}
        hasFallback
        id={1}
        reducedMotion
        registerHandle={(_, nextHandle) => {
          handle = nextHandle
        }}
        scope={{
          preserveViewLayout: false,
          type: 'page',
          view: routeView,
        }}
      />,
    )

    await waitFor(() => expect(handle).not.toBeNull())
    const layer = boundary.querySelector<HTMLElement>(
      '[data-routeveil-between-root]',
    )!

    expect(routeView.style.display).toBe('none')
    expect(routeView.style.getPropertyPriority('display')).toBe('important')
    expect(layer.dataset.routeveilBetweenLayout).toBe('replace')
    expect(layer.style.position).toBe('relative')

    rendered.unmount()

    await waitFor(() => {
      expect(routeView.style.display).toBe('grid')
    })
  })

  it('keeps the live between DOM mounted through disappearance', async () => {
    const browser = installBrowserMocks()
    const boundary = document.createElement('div')
    boundary.setAttribute('data-test-overlay-boundary', '')
    document.body.append(boundary)
    let handle: BetweenLayerHandle | null = null
    const view = render(
      <RouteveilBetweenLayer
        appearancePhase={null}
        disappearancePhase={null}
        fallback={<div data-testid="animated-between">Between</div>}
        hasFallback
        id={1}
        reducedMotion={false}
        registerHandle={(_, nextHandle) => {
          handle = nextHandle
        }}
        scope={{ root: boundary, type: 'overlay' }}
      />,
    )

    try {
      await waitFor(() => expect(handle).not.toBeNull())
      const activeHandle = handle as unknown as BetweenLayerHandle
      const originalNode = view.getByTestId('animated-between')
      const originalHost = originalNode.closest<HTMLElement>(
        '[data-routeveil-between-fallback]',
      )!
      const renderAnimation = originalNode.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(10px)' },
      ], {
        duration: 10_000,
        iterations: Infinity,
      })

      act(() => {
        activeHandle.freeze()
      })

      expect(boundary.querySelector('[data-routeveil-between-frozen]'))
        .toBe(originalHost)
      expect(boundary.querySelector('[data-testid="animated-between"]'))
        .toBe(originalNode)
      expect(originalNode.isConnected).toBe(true)
      expect(originalNode.getAnimations()).toContain(renderAnimation)

      let disappearance!: Promise<void>

      act(() => {
        disappearance = activeHandle.disappear(() => undefined)
      })

      expect(boundary.querySelector('[data-testid="animated-between"]'))
        .toBe(originalNode)
      expect(originalNode.getAnimations()).toContain(renderAnimation)

      await act(async () => {
        browser.animations.at(-1)!.finish()
        await disappearance
      })

      expect(boundary.querySelector('[data-testid="animated-between"]'))
        .toBe(originalNode)
      expect(originalNode.getAnimations()).toContain(renderAnimation)
      renderAnimation.cancel()
    } finally {
      view.unmount()
      browser.restore()
    }
  })

  it('keeps blending on the animated host through appearance and disappearance', async () => {
    const browser = installBrowserMocks()
    const blendStyles = document.createElement('style')
    blendStyles.textContent = '.between-layer-blend-test { mix-blend-mode: difference; }'
    document.head.append(blendStyles)
    const boundary = document.createElement('div')
    boundary.setAttribute('data-test-overlay-boundary', '')
    document.body.append(boundary)
    let handle: BetweenLayerHandle | null = null
    const view = render(
      <RouteveilBetweenLayer
        appearancePhase={null}
        disappearancePhase={null}
        fallback={(
          <div>
            <img
              alt=""
              className="between-layer-blend-test"
            />
          </div>
        )}
        hasFallback
        id={1}
        reducedMotion={false}
        registerHandle={(_, nextHandle) => {
          handle = nextHandle
        }}
        scope={{ root: boundary, type: 'overlay' }}
      />,
    )

    try {
      await waitFor(() => expect(handle).not.toBeNull())
      const activeHandle = handle as unknown as BetweenLayerHandle
      const motionHost = boundary.querySelector<HTMLElement>(
        '[data-routeveil-between-motion]',
      )!
      let appearance!: Promise<void>

      act(() => {
        appearance = activeHandle.appear(() => undefined)
      })

      expect(motionHost.style.mixBlendMode).toBe('difference')
      expect(motionHost.style.getPropertyPriority('mix-blend-mode'))
        .toBe('important')

      await act(async () => {
        browser.animations.at(-1)!.finish()
        await appearance
      })

      expect(motionHost.style.mixBlendMode).toBe('')
      let disappearance!: Promise<void>

      act(() => {
        disappearance = activeHandle.disappear(() => undefined)
      })

      expect(motionHost.style.mixBlendMode).toBe('difference')

      await act(async () => {
        browser.animations.at(-1)!.finish()
        await disappearance
      })

      expect(motionHost.style.mixBlendMode).toBe('')
      view.unmount()
    } finally {
      blendStyles.remove()
      browser.restore()
    }
  })

  it('keeps overlay content blendable and prevents viewport scrolling', async () => {
    document.documentElement.style.setProperty('overflow', 'auto')
    document.body.style.setProperty('overflow', 'visible')
    const boundary = document.createElement('div')
    boundary.setAttribute('data-test-overlay-boundary', '')
    document.body.append(boundary)
    let handle: BetweenLayerHandle | null = null
    const view = render(
      <RouteveilBetweenLayer
        appearancePhase={null}
        disappearancePhase={null}
        fallback={(
          <img
            alt=""
            data-testid="blend-content"
            style={{ mixBlendMode: 'multiply' }}
          />
        )}
        hasFallback
        id={1}
        reducedMotion
        registerHandle={(_, nextHandle) => {
          handle = nextHandle
        }}
        scope={{ root: boundary, type: 'overlay' }}
      />,
    )

    await waitFor(() => expect(handle).not.toBeNull())
    const layer = boundary.querySelector<HTMLElement>(
      '[data-routeveil-between-root]',
    )!
    const motionHost = layer.querySelector<HTMLElement>(
      '[data-routeveil-between-motion]',
    )!
    const contentHost = layer.querySelector<HTMLElement>(
      '[data-routeveil-between-fallback]',
    )!
    const content = view.getByTestId('blend-content')

    expect(content.style.mixBlendMode).toBe('multiply')
    expect(boundary.style.zIndex).toBe('')
    expect(layer.style.zIndex).toBe('')

    for (const engineHost of [layer, motionHost, contentHost]) {
      expect(engineHost.style.isolation).toBe('auto')
      expect(engineHost.style.contain).toBe('none')
    }

    expect(layer.style.overflow).toBe('hidden')
    expect(layer.style.overscrollBehavior).toBe('none')
    expect(layer.style.height).toBe('100%')
    expect(layer.style.maxHeight).toBe('100%')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')

    const wheel = new Event('wheel', { bubbles: true, cancelable: true })
    document.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)

    const touchMove = new Event('touchmove', {
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(touchMove)
    expect(touchMove.defaultPrevented).toBe(true)

    view.unmount()
    await waitFor(() => {
      expect(boundary.querySelector('[data-routeveil-between-root]')).toBeNull()
    })

    expect(document.documentElement.style.overflow).toBe('auto')
    expect(document.body.style.overflow).toBe('visible')
    const releasedWheel = new Event('wheel', {
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(releasedWheel)
    expect(releasedWheel.defaultPrevented).toBe(false)
  })
})
