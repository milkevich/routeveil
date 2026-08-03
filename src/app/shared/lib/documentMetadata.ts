import compatibility from '../../data/compatibility.json'
import {
  docsSections,
  type DocsSectionId,
} from '../../pages/docs/docsSections'
import {
  findSeoRoute,
  indexRobots,
  noindexRobots,
  npmPackageUrl,
  repositoryUrl,
  resolveSeoRoute,
  siteOrigin,
  type SeoRouteDefinition,
} from './seoRoutes'

export {
  indexRobots,
  npmPackageUrl,
  repositoryUrl,
  siteOrigin,
  socialImageUrl,
} from './seoRoutes'

export const documentLocationChangeEvent = 'routeveil:document-location-change'
export const structuredDataElementId = 'routeveil-structured-data'

const licenseUrl = 'https://spdx.org/licenses/MIT.html'
const productDescription = resolveSeoRoute('/').description

const docsSectionDescriptions: Record<DocsSectionId, string> = {
  overview:
    'Understand how Routeveil coordinates route exits, navigation commits, new-route rendering, and entrance animations in React Router.',
  installation:
    'Install Routeveil with npm install routeveil and configure its React, React DOM, and React Router peer dependencies.',
  compatibility:
    'Review the verified React 18 and 19 and React Router DOM 6.27 and 7 compatibility ranges for Routeveil.',
  'quick-start':
    'Add RouteveilProvider, RouteveilView, and RouteveilLink to create animated React Router navigation.',
  provider:
    'Configure RouteveilProvider defaults, custom transitions, reduced motion, and navigation behavior.',
  'routeveil-link':
    'Use RouteveilLink to choose transitions and typed options for individual React Router navigations.',
  'routeveil-view':
    'Use RouteveilView to define the routed content animated by Routeveil while persistent interface stays mounted.',
  'programmatic-navigation':
    'Navigate with transitions in code using useRouteveilNavigate, React Router options, and scroll controls.',
  'route-preloading':
    'Preload matching React Router lazy route modules before transitioned navigation begins.',
  'route-readiness':
    'Register incoming visual work that Routeveil should await before enter or reveal.',
  'between-rendering':
    'Display controlled React content between exit or cover and enter or reveal, with incoming holds and minimum timing.',
  'transition-playback':
    'Preview Routeveil page and overlay effects with optional between content without changing the current React Router location.',
  'page-transitions':
    'Explore Routeveil page transitions including fade, blur, slide, spin, rotate, bounce, push, and pull.',
  'shared-elements':
    'Connect matching visuals across React Router routes while shared movement may overlap page exit and always settles before page enter.',
  'overlay-transitions':
    'Explore Routeveil overlays including pixel, wipe, iris, halo, tunnel, clock, mosaic, and dissolve.',
  'interrupted-navigation':
    'Learn how Routeveil handles concurrent requests, browser history interruptions, focus, and deterministic transition cleanup.',
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

function metadataFromRoute(route: SeoRouteDefinition): RouteMetadata {
  return {
    title: route.title,
    description: route.description,
    canonicalUrl: route.canonicalUrl,
    robots: route.indexable ? indexRobots : noindexRobots,
    openGraphType: route.openGraphType,
  }
}

const docsMetadata = metadataFromRoute(resolveSeoRoute('/docs'))
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
  const route = resolveSeoRoute(pathname)

  if (route.pathname === '/docs') {
    return docsSectionMetadata.get(decodeHash(hash))
      ?? metadataFromRoute(route)
  }

  return metadataFromRoute(route)
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
      softwareRequirements: `React ${compatibility.supported.react}, React DOM ${compatibility.supported.reactDom}, and React Router DOM ${compatibility.supported.reactRouterDom}`,
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
        'Controlled between-render content and readiness holds',
        'Shared-element movement composed with page transitions',
        'Programmatic navigation and transition playback hooks',
        'Deterministic interrupted-navigation cleanup and focus handling',
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

function createBreadcrumb(route: SeoRouteDefinition): StructuredDataNode | null {
  if (!route.canonicalUrl || route.breadcrumb.length < 2) return null

  return {
    '@type': 'BreadcrumbList',
    '@id': `${route.canonicalUrl}#breadcrumb`,
    itemListElement: route.breadcrumb.map((item, index) => {
      const itemRoute = findSeoRoute(item.pathname)

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: itemRoute?.canonicalUrl,
      }
    }),
  }
}

export function resolveStructuredData(
  pathname: string,
  hash = '',
): Record<string, unknown> | null {
  const route = resolveSeoRoute(pathname)
  const metadata = resolveDocumentMetadata(pathname, hash)

  if (!route.indexable || !metadata.canonicalUrl) return null

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

  if (route.structuredDataType === 'article') {
    Object.assign(page, {
      '@type': ['WebPage', 'TechArticle'],
      headline: metadata.title,
      author: { '@id': authorId },
    })
  } else if (route.structuredDataType === 'web-application') {
    Object.assign(page, {
      '@type': ['WebPage', 'WebApplication'],
      applicationCategory: 'DeveloperApplication',
      browserRequirements: 'JavaScript and a modern web browser',
      isAccessibleForFree: true,
    })
  }

  const routeNodes: StructuredDataNode[] = [page]
  const breadcrumb = createBreadcrumb(route)

  if (breadcrumb) {
    page.breadcrumb = { '@id': `${metadata.canonicalUrl}#breadcrumb` }
    routeNodes.push(breadcrumb)
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [...createCommonStructuredData(), ...routeNodes],
  }
}
