import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ClockOverlay,
  type ClockDirection,
} from '../src/core/overlays/ClockOverlay'
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

describe('ClockOverlay', () => {
  it('uses the cursor origin and covers its padded farthest corner', () => {
    setViewport(300, 200)
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(
      <ClockOverlay
        clickPosition={{ x: 25, y: 175 }}
        controllerRef={controller}
        options={{ origin: 'cursor', startAngle: 765 }}
      />,
    )
    const root = view.container.querySelector<SVGSVGElement>(
      '[data-routeveil-clock]',
    )!
    const sweep = view.container.querySelector<SVGCircleElement>(
      '[data-routeveil-clock-sweep]',
    )!
    const coverRadius = Math.hypot(275, 175) + 2

    expect(root).toHaveAttribute('viewBox', '0 0 300 200')
    expect(root).toHaveAttribute('data-origin', 'cursor')
    expect(sweep).toHaveAttribute('cx', '25')
    expect(sweep).toHaveAttribute('cy', '175')
    expect(Number(sweep.getAttribute('r'))).toBeCloseTo(coverRadius / 2)
    expect(Number(sweep.getAttribute('stroke-width'))).toBeCloseTo(coverRadius)
    expect(
      Number(sweep.getAttribute('r'))
      + Number(sweep.getAttribute('stroke-width')) / 2,
    ).toBeGreaterThan(Math.hypot(275, 175))
    expect(sweep).toHaveAttribute('pathLength', '1')
    expect(sweep).toHaveAttribute('transform', 'rotate(45 25 175)')
  })

  it('honors explicit center and centers cursor origin without click data', () => {
    setViewport(300, 200)
    const view = render(
      <>
        <ClockOverlay
          clickPosition={{ x: 10, y: 15 }}
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ origin: 'center' }}
        />
        <ClockOverlay
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ origin: 'cursor' }}
        />
      </>,
    )
    const roots = [
      ...view.container.querySelectorAll<SVGSVGElement>(
        '[data-routeveil-clock]',
      ),
    ]
    const sweeps = [
      ...view.container.querySelectorAll<SVGCircleElement>(
        '[data-routeveil-clock-sweep]',
      ),
    ]

    expect(roots[0]).toHaveAttribute('data-origin', 'center')
    expect(roots[1]).toHaveAttribute('data-origin', 'cursor')
    for (const sweep of sweeps) {
      expect(sweep).toHaveAttribute('cx', '150')
      expect(sweep).toHaveAttribute('cy', '100')
      expect(sweep).toHaveAttribute('transform', 'rotate(-90 150 100)')
      expect(
        Number(sweep.getAttribute('r'))
        + Number(sweep.getAttribute('stroke-width')) / 2,
      ).toBeGreaterThan(Math.hypot(150, 100))
    }
  })

  it.each<{
    coverStart: number
    direction: ClockDirection
    revealEnd: number
  }>([
    { direction: 'clockwise', coverStart: 1, revealEnd: -1 },
    { direction: 'counterclockwise', coverStart: -1, revealEnd: 1 },
  ])(
    'uses continuous $direction keyframes for cover and reveal',
    async ({ coverStart, direction, revealEnd }) => {
      const controller = createRef<OverlayAnimationHandle>()
      const view = render(
        <ClockOverlay
          controllerRef={controller}
          options={{ direction, duration: 120, easing: 'ease-in-out' }}
        />,
      )
      const root = view.container.querySelector('[data-routeveil-clock]')!

      expect(root).toHaveAttribute('data-direction', direction)

      let cover!: Promise<void>
      act(() => {
        cover = controller.current!.cover()
      })
      const coverAnimation = browser.animations[0]!

      expect(animationKeyframes(coverAnimation)).toEqual([
        { strokeDashoffset: coverStart },
        { strokeDashoffset: 0 },
      ])
      expect(coverAnimation.options).toMatchObject({
        duration: 120,
        easing: 'ease-in-out',
        fill: 'forwards',
      })
      await finishAnimation(coverAnimation, cover)

      let reveal!: Promise<void>
      act(() => {
        reveal = controller.current!.reveal()
      })
      const revealAnimation = browser.animations[1]!

      expect(animationKeyframes(revealAnimation)).toEqual([
        { strokeDashoffset: 0 },
        { strokeDashoffset: revealEnd },
      ])
      await finishAnimation(revealAnimation, reveal)
    },
  )

  it('waits for cover completion and persists full coverage before resolving', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(<ClockOverlay controllerRef={controller} />)
    const sweep = view.container.querySelector<SVGCircleElement>(
      '[data-routeveil-clock-sweep]',
    )!
    let settled = false
    let offsetAtResolution: string | undefined
    let cover!: Promise<void>

    act(() => {
      cover = controller.current!.cover()
      void cover.then(() => {
        settled = true
        offsetAtResolution = sweep.style.strokeDashoffset
      })
    })

    await act(async () => Promise.resolve())
    expect(settled).toBe(false)

    await finishAnimation(browser.animations[0]!, cover)

    expect(settled).toBe(true)
    expect(offsetAtResolution).toBe('0')
    expect(sweep.style.strokeDashoffset).toBe('0')
  })

  it('falls back safely for malformed runtime options', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(
      <ClockOverlay
        controllerRef={controller}
        options={{
          color: 'transparent',
          direction: 'sideways',
          duration: Number.NaN,
          easing: '',
          origin: 'outside',
          startAngle: Number.POSITIVE_INFINITY,
        }}
      />,
    )
    const root = view.container.querySelector('[data-routeveil-clock]')!
    const sweep = view.container.querySelector<SVGCircleElement>(
      '[data-routeveil-clock-sweep]',
    )!

    expect(root).toHaveAttribute('data-direction', 'clockwise')
    expect(root).toHaveAttribute('data-origin', 'center')
    expect(sweep).toHaveAttribute('stroke', '#0a0a0a')
    expect(sweep).toHaveAttribute('cx', String(window.innerWidth / 2))
    expect(sweep).toHaveAttribute('cy', String(window.innerHeight / 2))
    expect(sweep.getAttribute('transform')).toMatch(/^rotate\(-90 /)
    expect(sweep.style.strokeDashoffset).toBe('1')

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })

    expect(browser.animations[0]?.options).toMatchObject({
      duration: 720,
      easing: 'linear',
      fill: 'forwards',
    })
    await finishAnimation(browser.animations[0]!, cover)
  })

  it('cancels active work on reset and unmount without stale final frames', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(<ClockOverlay controllerRef={controller} />)
    const sweep = view.container.querySelector<SVGCircleElement>(
      '[data-routeveil-clock-sweep]',
    )!

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })
    const coverAnimation = browser.animations[0]!

    act(() => controller.current!.reset())
    expect(coverAnimation.animation.cancel).toHaveBeenCalled()
    expect(sweep.style.opacity).toBe('1')
    expect(sweep.style.strokeDashoffset).toBe('1')

    await finishAnimation(coverAnimation, cover)
    expect(sweep.style.strokeDashoffset).toBe('1')

    let reveal!: Promise<void>
    act(() => {
      reveal = controller.current!.reveal()
    })
    const revealAnimation = browser.animations[1]!

    view.unmount()
    expect(revealAnimation.animation.cancel).toHaveBeenCalled()

    await finishAnimation(revealAnimation, reveal)
  })
})
