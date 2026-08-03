import { describe, expect, it } from 'vitest'
import {
  resolveDocumentMetadata,
  resolveStructuredData,
} from '../src/app/shared/lib/documentMetadata'
import {
  escapeXml,
  indexRobots,
  noindexRobots,
  renderSitemapXml,
  resolveSeoRoute,
  seoRouteRegistry,
  siteOrigin,
} from '../src/app/shared/lib/seoRoutes'

type StructuredDataNode = Record<string, unknown>

function structuredDataGraph(pathname: string): StructuredDataNode[] {
  const structuredData = resolveStructuredData(pathname)
  expect(structuredData).not.toBeNull()

  const parsed = JSON.parse(
    JSON.stringify(structuredData),
  ) as Record<string, unknown>
  expect(parsed['@context']).toBe('https://schema.org')
  expect(Array.isArray(parsed['@graph'])).toBe(true)

  return parsed['@graph'] as StructuredDataNode[]
}

function nodeTypes(node: StructuredDataNode): string[] {
  const value = node['@type']
  return Array.isArray(value) ? value as string[] : [String(value)]
}

describe('SEO route registry and sitemap', () => {
  it('keeps the requested public document titles', () => {
    expect(Object.fromEntries(
      seoRouteRegistry.map((route) => [route.pathname, route.title]),
    )).toMatchObject({
      '/': 'Routeveil – Transition Engine for React Router',
      '/docs': 'Documentation – Routeveil',
      '/lab': 'Laboratory – Routeveil',
      '/lab/between': 'Between Rendering – Routeveil',
      '/lab/shared-elements': 'Shared Elements – Routeveil',
    })
  })

  it('keeps route, output, canonical, title, and description values unique', () => {
    const indexableRoutes = seoRouteRegistry.filter((route) => route.indexable)
    const uniqueValues = (values: readonly (string | null)[]) => (
      new Set(values.filter((value): value is string => value !== null)).size
    )

    expect(uniqueValues(seoRouteRegistry.map((route) => route.pathname)))
      .toBe(seoRouteRegistry.length)
    expect(uniqueValues(seoRouteRegistry.map((route) => route.file)))
      .toBe(seoRouteRegistry.length)
    expect(uniqueValues(seoRouteRegistry.map((route) => route.canonicalUrl)))
      .toBe(seoRouteRegistry.filter((route) => route.canonicalUrl).length)
    expect(uniqueValues(indexableRoutes.map((route) => route.title)))
      .toBe(indexableRoutes.length)
    expect(uniqueValues(indexableRoutes.map((route) => route.description)))
      .toBe(indexableRoutes.length)
  })

  it('generates only final indexable canonical URLs', () => {
    const sitemap = renderSitemapXml()
    const sitemapDocument = new DOMParser().parseFromString(
      sitemap,
      'application/xml',
    )
    const urls = [
      ...sitemapDocument.getElementsByTagName('loc'),
    ].map((element) => element.textContent ?? '')
    const expectedUrls = seoRouteRegistry
      .filter((route) => route.indexable && route.includeInSitemap)
      .map((route) => route.canonicalUrl)

    expect(sitemapDocument.querySelector('parsererror')).toBeNull()
    expect(urls).toEqual(expectedUrls)
    expect(new Set(urls).size).toBe(urls.length)
    expect(sitemap).not.toMatch(/<(?:priority|changefreq|lastmod)>/u)

    for (const route of seoRouteRegistry) {
      expect(route.includeInSitemap).toBe(route.indexable)
      expect(urls.includes(route.canonicalUrl ?? '')).toBe(route.indexable)

      if (route.canonicalUrl) {
        const canonical = new URL(route.canonicalUrl)
        expect(canonical.origin).toBe(siteOrigin)
        expect(canonical.pathname).toBe(route.pathname)
        expect(canonical.search).toBe('')
        expect(canonical.hash).toBe('')
      }
    }

    for (const value of urls) {
      const url = new URL(value)
      expect(url.protocol).toBe('https:')
      expect(url.hostname).toBe('www.routeveil.dev')
      expect(url.hash).toBe('')
      expect(url.pathname).not.toBe('/404')
      expect(url.pathname === '/' || !url.pathname.endsWith('/')).toBe(true)
    }
  })

  it('escapes all XML-sensitive characters', () => {
    const unsafe = `${siteOrigin}/docs?one=1&two=<route>"quoted"'value'`
    const escaped = escapeXml(unsafe)
    const xmlDocument = new DOMParser().parseFromString(
      `<loc>${escaped}</loc>`,
      'application/xml',
    )

    expect(escaped).toBe(
      'https://www.routeveil.dev/docs?one=1&amp;two=&lt;route&gt;&quot;quoted&quot;&apos;value&apos;',
    )
    expect(xmlDocument.querySelector('parsererror')).toBeNull()
    expect(xmlDocument.documentElement.textContent).toBe(unsafe)
  })
})

