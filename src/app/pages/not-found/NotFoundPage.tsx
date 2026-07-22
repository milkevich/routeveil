import {
  Arrow,
  ButtonLink,
  PixelHeadingCharacter,
} from '../../shared/UI'
import { Footer } from '../../shared/UI/Footer'
import './not-found.css'

export function NotFoundPage() {
  return (
    <div>
      <main className="page not-found page-frame">
        <PixelHeadingCharacter
          as="h1"
          autoPlay
          className="not-found__face"
          cycleInterval={500}
          mode="multi"
          staggerDelay={40}
        >
          \(o_o)/
        </PixelHeadingCharacter>

        <span className="not-found__description">
          Beyond the veil, this page doesn’t exist.
        </span>

        <ButtonLink variant="outlined" to="/" transition="fade">
          <span className="not-found__back-arrow">
            <Arrow />
          </span>
          Go Back
        </ButtonLink>
      </main>

      <Footer />
    </div>
  )
}