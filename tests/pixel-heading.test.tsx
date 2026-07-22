import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PixelHeadingCharacter,
  PixelHeadingWord,
} from '../src/app/shared/UI'

afterEach(() => {
  vi.useRealTimers()
})

describe('PixelHeadingCharacter', () => {
  it('renders the requested heading level, prefix, and isolated characters', () => {
    const view = render(
      <PixelHeadingCharacter
        as="h2"
        isolate={{ x: 'sans' }}
        mode="multi"
        prefix="Route"
        prefixFont="grid"
      >
        veil x
      </PixelHeadingCharacter>,
    )
    const heading = view.getByRole('heading', { name: 'Route veil x' })

    expect(heading.tagName).toBe('H2')
    expect(
      heading.querySelector('[data-slot="pixel-heading-prefix"]'),
    ).toHaveTextContent('Route')
    expect(heading.querySelector('.pixel-heading__font-sans')).toHaveTextContent('x')
    expect(heading.querySelectorAll('[class^="font-pixel-"]').length).toBeGreaterThan(1)
  })

  it('cycles a uniform font on focus and reports the active index', () => {
    vi.useFakeTimers()
    const onFontIndexChange = vi.fn()
    const view = render(
      <PixelHeadingCharacter
        cycleInterval={100}
        mode="uniform"
        onFontIndexChange={onFontIndexChange}
        showLabel
      >
        Routeveil
      </PixelHeadingCharacter>,
    )
    const heading = view.getByRole('heading', { name: 'Routeveil' })
    const label = view.getByText('Square')

    fireEvent.focus(heading)
    expect(label).toHaveAttribute('data-visible', 'true')
    act(() => vi.advanceTimersByTime(100))

    expect(heading).toHaveClass('font-pixel-grid')
    expect(onFontIndexChange).toHaveBeenLastCalledWith(1)

    fireEvent.blur(heading)
    expect(label).toHaveAttribute('data-visible', 'false')
  })
})

describe('PixelHeadingWord', () => {
  it('swaps between the selected fonts on hover', () => {
    const view = render(
      <PixelHeadingWord initialFont="circle" hoverFont="line" showLabel>
        Transitions
      </PixelHeadingWord>,
    )
    const heading = view.getByRole('heading', { name: 'Transitions' })

    expect(heading).toHaveClass('font-pixel-circle')
    fireEvent.mouseEnter(heading)
    expect(heading).toHaveClass('font-pixel-line')
    expect(view.getByText('line')).toHaveAttribute('data-visible', 'true')
    fireEvent.mouseLeave(heading)
    expect(heading).toHaveClass('font-pixel-circle')
  })

  it('supports keyboard cycling and preserves native event handlers', () => {
    const onFontIndexChange = vi.fn()
    const onKeyDown = vi.fn()
    const view = render(
      <PixelHeadingWord
        onFontIndexChange={onFontIndexChange}
        onKeyDown={onKeyDown}
      >
        Accessible
      </PixelHeadingWord>,
    )
    const heading = view.getByRole('heading', { name: 'Accessible' })

    fireEvent.keyDown(heading, { key: 'Enter' })

    expect(heading).toHaveClass('font-pixel-grid')
    expect(onFontIndexChange).toHaveBeenCalledWith(1)
    expect(onKeyDown).toHaveBeenCalledOnce()
  })
})
