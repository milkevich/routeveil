import {
  docsSections,
  type DocsSectionId,
} from '../../pages/docs/docsSections'

export const siteOrigin = 'https://www.routeveil.dev'
export const socialImageUrl = `${siteOrigin}/og-image.png`
export const documentLocationChangeEvent = 'routeveil:document-location-change'

const indexRobots =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

const docsSectionDescriptions: Record<DocsSectionId, string> = {
  overview:
    'Understand how Routeveil coordinates route exits, navigation commits, new-route rendering, and entrance animations in React Router.',
  installation:
    'Install Routeveil and configure its React, React DOM, and React Router peer dependencies.',
  'quick-start':
    'Add RouteveilProvider, RouteveilView, and RouteveilLink to create animated React Router navigation.',
  provider:
    'Configure RouteveilProvider defaults, custom transitions, reduced motion, and navigation behavior.',
  'routeveil-link':
    'Use RouteveilLink to choose transitions and typed options for individual React Router navigations.',
  'routeveil-view':
    'Use RouteveilView to define the routed content animated by Routeveil while persistent interface stays mounted.',
  'programmatic-navigation':
    'Navigate with transitions in code using Routeveil hooks, typed options, and scroll controls.',
  'page-transitions':
    'Explore Routeveil page transitions including fade, blur, slide, spin, rotate, bounce, push, and pull.',
  'overlay-transitions':
    'Explore Routeveil overlays including pixel, wipe, iris, halo, tunnel, clock, mosaic, and dissolve.',
  'transition-options':
    'Configure Routeveil transition direction, duration, easing, colors, origins, grids, stagger, and other typed options.',
  'reduced-motion':
    'Learn how Routeveil respects reduced-motion preferences while completing React Router navigation safely.',
}

export interface RouteMetadata {
  title: string
  description: string
  canonicalUrl: string | null
  robots: string
}

const homeMetadata: RouteMetadata = {
  title: 'Routeveil - React Router Transitions',
  description:
    'Routeveil is a React Router transition library with typed page animations, full-screen overlays, per-link control, and customizable effects.',
  canonicalUrl: `${siteOrigin}/`,
  robots: indexRobots,
}

const docsMetadata: RouteMetadata = {
  title: 'Routeveil - Documentation',
  description:
    'Learn how to install Routeveil, configure React Router transitions, use typed options, navigate programmatically, and create custom effects.',
  canonicalUrl: `${siteOrigin}/docs`,
  robots: indexRobots,
}

const labMetadata: RouteMetadata = {
  title: 'Routeveil - Laboratory',
  description:
    'Preview and customize Routeveil\'s built-in React Router page and overlay transitions in the interactive laboratory.',
  canonicalUrl: `${siteOrigin}/lab`,
  robots: indexRobots,
}

const notFoundMetadata: RouteMetadata = {
  title: 'Routeveil - Page Not Found',
  description: 'The requested Routeveil page could not be found.',
  canonicalUrl: null,
  robots: 'noindex, follow',
}

const docsSectionMetadata = new Map<string, RouteMetadata>(
  docsSections.map((section) => [
    section.id,
    {
      title: `Routeveil - ${section.label}`,
      description: docsSectionDescriptions[section.id],
      canonicalUrl: `${siteOrigin}/docs`,
      robots: indexRobots,
    },
  ]),
)

function decodeHash(hash: string): string {
  const value = hash.startsWith('#') ? hash.slice(1) : hash

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function resolveDocumentMetadata(
  pathname: string,
  hash = '',
): RouteMetadata {
  if (pathname === '/docs' || pathname === '/docs/') {
    return docsSectionMetadata.get(decodeHash(hash)) ?? docsMetadata
  }

  if (pathname === '/lab' || pathname === '/lab/') {
    return labMetadata
  }

  return pathname === '/' ? homeMetadata : notFoundMetadata
}
