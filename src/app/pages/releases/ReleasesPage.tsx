import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { MouseEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getReleaseId,
  releases,
  type ReleaseEntry as ReleaseEntryData,
  type ReleaseSection as ReleaseSectionData,
} from '../../data/releases'
import LineSidebar from '../../shared/components/line-sidebar/LineSidebar'
import { documentLocationChangeEvent } from '../../shared/lib/documentMetadata'
import { CodeBlock } from '../../shared/UI/CodeBlock'
import { Footer } from '../../shared/UI/Footer'
import { Arrow, PixelHeadingWord } from '../../shared/UI'
import gitHubIcon from "../../../../public/gh.svg"
import './releases.css'
import { RouteveilLink } from '../../../react-router'

const releaseDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})

function decodeHash(hash: string): string {
  const value = hash.startsWith('#') ? hash.slice(1) : hash

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getReleaseIndex(hash: string): number {
  const id = decodeHash(hash)
  const index = releases.findIndex(
    (release) => getReleaseId(release.version) === id,
  )

  return index < 0 ? 0 : index
}

function formatReleaseDate(date: string): string {
  return releaseDateFormatter.format(new Date(`${date}T00:00:00Z`))
}

function getSectionKey(
  version: string,
  section: ReleaseSectionData,
): string {
  const contentIdentity = section.title
    ?? section.description
    ?? (section.type === 'basic'
      ? section.code?.filename
      : section.items?.join('|'))
    ?? section.type

  return `${version}-${section.type}-${contentIdentity}`
}

export function ReleaseSection({
  section,
}: {
  section: ReleaseSectionData
}) {
  const hasList = section.type === 'list'
    && Boolean(section.items?.length)
  const hasCode = section.type === 'basic'
    && Boolean(section.code)

  if (!section.title && !section.description && !hasList && !hasCode) {
    return null
  }

  return (
    <section className={`release-section release-section--${section.type}`}>
      {section.title ? (
        <PixelHeadingWord
          as="h3"
          hoverFont="square"
          initialFont="square"
        >
          {section.titleUrl ? (
            <RouteveilLink
              className="release-section__title-link"
              to={section.titleUrl}
              transition="bounce"
            >
              {section.title}
              <Arrow diagonal />
            </RouteveilLink>
          ) : section.title}
        </PixelHeadingWord>
      ) : null}
      {section.description && <p>{section.description}</p>}

      {section.type === 'list' && section.items?.length ? (
        <ul>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {section.type === 'basic' && section.code ? (
        <CodeBlock
          filename={section.code.filename}
          language={section.code.language}
        >
          {section.code.value}
        </CodeBlock>
      ) : null}
    </section>
  )
}

function ReleaseEntry({
  index,
  onTitleClick,
  release,
}: {
  index: number
  onTitleClick: (
    event: MouseEvent<HTMLAnchorElement>,
    index: number,
  ) => void
  release: ReleaseEntryData
}) {
  const releaseId = getReleaseId(release.version)

  return (
    <article className="release-entry" id={releaseId}>
      <div className="release-entry__version">
        <code>v{release.version}</code>
      </div>

      <div className="release-entry__content">
        <header className="release-entry__header">
          <div className="release-entry__title-row">
            <PixelHeadingWord initialFont='square' hoverFont='square' as='h2'>
              <a
                className="release-entry__title-link"
                href={`/releases#${releaseId}`}
                onClick={(event) => onTitleClick(event, index)}
              >
                {release.title}
              </a>
            </PixelHeadingWord>
          </div>
          <p>{release.description}</p>
        </header>

        <div className="release-entry__sections">
          {release.sections.map((section) => (
            <ReleaseSection
              key={getSectionKey(release.version, section)}
              section={section}
            />
          ))}
        </div>
        <div className="release-entry__footer">
          <time dateTime={release.date}>
            {formatReleaseDate(release.date)}
          </time>
          {release.releaseUrl ? (
            <a
              className="release-entry__github-link"
              href={release.releaseUrl}
              rel="external"
            >
              <img style={{width: 16}} src={gitHubIcon} alt="GitHub Icon"/> View GitHub release <Arrow diagonal/>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function ReleasesPage() {
  const location = useLocation()
  const [activeIndex, setActiveIndex] = useState(
    () => getReleaseIndex(location.hash),
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobilePanelRef = useRef<HTMLDivElement | null>(null)
  const mobileScrollRef = useRef<HTMLDivElement | null>(null)
  const mobileItemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null)

  const closeMobileNav = useCallback((restoreFocus = true) => {
    setMobileNavOpen(false)

    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        mobileTriggerRef.current?.focus()
      })
    }
  }, [])

  const scrollToRelease = useCallback((index: number) => {
    const release = releases[index]

    if (!release) return

    const id = getReleaseId(release.version)
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    document.getElementById(id)?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
    })

    window.history.replaceState(
      window.history.state,
      '',
      `#${id}`,
    )
    window.dispatchEvent(new Event(documentLocationChangeEvent))
    setActiveIndex(index)
  }, [])

  const handleMobileReleaseClick = useCallback((
    event: MouseEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return
    }

    event.preventDefault()
    closeMobileNav()

    window.requestAnimationFrame(() => {
      scrollToRelease(index)
    })
  }, [closeMobileNav, scrollToRelease])

  const handleReleaseTitleClick = useCallback((
    event: MouseEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return
    }

    event.preventDefault()
    scrollToRelease(index)
  }, [scrollToRelease])

  useEffect(() => {
    let frame = 0

    const updateActiveRelease = () => {
      frame = 0

      const headerHeight = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--header-height',
        ),
      )
      const offset = headerHeight + 44
      let nextIndex = 0

      releases.forEach((release, index) => {
        const node = document.getElementById(
          getReleaseId(release.version),
        )

        if (node && node.getBoundingClientRect().top <= offset) {
          nextIndex = index
        }
      })

      if (
        document.documentElement.scrollHeight > window.innerHeight
        &&
        window.innerHeight + window.scrollY
        >= document.documentElement.scrollHeight - 2
      ) {
        nextIndex = releases.length - 1
      }

      setActiveIndex((current) => (
        current === nextIndex ? current : nextIndex
      ))
    }

    const handleScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateActiveRelease)
      }
    }

    frame = window.requestAnimationFrame(updateActiveRelease)
    window.addEventListener('scroll', handleScroll, { passive: true })
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

    const id = decodeHash(location.hash)
    const index = releases.findIndex(
      (release) => getReleaseId(release.version) === id,
    )

    if (index < 0) return

    document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })

    const frame = window.requestAnimationFrame(() => {
      setActiveIndex((current) => current === index ? current : index)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])

  useEffect(() => {
    if (!mobileNavOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileNav()
      }
    }

    const scrollContainer = mobileScrollRef.current
    const activeItem = mobileItemRefs.current[activeIndex]

    if (scrollContainer && activeItem) {
      const itemCenter = activeItem.offsetTop + activeItem.offsetHeight / 2
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      scrollContainer.scrollTo({
        behavior: reduceMotion ? 'auto' : 'smooth',
        top: Math.max(0, itemCenter / 2.5),
      })
    }

    activeItem?.focus()

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, closeMobileNav, mobileNavOpen])

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 801px)')
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        const activeElement = document.activeElement
        const focusWasInMobileNav = (
          mobilePanelRef.current?.contains(activeElement)
          || mobileTriggerRef.current === activeElement
        )

        closeMobileNav(false)

        if (focusWasInMobileNav) {
          window.requestAnimationFrame(() => {
            document.querySelector<HTMLAnchorElement>(
              '.releases-sidebar a[aria-current="location"]',
            )?.focus()
          })
        }
      }
    }

    desktopQuery.addEventListener('change', handleDesktopChange)

    return () => {
      desktopQuery.removeEventListener('change', handleDesktopChange)
    }
  }, [closeMobileNav])

  const activeRelease = releases[activeIndex] ?? releases[0]

  return (
    <main className="page releases-page">
      <header className="releases-hero">
        <div className="releases-hero__heading-mask">
          <div className="releases-hero__heading-reveal">
            <PixelHeadingWord
              as="h1"
              hoverFont="square"
              initialFont="square"
            >
              Releases
            </PixelHeadingWord>
          </div>
        </div>

        <div className="releases-hero__description-mask">
          <div className="releases-hero__description-reveal">
            <p className="releases-hero__description">
              See what changed, what shipped, and how Routeveil has evolved. <br />
              You can also checkout the <a href="https://github.com/milkevich/routeveil/releases">releases on GitHub</a>.
            </p>
          </div>
        </div>
      </header>

      <div className="releases-layout page-frame">
        <aside className="releases-sidebar">
          <LineSidebar
            accentColor="#000000"
            activeIndex={activeIndex}
            ariaLabel="Release history"
            fontSize="14px"
            hrefs={releases.map((release) => (
              `/releases#${getReleaseId(release.version)}`
            ))}
            itemGap={15}
            items={releases.map((release) => release.title)}
            markerColor="#b7b7b7"
            markerLength={34}
            maxShift={10}
            onItemClick={scrollToRelease}
            textColor="#6f6f6f"
          />
        </aside>

        <div className="releases-feed-container">
          <div className="releases-feed">
            {releases.map((release, index) => (
              <ReleaseEntry
                index={index}
                key={release.version}
                onTitleClick={handleReleaseTitleClick}
                release={release}
              />
              
            ))}
          </div>
        </div>
      </div>

      <button
        aria-hidden={!mobileNavOpen}
        aria-label="Close releases navigation"
        className={`releases-mobile-nav__backdrop ${mobileNavOpen ? 'is-open' : ''
          }`}
        onClick={() => closeMobileNav()}
        tabIndex={mobileNavOpen ? 0 : -1}
        type="button"
      />

      <nav
        aria-label="Release navigation"
        className={`releases-mobile-nav ${mobileNavOpen ? 'is-open' : ''
          }`}
      >
        <div
          aria-hidden={!mobileNavOpen}
          className="releases-mobile-nav__panel"
          id="releases-mobile-section-menu"
          ref={mobilePanelRef}
        >
          <div
            className="releases-mobile-nav__scroll"
            ref={mobileScrollRef}
          >
            <div className="releases-mobile-nav__heading">
              <span>Releases</span>
            </div>

            <div className="releases-mobile-nav__items">
              {releases.map((release, index) => {
                const isActive = index === activeIndex
                const id = getReleaseId(release.version)

                return (
                  <a
                    aria-current={isActive ? 'location' : undefined}
                    className={`releases-mobile-nav__item ${isActive ? 'is-active' : ''
                      }`}
                    href={`/releases#${id}`}
                    key={release.version}
                    onClick={(event) => (
                      handleMobileReleaseClick(event, index)
                    )}
                    ref={(node) => {
                      mobileItemRefs.current[index] = node
                    }}
                    tabIndex={mobileNavOpen ? 0 : -1}
                  >
                    <span className="releases-mobile-nav__number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{release.title}</span>
                    <span
                      aria-hidden="true"
                      className="releases-mobile-nav__arrow"
                    >
                      ↗
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <button
          aria-controls="releases-mobile-section-menu"
          aria-expanded={mobileNavOpen}
          className="releases-mobile-nav__trigger"
          onClick={() => {
            if (mobileNavOpen) {
              closeMobileNav()
            } else {
              setMobileNavOpen(true)
            }
          }}
          ref={mobileTriggerRef}
          type="button"
        >
          <span className="releases-mobile-nav__trigger-label">
            Jump to:
          </span>
          <strong className="releases-mobile-nav__current">
            {activeRelease?.title}
          </strong>
          <span aria-hidden="true" className="releases-mobile-nav__icon">
            <span />
            <span />
          </span>
        </button>
      </nav>

      <Footer />
    </main>
  )
}
