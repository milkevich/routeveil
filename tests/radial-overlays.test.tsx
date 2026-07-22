import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HaloOverlay } from '../src/core/overlays/HaloOverlay'
import { IrisOverlay } from '../src/core/overlays/IrisOverlay'
import {
  radialGeometry,
  safeRadialOrigin,
} from '../src/core/overlays/radial-geometry'
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

beforeEach(() => {
  browser = installBrowserMocks()
})

afterEach(() => {
  browser.restore()
  setViewport(initialInnerWidth, initialInnerHeight)
})

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

describe('radial overlay geometry', () => {
  it('uses the farthest corner from a clamped cursor origin', () => {
    const geometry = radialGeometry(
      { width: 320, height: 180 },
      'cursor',
      { x: 40, y: 150 },
      6,
    )

    expect(geometry).toEqual({
      x: 40,
      y: 150,
      radius: Math.hypot(280, 150) + 6,
    })

    expect(
      radialGeometry(
        { width: 320, height: 180 },
        'cursor',
        { x: -50, y: 999 },
      ),
    ).toEqual({
      x: 0,
      y: 180,
      radius: Math.hypot(320, 180),
    })
  })

  it('falls back to the viewport center for a missing or invalid cursor', () => {
    const centered = {
      x: 160,
      y: 90,
      radius: Math.hypot(160, 90),
    }

    expect(
      radialGeometry({ width: 320, height: 180 }, 'cursor', undefined),
    ).toEqual(centered)
    expect(
      radialGeometry(
        { width: 320, height: 180 },
        'cursor',
        { x: Number.NaN, y: 12 },
      ),
    ).toEqual(centered)
    expect(safeRadialOrigin('unexpected')).toBe('cursor')
  })
})

describe('IrisOverlay', () => {
  it('renders an inverted circular SVG mask with a unique identifier', () => {
    setViewport(320, 180)

    const { container } = render(
      <>
        <IrisOverlay
          clickPosition={{ x: 40, y: 150 }}
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ color: '#123456', origin: 'cursor' }}
        />
        <IrisOverlay
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ origin: 'center' }}
        />
      </>,
    )

    const masks = [...container.querySelectorAll('mask')]
    const covers = [
      ...container.querySelectorAll('[data-routeveil-iris-cover]'),
    ]
    const circles = [...container.querySelectorAll('mask circle')]

    expect(masks).toHaveLength(2)
    expect(masks[0]?.id).toMatch(/^routeveil-iris-mask-/)
    expect(masks[1]?.id).toMatch(/^routeveil-iris-mask-/)
    expect(masks[0]?.id).not.toBe(masks[1]?.id)
    expect(covers[0]).toHaveAttribute('mask', `url(#${masks[0]?.id})`)
    expect(covers[0]).toHaveAttribute('fill', '#123456')
    expect(masks[0]?.querySelector('rect')).toHaveAttribute('fill', 'white')
    expect(circles[0]).toHaveAttribute('fill', 'black')
    expect(circles[0]).toHaveAttribute('cx', '40')
    expect(circles[0]).toHaveAttribute('cy', '150')
    expect(Number(circles[0]?.getAttribute('r'))).toBeCloseTo(
      Math.hypot(280, 150) + 2,
    )
    expect(circles[1]).toHaveAttribute('cx', '160')
    expect(circles[1]).toHaveAttribute('cy', '90')
  })
})

