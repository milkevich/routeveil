import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  documentLocationChangeEvent,
  resolveDocumentMetadata,
  resolveStructuredData,
  socialImageUrl,
  structuredDataElementId,
  type RouteMetadata,
} from './lib/documentMetadata'

function upsertMeta(
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
  element.content = content

  if (!element.isConnected) {
    document.head.append(element)
  }
}

function updateCanonical(canonicalUrl: string | null) {
  const [existing, ...duplicates] = [
    ...document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
  ]

  duplicates.forEach((element) => element.remove())

  if (!canonicalUrl) {
    existing?.remove()
    return
  }

  const element = existing ?? document.createElement('link')
  element.rel = 'canonical'
  element.href = canonicalUrl

  if (!element.isConnected) {
    document.head.append(element)
  }
}

function applyDocumentMetadata(metadata: RouteMetadata) {
  document.title = metadata.title
  updateCanonical(metadata.canonicalUrl)
  upsertMeta('name', 'description', metadata.description)
  upsertMeta('name', 'robots', metadata.robots)
  upsertMeta('property', 'og:type', metadata.openGraphType)
  upsertMeta('property', 'og:locale', 'en_US')
  upsertMeta('property', 'og:site_name', 'Routeveil')
  upsertMeta('property', 'og:title', metadata.title)
  upsertMeta('property', 'og:description', metadata.description)
  upsertMeta('property', 'og:url', metadata.canonicalUrl)
  upsertMeta('property', 'og:image', socialImageUrl)
  upsertMeta('property', 'og:image:secure_url', socialImageUrl)
  upsertMeta('property', 'og:image:type', 'image/png')
  upsertMeta('property', 'og:image:width', '1200')
  upsertMeta('property', 'og:image:height', '630')
  upsertMeta(
    'property',
    'og:image:alt',
    'Routeveil, React Router page and overlay transitions',
  )
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', metadata.title)
  upsertMeta('name', 'twitter:description', metadata.description)
  upsertMeta('name', 'twitter:image', socialImageUrl)
  upsertMeta(
    'name',
    'twitter:image:alt',
    'Routeveil, React Router page and overlay transitions',
  )
}

function updateStructuredData(structuredData: Record<string, unknown> | null) {
  const existing = document.getElementById(structuredDataElementId)

  if (!structuredData) {
    existing?.remove()
    return
  }

  const element = existing ?? document.createElement('script')
  element.id = structuredDataElementId
  element.setAttribute('type', 'application/ld+json')
  element.textContent = JSON.stringify(structuredData).replace(/</gu, '\\u003c')

  if (!element.isConnected) {
    document.head.append(element)
  }
}

function applyLocationMetadata(pathname: string, hash: string) {
  applyDocumentMetadata(resolveDocumentMetadata(pathname, hash))
  updateStructuredData(resolveStructuredData(pathname, hash))
}

export function DocumentMetadata() {
  const location = useLocation()

  useEffect(() => {
    const updateFromWindow = () => {
      applyLocationMetadata(
        window.location.pathname,
        window.location.hash,
      )
    }

    applyLocationMetadata(location.pathname, location.hash)
    window.addEventListener('hashchange', updateFromWindow)
    window.addEventListener('popstate', updateFromWindow)
    window.addEventListener(documentLocationChangeEvent, updateFromWindow)

    return () => {
      window.removeEventListener('hashchange', updateFromWindow)
      window.removeEventListener('popstate', updateFromWindow)
      window.removeEventListener(documentLocationChangeEvent, updateFromWindow)
    }
  }, [location.hash, location.pathname])

  return null
}
