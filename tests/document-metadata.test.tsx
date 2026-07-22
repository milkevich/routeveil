import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  MemoryRouter,
  useNavigate,
} from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { docsSections } from '../src/app/pages/docs/docsSections'
import { DocumentMetadata } from '../src/app/shared/DocumentMetadata'
import {
  documentLocationChangeEvent,
  resolveDocumentMetadata,
  siteOrigin,
  socialImageUrl,
} from '../src/app/shared/lib/documentMetadata'

const indexRobots =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

function renderMetadata(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DocumentMetadata />
    </MemoryRouter>,
  )
}

function metaContent(selector: string) {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content
}

function expectAppliedMetadata(pathname: string, hash = '') {
  const metadata = resolveDocumentMetadata(pathname, hash)

  expect(document.title).toBe(metadata.title)
  expect(metaContent('meta[name="description"]')).toBe(metadata.description)
  expect(metaContent('meta[name="robots"]')).toBe(metadata.robots)
  expect(metaContent('meta[property="og:type"]')).toBe('website')
  expect(metaContent('meta[property="og:site_name"]')).toBe('Routeveil')
  expect(metaContent('meta[property="og:title"]')).toBe(metadata.title)
  expect(metaContent('meta[property="og:description"]')).toBe(
    metadata.description,
  )
  expect(metaContent('meta[property="og:url"]') ?? null).toBe(
    metadata.canonicalUrl,
  )
  expect(metaContent('meta[property="og:image"]')).toBe(socialImageUrl)
  expect(metaContent('meta[property="og:image:type"]')).toBe('image/png')
  expect(metaContent('meta[property="og:image:width"]')).toBe('1200')
  expect(metaContent('meta[property="og:image:height"]')).toBe('630')
  expect(metaContent('meta[name="twitter:card"]')).toBe('summary_large_image')
  expect(metaContent('meta[name="twitter:title"]')).toBe(metadata.title)
  expect(metaContent('meta[name="twitter:description"]')).toBe(
    metadata.description,
  )
  expect(metaContent('meta[name="twitter:image"]')).toBe(socialImageUrl)
  expect(
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.href ?? null,
  ).toBe(metadata.canonicalUrl)

  const uniqueSelectors = [
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property="og:type"]',
    'meta[property="og:site_name"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:image"]',
    'meta[name="twitter:card"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[name="twitter:image"]',
  ]

  uniqueSelectors.forEach((selector) => {
    expect(document.head.querySelectorAll(selector)).toHaveLength(1)
  })

  expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(
    metadata.canonicalUrl ? 1 : 0,
  )
  expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(
    metadata.canonicalUrl ? 1 : 0,
  )
}

function NavigationHarness() {
  const navigate = useNavigate()

  return (
    <>
      <DocumentMetadata />
      <button onClick={() => navigate('/')} type="button">Home</button>
      <button onClick={() => navigate('/docs#installation')} type="button">
        Installation
      </button>
      <button onClick={() => navigate('/lab')} type="button">Lab</button>
      <button onClick={() => navigate('/missing')} type="button">Missing</button>
    </>
  )
}

describe('DocumentMetadata', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  it.each([
    ['/', ''],
    ['/docs', ''],
    ['/docs/', ''],
    ['/docs', '#installation'],
    ['/lab', ''],
    ['/lab/', ''],
    ['/missing', ''],
    ['/docs/installation', ''],
  ])('applies complete metadata for %s%s', (pathname, hash) => {
    renderMetadata(`${pathname}${hash}`)

    expectAppliedMetadata(pathname, hash)
  })

  it.each(docsSections)(
    'resolves metadata for the $label documentation section',
    (section) => {
      const metadata = resolveDocumentMetadata('/docs', `#${section.id}`)

      expect(metadata.title).toBe(`Routeveil - ${section.label}`)
      expect(metadata.description).toBeTruthy()
      expect(metadata.canonicalUrl).toBe(`${siteOrigin}/docs`)
      expect(metadata.robots).toBe(indexRobots)
    },
  )

  it('handles encoded, unknown, and malformed documentation hashes', () => {
    expect(resolveDocumentMetadata('/docs', '#quick%2Dstart').title).toBe(
      'Routeveil - Quick Start',
    )
    expect(resolveDocumentMetadata('/docs', '#unknown').title).toBe(
      'Routeveil - Documentation',
    )
    expect(resolveDocumentMetadata('/docs', '#%E0%A4%A').title).toBe(
      'Routeveil - Documentation',
    )
  })

  it('refreshes metadata for hashchange, popstate, and docs navigation events', () => {
    renderMetadata('/docs')

    const updates = [
      ['#installation', new HashChangeEvent('hashchange')],
      ['#overview', new PopStateEvent('popstate')],
      ['#quick-start', new Event(documentLocationChangeEvent)],
    ] as const

    updates.forEach(([hash, event]) => {
      act(() => {
        window.history.replaceState(null, '', `/docs${hash}`)
        window.dispatchEvent(event)
      })

      expectAppliedMetadata('/docs', hash)
    })
  })

  it('replaces stale metadata across sequential route navigation', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    expectAppliedMetadata('/')

    fireEvent.click(screen.getByRole('button', { name: 'Installation' }))
    expectAppliedMetadata('/docs', '#installation')

    fireEvent.click(screen.getByRole('button', { name: 'Lab' }))
    expectAppliedMetadata('/lab')

    fireEvent.click(screen.getByRole('button', { name: 'Missing' }))
    expectAppliedMetadata('/missing')

    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    expectAppliedMetadata('/')
  })

  it('deduplicates metadata already present in the document head', () => {
    document.head.innerHTML = `
      <meta name="description" content="stale">
      <meta name="description" content="duplicate">
      <link rel="canonical" href="https://example.com/">
      <link rel="canonical" href="https://example.org/">
    `

    renderMetadata('/')

    expectAppliedMetadata('/')
  })
})
