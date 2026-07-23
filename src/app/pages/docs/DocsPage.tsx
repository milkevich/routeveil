import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'
import LineSidebar from '../../shared/components/line-sidebar/LineSidebar'
import { documentLocationChangeEvent } from '../../shared/lib/documentMetadata'
import { Footer } from '../../shared/UI/Footer'
import { PixelHeadingWord } from '../../shared/UI'
import { ApiDocs } from './content/ApiDocs'
import { GettingStartedDocs } from './content/GettingStartedDocs'
import { GuideDocs } from './content/GuideDocs'
import { TransitionDocs } from './content/TransitionDocs'
import { docsSections } from './docsSections'
import './docs.css'

export function DocsPage() {
  const location = useLocation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const mobileScrollRef = useRef<HTMLDivElement | null>(null)
  const mobileItemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const scrollToSection = useCallback((index: number) => {
    const section = docsSections[index]

    if (!section) return

    document
      .getElementById(section.id)
      ?.scrollIntoView({ behavior: 'smooth' })

    window.history.replaceState(
      window.history.state,
      '',
      `#${section.id}`,
    )

    window.dispatchEvent(new Event(documentLocationChangeEvent))
  }, [])

  const handleMobileSectionClick = useCallback(
    (index: number) => {
      setMobileNavOpen(false)

      window.requestAnimationFrame(() => {
        scrollToSection(index)
      })
    },
    [scrollToSection],
  )

  useEffect(() => {
    let frame = 0

    const updateActiveSection = () => {
      frame = 0

      const headerHeight = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--header-height',
        ),
      )

      const offset = headerHeight + 44
      let nextIndex = 0

      docsSections.forEach((section, index) => {
        const node = document.getElementById(section.id)

        if (
          node &&
          node.getBoundingClientRect().top <= offset
        ) {
          nextIndex = index
        }
      })

      setActiveIndex((current) =>
        current === nextIndex ? current : nextIndex,
      )
    }

    const handleScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateActiveSection)
      }
    }

    frame = window.requestAnimationFrame(updateActiveSection)

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    })

    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)

      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (!location.hash) return

    const id = decodeURIComponent(location.hash.slice(1))

    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'instant' })
  }, [location.hash])

  useEffect(() => {
    if (!mobileNavOpen) return

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }

    const scrollContainer = mobileScrollRef.current
    const activeItem = mobileItemRefs.current[activeIndex]

    if (scrollContainer && activeItem) {
      const itemCenter =
        activeItem.offsetTop + activeItem.offsetHeight / 2

      const targetPosition =
        itemCenter / 2.5

      scrollContainer.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: 'smooth',
      })
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, mobileNavOpen])

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 801px)')

    const handleDesktopChange = (
      event: MediaQueryListEvent,
    ) => {
      if (event.matches) {
        setMobileNavOpen(false)
      }
    }

    desktopQuery.addEventListener('change', handleDesktopChange)

    return () => {
      desktopQuery.removeEventListener(
        'change',
        handleDesktopChange,
      )
    }
  }, [])

  const activeSection =
    docsSections[activeIndex] ?? docsSections[0]

  return (
    <main className="page docs-page">
      <header className="docs-hero">
  <div className="docs-hero__heading-mask">
    <div className="docs-hero__heading-reveal">
      <PixelHeadingWord
        as="h1"
        initialFont="square"
        hoverFont="square"
      >
        Documentation
      </PixelHeadingWord>
    </div>
  </div>

  <div className="docs-hero__description-mask">
    <div className="docs-hero__description-reveal">
      <p className="docs-hero__description">
        Installation, API lifecycles, transition options, and
        copyable React Router examples for Routeveil.
      </p>
    </div>
  </div>
</header>

      <div className="docs-layout page-frame">
        <aside className="docs-sidebar">
          <LineSidebar
            activeIndex={activeIndex}
            accentColor="#000000"
            fontSize="14px"
            itemGap={15}
            items={docsSections.map(
              (section) => section.label,
            )}
            markerColor="#b7b7b7"
            markerLength={34}
            maxShift={10}
            onItemClick={scrollToSection}
            textColor="#777777"
          />
        </aside>

        <article className="docs-article">
          <GettingStartedDocs />
          <ApiDocs />
          <TransitionDocs />
          <GuideDocs />
        </article>
      </div>

      <button
        aria-hidden={!mobileNavOpen}
        aria-label="Close documentation navigation"
        className={`docs-mobile-nav__backdrop ${
          mobileNavOpen ? 'is-open' : ''
        }`}
        onClick={() => setMobileNavOpen(false)}
        tabIndex={mobileNavOpen ? 0 : -1}
        type="button"
      />

      <nav
        aria-label="Documentation sections"
        className={`docs-mobile-nav ${
          mobileNavOpen ? 'is-open' : ''
        }`}
      >
        <div
          aria-hidden={!mobileNavOpen}
          className="docs-mobile-nav__panel"
          id="docs-mobile-section-menu"
        >
          <div
            className="docs-mobile-nav__scroll"
            ref={mobileScrollRef}
          >
            <div className="docs-mobile-nav__heading">
              <span>Documentation</span>
            </div>

            <div className="docs-mobile-nav__items">
              {docsSections.map((section, index) => {
                const isActive = index === activeIndex

                return (
                  <button
                    aria-current={
                      isActive ? 'location' : undefined
                    }
                    className={`docs-mobile-nav__item ${
                      isActive ? 'is-active' : ''
                    }`}
                    key={section.id}
                    onClick={() =>
                      handleMobileSectionClick(index)
                    }
                    ref={(node) => {
                      mobileItemRefs.current[index] = node
                    }}
                    tabIndex={mobileNavOpen ? 0 : -1}
                    type="button"
                  >
                    <span className="docs-mobile-nav__number">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span>{section.label}</span>

                    <span
                      aria-hidden="true"
                      className="docs-mobile-nav__arrow"
                    >
                      ↗
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button
          aria-controls="docs-mobile-section-menu"
          aria-expanded={mobileNavOpen}
          className="docs-mobile-nav__trigger"
          onClick={() =>
            setMobileNavOpen((current) => !current)
          }
          type="button"
        >
          <span className="docs-mobile-nav__trigger-label">
            Jump to:
          </span>

          <strong className="docs-mobile-nav__current">
            {activeSection?.label}
          </strong>

          <span
            aria-hidden="true"
            className="docs-mobile-nav__icon"
          >
            <span />
            <span />
          </span>
        </button>
      </nav>

      <Footer />
    </main>
  )
}
