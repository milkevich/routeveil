import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MosaicOverlay } from '../src/core/overlays/MosaicOverlay'
import { VenetianOverlay } from '../src/core/overlays/VenetianOverlay'
import type { OverlayAnimationHandle } from '../src/core/transitions/types'
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

function animationKeyframes(animation: ControlledAnimation): Keyframe[] {
  expect(Array.isArray(animation.keyframes)).toBe(true)
  return animation.keyframes as Keyframe[]
}

async function finishAnimations(
  animations: readonly ControlledAnimation[],
  phase: Promise<void>,
): Promise<void> {
  await act(async () => {
    animations.forEach((animation) => animation.finish())
    await phase
  })
}

function percentage(styleValue: string): number {
  const match = styleValue.match(/-?\d+(?:\.\d+)?/)
  expect(match).not.toBeNull()
  return Number(match?.[0])
}

describe('VenetianOverlay', () => {
  it('renders overlapping horizontal strips and rotates them shut on the X axis', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const { container } = render(
      <VenetianOverlay
        controllerRef={controller}
        options={{ alternate: true, count: 4, direction: 'horizontal' }}
      />,
    )
    const root = container.querySelector<HTMLElement>(
      '[data-routeveil-venetian]',
    )
    const strips = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-routeveil-venetian-strip]',
      ),
    ]

    expect(root).toHaveAttribute('data-direction', 'horizontal')
    expect(root?.style.perspective).toBe('1000px')
    expect(strips).toHaveLength(4)
    expect(strips[0]?.style.width).toBe('100%')
    expect(strips[0]?.style.height).toBe('calc(25% + 2px)')
    expect(strips[0]?.style.transform).toBe('rotateX(88deg)')
    expect(strips[1]?.style.transform).toBe('rotateX(-88deg)')
    expect(strips[0]?.style.transformOrigin).toBe('center top')
    expect(strips[1]?.style.transformOrigin).toBe('center bottom')

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })
    const animations = browser.animations.slice()

    expect(animations).toHaveLength(4)
    expect(animationKeyframes(animations[0]!)).toEqual([
      { opacity: 0, transform: 'rotateX(88deg)' },
      { opacity: 1, offset: 0.55, transform: 'rotateX(39.6deg)' },
      { opacity: 1, transform: 'rotateX(0deg)' },
    ])
    expect(animationKeyframes(animations[1]!)[0]).toMatchObject({
      transform: 'rotateX(-88deg)',
    })

    await finishAnimations(animations, cover)
  })

  it('renders vertical strips and rotates a covered screen open on the Y axis', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const { container } = render(
      <VenetianOverlay
        controllerRef={controller}
        options={{ alternate: false, count: 3, direction: 'vertical' }}
      />,
    )
    const strips = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-routeveil-venetian-strip]',
      ),
    ]

    expect(strips).toHaveLength(3)
    expect(strips[0]?.style.width).toBe('calc(33.3333% + 2px)')
    expect(strips[0]?.style.height).toBe('100%')
    expect(strips[0]?.style.transform).toBe('rotateY(88deg)')
    expect(strips[1]?.style.transform).toBe('rotateY(88deg)')
    expect(strips[0]?.style.transformOrigin).toBe('left center')

    let reveal!: Promise<void>
    act(() => {
      reveal = controller.current!.reveal()
    })
    const animations = browser.animations.slice()

    expect(animations).toHaveLength(3)
    expect(animationKeyframes(animations[0]!)[0]).toEqual({
      opacity: 1,
      transform: 'rotateY(0deg)',
    })
    expect(animationKeyframes(animations[0]!).at(-1)).toEqual({
      opacity: 0,
      transform: 'rotateY(88deg)',
    })

    await finishAnimations(animations, reveal)
  })
})

