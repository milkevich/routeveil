export const siteOrigin = 'https://www.routeveil.dev'
export const repositoryUrl = 'https://github.com/milkevich/routeveil'
export const npmPackageUrl = 'https://www.npmjs.com/package/routeveil'
export const socialImageUrl = `${siteOrigin}/og-image-v3.png`

export const indexRobots =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const noindexRobots = 'noindex, follow'

export type SeoLink = {
  href: string
  label: string
}

export type SeoStaticSection = {
  code?: string
  heading: string
  id?: string
  paragraphs: readonly string[]
}

export type SeoBreadcrumbItem = {
  name: string
  pathname: string
}

export type SeoRouteDefinition = {
  breadcrumb: readonly SeoBreadcrumbItem[]
  canonicalUrl: string | null
  description: string
  file: string
  heading: string
  includeInSitemap: boolean
  indexable: boolean
  links: readonly SeoLink[]
  openGraphType: 'article' | 'website'
  pathname: string
  staticContent: readonly SeoStaticSection[]
  staticSummary: string
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
    heading: 'Routeveil for React Router transitions',
    staticSummary:
      'Routeveil adds typed page transitions, full-screen overlay transitions, shared-element movement, and between-route React content to React Router navigation.',
    staticContent: [
      {
        heading: 'Transitions that belong to navigation',
        paragraphs: [
          'Choose movement at the link or programmatic navigation that starts it while route components stay focused on their own content.',
          'Routeveil supports page transitions, full-screen overlays, matching shared elements across routes, and content rendered between outgoing and incoming pages.',
        ],
      },
      {
        heading: 'Built for application behavior',
        paragraphs: [
          'Reduced-motion handling, transition playback, route readiness, focus, and scroll behavior are coordinated with React Router rather than layered on as a separate slideshow.',
        ],
      },
    ],
    breadcrumb: [],
    links: [
      { href: '/docs', label: 'Read the Routeveil documentation' },
      { href: '/lab', label: 'Preview transitions in the laboratory' },
      { href: '/lab/between', label: 'Explore the Between Render Lab' },
      {
        href: '/lab/shared-elements',
        label: 'Explore the Shared Elements Lab',
      },
      { href: repositoryUrl, label: 'View Routeveil on GitHub' },
      { href: npmPackageUrl, label: 'Install Routeveil from npm' },
    ],
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
    heading: 'Routeveil documentation',
    staticSummary:
      'Install Routeveil and learn the provider, routed view, links, hooks, and transition options that coordinate animated React Router navigation.',
    staticContent: [
      {
        id: 'installation',
        heading: 'Installation',
        paragraphs: [
          'Import the React Router integration from routeveil/react-router after installing the package.',
        ],
        code: 'npm install routeveil',
      },
      {
        id: 'quick-start',
        heading: 'Provider, view, and navigation',
        paragraphs: [
          'RouteveilProvider coordinates transition state, RouteveilView marks the routed content that moves, and RouteveilLink starts navigation with a selected transition. Hooks provide the same control for programmatic navigation and same-page playback.',
        ],
      },
      {
        id: 'between-rendering',
        heading: 'Between rendering',
        paragraphs: [
          'Render React content between outgoing and incoming phases, set a minimum duration, or let an incoming RouteveilBetween registration hold the transition for ready content.',
        ],
      },
      {
        id: 'transition-playback',
        heading: 'Transition playback',
        paragraphs: [
          'Preview a page or overlay transition on the current route without committing a new React Router location.',
        ],
      },
      {
        id: 'page-transitions',
        heading: 'Page transitions',
        paragraphs: [
          'Animate the routed view itself with typed effects such as fade, blur, slide, push, pull, spin, rotate, and bounce.',
        ],
      },
      {
        id: 'overlay-transitions',
        heading: 'Overlay transitions',
        paragraphs: [
          'Cover and reveal navigation with full-screen effects including pixel, wipe, curtain, iris, tunnel, mosaic, and dissolve.',
        ],
      },
      {
        id: 'shared-elements',
        heading: 'Shared elements',
        paragraphs: [
          'Match named HTML or SVG elements across React Router routes and settle their movement before page enter completes.',
        ],
      },
      {
        id: 'reduced-motion',
        heading: 'Reduced motion',
        paragraphs: [
          'Respect reduced-motion preferences while navigation, focus, scroll positioning, and route updates still complete safely.',
        ],
      },
    ],
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Documentation', pathname: '/docs' },
    ],
    links: [
      { href: '/docs#installation', label: 'Installation' },
      { href: '/docs#quick-start', label: 'Quick start' },
      { href: '/docs#between-rendering', label: 'Between rendering' },
      { href: '/docs#transition-playback', label: 'Transition playback' },
      { href: '/docs#page-transitions', label: 'Page transitions' },
      { href: '/docs#overlay-transitions', label: 'Overlay transitions' },
      { href: '/docs#shared-elements', label: 'Shared elements' },
      { href: '/docs#reduced-motion', label: 'Reduced motion' },
      { href: '/lab', label: 'Open the transition laboratory' },
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
    heading: 'Routeveil transition laboratory',
    staticSummary:
      'Preview React Router page transitions and full-screen overlay transitions directly on the current page without changing its route, URL, scroll position, or browser history.',
    staticContent: [
      {
        heading: 'Same-page transition playback',
        paragraphs: [
          'Run page effects such as fade, blur, slide, push, and pull, or cover-and-reveal overlays such as pixel, wipe, iris, tunnel, mosaic, and dissolve.',
          'The specialized labs demonstrate custom React content between phases and matching shared elements across separate React Router routes.',
        ],
      },
    ],
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Laboratory', pathname: '/lab' },
    ],
    links: [
      { href: '/lab/between', label: 'Open the Between Render Lab' },
      {
        href: '/lab/shared-elements',
        label: 'Open the Shared Elements Lab',
      },
      { href: '/docs', label: 'Read the Routeveil documentation' },
      { href: '/', label: 'Return to the Routeveil homepage' },
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
    heading: 'Routeveil Between Render Lab',
    staticSummary:
      'Preview React content displayed between the outgoing and incoming phases of Routeveil page and overlay transitions.',
    staticContent: [
      {
        heading: 'Between-route content and timing',
        paragraphs: [
          'A navigation can supply between-route React content and a minDuration, while an incoming RouteveilBetween registration can contribute content or hold the transition until its work is ready.',
          'These examples use same-page playback, so each transition runs without changing the current React Router route or browser history.',
        ],
      },
    ],
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Laboratory', pathname: '/lab' },
      { name: 'Between Render', pathname: '/lab/between' },
    ],
    links: [
      {
        href: '/docs#between-rendering',
        label: 'Read the between-rendering guide',
      },
      {
        href: '/docs#transition-playback',
        label: 'Read about same-page transition playback',
      },
      { href: '/lab', label: 'Return to the transition laboratory' },
      { href: '/', label: 'Return to the Routeveil homepage' },
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
    heading: 'Routeveil Shared Elements Lab',
    staticSummary:
      'Explore how Routeveil matches named HTML or SVG elements across React Router routes and moves them while the surrounding page transition completes.',
    staticContent: [
      {
        heading: 'Matching elements across routes',
        paragraphs: [
          'Open a gallery item to move its matching image into a separate detail route. Page enter waits for shared movement to settle before the real incoming element takes over.',
          'The shared-elements guide explains matching, scroll positioning, reduced motion, and how shared movement composes with page transitions.',
        ],
      },
    ],
    breadcrumb: [
      { name: 'Routeveil', pathname: '/' },
      { name: 'Laboratory', pathname: '/lab' },
      {
        name: 'Shared Elements',
        pathname: '/lab/shared-elements',
      },
    ],
    links: [
      {
        href: '/docs#shared-elements',
        label: 'Read the shared-elements guide',
      },
      { href: '/lab', label: 'Return to the transition laboratory' },
      { href: '/', label: 'Return to the Routeveil homepage' },
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
    heading: 'Shared element gallery detail',
    staticSummary:
      'This interactive detail view displays the gallery item selected in the Shared Elements Lab and can move it back to its matching position.',
    staticContent: [
      {
        heading: 'Return to the stable lab page',
        paragraphs: [
          'The selected item depends on the gallery navigation state, so the Shared Elements Lab is the canonical searchable explanation and starting point for this demonstration.',
        ],
      },
    ],
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
    links: [
      {
        href: '/lab/shared-elements',
        label: 'Return to the Shared Elements Lab',
      },
      {
        href: '/docs#shared-elements',
        label: 'Read the shared-elements guide',
      },
      { href: '/lab', label: 'Return to the transition laboratory' },
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
    heading: 'Page not found',
    staticSummary:
      'The requested page does not exist, but the Routeveil documentation and interactive transition demos are still available.',
    staticContent: [
      {
        heading: 'Continue exploring Routeveil',
        paragraphs: [
          'Return home, read the React Router transition documentation, or open the laboratory to preview page and overlay transitions.',
        ],
      },
    ],
    breadcrumb: [],
    links: [
      { href: '/', label: 'Return to the Routeveil homepage' },
      { href: '/docs', label: 'Read the Routeveil documentation' },
      { href: '/lab', label: 'Open the transition laboratory' },
    ],
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
