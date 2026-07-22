import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { docsSections } from '../src/app/pages/docs/docsSections'
import { DocumentTitle } from '../src/app/shared/DocumentTitle'
import { resolveDocumentTitle } from '../src/app/shared/lib/documentTitle'

function renderTitle(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DocumentTitle />
    </MemoryRouter>,
  )
}

describe('DocumentTitle', () => {
  it.each([
    ['/', 'Routeveil - React Router Transitions'],
    ['/docs', 'Routeveil - Documentation'],
    ['/lab', 'Routeveil - Laboratory'],
    ['/missing', 'Routeveil - Page Not Found'],
  ])('uses the title for %s', (path, title) => {
    renderTitle(path)

    expect(document.title).toBe(title)
  })

  it.each(docsSections)(
    'uses the title for the $label documentation section',
    (section) => {
      expect(resolveDocumentTitle('/docs', `#${section.id}`)).toBe(
        `Routeveil - ${section.label}`,
      )
    },
  )
})
