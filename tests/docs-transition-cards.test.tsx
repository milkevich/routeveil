import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiDocs } from '../src/app/pages/docs/content/ApiDocs'
import { GettingStartedDocs } from '../src/app/pages/docs/content/GettingStartedDocs'
import { GuideDocs } from '../src/app/pages/docs/content/GuideDocs'
import { TransitionDocs } from '../src/app/pages/docs/content/TransitionDocs'
import { docsSections } from '../src/app/pages/docs/docsSections'
import { RouteveilProvider } from '../src/react-router'

const { playTransition } = vi.hoisted(() => ({
  playTransition: vi.fn(() => Promise.resolve()),
}))

vi.mock('../src/react-router/useRouteveilTransition', () => ({
  useRouteveilTransition: () => playTransition,
}))

beforeEach(() => {
  playTransition.mockClear()
})

describe('documentation transition cards', () => {
  it('plays each page and overlay transition with its preview options', async () => {
    render(
      <MemoryRouter>
        <RouteveilProvider>
          <TransitionDocs />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', {
      name: 'Play slide transition',
    }))

    await waitFor(() => {
      expect(playTransition).toHaveBeenNthCalledWith(
        1,
        { name: 'slide', direction: 'left' },
        { clickPosition: { x: 0, y: 0 } },
      )
    })

    fireEvent.click(screen.getByRole('button', {
      name: 'Play halo transition',
    }))

    await waitFor(() => {
      expect(playTransition).toHaveBeenNthCalledWith(
        2,
        { name: 'halo', color: '#8433e1', origin: 'cursor' },
        { clickPosition: { x: 0, y: 0 } },
      )
    })
  })
})

describe('documentation structure', () => {
  it('keeps the public sections in their numbered reading order', () => {
    expect(docsSections).toHaveLength(17)
    expect(docsSections.map(({ label }) => label)).toEqual([
      'Overview',
      'Installation',
      'Quick Start',
      'Compatibility',
      'Provider',
      'RouteveilLink',
      'RouteveilView',
      'Programmatic Navigation',
      'Route Preloading',
      'Route Readiness',
      'Between Rendering',
      'Transition Playback',
      'Page Transitions',
      'Shared Elements',
      'Overlay Transitions',
      'Interrupted Navigation',
      'Reduced Motion',
    ])
  })

  it('renders matching anchors with sequential visible numbers', () => {
    const { container } = render(
      <MemoryRouter>
        <RouteveilProvider>
          <GettingStartedDocs />
          <ApiDocs />
          <TransitionDocs />
          <GuideDocs />
        </RouteveilProvider>
      </MemoryRouter>,
    )
    const sections = [
      ...container.querySelectorAll<HTMLElement>('.doc-section'),
    ]

    expect(sections.map(({ id }) => id)).toEqual(
      docsSections.map(({ id }) => id),
    )
    expect(sections.map((section) => (
      section.querySelector('.doc-section__heading > span')?.textContent
    ))).toEqual(
      docsSections.map((_, index) => String(index + 1).padStart(2, '0')),
    )
  })
})
