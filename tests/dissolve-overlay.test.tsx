import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DissolveOverlay } from '../src/core/overlays/DissolveOverlay'
import { createDissolveNoiseField } from '../src/core/overlays/dissolve-noise'
import type { OverlayAnimationHandle } from '../src/core/transitions/types'
import { installBrowserMocks } from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

const initialInnerWidth = window.innerWidth
const initialInnerHeight = window.innerHeight
const getContextDescriptor = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
)

let browser: BrowserMocks
let canvasContext: CanvasRenderingContext2D
let clearRect: ReturnType<typeof vi.fn>
let fillRect: ReturnType<typeof vi.fn>

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
  clearRect = vi.fn()
  fillRect = vi.fn()
  canvasContext = {
    beginPath: vi.fn(),
    clearRect,
    createImageData: vi.fn((width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      height,
      width,
    })),
    fill: vi.fn(),
    fillRect,
    fillStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    putImageData: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
  } as unknown as CanvasRenderingContext2D
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => canvasContext),
    writable: true,
  })
})

afterEach(() => {
  browser.restore()
  setViewport(initialInnerWidth, initialInnerHeight)
  if (getContextDescriptor) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      getContextDescriptor,
    )
  }
})

describe('dissolve noise', () => {
  it('creates a stable seeded threshold field with normalized dimensions', () => {
    const first = createDissolveNoiseField(6, 4, 91)
    const repeated = createDissolveNoiseField(6, 4, 91)
    const different = createDissolveNoiseField(6, 4, 92)

    expect(first.columns).toBe(6)
    expect(first.rows).toBe(4)
    expect(first.thresholds).toHaveLength(24)
    expect([...first.thresholds]).toEqual([...repeated.thresholds])
    expect([...first.thresholds]).not.toEqual([...different.thresholds])
    expect(
      [...first.thresholds].every((value) => value >= 0 && value <= 1),
    ).toBe(true)
    expect(createDissolveNoiseField(0, -4, 91)).toMatchObject({
      columns: 1,
      rows: 1,
    })
  })

  it('covers the full canvas at progress one and cancels active frames on reset', async () => {
    setViewport(20, 12)
    const controller = createRef<OverlayAnimationHandle>()
    const { container } = render(
      <DissolveOverlay
        controllerRef={controller}
        options={{ color: '#223344', duration: 1, grainSize: 4, seed: 11 }}
      />,
    )
    const canvas = container.querySelector<HTMLCanvasElement>(
      '[data-routeveil-dissolve]',
    )!

    expect(canvas.width).toBe(5)
    expect(canvas.height).toBe(3)

    let canceledCover!: Promise<void>
    act(() => {
      canceledCover = controller.current!.cover()
    })
    expect(browser.pendingFrames).toBe(1)

    act(() => {
      controller.current!.reset()
    })
    await canceledCover
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
    expect(browser.pendingFrames).toBe(0)

    let completedCover!: Promise<void>
    act(() => {
      completedCover = controller.current!.cover()
    })
    act(() => browser.flushFrame())
    act(() => browser.flushFrame())
    await act(async () => completedCover)

    expect(clearRect).toHaveBeenCalledWith(0, 0, 5, 3)
    expect(fillRect).toHaveBeenLastCalledWith(0, 0, 5, 3)
    expect(canvasContext.fillStyle).toBe('#223344')
    expect(canvasContext.globalAlpha).toBe(1)

    act(() => {
      setViewport(24, 16)
      window.dispatchEvent(new Event('resize'))
    })
    expect(canvas.width).toBe(6)
    expect(canvas.height).toBe(4)
    expect(fillRect).toHaveBeenLastCalledWith(0, 0, 6, 4)
  })

  it('cancels a scheduled frame when unmounted', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(
      <DissolveOverlay controllerRef={controller} options={{ duration: 100 }} />,
    )

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })
    expect(browser.pendingFrames).toBe(1)

    view.unmount()
    await cover

    expect(window.cancelAnimationFrame).toHaveBeenCalled()
    expect(browser.pendingFrames).toBe(0)
  })
})
