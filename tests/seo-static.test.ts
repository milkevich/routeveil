import {
  existsSync,
  readFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import {
  npmPackageUrl,
  repositoryUrl,
  resolveDocumentMetadata,
  resolveStructuredData,
  siteOrigin,
} from '../src/app/shared/lib/documentMetadata'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('static SEO and crawler assets', () => {
  it('uses one canonical origin across metadata and package configuration', () => {
    const packageJson = JSON.parse(readProjectFile('package.json'))
    const readme = readProjectFile('README.md')

    expect(siteOrigin).toBe('https://www.routeveil.dev')
    expect(packageJson.homepage).toBe(siteOrigin)
    expect(packageJson.license).toBe('MIT')
    expect(readme).toContain('href="https://www.routeveil.dev"')
  })

  it.each([
    ['/', 'https://www.routeveil.dev/', 'WebPage'],
    ['/docs', 'https://www.routeveil.dev/docs', 'TechArticle'],
    ['/lab', 'https://www.routeveil.dev/lab', 'WebApplication'],
  ])(
    'provides canonical metadata and connected structured data for %s',
    (pathname, canonicalUrl, routeType) => {
      const metadata = resolveDocumentMetadata(pathname)
      const structuredData = resolveStructuredData(pathname)
      const graph = structuredData?.['@graph'] as Array<Record<string, unknown>>
      const types = graph.flatMap((node) => {
        const type = node['@type']
        return Array.isArray(type) ? type : [type]
      })

      expect(metadata.canonicalUrl).toBe(canonicalUrl)
      expect(metadata.robots).toContain('index, follow')
      expect(metadata.description).toBeTruthy()
      expect(structuredData?.['@context']).toBe('https://schema.org')
      expect(types).toEqual(expect.arrayContaining([
        'Person',
        'WebSite',
        'SoftwareApplication',
        'SoftwareSourceCode',
        routeType,
      ]))
      expect(JSON.stringify(structuredData)).toContain(repositoryUrl)
      expect(JSON.stringify(structuredData)).toContain(npmPackageUrl)
      expect(JSON.stringify(structuredData)).toContain(
        'https://spdx.org/licenses/MIT.html',
      )
    },
  )

  it('keeps missing pages non-indexable and without structured data', () => {
    const metadata = resolveDocumentMetadata('/missing')

    expect(metadata.robots).toBe('noindex, follow')
    expect(metadata.canonicalUrl).toBeNull()
    expect(resolveStructuredData('/missing')).toBeNull()
  })

  it('explicitly allows general, search, and AI crawlers', () => {
    const robots = readProjectFile('public/robots.txt')

    expect(robots).toContain('User-agent: *\nAllow: /')
    expect(robots).toContain('User-agent: OAI-SearchBot\nAllow: /')
    expect(robots).toContain('User-agent: GPTBot\nAllow: /')
    expect(robots).toContain('User-agent: Claude-SearchBot\nAllow: /')
    expect(robots).toContain('User-agent: PerplexityBot\nAllow: /')
    expect(robots).not.toContain('Disallow:')
    expect(robots).toContain('Sitemap: https://www.routeveil.dev/sitemap.xml')
  })

  it('lists every canonical prerendered route in the sitemap', () => {
    const sitemap = readProjectFile('public/sitemap.xml')
    const xml = new DOMParser().parseFromString(sitemap, 'application/xml')
    const locations = [...xml.querySelectorAll('loc')].map(
      (node) => node.textContent,
    )

    expect(xml.querySelector('parsererror')).toBeNull()
    expect(locations).toEqual([
      'https://www.routeveil.dev/',
      'https://www.routeveil.dev/docs',
      'https://www.routeveil.dev/lab',
    ])
    expect(new Set(locations).size).toBe(locations.length)
    expect(locations.every((location) => !location?.includes('#'))).toBe(true)
  })

  it('publishes concise and expanded AI-readable references', () => {
    const llms = readProjectFile('public/llms.txt')
    const llmsFull = readProjectFile('public/llms-full.txt')

    for (const content of [llms, llmsFull]) {
      expect(content).toContain('npm install routeveil')
      expect(content).toContain('routeveil/react-router')
      expect(content).toContain('https://www.routeveil.dev/docs')
      expect(content).toContain(repositoryUrl)
      expect(content).toContain(npmPackageUrl)
      expect(content).not.toContain('<html')
    }
  })

  it('preserves the original client runtime and emits crawler-only shells', () => {
    const index = readProjectFile('index.html')
    const main = readProjectFile('src/main.tsx')
    const router = readProjectFile('src/app/router.tsx')
    const generator = readProjectFile('scripts/generate-seo-pages.ts')
    const packageJson = JSON.parse(readProjectFile('package.json'))
    const vercel = JSON.parse(readProjectFile('vercel.json'))

    expect(index).toContain('<div id="root"></div>')
    expect(index).toContain('<script type="module" src="/src/main.tsx"></script>')
    expect(main).toContain('createRoot(document.getElementById(\'root\')!)')
    expect(main).toContain('<RouterProvider router={router} />')
    expect(router).toContain('createBrowserRouter')
    expect(router).toContain("path: '*'")
    expect(generator).toContain("file: 'docs.html'")
    expect(generator).toContain("file: 'lab.html'")
    expect(generator).toContain("file: '404.html'")
    expect(generator).toContain('root.replaceChildren()')
    expect(packageJson.scripts['build:demo']).toBe(
      'vite build && node --import tsx scripts/generate-seo-pages.ts',
    )
    expect(packageJson.devDependencies['@react-router/dev']).toBeUndefined()
    expect(existsSync(resolve(process.cwd(), 'react-router.config.ts'))).toBe(false)
    expect(vercel.outputDirectory).toBe('dist/demo')
    expect(vercel.trailingSlash).toBe(false)
    expect(vercel.rewrites).toBeUndefined()
    expect(vercel.redirects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        destination: 'https://www.routeveil.dev/:path*',
        permanent: true,
      }),
    ]))
  })

  it('provides a valid web manifest and 1200 by 630 social image', () => {
    const manifest = JSON.parse(readProjectFile('public/site.webmanifest'))
    const image = readFileSync(resolve(process.cwd(), 'public/og-image.png'))

    expect(manifest).toMatchObject({
      name: 'Routeveil',
      start_url: '/',
      theme_color: '#ffffff',
    })
    expect([...image.subarray(0, 8)]).toEqual([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10,
    ])
    expect(image.readUInt32BE(16)).toBe(1200)
    expect(image.readUInt32BE(20)).toBe(630)
  })
})
