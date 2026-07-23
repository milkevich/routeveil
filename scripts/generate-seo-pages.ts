import {
  access,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { JSDOM } from 'jsdom'
import {
  indexRobots,
  resolveDocumentMetadata,
  resolveStructuredData,
  structuredDataElementId,
} from '../src/app/shared/lib/documentMetadata'

type PageDefinition = {
  file: string
  fallback: string
  pathname: string
}

const buildRoot = resolve(process.cwd(), 'dist/demo')
const templatePath = resolve(buildRoot, 'index.html')
const template = await readFile(templatePath, 'utf8')
const fallbackMarker = '__ROUTEVEIL_STATIC_FALLBACK__'

const pages: PageDefinition[] = [
  {
    file: 'index.html',
    pathname: '/',
    fallback: `
      <main>
        <h1>RouteVeil</h1>
        <p>Choose the movement where navigation begins and keep route components clean. Per-navigation page and full-screen overlay transitions for React Router.</p>
        <nav aria-label="Routeveil resources">
          <a href="/docs#installation">Get Started</a>
          <a href="/lab">Transitions</a>
          <a href="https://github.com/milkevich/routeveil">GitHub</a>
          <a href="https://www.npmjs.com/package/routeveil">npm</a>
        </nav>
      </main>
    `,
  },
  {
    file: 'docs.html',
    pathname: '/docs',
    fallback: `
      <main>
        <h1>Documentation</h1>
        <p>Installation, API lifecycles, transition options, and copyable React Router examples for Routeveil.</p>
        <section>
          <h2>Installation</h2>
          <pre><code>npm install routeveil</code></pre>
          <p>Import Routeveil for React Router from <code>routeveil/react-router</code>.</p>
        </section>
        <nav aria-label="Documentation sections">
          <a href="/docs#overview">Overview</a>
          <a href="/docs#installation">Installation</a>
          <a href="/docs#quick-start">Quick Start</a>
          <a href="/docs#provider">Provider</a>
          <a href="/docs#routeveil-link">RouteveilLink</a>
          <a href="/docs#routeveil-view">RouteveilView</a>
          <a href="/docs#programmatic-navigation">Programmatic Navigation</a>
          <a href="/docs#page-transitions">Page Transitions</a>
          <a href="/docs#overlay-transitions">Overlay Transitions</a>
          <a href="/docs#transition-options">Transition Options</a>
          <a href="/docs#reduced-motion">Reduced Motion</a>
        </nav>
      </main>
    `,
  },
  {
    file: 'lab.html',
    pathname: '/lab',
    fallback: `
      <main>
        <h1>Laboratory</h1>
        <p>Select any transition to run it directly on the current page. The route, URL, scroll position, and browser history stay unchanged.</p>
        <section>
          <h2>Page transitions</h2>
          <p>Fade, blur, slide, spin, rotate, bounce, push, and pull.</p>
        </section>
        <section>
          <h2>Overlay transitions</h2>
          <p>Pixel, curtain, wipe, columns, rows, iris, halo, tunnel, clock, venetian, mosaic, and dissolve.</p>
        </section>
        <a href="/docs">Read the Routeveil documentation</a>
      </main>
    `,
  },
  {
    file: '404.html',
    pathname: '/404',
    fallback: `
      <main>
        <h1>(o_o)/</h1>
        <p>Beyond the veil, this page doesn’t exist.</p>
        <a href="/">Go Back</a>
      </main>
    `,
  },
]

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

function applyMetadata(document: Document, pathname: string) {
  const metadata = resolveDocumentMetadata(pathname)

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
  upsertMeta(
    document,
    'property',
    'og:image',
    'https://www.routeveil.dev/og-image-v2.png',
  )
  upsertMeta(
    document,
    'property',
    'og:image:secure_url',
    'https://www.routeveil.dev/og-image-v2.png',
  )
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
  upsertMeta(
    document,
    'name',
    'twitter:image',
    'https://www.routeveil.dev/og-image-v2.png',
  )
  upsertMeta(
    document,
    'name',
    'twitter:image:alt',
    'Routeveil, React Router page and overlay transitions',
  )
  updateStructuredData(document, resolveStructuredData(pathname))
}

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

for (const page of pages) {
  const dom = new JSDOM(template)
  const { document } = dom.window
  const root = document.getElementById('root')
  const metadata = resolveDocumentMetadata(page.pathname)
  const fallbackDocument = new JSDOM(page.fallback).window.document

  invariant(root, `${page.pathname} is missing the React root`)
  root.replaceChildren()
  document.querySelectorAll('noscript[data-routeveil-fallback]')
    .forEach((element) => element.remove())

  const fallback = document.createElement('noscript')
  fallback.setAttribute('data-routeveil-fallback', '')
  fallback.textContent = fallbackMarker
  root.after(fallback)
  applyMetadata(document, page.pathname)

  invariant(root.childNodes.length === 0, `${page.pathname} must keep an empty React root`)
  invariant(document.title === metadata.title, `${page.pathname} has the wrong title`)
  invariant(
    document.querySelectorAll('link[rel="canonical"]').length
      === (metadata.canonicalUrl ? 1 : 0),
    `${page.pathname} has the wrong canonical count`,
  )
  invariant(
    document.querySelector('meta[name="robots"]')?.getAttribute('content')
      === metadata.robots,
    `${page.pathname} has the wrong robots directive`,
  )
  invariant(
    fallbackDocument.querySelectorAll('main').length === 1
      && fallbackDocument.querySelectorAll('h1').length === 1,
    `${page.pathname} needs one fallback main and h1`,
  )
  invariant(
    (fallbackDocument.body.textContent?.trim().length ?? 0) > 40,
    `${page.pathname} has no crawler fallback copy`,
  )
  invariant(
    Boolean(document.querySelector('link[rel="stylesheet"][href]')),
    `${page.pathname} is missing the application stylesheet`,
  )
  invariant(
    Boolean(document.querySelector('script[type="module"][src]')),
    `${page.pathname} is missing the original client entry`,
  )
  invariant(
    Boolean(document.getElementById(structuredDataElementId))
      === Boolean(metadata.canonicalUrl),
    `${page.pathname} has the wrong structured data state`,
  )

  if (page.pathname === '/docs') {
    invariant(
      fallbackDocument.body.textContent?.includes('npm install routeveil'),
      'documentation fallback has the wrong install command',
    )
  }

  const serialized = `<!doctype html>\n${document.documentElement.outerHTML}\n`
  invariant(serialized.includes(fallbackMarker), `${page.pathname} lost its fallback marker`)
  const output = serialized.replace(fallbackMarker, page.fallback.trim())
  await mkdir(resolve(buildRoot, page.file, '..'), { recursive: true })
  await writeFile(resolve(buildRoot, page.file), output)
}

const indexDocument = new JSDOM(
  await readFile(resolve(buildRoot, 'index.html'), 'utf8'),
).window.document
const stylesheet = indexDocument.querySelector<HTMLLinkElement>(
  'link[rel="stylesheet"][href]',
)?.getAttribute('href')
const moduleScript = indexDocument.querySelector<HTMLScriptElement>(
  'script[type="module"][src]',
)?.getAttribute('src')

for (const asset of [stylesheet, moduleScript]) {
  invariant(asset?.startsWith('/assets/'), 'built asset URL is invalid')
  invariant(
    await exists(resolve(buildRoot, asset.slice(1))),
    `built asset is missing: ${asset}`,
  )
}

const sitemap = await readFile(resolve(buildRoot, 'sitemap.xml'), 'utf8')
const robots = await readFile(resolve(buildRoot, 'robots.txt'), 'utf8')
const llms = await readFile(resolve(buildRoot, 'llms.txt'), 'utf8')
const llmsFull = await readFile(resolve(buildRoot, 'llms-full.txt'), 'utf8')

invariant(sitemap.includes('https://www.routeveil.dev/docs'), 'sitemap is missing docs')
invariant(robots.includes('User-agent: OAI-SearchBot'), 'robots is missing AI search access')
invariant(robots.includes('Sitemap: https://www.routeveil.dev/sitemap.xml'), 'robots has the wrong sitemap')
invariant(llms.includes('npm install routeveil'), 'llms.txt has the wrong install command')
invariant(llmsFull.includes('npm install routeveil'), 'llms-full.txt has the wrong install command')
invariant(indexRobots.startsWith('index, follow'), 'indexing directives are invalid')

process.stdout.write('SEO shells verified without changing the React root or client entry.\n')