describe('HaloOverlay', () => {
  it('uses Iris timing with the exact opposite cover direction', async () => {
    const irisController = createRef<OverlayAnimationHandle>()
    const haloController = createRef<OverlayAnimationHandle>()
    render(
      <>
        <IrisOverlay controllerRef={irisController} />
        <HaloOverlay controllerRef={haloController} />
      </>,
    )

    let irisCover!: Promise<void>
    let haloCover!: Promise<void>
    act(() => {
      irisCover = irisController.current!.cover()
      haloCover = haloController.current!.cover()
    })
    const irisAnimation = browser.animations[0]!
    const haloAnimation = browser.animations[1]!

    expect(animationKeyframes(irisAnimation)).toEqual([
      { transform: 'scale(1)' },
      { transform: 'scale(0)' },
    ])
    expect(animationKeyframes(haloAnimation)).toEqual([
      { transform: 'scale(0)' },
      { transform: 'scale(1)' },
    ])
    expect(haloAnimation.options).toEqual(irisAnimation.options)

    await act(async () => {
      irisAnimation.finish()
      haloAnimation.finish()
      await Promise.all([irisCover, haloCover])
    })
  })

  it('renders one simple circle per instance using farthest-corner geometry', () => {
    setViewport(300, 200)

    const { container } = render(
      <>
        <HaloOverlay
          clickPosition={{ x: 25, y: 175 }}
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ color: '#304050', origin: 'cursor' }}
        />
        <HaloOverlay
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={{ origin: 'center' }}
        />
      </>,
    )

    const roots = [
      ...container.querySelectorAll<SVGSVGElement>('[data-routeveil-halo]'),
    ]
    const circles = [
      ...container.querySelectorAll<SVGCircleElement>(
        '[data-routeveil-halo-circle]',
      ),
    ]

    expect(roots).toHaveLength(2)
    expect(circles).toHaveLength(2)
    expect(circles[0]).not.toBe(circles[1])
    expect(container.querySelector('defs, filter, mask')).toBeNull()
    expect(roots[0]?.querySelectorAll('circle')).toHaveLength(1)
    expect(roots[1]?.querySelectorAll('circle')).toHaveLength(1)
    expect(circles[0]).toHaveAttribute('fill', '#304050')
    expect(circles[0]).toHaveAttribute('cx', '25')
    expect(circles[0]).toHaveAttribute('cy', '175')
    expect(Number(circles[0]?.getAttribute('r'))).toBeCloseTo(
      Math.hypot(275, 175) + 2,
    )
    expect(circles[1]).toHaveAttribute('cx', '150')
    expect(circles[1]).toHaveAttribute('cy', '100')
    expect(Number(circles[1]?.getAttribute('r'))).toBeCloseTo(
      Math.hypot(150, 100) + 2,
    )
  })

  it('covers from scale zero to one and reveals with the reverse animation', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const { container } = render(
      <HaloOverlay
        controllerRef={controller}
        options={{ duration: 100, easing: 'linear' }}
      />,
    )
    const circle = container.querySelector<SVGCircleElement>(
      '[data-routeveil-halo-circle]',
    )!

    expect(circle.style.transform).toBe('scale(0)')
    expect(circle.style.transformOrigin).toBe('center')

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })
    const coverAnimation = browser.animations[0]!

    expect(animationKeyframes(coverAnimation)).toEqual([
      { transform: 'scale(0)' },
      { transform: 'scale(1)' },
    ])
    expect(coverAnimation.options).toMatchObject({
      duration: 100,
      easing: 'linear',
      fill: 'forwards',
    })
    await finishAnimation(coverAnimation, cover)

    let reveal!: Promise<void>
    act(() => {
      reveal = controller.current!.reveal()
    })
    const revealAnimation = browser.animations[1]!

    expect(animationKeyframes(revealAnimation)).toEqual([
      { transform: 'scale(1)' },
      { transform: 'scale(0)' },
    ])
    await finishAnimation(revealAnimation, reveal)
  })

  it('completes phases and cancels active work on reset and unmount', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(
      <HaloOverlay controllerRef={controller} options={{ duration: 100 }} />,
    )
    const circle = view.container.querySelector<SVGCircleElement>(
      '[data-routeveil-halo-circle]',
    )!

    let completedCover!: Promise<void>
    act(() => {
      completedCover = controller.current!.cover()
    })
    const completedAnimation = browser.animations[0]!
    await finishAnimation(completedAnimation, completedCover)

    act(() => controller.current!.reset())
    expect(completedAnimation.animation.cancel).toHaveBeenCalled()
    expect(circle.style.transform).toBe('scale(0)')

    let activeCover!: Promise<void>
    act(() => {
      activeCover = controller.current!.cover()
    })
    const activeAnimation = browser.animations[1]!

    view.unmount()
    expect(activeAnimation.animation.cancel).toHaveBeenCalled()

    await finishAnimation(activeAnimation, activeCover)
  })
})
