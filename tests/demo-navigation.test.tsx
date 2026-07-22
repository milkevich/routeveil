import { act, render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { primaryNavigation, resolvePrimaryPath, routeDirection } from '../src/app/data/navigation'
import { Header } from '../src/app/shared/UI/Header'
import { RouteveilProvider, RouteveilView } from '../src/react-router'

describe('demo primary navigation', () => {
  it('derives directions from the centralized route order', () => {
    expect(primaryNavigation.map((route) => route.path)).toEqual(['/', '/docs', '/lab'])
    expect(routeDirection('/', '/docs')).toBe('left')
    expect(routeDirection('/', '/lab')).toBe('left')
    expect(routeDirection('/docs', '/lab')).toBe('left')
    expect(routeDirection('/lab', '/docs')).toBe('right')
    expect(routeDirection('/docs/reference', '/')).toBe('right')
    expect(resolvePrimaryPath('/lab/preview/b')).toBe('/lab')
  })

  it('restores the active indicator on a direct docs render and updates its measurement', () => {
    const view = render(
      <MemoryRouter initialEntries={['/docs']}>
        <RouteveilProvider>
          <Header />
          <RouteveilView>
            <Routes>
              <Route path="/docs" element={<main>Docs</main>} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )
    const activeLink = view.container.querySelector<HTMLAnchorElement>(
      '.primary-nav__link[aria-current="page"]',
    )!
    const indicator = view.container.querySelector<HTMLElement>(
      '.primary-nav__indicator',
    )!
    const homeLink = screen.getAllByRole('link', { name: 'Home' })
      .find((link) => link.classList.contains('primary-nav__link'))!
    const labLink = screen.getAllByRole('link', { name: 'Lab' })
      .find((link) => link.classList.contains('primary-nav__link'))!

    expect(activeLink).toHaveTextContent('Docs')
    expect(indicator).toHaveAttribute('data-ready', 'true')
    expect(homeLink).toHaveAttribute('data-direction', 'right')
    expect(labLink).toHaveAttribute('data-direction', 'left')
    expect(screen.getByRole('link', { name: 'Explore Lab' }))
      .toHaveAttribute('href', '/lab')

    Object.defineProperty(activeLink, 'offsetWidth', { configurable: true, value: 72 })
    Object.defineProperty(activeLink, 'offsetLeft', { configurable: true, value: 88 })
    act(() => window.dispatchEvent(new Event('resize')))

    expect(indicator).toHaveStyle({ width: '32.4px', transform: 'translate3d(107.8px, 0, 0)' })
  })
})
