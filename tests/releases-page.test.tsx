import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  getReleaseId,
  releases,
  type ReleaseEntry,
} from '../src/app/data/releases'
import {
  ReleasesPage,
  ReleaseSection,
} from '../src/app/pages/releases/ReleasesPage'
import { router } from '../src/app/router'
import { documentLocationChangeEvent } from '../src/app/shared/lib/documentMetadata'
import { RouteveilProvider } from '../src/react-router'
import { installBrowserMocks } from './browser-mocks'

const expectedReleases = [
  ['0.4.0', '2026-08-02', 'Between Rendering'],
  ['0.3.1', '2026-07-31', 'Transition Request Guard'],
  ['0.3.0', '2026-07-31', 'Unified Transition API'],
  ['0.2.5', '2026-07-28', 'Provider Lifecycle Refinements'],
  ['0.2.4', '2026-07-27', 'Snapshot Pipeline'],
  ['0.2.3', '2026-07-26', 'Shared Element Matching'],
  ['0.2.2', '2026-07-25', 'Route-wide Shared Elements'],
  ['0.2.1', '2026-07-25', 'Preloading and Route Readiness'],
  ['0.2.0', '2026-07-25', 'Shared Element Transitions'],
  ['0.1.1', '2026-07-22', 'Production Readiness'],
  ['0.1.0', '2026-07-21', 'Core Transition Engine'],
] as const

type ScrollCall = {
  element: Element
  options?: ScrollIntoViewOptions
}

let browser: ReturnType<typeof installBrowserMocks>
let scrollCalls: ScrollCall[]
let scrollIntoViewDescriptor: PropertyDescriptor | undefined
let elementScrollToDescriptor: PropertyDescriptor | undefined

function restoreProperty(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    Reflect.deleteProperty(target, property)
  }
}

function renderReleases(pathname = '/releases') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <RouteveilProvider>
        <ReleasesPage />
      </RouteveilProvider>
    </MemoryRouter>,
  )
}

function releaseWithVersion(version: string): ReleaseEntry {
  const release = releases.find((entry) => entry.version === version)

  if (!release) throw new Error(`Missing release ${version}`)
  return release
}

beforeEach(() => {
  browser = installBrowserMocks()
  scrollCalls = []
  scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'scrollIntoView',
  )
  elementScrollToDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollTo',
  )

  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value(this: Element, options?: ScrollIntoViewOptions) {
      scrollCalls.push({ element: this, options })
    },
    writable: true,
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
    writable: true,
  })
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  document.body.style.overflow = ''
  document.documentElement.style.removeProperty('--header-height')
  restoreProperty(
    Element.prototype,
    'scrollIntoView',
    scrollIntoViewDescriptor,
  )
  restoreProperty(
    HTMLElement.prototype,
    'scrollTo',
    elementScrollToDescriptor,
  )
  browser.restore()
  vi.restoreAllMocks()
})

describe('release registry', () => {
  it('contains every unique release newest first with stable IDs', () => {
    expect(releases.map((release) => [
      release.version,
      release.date,
      release.title,
    ])).toEqual(expectedReleases)
    expect(releases).toHaveLength(11)
    expect(new Set(releases.map((release) => release.version)).size).toBe(11)
    expect(new Set(releases.map((release) => (
      getReleaseId(release.version)
    ))).size).toBe(11)
    expect(getReleaseId('0.10.12')).toBe('v0-10-12')
    expect(releases.every((release) => (
      /^\d{4}-\d{2}-\d{2}$/u.test(release.date)
    ))).toBe(true)
  })

  it('only links versions with real GitHub releases', () => {
    const releasesWithoutUrls = releases
      .filter((release) => !('releaseUrl' in release))
      .map((release) => release.version)

    expect(releasesWithoutUrls).toEqual(['0.2.0', '0.1.1', '0.1.0'])

    for (const release of releases) {
      if ('releaseUrl' in release) {
        expect(release.releaseUrl).toBe(
          'https://github.com/milkevich/routeveil/releases/tag/v'
            + release.version,
        )
      }
    }
  })
})

