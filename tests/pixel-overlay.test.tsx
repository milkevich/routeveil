import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PixelOverlay } from '../src/core/overlays/PixelOverlay'
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

function flushFrames(count: number): void {
  for (let index = 0; index < count; index += 1) {
    act(() => browser.flushFrame())
  }
}

beforeEach(() => {
  browser = installBrowserMocks()
  clearRect = vi.fn()
  fillRect = vi.fn()
  canvasContext = {
    clearRect,
    fillRect,
    fillStyle: '',
    globalAlpha: 1,
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
  } else {
    Reflect.deleteProperty(HTMLCanvasElement.prototype, 'getContext')
  }
})

describe('PixelOverlay', () => {
  it('renders one canvas with square cells and keeps them square after resize', () => {
    setViewport(1_024, 700)

    const { container } = render(
      <PixelOverlay
        controllerRef={() => undefined}
        options={{ columns: 16, rows: 10 }}
      />,
    )

    const canvas = container.querySelector<HTMLCanvasElement>(
      '[data-routeveil-pixel-grid]',
    )!

    expect(canvas.width).toBe(128)
    expect(canvas.height).toBe(80)
    expect(canvas.style.width).toBe('1120px')
    expect(canvas.style.height).toBe('700px')
    expect(canvas.style.left).toBe('-48px')
    expect(container.querySelectorAll('[data-routeveil-pixel]')).toHaveLength(0)

    act(() => {
      setViewport(1_366, 768)
      window.dispatchEvent(new Event('resize'))
    })

    expect(canvas.style.width).toBe('1366px')
    expect(canvas.style.height).toBe('853.75px')
    expect(canvas.style.top).toBe('-42.875px')
    expect(canvas.width / 16).toBe(canvas.height / 10)
  })

  it('uses one frame loop and fully covers before cover resolves', async () => {
    setViewport(300, 100)
    const controller = createRef<OverlayAnimationHandle>()
    render(
      <PixelOverlay
        controllerRef={controller}
        options={{
          color: '#223344',
          columns: 3,
          duration: 16,
          origin: 'center',
          rows: 1,
          stagger: 32,
        }}
      />,
    )

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })

    expect(browser.animate).not.toHaveBeenCalled()
    expect(browser.pendingFrames).toBe(1)

    flushFrames(2)
    expect(browser.pendingFrames).toBe(1)
    expect(fillRect).toHaveBeenCalledWith(8, 0, 8, 8)
    expect(fillRect).not.toHaveBeenCalledWith(0, 0, 8, 8)

    flushFrames(2)
    await act(async () => cover)

    expect(browser.pendingFrames).toBe(0)
    expect(clearRect).toHaveBeenCalledWith(0, 0, 24, 8)
    expect(fillRect).toHaveBeenLastCalledWith(0, 0, 24, 8)
    expect(canvasContext.fillStyle).toBe('#223344')
    expect(canvasContext.globalAlpha).toBe(1)
  })

  it('starts reveal fully covered and clears it after the final frame', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    render(
      <PixelOverlay
        controllerRef={controller}
        options={{ columns: 2, duration: 16, rows: 1, stagger: 0 }}
      />,
    )

    let reveal!: Promise<void>
    act(() => {
      reveal = controller.current!.reveal()
    })

    expect(fillRect).toHaveBeenLastCalledWith(0, 0, 16, 8)
    expect(browser.pendingFrames).toBe(1)

    flushFrames(2)
    await act(async () => reveal)

    expect(browser.pendingFrames).toBe(0)
    expect(clearRect).toHaveBeenLastCalledWith(0, 0, 16, 8)
    expect(canvasContext.globalAlpha).toBe(1)
  })

  it('cancels and settles an active frame loop during reset and unmount', async () => {
    const controller = createRef<OverlayAnimationHandle>()
    const view = render(
      <PixelOverlay
        controllerRef={controller}
        options={{ duration: 100, stagger: 100 }}
      />,
    )

    let resetCover!: Promise<void>
    act(() => {
      resetCover = controller.current!.cover()
      controller.current!.reset()
    })
    await resetCover

    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1)
    expect(browser.pendingFrames).toBe(0)

    let unmountedCover!: Promise<void>
    act(() => {
      unmountedCover = controller.current!.cover()
    })
    view.unmount()
    await unmountedCover

    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(2)
    expect(browser.pendingFrames).toBe(0)
  })
})
