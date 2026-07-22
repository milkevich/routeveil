import { docsSections } from '../../pages/docs/docsSections'

const homeTitle = 'Routeveil - React Router Transitions'
const docsTitle = 'Routeveil - Documentation'
const labTitle = 'Routeveil - Laboratory'
const notFoundTitle = 'Routeveil - Page Not Found'
const docsSectionTitles = new Map<string, string>(
  docsSections.map((section) => [section.id, `Routeveil - ${section.label}`]),
)

function decodeHash(hash: string): string {
  const value = hash.startsWith('#') ? hash.slice(1) : hash

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function resolveDocumentTitle(pathname: string, hash = ''): string {
  if (pathname === '/docs' || pathname === '/docs/') {
    return docsSectionTitles.get(decodeHash(hash)) ?? docsTitle
  }

  if (pathname === '/lab' || pathname === '/lab/') {
    return labTitle
  }

  return pathname === '/' ? homeTitle : notFoundTitle
}