describe('Releases page', () => {
  it('only links section titles and shows arrows when a title URL exists', () => {
    const view = render(
      <ReleaseSection
        section={{
          type: 'list',
          title: 'Migration guide',
          titleUrl: '/docs#installation',
        }}
      />,
      {
        wrapper: ({ children }) => (
          <MemoryRouter>
            <RouteveilProvider>{children}</RouteveilProvider>
          </MemoryRouter>
        ),
      },
    )
    const linkedHeading = screen.getByRole('heading', {
      level: 3,
      name: 'Migration guide',
    })
    const titleLink = within(linkedHeading).getByRole('link')

    expect(titleLink).toHaveAttribute('href', '/docs#installation')
    expect(titleLink.querySelector('.icon-arrow')).not.toBeNull()

    view.rerender(
      <ReleaseSection
        section={{ type: 'basic', title: 'Install' }}
      />,
    )

    const unlinkedHeading = screen.getByRole('heading', {
      level: 3,
      name: 'Install',
    })

    expect(unlinkedHeading.querySelector('a')).toBeNull()
    expect(unlinkedHeading.querySelector('.icon-arrow')).toBeNull()
  })

  it('renders the complete timeline and title-based navigation', () => {
    const view = renderReleases()
    const entries = [
      ...view.container.querySelectorAll<HTMLElement>('.release-entry'),
    ]
    const desktopNav = screen.getByRole('navigation', {
      name: 'Release history',
    })
    const desktopLinks = within(desktopNav).getAllByRole('link')
    const mobileNav = screen.getByRole('navigation', {
      name: 'Release navigation',
    })
    const mobileLinks = [
      ...mobileNav.querySelectorAll<HTMLAnchorElement>(
        '.releases-mobile-nav__item',
      ),
    ]

    expect(screen.getByRole('heading', { level: 1, name: 'Releases' }))
      .toBeVisible()
    expect(view.container.querySelector('.releases-hero__description'))
      .toHaveTextContent(
        'See what changed, what shipped, and how Routeveil has evolved.',
      )
    expect(entries).toHaveLength(11)
    expect(entries.map((entry) => entry.id)).toEqual(
      releases.map((release) => getReleaseId(release.version)),
    )
    expect(entries.map((entry) => (
      entry.querySelector('h2')?.textContent
    ))).toEqual(releases.map((release) => release.title))
    expect(entries.map((entry) => (
      entry.querySelector<HTMLAnchorElement>('h2 a')?.getAttribute('href')
    ))).toEqual(releases.map((release) => (
      `/releases#${getReleaseId(release.version)}`
    )))
    expect(entries.map((entry) => (
      entry.querySelector('time')?.getAttribute('datetime')
    ))).toEqual(releases.map((release) => release.date))
    expect(entries[0]?.querySelector('time')).toHaveTextContent('Aug 2, 2026')

    expect(desktopLinks.map((link) => (
      link.querySelector('.line-sidebar__text')?.textContent
    ))).toEqual(releases.map((release) => release.title))
    expect(desktopLinks.map((link) => link.getAttribute('href'))).toEqual(
      releases.map((release) => (
        `/releases#${getReleaseId(release.version)}`
      )),
    )
    expect(mobileLinks.map((link) => (
      link.querySelector(':scope > span:nth-child(2)')?.textContent
    ))).toEqual(releases.map((release) => release.title))
    expect(mobileLinks.map((link) => link.getAttribute('href'))).toEqual(
      releases.map((release) => (
        `/releases#${getReleaseId(release.version)}`
      )),
    )
    expect(desktopNav.textContent).not.toMatch(/v0\.\d/u)
  })

  it('renders optional sections, list items, code blocks, and real release links', () => {
    const view = renderReleases()
    const codeSections = releases.flatMap((release) => (
      release.sections.filter((section) => (
        section.type === 'basic' && section.code
      ))
    ))
    const githubLinks = [
      ...view.container.querySelectorAll<HTMLAnchorElement>(
        '.release-entry__github-link',
      ),
    ]
    const releasesWithUrls = releases.filter((release) => (
      'releaseUrl' in release
    ))

    expect(view.container.querySelectorAll('.code-block'))
      .toHaveLength(codeSections.length)
    expect([
      ...view.container.querySelectorAll('.code-block__filename'),
    ].map((node) => node.textContent)).toEqual(
      codeSections.map((section) => (
        section.type === 'basic' ? section.code?.filename : undefined
      )),
    )
    expect(view.container.querySelectorAll(
      '.release-section h3:empty, .release-section p:empty, .release-section ul:empty',
    )).toHaveLength(0)

    const latestEntry = view.container.querySelector('#v0-4-0')!
    const latest = releaseWithVersion('0.4.0')
    const expectedItems = latest.sections
      .filter((section) => section.type === 'list')
      .flatMap((section) => section.items ?? [])

    expect([
      ...latestEntry.querySelectorAll('.release-section li'),
    ].map((item) => item.textContent)).toEqual(expectedItems)

    const apiNote = view.container.querySelector(
      '#v0-2-3 .release-section:last-child',
    )!
    expect(apiNote.querySelector('h3')).toBeNull()
    expect(apiNote.querySelector('.code-block')).toBeNull()
    expect(apiNote).toHaveTextContent(
      'No new props or public API changes were required for the safer matching behavior.',
    )

    expect(githubLinks).toHaveLength(releasesWithUrls.length)
    expect(githubLinks.map((link) => link.getAttribute('href'))).toEqual(
      releasesWithUrls.map((release) => (
        'releaseUrl' in release ? release.releaseUrl : undefined
      )),
    )
    expect(githubLinks.every((link) => (
      link.textContent?.trim() === 'View GitHub release'
    ))).toBe(true)

    for (const version of ['0.2.0', '0.1.1', '0.1.0']) {
      expect(view.container.querySelector(
        `#${getReleaseId(version)} .release-entry__github-link`,
      )).toBeNull()
    }
  })

  it('activates direct hashes and replaces hashes on smooth navigation', () => {
    renderReleases('/releases#v0-3-0')
    const activeLink = screen.getByRole('navigation', {
      name: 'Release history',
    }).querySelector('[aria-current="location"]')

    expect(activeLink).toHaveTextContent('Unified Transition API')
    expect(scrollCalls).toContainEqual({
      element: document.getElementById('v0-3-0')!,
      options: { behavior: 'instant' },
    })

    const replaceState = vi.spyOn(window.history, 'replaceState')
    const locationEvent = vi.fn()
    window.addEventListener(documentLocationChangeEvent, locationEvent)

    fireEvent.click(screen.getByRole('navigation', {
      name: 'Release history',
    }).querySelector<HTMLAnchorElement>(
      'a[href="/releases#v0-2-4"]',
    )!)

    expect(scrollCalls.at(-1)).toEqual({
      element: document.getElementById('v0-2-4')!,
      options: { behavior: 'smooth' },
    })
    expect(replaceState).toHaveBeenCalledWith(
      window.history.state,
      '',
      '#v0-2-4',
    )
    expect(locationEvent).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('heading', {
      level: 2,
      name: 'Provider Lifecycle Refinements',
    }).querySelector('a')!)

    expect(scrollCalls.at(-1)).toEqual({
      element: document.getElementById('v0-2-5')!,
      options: { behavior: 'smooth' },
    })
    expect(replaceState).toHaveBeenLastCalledWith(
      window.history.state,
      '',
      '#v0-2-5',
    )
    window.removeEventListener(documentLocationChangeEvent, locationEvent)
  })

  it('uses instant scrolling for reduced motion', () => {
    browser.setReducedMotion(true)
    renderReleases()

    fireEvent.click(screen.getByRole('navigation', {
      name: 'Release history',
    }).querySelector<HTMLAnchorElement>(
      'a[href="/releases#v0-3-1"]',
    )!)

    expect(scrollCalls.at(-1)?.options).toEqual({ behavior: 'auto' })
  })

  it('tracks the active release while the page scrolls', () => {
    const view = renderReleases()
    const entries = [
      ...view.container.querySelectorAll<HTMLElement>('.release-entry'),
    ]

    document.documentElement.style.setProperty('--header-height', '64px')
    entries.forEach((entry, index) => {
      vi.spyOn(entry, 'getBoundingClientRect').mockReturnValue({
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: index <= 4 ? 80 : 400,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })
    })

    act(() => browser.flushFrame())

    expect(screen.getByRole('navigation', {
      name: 'Release history',
    }).querySelector('[aria-current="location"]'))
      .toHaveTextContent('Snapshot Pipeline')
    expect(screen.getByRole('button', { name: /Jump to:/u }))
      .toHaveTextContent('Snapshot Pipeline')
  })

  it('locks and restores scrolling around the mobile release menu', () => {
    renderReleases()
    const trigger = screen.getByRole('button', { name: /Jump to:/u })
    const mobileNav = screen.getByRole('navigation', {
      name: 'Release navigation',
    })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(
      mobileNav.querySelector('[aria-current="location"]'),
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.body.style.overflow).toBe('')
    act(() => browser.flushFrame())
    expect(trigger).toHaveFocus()
  })

  it('closes the mobile menu after selection and at desktop width', () => {
    const originalMatchMedia = window.matchMedia
    let desktopChange: ((event: MediaQueryListEvent) => void) | undefined

    window.matchMedia = vi.fn((query: string) => {
      const mediaQuery = originalMatchMedia(query)

      return {
        ...mediaQuery,
        addEventListener: vi.fn((type, listener) => {
          if (
            query === '(min-width: 801px)'
            && type === 'change'
            && typeof listener === 'function'
          ) {
            desktopChange = listener
          }
        }),
        removeEventListener: vi.fn(),
      }
    })

    renderReleases()
    const trigger = screen.getByRole('button', { name: /Jump to:/u })
    const mobileNav = screen.getByRole('navigation', {
      name: 'Release navigation',
    })

    fireEvent.click(trigger)
    fireEvent.click(mobileNav.querySelector<HTMLAnchorElement>(
      'a[href="/releases#v0-2-2"]',
    )!)

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.body.style.overflow).toBe('')
    act(() => browser.flushFrame())
    expect(scrollCalls.at(-1)?.element.id).toBe('v0-2-2')
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.activeElement).toBe(
      mobileNav.querySelector('[aria-current="location"]'),
    )
    act(() => {
      desktopChange?.({ matches: true } as MediaQueryListEvent)
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    act(() => browser.flushFrame())
    expect(screen.getByRole('navigation', {
      name: 'Release history',
    }).querySelector('[aria-current="location"]')).toHaveFocus()
  })

  it('is registered as a lazy application route', async () => {
    const releaseRoute = router.routes[0]?.children?.find((route) => (
      route.path === 'releases'
    ))

    expect(releaseRoute?.lazy).toBeTypeOf('function')
    const resolved = await releaseRoute?.lazy?.()
    expect(resolved?.Component).toBe(ReleasesPage)
    expect(router.routes[0]?.children?.some((route) => (
      route.path === 'docs'
    ))).toBe(true)
    expect(router.routes[0]?.children?.some((route) => (
      route.path === 'lab'
    ))).toBe(true)
  })
})
