import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import gh from '../../../../public/gh.svg'
import logo from '../../../../public/favicon.svg'
import { RouteveilLink } from '../../../react-router'
import { primaryNavigation, resolvePrimaryPath, routeDirection } from '../../data/navigation'
import type { PrimaryPath } from '../../data/navigation'
import { Arrow } from './Arrow'
import { Button, ButtonLink } from './Button'
import './Header.css'

function GithubButton() {
  return (
    <ButtonLink
      aria-label="GitHub"
      className="site-header__github"
      to="https://github.com/milkevich/routeveil"
      variant="outlined"
    >
      <img alt="" src={gh} />
    </ButtonLink>
  )
}

export function Header() {
  const location = useLocation()
  const activePath = resolvePrimaryPath(location.pathname)
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const linkRefs = useRef<Partial<Record<PrimaryPath, HTMLAnchorElement | null>>>({})
  const [menuOpen, setMenuOpen] = useState(false)

  useLayoutEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    const activeLink = linkRefs.current[activePath]
    if (!nav || !indicator || !activeLink) return

    const measure = () => {
      const indicatorWidth = activeLink.offsetWidth * 0.45
      const indicatorLeft = (
        activeLink.offsetLeft
        + (activeLink.offsetWidth - indicatorWidth) / 2
      )

      indicator.style.width = `${indicatorWidth}px`
      indicator.style.transform = `translate3d(${indicatorLeft}px, 0, 0)`
      indicator.dataset.ready = 'true'
    }

    measure()
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measure)
    observer?.observe(nav)
    window.addEventListener('resize', measure)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activePath])

  return (
    <header className={menuOpen ? 'site-header header-menu-opened' : 'site-header'}>
      <div className="site-header__inner">
        <div className="site-header__identity">
          <RouteveilLink
            aria-label="Routeveil home"
            className="site-brand"
            data-direction={routeDirection(location.pathname, '/')}
            to="/"
            transition="bounce"
          >
            <img alt="Routeveil" src={logo} />
          </RouteveilLink>

          <nav ref={navRef} aria-label="Primary navigation" className="primary-nav">
            {primaryNavigation.map((item) => (
              <RouteveilLink
                ref={(node) => {
                  linkRefs.current[item.path] = node
                }}
                aria-current={activePath === item.path ? 'page' : undefined}
                className="primary-nav__link"
                data-direction={routeDirection(location.pathname, item.path)}
                key={item.path}
                to={item.path}
                transition="slide"
                transitionOptions={{
                  direction: routeDirection(location.pathname, item.path),
                }}
              >
                {item.label}
              </RouteveilLink>
            ))}
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="primary-nav__indicator"
            />
          </nav>
        </div>

        <div className="site-header-right-buttons">
          <GithubButton />
          <ButtonLink
            className="site-header__lab-button"
            to="/lab"
            transition="wipe"
            transitionOptions={{ direction: 'left' }}
            variant="filled"
          >
            Explore Lab
            <Arrow />
          </ButtonLink>
        </div>

        <div className="menu-toggle">
          <GithubButton />
          <Button
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="menu-toggle__button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
            variant="outlined"
          >
            <span className="menu-toggle__line" />
            <span className="menu-toggle__line" />
          </Button>
        </div>
      </div>

      <nav
        aria-hidden={!menuOpen}
        aria-label="Mobile navigation"
        className="mobile-nav"
        data-open={menuOpen}
        id="mobile-navigation"
        inert={!menuOpen}
      >
        {primaryNavigation.map((item, index) => (
          <RouteveilLink
            aria-current={activePath === item.path ? 'page' : undefined}
            data-direction={routeDirection(location.pathname, item.path)}
            key={item.path}
            onClick={() => setMenuOpen(false)}
            to={item.path}
            transition="bounce"
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {item.label}
          </RouteveilLink>
        ))}
      </nav>
    </header>
  )
}

export default Header
