import { useRef } from 'react'
import Crosshair from '../../shared/components/crosshair/Crosshair'
import {
  ButtonLink,
  PixelHeadingCharacter,
} from '../../shared/UI'

function HeroHeading() {
  return (
    <div className="home-hero__heading-mask">
      <div className="home-hero__heading-reveal">
        <PixelHeadingCharacter
          autoPlay
          cycleInterval={500}
          mode="multi"
          staggerDelay={40}
        >
          RouteVeil
        </PixelHeadingCharacter>
      </div>
    </div>
  )
}

function HeroLede() {
  return (
    <div className="home-hero__lede-mask">
      <div className="home-hero__lede-reveal">
        <p className="home-hero__lede">
          Choose the movement where navigation begins and keep route components
          clean.
          <br />
          Per-navigation page and full-screen overlay transitions for{' '}
          <a
            className="home-hero__router-link"
            href="https://reactrouter.com/"
          >
            React Router
          </a>
          .
        </p>
      </div>
    </div>
  )
}

function HeroCTA() {
  return (
    <div className="home-hero__footer">
      <div className="home-hero__actions">
        <ButtonLink
          style={{
            height: 42,
            paddingInline: 16,
          }}
          preventScrollReset
          to="/docs#installation"
          transition="dissolve"
          transitionOptions={{ color: '#000000' }}
        >
          Get Started
        </ButtonLink>

        <ButtonLink
          style={{
            height: 42,
            paddingInline: 16,
          }}
          preventScrollReset
          to="/lab"
          transition="tunnel"
          variant='outlined'
          transitionOptions={{ color: '#ffffff' }}
        >
          Transitions
        </ButtonLink>
      </div>
    </div>
  )
}

export function HomeHero() {
  const heroRef = useRef<HTMLElement | null>(null)

  return (
    <section ref={heroRef} className="home-hero">
      <div aria-hidden="true" className="home-background">
        <div className="home-background__fallback" />
      </div>

      <Crosshair color="#000000" />

      <div className="home-hero__content page-frame">
        <HeroHeading />
        <HeroLede />
        <HeroCTA />
      </div>
    </section>
  )
}
