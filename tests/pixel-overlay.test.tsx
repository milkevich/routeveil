import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PixelOverlay } from '../src/core/overlays/PixelOverlay'

const initialInnerWidth = window.innerWidth
const initialInnerHeight = window.innerHeight

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

afterEach(() => {
  setViewport(initialInnerWidth, initialInnerHeight)
})

describe('PixelOverlay', () => {
  it('renders square cells and keeps them square after viewport resize', () => {
    setViewport(1_024, 700)

    const { container } = render(
      <PixelOverlay
        controllerRef={() => undefined}
        options={{ columns: 16, rows: 10 }}
      />,
    )

    const grid = container.querySelector<HTMLElement>(
      '[data-routeveil-pixel-grid]',
    )!
    const cell = container.querySelector<HTMLElement>(
      '[data-routeveil-pixel]',
    )!

    expect(grid.style.width).toBe('1120px')
    expect(grid.style.height).toBe('700px')
    expect(grid.style.left).toBe('-48px')
    expect(cell.style.width).toBe('70px')
    expect(cell.style.height).toBe('70px')

    act(() => {
      setViewport(1_366, 768)
      window.dispatchEvent(new Event('resize'))
    })

    expect(grid.style.width).toBe('1366px')
    expect(grid.style.height).toBe('853.75px')
    expect(grid.style.top).toBe('-42.875px')
    expect(cell.style.width).toBe('85.375px')
    expect(cell.style.height).toBe('85.375px')
  })
})
