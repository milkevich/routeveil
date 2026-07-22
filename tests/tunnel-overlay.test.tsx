import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TunnelOverlay } from '../src/core/overlays/TunnelOverlay'
import type { OverlayAnimationHandle } from '../src/core/transitions/types'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

const initialInnerWidth = window.innerWidth
const initialInnerHeight = window.innerHeight

let browser: BrowserMocks

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  })
}

function animationKeyframes(animation: ControlledAnimation): Keyframe[] {
  expect(Array.isArray(animation.keyframes)).toBe(true)
  return animation.keyframes as Keyframe[]
}

async function finishAnimation(
  animation: ControlledAnimation,
  phase: Promise<void>,
): Promise<void> {
  await act(async () => {
    animation.finish()
    await phase
  })
}

beforeEach(() => {
  browser = installBrowserMocks()
})

afterEach(() => {
  browser.restore()
  setViewport(initialInnerWidth, initialInnerHeight)
})

describe('TunnelOverlay', () => {
  it('uses click geometry and centers cursor origin without a programmatic click', () => {
    setViewport(300, 200)

    const { container } = render(
      <>
        <TunnelOverlay
          clickPosition={{ x: 25, y: 175 }}
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ color: '#304050', origin: 'cursor' }}
        />
        <TunnelOverlay
          clickPosition={{ x: 10, y: 15 }}
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ origin: 'center' }}
        />
        <TunnelOverlay
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ origin: 'cursor' }}
        />
      </>,
    )

    const roots = [
      ...container.querySelectorAll<HTMLElement>('[data-routeveil-tunnel]'),
    ]
    expect(roots).toHaveLength(3)

    const expectGeometry = (
      root: HTMLElement,
      x: number,
      y: number,
      radius: number,
    ) => {
      const coverLayer = root.querySelector('[data-routeveil-tunnel-cover]')
      const revealLayer = root.querySelector('[data-routeveil-tunnel-reveal]')
      const circles = [
        coverLayer?.querySelector('[data-routeveil-halo-circle]'),
        revealLayer?.querySelector('mask circle'),
      ]
      expect(coverLayer).not.toBeNull()
      expect(revealLayer).not.toBeNull()

      for (const circle of circles) {
        expect(circle).not.toBeNull()
        expect(circle).toHaveAttribute('cx', String(x))
        expect(circle).toHaveAttribute('cy', String(y))
        expect(Number(circle?.getAttribute('r'))).toBeCloseTo(radius)
      }
    }

    expectGeometry(roots[0]!, 25, 175, Math.hypot(275, 175) + 2)
    expectGeometry(roots[1]!, 150, 100, Math.hypot(150, 100) + 2)
    expectGeometry(roots[2]!, 150, 100, Math.hypot(150, 100) + 2)
    expect(roots[0]!.querySelector('[fill="#304050"]')).not.toBeNull()
  })

  it('finishes a full halo cover before resolving and then performs an iris reveal', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const { container } = render(
      <TunnelOverlay
        controllerRef={controller}
        options={{
          duration: 900,
          coverDuration: 120,
          revealDuration: 180,
          easing: 'linear',
        }}
      />,
    )
    const coverLayer = container.querySelector<HTMLElement>(
      '[data-routeveil-tunnel-cover]',
    )!
    const revealLayer = container.querySelector<HTMLElement>(
      '[data-routeveil-tunnel-reveal]',
    )!
    const revealCircle = revealLayer.querySelector<SVGCircleElement>(
      'mask circle',
    )!

    expect(coverLayer.style.opacity).toBe('1')
    expect(revealLayer.style.opacity).toBe('0')

    let cover!: Promise<void>
    let coverResolved = false
    act(() => {
      cover = controller.current!.cover()
      void cover.then(() => {
        coverResolved = true
      })
    })

    const coverAnimation = browser.animations[0]!
    expect(animationKeyframes(coverAnimation)).toEqual([
      { transform: 'scale(0)' },
      { transform: 'scale(1)' },
    ])
    expect(coverAnimation.options).toMatchObject({
      duration: 120,
      easing: 'linear',
      fill: 'forwards',
    })
    await act(async () => Promise.resolve())
    expect(coverResolved).toBe(false)

    await finishAnimation(coverAnimation, cover)
    expect(coverResolved).toBe(true)
    expect(coverLayer.style.opacity).toBe('1')
    expect(revealLayer.style.opacity).toBe('0')

    let reveal!: Promise<void>
    act(() => {
      reveal = controller.current!.reveal()
    })
    const revealAnimation = browser.animations[1]!

    expect(revealCircle.style.transform).toBe('scale(0)')
    expect(revealLayer.style.opacity).toBe('1')
    expect(coverLayer.style.opacity).toBe('0')
    expect(animationKeyframes(revealAnimation)).toEqual([
      { transform: 'scale(0)' },
      { transform: 'scale(1)' },
    ])
    expect(revealAnimation.options).toMatchObject({
      duration: 180,
      easing: 'linear',
      fill: 'forwards',
    })
    await finishAnimation(revealAnimation, reveal)
  })

  it('uses the shared duration for both phases when overrides are omitted', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    render(
      <TunnelOverlay controllerRef={controller} options={{ duration: 75 }} />,
    )

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })
    const coverAnimation = browser.animations[0]!
    expect(coverAnimation.options).toMatchObject({ duration: 75 })
    await finishAnimation(coverAnimation, cover)

    let reveal!: Promise<void>
    act(() => {
      reveal = controller.current!.reveal()
    })
    const revealAnimation = browser.animations[1]!
    expect(revealAnimation.options).toMatchObject({ duration: 75 })
    await finishAnimation(revealAnimation, reveal)
  })

  it('resets both phases and cancels active animation work on reset and unmount', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(
      <TunnelOverlay controllerRef={controller} options={{ duration: 100 }} />,
    )
    const coverCircle = view.container.querySelector<SVGCircleElement>(
      '[data-routeveil-tunnel-cover] [data-routeveil-halo-circle]',
    )!
    const revealCircle = view.container.querySelector<SVGCircleElement>(
      '[data-routeveil-tunnel-reveal] mask circle',
    )!

    let completedCover!: Promise<void>
    act(() => {
      completedCover = controller.current!.cover()
    })
    const completedAnimation = browser.animations[0]!
    await finishAnimation(completedAnimation, completedCover)

    act(() => controller.current!.reset())
    expect(completedAnimation.animation.cancel).toHaveBeenCalled()
    expect(coverCircle.style.transform).toBe('scale(0)')
    expect(revealCircle.style.transform).toBe('scale(1)')

    let interruptedReveal!: Promise<void>
    act(() => {
      interruptedReveal = controller.current!.reveal()
    })
    const revealAnimation = browser.animations[1]!

    act(() => controller.current!.reset())
    expect(revealAnimation.animation.cancel).toHaveBeenCalled()
    expect(coverCircle.style.transform).toBe('scale(0)')
    expect(revealCircle.style.transform).toBe('scale(1)')
    await finishAnimation(revealAnimation, interruptedReveal)

    let activeCover!: Promise<void>
    act(() => {
      activeCover = controller.current!.cover()
    })
    const activeAnimation = browser.animations[2]!

    view.unmount()
    expect(activeAnimation.animation.cancel).toHaveBeenCalled()
    await finishAnimation(activeAnimation, activeCover)
  })
})
