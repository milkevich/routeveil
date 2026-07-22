import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveDocumentTitle } from './lib/documentTitle'

export function DocumentTitle() {
  const location = useLocation()

  useEffect(() => {
    const updateTitleFromWindow = () => {
      document.title = resolveDocumentTitle(
        window.location.pathname,
        window.location.hash,
      )
    }

    document.title = resolveDocumentTitle(
      location.pathname,
      location.hash,
    )
    window.addEventListener('hashchange', updateTitleFromWindow)
    window.addEventListener('popstate', updateTitleFromWindow)

    return () => {
      window.removeEventListener('hashchange', updateTitleFromWindow)
      window.removeEventListener('popstate', updateTitleFromWindow)
    }
  }, [location.hash, location.pathname])

  return null
}
