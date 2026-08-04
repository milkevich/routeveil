import {
  access,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { JSDOM } from 'jsdom'
import compatibility from '../src/app/data/compatibility.json'
import { releases } from '../src/app/data/releases'
import {
  resolveDocumentMetadata,
  resolveStructuredData,
  structuredDataElementId,
} from '../src/app/shared/lib/documentMetadata'
import {
  indexRobots,
  noindexRobots,
  renderSitemapXml,
  seoRouteRegistry,
  siteOrigin,
  socialImageUrl,
  type SeoRouteDefinition,
} from '../src/app/shared/lib/seoRoutes'

const buildRoot = resolve(process.cwd(), 'dist/demo')
const templatePath = resolve(buildRoot, 'index.html')
const template = await readFile(templatePath, 'utf8')
const generatedSitemap = renderSitemapXml()

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SEO build check failed: ${message}`)
}

async function exists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function upsertMeta(
  document: Document,
  attribute: 'name' | 'property',
  key: string,
  content: string | null,
) {
  const selector = `meta[${attribute}="${key}"]`
  const [existing, ...duplicates] = [
    ...document.head.querySelectorAll<HTMLMetaElement>(selector),
  ]

  duplicates.forEach((element) => element.remove())

  if (!content) {
    existing?.remove()
    return
  }

  const element = existing ?? document.createElement('meta')
  element.setAttribute(attribute, key)
  element.setAttribute('content', content)

  if (!element.isConnected) {
    document.head.append(element)
  }
}

function updateCanonical(document: Document, canonicalUrl: string | null) {
  const [existing, ...duplicates] = [
    ...document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
  ]

  duplicates.forEach((element) => element.remove())

  if (!canonicalUrl) {
    existing?.remove()
    return
  }

  const element = existing ?? document.createElement('link')
  element.setAttribute('rel', 'canonical')
  element.setAttribute('href', canonicalUrl)

  if (!element.isConnected) {
    document.head.append(element)
  }
}

function updateStructuredData(
  document: Document,
  structuredData: Record<string, unknown> | null,
) {
  document.getElementById(structuredDataElementId)?.remove()

  if (!structuredData) return

  const element = document.createElement('script')
  element.id = structuredDataElementId
  element.setAttribute('type', 'application/ld+json')
  element.textContent = JSON.stringify(structuredData).replace(/</gu, '\\u003c')
  document.head.append(element)
}

function applyMetadata(document: Document, route: SeoRouteDefinition) {
  const metadata = resolveDocumentMetadata(route.pathname)

  document.title = metadata.title
  updateCanonical(document, metadata.canonicalUrl)
  upsertMeta(document, 'name', 'description', metadata.description)
  upsertMeta(document, 'name', 'robots', metadata.robots)
  upsertMeta(document, 'property', 'og:type', metadata.openGraphType)
  upsertMeta(document, 'property', 'og:locale', 'en_US')
  upsertMeta(document, 'property', 'og:site_name', 'Routeveil')
  upsertMeta(document, 'property', 'og:title', metadata.title)
  upsertMeta(document, 'property', 'og:description', metadata.description)
  upsertMeta(document, 'property', 'og:url', metadata.canonicalUrl)
  upsertMeta(document, 'property', 'og:image', socialImageUrl)
  upsertMeta(document, 'property', 'og:image:secure_url', socialImageUrl)
  upsertMeta(document, 'property', 'og:image:type', 'image/png')
  upsertMeta(document, 'property', 'og:image:width', '1200')
  upsertMeta(document, 'property', 'og:image:height', '630')
  upsertMeta(
    document,
    'property',
    'og:image:alt',
    'Routeveil, React Router page and overlay transitions',
  )
  upsertMeta(document, 'name', 'twitter:card', 'summary_large_image')
  upsertMeta(document, 'name', 'twitter:title', metadata.title)
  upsertMeta(document, 'name', 'twitter:description', metadata.description)
  upsertMeta(document, 'name', 'twitter:image', socialImageUrl)
  upsertMeta(
    document,
    'name',
    'twitter:image:alt',
    'Routeveil, React Router page and overlay transitions',
  )
  updateStructuredData(document, resolveStructuredData(route.pathname))
}

function metaContent(
  document: Document,
  attribute: 'name' | 'property',
  key: string,
): string | null {
  return document
    .querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    ?.getAttribute('content') ?? null
}

function parseStructuredData(
  document: Document,
  route: SeoRouteDefinition,
): Record<string, unknown> | null {
  const elements = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )

  if (!route.indexable) {
    invariant(elements.length === 0, `${route.pathname} must not emit JSON-LD`)
    return null
  }

  invariant(elements.length === 1, `${route.pathname} needs one JSON-LD block`)

  try {
    return JSON.parse(elements[0]?.textContent ?? '') as Record<string, unknown>
  } catch {
    throw new Error(
      `SEO build check failed: ${route.pathname} has invalid JSON-LD`,
    )
  }
}

function validateBreadcrumbs(
  route: SeoRouteDefinition,
  structuredData: Record<string, unknown> | null,
) {
  if (!structuredData) return

  const graph = structuredData['@graph']
  invariant(Array.isArray(graph), `${route.pathname} has no JSON-LD graph`)
  const breadcrumbs = graph.filter((node) => (
    typeof node === 'object'
    && node !== null
    && (node as Record<string, unknown>)['@type'] === 'BreadcrumbList'
  )) as Array<Record<string, unknown>>

  if (route.breadcrumb.length < 2) {
    invariant(
      breadcrumbs.length === 0,
      `${route.pathname} has a meaningless breadcrumb`,
    )
    return
  }

  invariant(
    breadcrumbs.length === 1,
    `${route.pathname} needs one breadcrumb list`,
  )
  const items = breadcrumbs[0]?.itemListElement
  invariant(
    Array.isArray(items),
    `${route.pathname} breadcrumb items are invalid`,
  )

  const canonicalUrls = new Set(
    seoRouteRegistry
      .map((candidate) => candidate.canonicalUrl)
      .filter((value): value is string => Boolean(value)),
  )

  items.forEach((item, index) => {
    invariant(
      typeof item === 'object' && item !== null,
      `${route.pathname} breadcrumb ${index + 1} is invalid`,
    )
    const listItem = item as Record<string, unknown>
    invariant(
      listItem.position === index + 1,
      `${route.pathname} breadcrumb positions are not sequential`,
    )
    invariant(
      typeof listItem.item === 'string'
        && canonicalUrls.has(listItem.item),
      `${route.pathname} breadcrumb item is not canonical`,
    )
  })

  invariant(
    (items.at(-1) as Record<string, unknown> | undefined)?.item
      === route.canonicalUrl,
    `${route.pathname} breadcrumb does not end at its canonical URL`,
  )
}

function validateGeneratedClientEntry(
  document: Document,
  route: SeoRouteDefinition,
) {
  const root = document.getElementById('root')
  invariant(root, `${route.pathname} is missing the React root`)
  invariant(
    root.childNodes.length === 0,
    `${route.pathname} must have an empty initial React root`,
  )
  invariant(
    !document.querySelector('[data-routeveil-static-shell]'),
    `${route.pathname} contains the removed static shell`,
  )
  invariant(
    document.querySelectorAll('noscript').length === 0,
    `${route.pathname} contains an alternate noscript page`,
  )
  invariant(
    Boolean(document.querySelector('script[type="module"][src]')),
    `${route.pathname} is missing the client application entry`,
  )
}

function validateMetadata(
  document: Document,
  route: SeoRouteDefinition,
  sitemapUrls: Set<string>,
) {
  const metadata = resolveDocumentMetadata(route.pathname)
  const canonicals = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="canonical"]',
  )

  invariant(document.documentElement.lang === 'en', `${route.pathname} needs lang=en`)
  invariant(document.title === route.title, `${route.pathname} has the wrong title`)
  invariant(
    metaContent(document, 'name', 'description') === route.description,
    `${route.pathname} has the wrong description`,
  )
  invariant(
    canonicals.length === (route.canonicalUrl ? 1 : 0),
    `${route.pathname} has the wrong canonical count`,
  )
  if (route.canonicalUrl) {
    invariant(
      canonicals[0]?.href === route.canonicalUrl,
      `${route.pathname} has the wrong canonical URL`,
    )
  }
  invariant(
    metaContent(document, 'name', 'robots')
      === (route.indexable ? indexRobots : noindexRobots),
    `${route.pathname} has the wrong robots directive`,
  )
  invariant(
    metaContent(document, 'property', 'og:title') === metadata.title
      && metaContent(document, 'property', 'og:description')
        === metadata.description
      && metaContent(document, 'property', 'og:url')
        === metadata.canonicalUrl
      && metaContent(document, 'property', 'og:image') === socialImageUrl,
    `${route.pathname} has mismatched Open Graph metadata`,
  )
  invariant(
    metaContent(document, 'name', 'twitter:title') === metadata.title
      && metaContent(document, 'name', 'twitter:description')
        === metadata.description
      && metaContent(document, 'name', 'twitter:image') === socialImageUrl,
    `${route.pathname} has mismatched Twitter metadata`,
  )

  if (route.indexable) {
    invariant(
      route.canonicalUrl !== null && sitemapUrls.has(route.canonicalUrl),
      `${route.pathname} canonical URL is missing from the sitemap`,
    )
  } else {
    invariant(
      !route.canonicalUrl || !sitemapUrls.has(route.canonicalUrl),
      `${route.pathname} is noindex but appears in the sitemap`,
    )
  }
}

function localAssetPath(reference: string): string | null {
  try {
    const url = new URL(reference, siteOrigin)
    if (url.origin !== siteOrigin) return null
    return url.pathname.slice(1)
  } catch {
    return null
  }
}

async function validateAssets(document: Document, route: SeoRouteDefinition) {
  const references = [
    ...document.querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"][href], link[rel~="icon"][href], link[rel="apple-touch-icon"][href], link[rel="manifest"][href], link[rel="sitemap"][href]',
    ),
    ...document.querySelectorAll<HTMLElement>('[src]'),
  ].map((element) => element.getAttribute('href') ?? element.getAttribute('src'))

  for (const element of document.querySelectorAll<HTMLElement>('[srcset]')) {
    const srcset = element.getAttribute('srcset') ?? ''
    references.push(...srcset.split(',').map((candidate) => (
      candidate.trim().split(/\s+/u)[0] ?? null
    )))
  }

  references.push(
    metaContent(document, 'property', 'og:image'),
    metaContent(document, 'property', 'og:image:secure_url'),
    metaContent(document, 'name', 'twitter:image'),
  )

  for (const reference of new Set(references)) {
    invariant(reference, `${route.pathname} has an empty asset reference`)
    const path = localAssetPath(reference)
    if (!path) continue
    invariant(
      await exists(resolve(buildRoot, path)),
      `${route.pathname} references a missing asset: ${reference}`,
    )
  }
}

function parseSitemap(sitemap: string): string[] {
  const document = new JSDOM(sitemap, { contentType: 'text/xml' }).window.document
  invariant(
    document.querySelectorAll('parsererror').length === 0,
    'sitemap XML is invalid',
  )
  invariant(
    document.querySelectorAll('priority, changefreq, lastmod').length === 0,
    'sitemap contains unsupported freshness or ranking hints',
  )
  return [...document.querySelectorAll('loc')]
    .map((element) => element.textContent?.trim() ?? '')
}

function validateSitemap(sitemap: string): Set<string> {
  const urls = parseSitemap(sitemap)
  const uniqueUrls = new Set(urls)
  const expectedUrls = seoRouteRegistry
    .filter((route) => route.indexable && route.includeInSitemap)
    .map((route) => route.canonicalUrl)

  invariant(urls.length === uniqueUrls.size, 'sitemap URLs are not unique')
  invariant(
    JSON.stringify(urls) === JSON.stringify(expectedUrls),
    'sitemap has drifted from the SEO route registry',
  )

  for (const value of urls) {
    const url = new URL(value)
    invariant(url.protocol === 'https:', `sitemap URL is not HTTPS: ${value}`)
    invariant(url.hostname === 'www.routeveil.dev', `sitemap URL is not on www: ${value}`)
    invariant(!url.hash, `sitemap URL contains a hash: ${value}`)
    invariant(url.pathname !== '/404', 'sitemap points to the 404 page')
    invariant(
      url.pathname === '/' || !url.pathname.endsWith('/'),
      `sitemap URL has a trailing slash: ${value}`,
    )
  }

  return uniqueUrls
}

function validateRouteRegistry() {
  const pathnames = new Set<string>()
  const files = new Set<string>()
  const canonicalUrls = new Set<string>()
  const indexableTitles = new Set<string>()
  const indexableDescriptions = new Set<string>()

  for (const route of seoRouteRegistry) {
    invariant(!pathnames.has(route.pathname), `duplicate route ${route.pathname}`)
    invariant(!files.has(route.file), `duplicate output file ${route.file}`)
    pathnames.add(route.pathname)
    files.add(route.file)

    if (route.canonicalUrl) {
      const canonical = new URL(route.canonicalUrl)
      invariant(
        canonical.origin === siteOrigin
          && canonical.pathname === route.pathname
          && canonical.search === ''
          && canonical.hash === '',
        `${route.pathname} canonical URL is not a final route URL`,
      )
      invariant(
        !canonicalUrls.has(route.canonicalUrl),
        `duplicate canonical URL ${route.canonicalUrl}`,
      )
      canonicalUrls.add(route.canonicalUrl)
    }

    if (route.indexable) {
      invariant(route.includeInSitemap, `${route.pathname} is missing from the sitemap`)
      invariant(
        !indexableTitles.has(route.title),
        `${route.pathname} has a duplicate title`,
      )
      invariant(
        !indexableDescriptions.has(route.description),
        `${route.pathname} has a duplicate description`,
      )
      indexableTitles.add(route.title)
      indexableDescriptions.add(route.description)
    }
  }
}

async function validateVercelConfiguration() {
  const configuration = JSON.parse(
    await readFile(resolve(process.cwd(), 'vercel.json'), 'utf8'),
  ) as Record<string, unknown>
  const redirects = Array.isArray(configuration.redirects)
    ? configuration.redirects as Array<Record<string, unknown>>
    : []
  const preferredHostRedirect = redirects.find((redirect) => (
    redirect.source === '/:path*'
    && redirect.destination === 'https://www.routeveil.dev/:path*'
    && redirect.permanent === true
    && Array.isArray(redirect.has)
    && redirect.has.some((condition) => (
      typeof condition === 'object'
      && condition !== null
      && (condition as Record<string, unknown>).type === 'host'
      && (condition as Record<string, unknown>).value === 'routeveil.dev'
    ))
  ))

  invariant(configuration.framework === 'vite', 'Vercel framework is not Vite')
  invariant(
    configuration.buildCommand === 'npm run build:demo',
    'Vercel uses the wrong build command',
  )
  invariant(
    configuration.outputDirectory === 'dist/demo',
    'Vercel uses the wrong output directory',
  )
  invariant(configuration.cleanUrls === true, 'Vercel clean URLs are disabled')
  invariant(
    configuration.trailingSlash === false,
    'Vercel trailing-slash redirects are disabled',
  )
  invariant(preferredHostRedirect, 'Vercel preferred-host redirect is invalid')
  invariant(
    redirects.length === 1,
    'Vercel has an unexpected redirect outside canonical host normalization',
  )

  const rewrites = Array.isArray(configuration.rewrites)
    ? configuration.rewrites as Array<Record<string, unknown>>
    : []
  invariant(
    !rewrites.some((rewrite) => rewrite.destination === '/index.html'),
    'Vercel SPA fallback would prevent real 404 responses',
  )
}

function parseRobotsGroups(robots: string) {
  const groups: Array<{
    agents: string[]
    directives: Array<{ name: string; value: string }>
  }> = []
  let agents: string[] = []
  let directives: Array<{ name: string; value: string }> = []

  const finishGroup = () => {
    if (agents.length === 0) return
    groups.push({ agents, directives })
    agents = []
    directives = []
  }

  for (const sourceLine of robots.split(/\r?\n/u)) {
    const line = sourceLine.replace(/\s*#.*$/u, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const name = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (name === 'user-agent') {
      if (directives.length > 0) finishGroup()
      agents.push(value.toLowerCase())
    } else if (agents.length > 0) {
      directives.push({ name, value })
    }
  }

  finishGroup()
  return groups
}

function validateRobots(robots: string) {
  const groups = parseRobotsGroups(robots)
  const wildcard = groups.find((group) => group.agents.includes('*'))
  const googlebot = groups.find((group) => group.agents.includes('googlebot'))

  invariant(
    wildcard?.directives.some((directive) => (
      directive.name === 'allow' && directive.value === '/'
    )),
    'robots.txt does not allow general search crawlers',
  )
  invariant(
    !wildcard?.directives.some((directive) => (
      directive.name === 'disallow' && directive.value !== ''
    )),
    'robots.txt blocks public routes for general search crawlers',
  )
  invariant(
    !googlebot?.directives.some((directive) => (
      directive.name === 'disallow' && directive.value !== ''
    )),
    'robots.txt blocks public routes for Googlebot',
  )
  invariant(
    robots.includes('Sitemap: https://www.routeveil.dev/sitemap.xml'),
    'robots.txt has the wrong sitemap URL',
  )
  invariant(
    robots.includes('User-agent: OAI-SearchBot'),
    'robots.txt is missing AI search access',
  )
}

function validateAiReferences(llms: string, llmsFull: string) {
  invariant(
    llms.includes('npm install routeveil')
      && llmsFull.includes('npm install routeveil'),
    'AI-readable references have the wrong install command',
  )

  for (const range of Object.values<string>(compatibility.supported)) {
    invariant(
      llms.includes(range) && llmsFull.includes(range),
      `AI-readable references are missing compatibility range ${range}`,
    )
  }

  for (const fixture of compatibility.fixtures) {
    const versions = [
      `React ${fixture.react}`,
      `React DOM ${fixture.reactDom}`,
      `React Router DOM ${fixture.reactRouterDom}`,
    ]

    invariant(
      versions.every((version) => (
        llms.includes(version) && llmsFull.includes(version)
      )),
      `AI-readable references are missing compatibility fixture ${fixture.id}`,
    )
  }

  invariant(
    llms.includes('Interrupted navigation')
      && llmsFull.includes('Interrupted navigation'),
    'AI-readable references are missing interrupted navigation',
  )
  invariant(
    llms.includes('Shared elements')
      && llms.includes('https://www.routeveil.dev/lab/shared-elements')
      && llmsFull.includes('Shared elements')
      && llmsFull.includes('https://www.routeveil.dev/lab/shared-elements'),
    'AI-readable references are missing shared elements',
  )
  invariant(
    llms.includes('RouteveilBetween')
      && llms.includes('https://www.routeveil.dev/lab/between')
      && llmsFull.includes('RouteveilBetween')
      && llmsFull.includes('https://www.routeveil.dev/lab/between')
      && llmsFull.includes('data-routeveil-phase="between"'),
    'AI-readable references are missing between rendering',
  )

  invariant(
    llms.includes('https://www.routeveil.dev/releases')
      && llmsFull.includes('- Releases: https://www.routeveil.dev/releases'),
    'AI-readable references are missing the releases page',
  )

  const releaseHistoryStart = llmsFull.indexOf('## Release history')
  const releaseHistoryEnd = llmsFull.indexOf(
    '\n## ',
    releaseHistoryStart + 1,
  )
  const releaseHistory = llmsFull.slice(
    releaseHistoryStart,
    releaseHistoryEnd < 0 ? undefined : releaseHistoryEnd,
  )
  let previousReleaseIndex = -1

  invariant(
    releaseHistoryStart >= 0,
    'AI-readable references are missing the release history section',
  )

  for (const release of releases) {
    const summary = `- \`${release.version}\` (${release.date}) — ${release.title}: ${release.description}`
    const releaseIndex = releaseHistory.indexOf(summary)

    invariant(
      releaseIndex > previousReleaseIndex,
      `AI-readable release history is missing or misorders ${release.version}`,
    )
    previousReleaseIndex = releaseIndex
  }
}

