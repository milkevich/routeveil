import {
  docsSections,
  type DocsSectionId,
} from '../../pages/docs/docsSections'

export const siteOrigin = 'https://www.routeveil.dev'
export const repositoryUrl = 'https://github.com/milkevich/routeveil'
export const npmPackageUrl = 'https://www.npmjs.com/package/routeveil'
export const socialImageUrl = `${siteOrigin}/og-image-v2.png`
export const documentLocationChangeEvent = 'routeveil:document-location-change'
export const structuredDataElementId = 'routeveil-structured-data'
const licenseUrl = 'https://spdx.org/licenses/MIT.html'

export const indexRobots =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

const productDescription =
  'Routeveil is an open-source React and TypeScript transition engine for React Router with typed page animations and full-screen overlays.'

const docsSectionDescriptions: Record<DocsSectionId, string> = {
  overview:
    'Understand how Routeveil coordinates route exits, navigation commits, new-route rendering, and entrance animations in React Router.',
  installation:
    'Install Routeveil with npm install routeveil and configure its React, React DOM, and React Router peer dependencies.',
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
  openGraphType: 'article' | 'website'
}

const homeMetadata: RouteMetadata = {
  title: 'Routeveil - React Router Transitions',
  description: productDescription,
  canonicalUrl: `${siteOrigin}/`,
  robots: indexRobots,
  openGraphType: 'website',
}

const docsMetadata: RouteMetadata = {
  title: 'Routeveil Documentation - React Router Transitions',
  description:
    'Install Routeveil with npm install routeveil, then learn its typed React Router transition components, hooks, built-in effects, and options.',
  canonicalUrl: `${siteOrigin}/docs`,
  robots: indexRobots,
  openGraphType: 'article',
}

const labMetadata: RouteMetadata = {
  title: 'Routeveil Laboratory - Interactive Transition Demos',
  description:
    'Preview and customize Routeveil built-in React Router page and full-screen overlay transitions in the interactive laboratory.',
  canonicalUrl: `${siteOrigin}/lab`,
  robots: indexRobots,
  openGraphType: 'website',
}

const notFoundMetadata: RouteMetadata = {
  title: 'Routeveil - Page Not Found',
  description: 'The requested Routeveil page could not be found.',
  canonicalUrl: null,
  robots: 'noindex, follow',
  openGraphType: 'website',
}

const docsSectionMetadata = new Map<string, RouteMetadata>(
  docsSections.map((section) => [
    section.id,
    {
      ...docsMetadata,
      title: `Routeveil Documentation - ${section.label}`,
      description: docsSectionDescriptions[section.id],
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

type StructuredDataNode = Record<string, unknown>

function createCommonStructuredData(): StructuredDataNode[] {
  const authorId = `${repositoryUrl}#author`
  const softwareId = `${siteOrigin}/#software`
  const sourceId = `${siteOrigin}/#source`
  const websiteId = `${siteOrigin}/#website`

  return [
    {
      '@type': 'Person',
      '@id': authorId,
      name: 'Gleb',
      url: 'https://github.com/milkevich',
      sameAs: ['https://github.com/milkevich'],
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${siteOrigin}/`,
      name: 'Routeveil',
      alternateName: 'Routeveil React Router Transitions',
      description: productDescription,
      inLanguage: 'en-US',
      about: { '@id': softwareId },
      publisher: { '@id': authorId },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': softwareId,
      name: 'Routeveil',
      url: `${siteOrigin}/`,
      description: productDescription,
      applicationCategory: 'DeveloperApplication',
      applicationSubCategory: 'React Router transition engine',
      operatingSystem: 'Cross-platform',
      browserRequirements: 'A modern browser with the Web Animations API',
      softwareRequirements: 'React 19, React DOM 19, and React Router DOM 7',
      downloadUrl: npmPackageUrl,
      installUrl: npmPackageUrl,
      isAccessibleForFree: true,
      license: licenseUrl,
      author: { '@id': authorId },
      sameAs: [repositoryUrl, npmPackageUrl],
      featureList: [
        'Per-navigation React Router transitions',
        'Typed transition-specific options',
        'Page and full-screen overlay effects',
        'Programmatic navigation and transition playback hooks',
        'Reduced-motion support',
      ],
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': sourceId,
      name: 'Routeveil source code',
      url: repositoryUrl,
      description: productDescription,
      codeRepository: repositoryUrl,
      programmingLanguage: ['TypeScript', 'JavaScript'],
      runtimePlatform: ['React', 'React Router'],
      targetProduct: { '@id': softwareId },
      isAccessibleForFree: true,
      license: licenseUrl,
      author: { '@id': authorId },
      sameAs: [`${siteOrigin}/`, npmPackageUrl],
    },
  ]
}

function createBreadcrumb(
  canonicalUrl: string,
  name: string,
): StructuredDataNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Routeveil',
        item: `${siteOrigin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: canonicalUrl,
      },
    ],
  }
}

export function resolveStructuredData(
  pathname: string,
  hash = '',
): Record<string, unknown> | null {
  const metadata = resolveDocumentMetadata(pathname, hash)

  if (!metadata.canonicalUrl) return null

  const softwareId = `${siteOrigin}/#software`
  const websiteId = `${siteOrigin}/#website`
  const authorId = `${repositoryUrl}#author`
  const pageId = `${metadata.canonicalUrl}#webpage`
  const page: StructuredDataNode = {
    '@type': 'WebPage',
    '@id': pageId,
    url: metadata.canonicalUrl,
    name: metadata.title,
    description: metadata.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': websiteId },
    about: { '@id': softwareId },
    mainEntity: { '@id': softwareId },
  }

  const routeNodes: StructuredDataNode[] = [page]

  if (pathname === '/docs' || pathname === '/docs/') {
    Object.assign(page, {
      '@type': ['WebPage', 'TechArticle'],
      headline: metadata.title,
      author: { '@id': authorId },
      breadcrumb: { '@id': `${siteOrigin}/docs#breadcrumb` },
    })
    routeNodes.push(createBreadcrumb(`${siteOrigin}/docs`, 'Documentation'))
  } else if (pathname === '/lab' || pathname === '/lab/') {
    Object.assign(page, {
      '@type': ['WebPage', 'WebApplication'],
      applicationCategory: 'DeveloperApplication',
      browserRequirements: 'JavaScript and a modern web browser',
      isAccessibleForFree: true,
      breadcrumb: { '@id': `${siteOrigin}/lab#breadcrumb` },
    })
    routeNodes.push(createBreadcrumb(`${siteOrigin}/lab`, 'Laboratory'))
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [...createCommonStructuredData(), ...routeNodes],
  }
}
