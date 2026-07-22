import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('static SEO assets', () => {
  it('provides complete home fallback metadata and structured data', () => {
    const html = readProjectFile('index.html')
    const page = new DOMParser().parseFromString(html, 'text/html')
    const structuredData = JSON.parse(
      page.querySelector('script[type="application/ld+json"]')?.textContent ?? '',
    )

    expect(page.title).toBe('Routeveil - React Router Transitions')
    expect(page.documentElement.lang).toBe('en')
    expect(page.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toContain('React Router transition library')
    expect(page.querySelector('meta[name="robots"]')?.getAttribute('content'))
      .toBe(
        'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      )
    expect(page.querySelector('meta[property="og:url"]')?.getAttribute('content'))
      .toBe('https://www.routeveil.dev/')
    expect(page.querySelector('meta[property="og:image"]')?.getAttribute('content'))
      .toBe('https://www.routeveil.dev/og-image.png')
    expect(page.querySelector('meta[name="twitter:card"]')?.getAttribute('content'))
      .toBe('summary_large_image')
    expect(page.querySelector('link[rel="canonical"]')).toBeNull()
    expect(structuredData['@context']).toBe('https://schema.org')
    expect(structuredData['@graph']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ '@type': 'WebSite', name: 'Routeveil' }),
        expect.objectContaining({ '@type': 'SoftwareSourceCode', name: 'Routeveil' }),
      ]),
    )
  })

  it('allows crawling and advertises the sitemap', () => {
    const robots = readProjectFile('public/robots.txt')
    const directives = robots.trim().split(/\r?\n/u)

    expect(directives).toEqual([
      'User-agent: *',
      'Allow: /',
      'Sitemap: https://www.routeveil.dev/sitemap.xml',
    ])
  })

  it('lists every canonical application route in the sitemap', () => {
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
    expect(
      locations.every((location) => location?.startsWith('https://www.routeveil.dev')),
    ).toBe(true)
    expect(locations.every((location) => !location?.includes('#'))).toBe(true)
  })

  it('provides a valid 1200 by 630 social image', () => {
    const image = readFileSync(resolve(process.cwd(), 'public/og-image.png'))

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