describe('route metadata and structured data', () => {
  for (const route of seoRouteRegistry) {
    it(`resolves registry metadata and valid JSON-LD for ${route.pathname}`, () => {
      const metadata = resolveDocumentMetadata(route.pathname)

      expect(metadata).toEqual({
        title: route.title,
        description: route.description,
        canonicalUrl: route.canonicalUrl,
        robots: route.indexable ? indexRobots : noindexRobots,
        openGraphType: route.openGraphType,
      })

      if (!route.indexable) {
        expect(resolveStructuredData(route.pathname)).toBeNull()
        return
      }

      const graph = structuredDataGraph(route.pathname)
      const page = graph.find((node) => (
        node['@id'] === `${route.canonicalUrl}#webpage`
      ))

      expect(graph.some((node) => nodeTypes(node).includes('WebSite'))).toBe(true)
      expect(
        graph.some((node) => nodeTypes(node).includes('SoftwareApplication')),
      ).toBe(true)
      expect(
        graph.some((node) => nodeTypes(node).includes('SoftwareSourceCode')),
      ).toBe(true)
      expect(page).toMatchObject({
        url: route.canonicalUrl,
        name: route.title,
        description: route.description,
        inLanguage: 'en-US',
      })
      expect(nodeTypes(page!)).toContain('WebPage')

      if (route.structuredDataType === 'article') {
        expect(nodeTypes(page!)).toContain('TechArticle')
      }
      if (route.structuredDataType === 'web-application') {
        expect(nodeTypes(page!)).toContain('WebApplication')
      }

      const breadcrumbs = graph.filter((node) => (
        node['@type'] === 'BreadcrumbList'
      ))

      if (route.breadcrumb.length < 2) {
        expect(breadcrumbs).toEqual([])
        return
      }

      expect(breadcrumbs).toHaveLength(1)
      const items = breadcrumbs[0]?.itemListElement as StructuredDataNode[]
      expect(items.map((item) => item.position)).toEqual(
        route.breadcrumb.map((_, index) => index + 1),
      )
      expect(items.map((item) => item.name)).toEqual(
        route.breadcrumb.map((item) => item.name),
      )
      expect(items.map((item) => item.item)).toEqual(
        route.breadcrumb.map((item) => (
          resolveSeoRoute(item.pathname).canonicalUrl
        )),
      )
      expect(items.at(-1)?.item).toBe(route.canonicalUrl)
    })
  }

  it('uses the real laboratory breadcrumb hierarchies', () => {
    const breadcrumbItems = (pathname: string) => {
      const breadcrumb = structuredDataGraph(pathname).find((node) => (
        node['@type'] === 'BreadcrumbList'
      ))
      return breadcrumb?.itemListElement as StructuredDataNode[]
    }

    expect(breadcrumbItems('/lab/between')).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Routeveil',
        item: `${siteOrigin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Laboratory',
        item: `${siteOrigin}/lab`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Between Render',
        item: `${siteOrigin}/lab/between`,
      },
    ])
    expect(breadcrumbItems('/lab/shared-elements')).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Routeveil',
        item: `${siteOrigin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Laboratory',
        item: `${siteOrigin}/lab`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Shared Elements',
        item: `${siteOrigin}/lab/shared-elements`,
      },
    ])
  })

  it('keeps the generic shared-element detail route noindex and unsitemapped', () => {
    const detail = resolveSeoRoute('/lab/shared-elements/detail')
    const sitemap = renderSitemapXml()

    expect(detail.indexable).toBe(false)
    expect(detail.includeInSitemap).toBe(false)
    expect(resolveDocumentMetadata(detail.pathname).robots).toBe(noindexRobots)
    expect(resolveStructuredData(detail.pathname)).toBeNull()
    expect(sitemap).not.toContain(detail.canonicalUrl)
  })
})