describe('MosaicOverlay', () => {
  it('replaces invalid or translucent palette entries with opaque colors', () => {
    const { container } = render(
      <MosaicOverlay
        controllerRef={createRef<OverlayAnimationHandle>()}
        options={{
          colors: ['transparent', 'not-a-color'],
          columns: 2,
          rows: 1,
          seed: 5,
        }}
      />,
    )
    const tiles = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-routeveil-mosaic-tile]',
      ),
    ]

    expect(tiles).toHaveLength(2)
    for (const tile of tiles) {
      expect(tile.style.backgroundColor).not.toBe('')
      expect(tile.style.backgroundColor).not.toBe('transparent')
    }
  })

  it('keeps a seeded irregular tile layout stable and fills every row', () => {
    const options = {
      columns: 4,
      rows: 3,
      rotation: 14,
      seed: 1_234,
    }
    const { container, rerender } = render(
      <MosaicOverlay
        controllerRef={createRef<OverlayAnimationHandle>()}
        options={options}
      />,
    )
    const readTiles = () => [
      ...container.querySelectorAll<HTMLElement>(
        '[data-routeveil-mosaic-tile]',
      ),
    ]
    const initialStyles = readTiles().map((tile) => tile.getAttribute('style'))

    expect(readTiles()).toHaveLength(12)
    expect(new Set(readTiles().map((tile) => tile.style.width)).size).toBeGreaterThan(1)
    expect(new Set(readTiles().map((tile) => tile.style.height)).size).toBeGreaterThan(1)

    const rows = Map.groupBy(readTiles(), (tile) => tile.style.top)
    expect(rows.size).toBe(3)
    for (const row of rows.values()) {
      const sorted = [...row].sort(
        (left, right) => percentage(left.style.left) - percentage(right.style.left),
      )
      expect(percentage(sorted[0]!.style.left)).toBeCloseTo(0)
      const last = sorted.at(-1)!
      expect(
        percentage(last.style.left) + percentage(last.style.width),
      ).toBeCloseTo(100)
      expect(
        sorted.reduce((total, tile) => total + percentage(tile.style.width), 0),
      ).toBeCloseTo(100)
    }

    const rowStarts = [...rows.keys()].map(percentage).sort((a, b) => a - b)
    const rowHeights = [...rows.values()].map((row) =>
      percentage(row[0]!.style.height),
    )
    expect(rowStarts[0]).toBeCloseTo(0)
    expect(rowStarts.at(-1)! + rowHeights.at(-1)!).toBeCloseTo(100)

    rerender(
      <MosaicOverlay
        controllerRef={createRef<OverlayAnimationHandle>()}
        options={{ ...options }}
      />,
    )
    expect(readTiles().map((tile) => tile.getAttribute('style'))).toEqual(
      initialStyles,
    )
  })

  it('uses the seed for stable layout generation and emits full-cover keyframes', async () => {
    const renderMosaic = (seed: number) => {
      const controller = createRef<OverlayAnimationHandle>()
      const view = render(
        <MosaicOverlay
          controllerRef={controller}
          options={{ columns: 3, rows: 2, seed, stagger: 0 }}
        />,
      )
      return { controller, view }
    }
    const first = renderMosaic(77)
    const firstStyles = [
      ...first.view.container.querySelectorAll<HTMLElement>(
        '[data-routeveil-mosaic-tile]',
      ),
    ].map((tile) => tile.getAttribute('style'))
    first.view.unmount()
    const second = renderMosaic(77)
    const secondStyles = [
      ...second.view.container.querySelectorAll<HTMLElement>(
        '[data-routeveil-mosaic-tile]',
      ),
    ].map((tile) => tile.getAttribute('style'))

    expect(secondStyles).toEqual(firstStyles)

    let cover!: Promise<void>
    act(() => {
      cover = second.controller.current!.cover()
    })
    const animations = browser.animations.slice()

    expect(animations).toHaveLength(6)
    for (const animation of animations) {
      expect(animationKeyframes(animation).at(-1)).toEqual({
        opacity: 1,
        transform: 'scale(1.025) rotate(0deg)',
      })
    }

    await finishAnimations(animations, cover)
  })
})
