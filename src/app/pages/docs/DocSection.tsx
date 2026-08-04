import type { ReactNode } from 'react'
import { PixelHeadingWord } from '../../shared/UI'
import type { DocsSectionId } from './docsSections'

export function DocSection({
  id,
  index,
  title,
  intro,
  children,
}: {
  id: DocsSectionId
  index: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <section className="doc-section" id={id}>
      <div className="doc-section__heading">
        <span>{index}</span>
        <PixelHeadingWord
          as="h2"
          hoverFont="square"
          initialFont="square"
        >
          <a
            className="doc-section__title-link"
            href={`/docs#${id}`}
          >
            {title}
          </a>
        </PixelHeadingWord>
        {intro && <p>{intro}</p>}
      </div>
      <div className="doc-section__body">{children}</div>
    </section>
  )
}