validateRouteRegistry()

for (const route of seoRouteRegistry) {
  const dom = new JSDOM(template)
  const { document } = dom.window
  const root = document.getElementById('root')

  invariant(root, `${route.pathname} is missing the React root`)
  invariant(
    root.childNodes.length === 0,
    `${route.pathname} build template must have an empty React root`,
  )
  applyMetadata(document, route)

  const output = `<!doctype html>\n${document.documentElement.outerHTML}\n`
  invariant(
    !output.includes('__ROUTEVEIL_STATIC_FALLBACK__'),
    `${route.pathname} contains the obsolete fallback marker`,
  )
  await mkdir(resolve(buildRoot, route.file, '..'), { recursive: true })
  await writeFile(resolve(buildRoot, route.file), output)
}

await writeFile(resolve(buildRoot, 'sitemap.xml'), generatedSitemap)

const sourceSitemap = await readFile(
  resolve(process.cwd(), 'public/sitemap.xml'),
  'utf8',
)
invariant(
  sourceSitemap === generatedSitemap,
  'public/sitemap.xml has drifted; run npm run generate:sitemap',
)

const sitemap = await readFile(resolve(buildRoot, 'sitemap.xml'), 'utf8')
const sitemapUrls = validateSitemap(sitemap)

for (const route of seoRouteRegistry) {
  const outputPath = resolve(buildRoot, route.file)
  invariant(await exists(outputPath), `${route.pathname} output file is missing`)
  const output = await readFile(outputPath, 'utf8')
  const document = new JSDOM(output).window.document

  validateGeneratedClientEntry(document, route)
  validateMetadata(document, route, sitemapUrls)
  const structuredData = parseStructuredData(document, route)
  validateBreadcrumbs(route, structuredData)
  await validateAssets(document, route)
}

await validateVercelConfiguration()

const robots = await readFile(resolve(buildRoot, 'robots.txt'), 'utf8')
const llms = await readFile(resolve(buildRoot, 'llms.txt'), 'utf8')
const llmsFull = await readFile(resolve(buildRoot, 'llms-full.txt'), 'utf8')
validateRobots(robots)
validateAiReferences(llms, llmsFull)

process.stdout.write(
  'SEO pages verified with empty client roots, route metadata, canonical sitemap entries, structured data, and redirect safeguards.\n',
)
