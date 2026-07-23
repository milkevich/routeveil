import { RouteveilLink } from '../../../react-router'
import { Arrow, PixelHeadingWord } from '../../shared/UI'

const customizationLinks = [
  {
    index: '01',
    title: 'Page',
    description:
      'Learn how to configure direction and use each built-in page transition.',
    to: '/docs#page-transitions',
  },
  {
    index: '02',
    title: 'Overlay',
    description:
      'Explore colors, origins, timing, structure, and overlay-specific options.',
    to: '/docs#overlay-transitions',
  },
  {
    index: '03',
    title: 'Options',
    description:
      'See the complete transitionOptions reference and TypeScript behavior.',
    to: '/docs#transition-options',
  },
] as const

export function CustomizationSection() {
  return (
    <section className="lab-group page-frame">
      <header className="lab-group__header">
        <div className="lab-group__title">
          <span>03</span>

          <PixelHeadingWord
            as="h2"
            initialFont="square"
            hoverFont="square"
          >
            Customization
          </PixelHeadingWord>
        </div>

        <p>
          Open the documentation for transition-specific options,
          examples, and configuration details.
        </p>
      </header>

      <div className="lab-card-grid lab-card-grid--customization">
        {customizationLinks.map((item) => (
          <RouteveilLink
            className="transition-card customization-card"
            key={item.to}
            to={item.to}
            transition="wipe"
            transitionOptions={{ direction: 'right' }}
          >
            <span className="transition-card__index">
              {item.index}
            </span>

            <span
              aria-hidden="true"
              className="transition-card__arrow"
            >
              <Arrow diagonal />
            </span>

            <span className="transition-card__content">
              <strong>{item.title}</strong>

              <span className="transition-card__description">
                {item.description}
              </span>
            </span>
          </RouteveilLink>
        ))}
      </div>
    </section>
  )
}