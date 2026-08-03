import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BetweenDemoPage } from '../src/app/pages/lab/between/BetweenDemoPage'

const { playTransition } = vi.hoisted(() => ({
  playTransition: vi.fn(() => Promise.resolve()),
}))

vi.mock('../src/react-router/useRouteveilTransition', () => ({
  useRouteveilTransition: () => playTransition,
}))

beforeEach(() => {
  playTransition.mockClear()
})

describe('between render demo', () => {
  it('explains between rendering with crawlable documentation links', () => {
    render(
      <MemoryRouter>
        <BetweenDemoPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/minDuration/u)).toBeVisible()
    expect(screen.getByText(/RouteveilBetween/u)).toBeVisible()
    expect(screen.getByRole('link', { name: 'between rendering guide' }))
      .toHaveAttribute('href', '/docs#between-rendering')
    expect(screen.getByRole('link', { name: 'Transition Laboratory' }))
      .toHaveAttribute('href', '/lab')
  })

  it('renders the twelve examples in their required order', () => {
    const view = render(
      <MemoryRouter>
        <BetweenDemoPage />
      </MemoryRouter>,
    )
    const cards = [...view.container.querySelectorAll<HTMLButtonElement>(
      '.between-demo__card',
    )]

    expect(cards.map((card) => card.querySelector('strong')?.textContent))
      .toEqual([
        'push',
        'wipe',
        'rows',
        'dissolve',
        'bounce',
        'venetian',
        'halo',
        'spin',
        'columns',
        'curtain',
        'tunnel',
        'mosaic',
      ])
    expect(cards.map((card) => (
      card.querySelector('.transition-card__index')?.textContent
    ))).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
    ])
  })

  it('passes pointer coordinates only for configured examples', () => {
    const view = render(
      <MemoryRouter>
        <BetweenDemoPage />
      </MemoryRouter>,
    )
    const cards = [...view.container.querySelectorAll<HTMLButtonElement>(
      '.between-demo__card',
    )]

    fireEvent.click(cards[0]!, { clientX: 14, clientY: 28 })
    fireEvent.click(cards[4]!, { clientX: 24, clientY: 48 })
    fireEvent.click(cards[6]!, { clientX: 36, clientY: 72 })

    expect(playTransition.mock.calls[0]?.[0]).toBe('push')
    expect(playTransition.mock.calls[0]?.[1]).not.toHaveProperty(
      'clickPosition',
    )
    expect(playTransition.mock.calls[1]?.[0]).toBe('bounce')
    expect(playTransition.mock.calls[1]?.[1]).not.toHaveProperty(
      'clickPosition',
    )
    expect(playTransition.mock.calls[2]?.[0]).toEqual({
      name: 'halo',
      color: '#000000',
      origin: 'center',
    })
    expect(playTransition.mock.calls[2]?.[1]).toEqual(expect.objectContaining({
      clickPosition: { x: 36, y: 72 },
    }))
  })

  it('keeps every example paired with its intended transition options', () => {
    const view = render(
      <MemoryRouter>
        <BetweenDemoPage />
      </MemoryRouter>,
    )
    const cards = [...view.container.querySelectorAll<HTMLButtonElement>(
      '.between-demo__card',
    )]

    cards.forEach((card) => {
      fireEvent.click(card, { clientX: 20, clientY: 40 })
    })

    expect(playTransition.mock.calls.map(([transition]) => transition)).toEqual([
      'push',
      { name: 'wipe', color: '#000000' },
      {
        name: 'rows',
        color: '#ff258b',
        order: 'reverse',
        direction: 'left',
        count: 6,
      },
      { name: 'dissolve', color: '#000dff' },
      'bounce',
      { name: 'venetian', color: '#647375' },
      { name: 'halo', color: '#000000', origin: 'center' },
      'spin',
      { name: 'columns', color: '#F8F800', direction: 'up', count: 6 },
      { name: 'curtain', color: '#f5f5f5' },
      { name: 'tunnel', color: '#F5EFE4' },
      {
        name: 'mosaic',
        colors: ['#d0ff00', '#eeffa3', '#c0eb00'],
      },
    ])
    expect(playTransition.mock.calls.map(([, options]) => (
      options?.between && typeof options.between === 'object'
        && 'minDuration' in options.between
        ? options.between.minDuration
        : null
    ))).toEqual([
      1800,
      1800,
      900,
      2700,
      1800,
      900,
      1440,
      3780,
      1800,
      1800,
      2250,
      900,
    ])
  })
})
