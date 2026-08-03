import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SeoStaticShell } from '../src/app/shared/SeoStaticShell'
import {
  resolveDocumentMetadata,
  resolveStructuredData,
} from '../src/app/shared/lib/documentMetadata'
import {
  escapeXml,
  findSeoRoute,
  indexRobots,
  noindexRobots,
  renderSitemapXml,
  resolveSeoRoute,
  seoRouteRegistry,
  siteOrigin,
  type SeoRouteDefinition,
} from '../src/app/shared/lib/seoRoutes'

type StructuredDataNode = Record<string, unknown>

function renderStaticDocument(route: SeoRouteDefinition): Document {
  const markup = renderToStaticMarkup(<SeoStaticShell route={route} />)

  return new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><body><div id="root">${markup}</div></body></html>`,
    'text/html',
  )
}

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

describe('SEO static route shells', () => {
  for (const route of seoRouteRegistry) {
    it(`renders understandable initial HTML for ${route.pathname}`, () => {
      const staticDocument = renderStaticDocument(route)
      const root = staticDocument.getElementById('root')
      const main = root?.querySelector('main')
      const heading = root?.querySelector('h1')
      const text = root?.textContent?.replace(/\s+/gu, ' ').trim() ?? ''
      const anchors = [
        ...root!.querySelectorAll<HTMLAnchorElement>('a[href]'),
      ]
      const internalAnchors = anchors.filter((anchor) => (
        anchor.getAttribute('href')?.startsWith('/')
      ))

      expect(root).not.toBeNull()
      expect(root?.children).toHaveLength(1)
      expect(root?.querySelectorAll('main')).toHaveLength(1)
      expect(main?.getAttribute('data-routeveil-static-shell')).toBe('')
      expect(main?.hasAttribute('hidden')).toBe(false)
      expect(main?.getAttribute('aria-hidden')).not.toBe('true')
      expect(root?.querySelectorAll('h1')).toHaveLength(1)
      expect(heading?.textContent).toBe(route.heading)
      expect(text.length).toBeGreaterThan(160)
      expect(text).toContain(route.staticSummary)
      expect(root?.querySelector('noscript')).toBeNull()
      expect(root?.querySelector('script')).toBeNull()
      expect(internalAnchors.length).toBeGreaterThan(0)
      expect(anchors.map((anchor) => ({
        href: anchor.getAttribute('href'),
        label: anchor.textContent?.trim(),
      }))).toEqual(route.links)

      for (const section of route.staticContent) {
        expect(text).toContain(section.heading)
        if (section.code) expect(text).toContain(section.code)
        for (const paragraph of section.paragraphs) {
          expect(text).toContain(paragraph)
        }
      }

      for (const anchor of anchors) {
        expect(anchor.textContent?.trim().length).toBeGreaterThan(0)
      }
    })
  }

  it('makes every indexable page crawlably reachable from the homepage', () => {
    const pending = ['/']
    const visited = new Set<string>()

    while (pending.length > 0) {
      const pathname = pending.shift()
      if (!pathname || visited.has(pathname)) continue
      visited.add(pathname)

      const route = findSeoRoute(pathname)
      if (!route) continue

      for (const link of route.links) {
        const linkedRoute = link.href.startsWith('/')
          ? findSeoRoute(new URL(link.href, siteOrigin).pathname)
          : undefined
        if (linkedRoute?.indexable && !visited.has(linkedRoute.pathname)) {
          pending.push(linkedRoute.pathname)
        }
      }
    }

    expect(
      seoRouteRegistry
        .filter((route) => route.indexable)
        .map((route) => route.pathname)
        .filter((pathname) => !visited.has(pathname)),
    ).toEqual([])
  })

  it('resolves every internal route and fragment without JavaScript', () => {
    const documents = new Map(
      seoRouteRegistry.map((route) => [
        route.pathname,
        renderStaticDocument(route),
      ]),
    )

    for (const route of seoRouteRegistry) {
      for (const link of route.links) {
        const url = new URL(link.href, `${siteOrigin}${route.pathname}`)
        if (url.origin !== siteOrigin) continue

        const targetRoute = findSeoRoute(url.pathname)
        expect(targetRoute, link.href).toBeDefined()
        expect(url.pathname, link.href).toBe(targetRoute?.pathname)

        if (url.hash) {
          const targetId = decodeURIComponent(url.hash.slice(1))
          expect(
            documents.get(targetRoute!.pathname)?.getElementById(targetId),
            link.href,
          ).not.toBeNull()
        }
      }
    }
  })
})

describe('SEO route registry and sitemap', () => {
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
