import { Footer } from '../../shared/UI/Footer'
import { HomeHero } from './HomeHero'
import './home.css'

export function HomePage() {
  return (
    <main className="page home-page">
      <HomeHero />
      <Footer />
    </main>
  )
}
