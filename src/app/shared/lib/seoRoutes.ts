export const siteOrigin = 'https://www.routeveil.dev'
export const repositoryUrl = 'https://github.com/milkevich/routeveil'
export const npmPackageUrl = 'https://www.npmjs.com/package/routeveil'
export const socialImageUrl = `${siteOrigin}/og-image-v3.png`

export const indexRobots =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const noindexRobots = 'noindex, follow'

export type SeoBreadcrumbItem = {
  name: string
  pathname: string
}

export type SeoRouteDefinition = {
  breadcrumb: readonly SeoBreadcrumbItem[]
  canonicalUrl: string | null
  description: string
  file: string
  includeInSitemap: boolean
  indexable: boolean
  openGraphType: 'article' | 'website'
  pathname: string
  structuredDataType: 'article' | 'web-application' | 'website' | null
  title: string
}

const productDescription =
  'Routeveil is an open-source React and TypeScript transition engine for React Router with typed page animations, shared elements, and full-screen overlays.'

function canonicalUrl(pathname: string): string {
  return `${siteOrigin}${pathname}`
}

export const seoRouteRegistry = [
  {
    pathname: '/',
    file: 'index.html',
    title: 'Routeveil – Transition Engine for React Router',
    description: productDescription,
    canonicalUrl: `${siteOrigin}/`,
    indexable: true,
    includeInSitemap: true,
    openGraphType: 'website',
    structuredDataType: 'website',
    breadcrumb: [],
  },
  {
    pathname: '/docs',
    file: 'docs.html',
    title: 'Documentation – Routeveil',
    description:
      'Install Routeveil with npm install routeveil, then learn its typed React Router transition components, hooks, built-in effects, and options.',
    canonicalUrl: canonicalUrl('/docs'),
    indexable: true,
    includeInSitemap: true,
    openGraphType: 'article',
    structuredDataType: 'article',
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Documentation', pathname: '/docs' },
    ],
  },
  {
    pathname: '/lab',
    file: 'lab.html',
    title: 'Laboratory – Routeveil',
    description:
      'Preview and customize Routeveil built-in React Router page and full-screen overlay transitions in the interactive laboratory.',
    canonicalUrl: canonicalUrl('/lab'),
    indexable: true,
    includeInSitemap: true,
    openGraphType: 'website',
    structuredDataType: 'web-application',
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Laboratory', pathname: '/lab' },
    ],
  },
  {
    pathname: '/lab/between',
    file: 'lab/between.html',
    title: 'Between Rendering – Routeveil',
    description:
      'Preview Routeveil page and overlay transitions with custom between content, controlled timing, and same-page playback.',
    canonicalUrl: canonicalUrl('/lab/between'),
    indexable: true,
    includeInSitemap: true,
    openGraphType: 'website',
    structuredDataType: 'web-application',
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Laboratory', pathname: '/lab' },
      { name: 'Between Render', pathname: '/lab/between' },
    ],
  },
  {
    pathname: '/lab/shared-elements',
    file: 'lab/shared-elements.html',
    title: 'Shared Elements – Routeveil',
    description:
      'Preview shared-element transitions between React Router routes with Routeveil.',
    canonicalUrl: canonicalUrl('/lab/shared-elements'),
    indexable: true,
    includeInSitemap: true,
    openGraphType: 'website',
    structuredDataType: 'web-application',
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Laboratory', pathname: '/lab' },
      {
        name: 'Shared Elements',
        pathname: '/lab/shared-elements',
      },
    ],
  },
  {
    pathname: '/lab/shared-elements/detail',
    file: 'lab/shared-elements/detail.html',
    title: 'Routeveil Shared Element Detail - React Router Transitions',
    description:
      'Inspect a selected gallery image and reverse its shared-element transition with Routeveil.',
    canonicalUrl: canonicalUrl('/lab/shared-elements/detail'),
    indexable: false,
    includeInSitemap: false,
    openGraphType: 'website',
    structuredDataType: null,
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Laboratory', pathname: '/lab' },
      {
        name: 'Shared Elements',
        pathname: '/lab/shared-elements',
      },
      {
        name: 'Gallery Detail',
        pathname: '/lab/shared-elements/detail',
      },
    ],
  },
  {
    pathname: '/404',
    file: '404.html',
    title: '404 Found – Routeveil',
    description: 'The requested Routeveil page could not be found.',
    canonicalUrl: null,
    indexable: false,
    includeInSitemap: false,
    openGraphType: 'website',
    structuredDataType: null,
    breadcrumb: [],
  },
] as const satisfies readonly SeoRouteDefinition[]

export type SeoRoutePathname = (typeof seoRouteRegistry)[number]['pathname']

export function normalizeSeoPathname(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/u, '') || '/'
}

export function findSeoRoute(pathname: string): SeoRouteDefinition | undefined {
  const normalizedPathname = normalizeSeoPathname(pathname)
  return seoRouteRegistry.find((route) => route.pathname === normalizedPathname)
}

export function resolveSeoRoute(pathname: string): SeoRouteDefinition {
  return findSeoRoute(pathname)
    ?? seoRouteRegistry.find((route) => route.pathname === '/404')!
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;')
}

export function renderSitemapXml(): string {
  const entries = seoRouteRegistry
    .filter((route) => route.indexable && route.includeInSitemap)
    .map((route) => `  <url>\n    <loc>${escapeXml(route.canonicalUrl!)}</loc>\n  </url>`)
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n')
}
