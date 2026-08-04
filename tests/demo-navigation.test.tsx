import { act, fireEvent, render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { primaryNavigation, resolvePrimaryPath, routeDirection } from '../src/app/data/navigation'
import { HomePage } from '../src/app/pages/home/HomePage'
import { Header } from '../src/app/shared/UI/Header'
import { RouteveilProvider, RouteveilView } from '../src/react-router'
import { installBrowserMocks } from './browser-mocks'

function NavigateWithinLab() {
  const navigate = useNavigate()

  return (
    <>
      <button type="button" onClick={() => navigate('/lab?mode=two')}>
        Change Lab location
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Return to previous location
      </button>
    </>
  )
}

describe('demo primary navigation', () => {
  it('renders the unchanged homepage heading and crawlable links', () => {
    const browser = installBrowserMocks()

    try {
      render(
        <MemoryRouter>
          <RouteveilProvider>
            <HomePage />
          </RouteveilProvider>
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', {
        level: 1,
        name: 'RouteVeil',
      })).toBeVisible()
      expect(screen.getByRole('link', { name: 'Get Started' }))
        .toHaveAttribute('href', '/docs#installation')
      expect(screen.getByRole('link', { name: 'Transitions' }))
        .toHaveAttribute('href', '/lab')
      expect(screen.getByRole('link', { name: 'React Router' }))
        .toHaveAttribute('href', 'https://reactrouter.com/')
      expect(screen.getByRole('link', { name: 'GitHub' }))
        .toHaveAttribute('href', 'https://github.com/milkevich/routeveil')
    } finally {
      browser.restore()
    }
  })

  it('derives directions from the centralized route order', () => {
    expect(primaryNavigation).toEqual([
      { label: 'Home', path: '/' },
      { label: 'Docs', path: '/docs' },
      { label: 'Releases', path: '/releases' },
      { label: 'Lab', path: '/lab' },
    ])
    expect(routeDirection('/', '/docs')).toBe('left')
    expect(routeDirection('/', '/lab')).toBe('left')
    expect(routeDirection('/docs', '/releases')).toBe('left')
    expect(routeDirection('/releases', '/lab')).toBe('left')
    expect(routeDirection('/docs', '/lab')).toBe('left')
    expect(routeDirection('/lab', '/docs')).toBe('right')
    expect(routeDirection('/lab', '/releases')).toBe('right')
    expect(routeDirection('/releases', '/docs')).toBe('right')
    expect(routeDirection('/docs/reference', '/')).toBe('right')
    expect(resolvePrimaryPath('/releases')).toBe('/releases')
    expect(resolvePrimaryPath('/releases/archive')).toBe('/releases')
    expect(resolvePrimaryPath('/releases#v0-4-0')).toBe('/releases')
    expect(resolvePrimaryPath('/lab/preview/b')).toBe('/lab')
  })

  it('renders Releases as the active desktop and mobile destination', () => {
    const view = render(
      <MemoryRouter initialEntries={['/releases#v0-4-0']}>
        <RouteveilProvider>
          <Header />
        </RouteveilProvider>
      </MemoryRouter>,
    )
    const desktopLinks = [
      ...view.container.querySelectorAll<HTMLAnchorElement>(
        '.primary-nav__link',
      ),
    ]
    const mobileLinks = [
      ...view.container.querySelectorAll<HTMLAnchorElement>(
        '.mobile-nav > a',
      ),
    ]

    expect(desktopLinks.map((link) => link.textContent)).toEqual([
      'Home',
      'Docs',
      'Releases',
      'Lab',
    ])
    expect(mobileLinks.map((link) => link.textContent)).toEqual([
      '01Home',
      '02Docs',
      '03Releases',
      '04Lab',
    ])

    const releasesLinks = [
      ...view.container.querySelectorAll<HTMLAnchorElement>(
        'a[href="/releases"]',
      ),
    ]

    expect(releasesLinks).toHaveLength(2)
    expect(releasesLinks.every((link) => (
      link.getAttribute('aria-current') === 'page'
    ))).toBe(true)
    expect(desktopLinks.map((link) => link.dataset.direction)).toEqual([
      'right',
      'right',
      'left',
      'left',
    ])
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

  it('closes the mobile menu on outside interaction and navigation', () => {
    const view = render(
      <MemoryRouter initialEntries={['/lab']}>
        <RouteveilProvider>
          <Header />
          <NavigateWithinLab />
          <RouteveilView>
            <Routes>
              <Route path="/lab" element={<main>Lab</main>} />
            </Routes>
          </RouteveilView>
        </RouteveilProvider>
      </MemoryRouter>,
    )
    const menuButton = screen.getByRole('button', {
      name: 'Open navigation menu',
    })

    fireEvent.click(menuButton)

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(view.container.querySelector('.mobile-nav')).toHaveAttribute(
      'data-open',
      'true',
    )

    fireEvent.pointerDown(view.container.querySelector('.site-header')!)

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    fireEvent.pointerDown(document.body)

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menuButton)
    fireEvent.click(screen.getByRole('button', {
      name: 'Change Lab location',
    }))

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(view.container.querySelector('.mobile-nav')).toHaveAttribute(
      'data-open',
      'false',
    )

    fireEvent.click(screen.getByRole('button', {
      name: 'Return to previous location',
    }))

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })
})
