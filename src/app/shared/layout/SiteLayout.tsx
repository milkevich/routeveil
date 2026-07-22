import type { ReactNode } from 'react'
import GradualBlur from '../components/gradual-blur/GradualBlur'
import { Header } from '../UI/Header'

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <div aria-hidden="true" className="edge-wash edge-wash--top" />
      <GradualBlur
        className="edge-blur edge-blur--top"
        curve="bezier"
        divCount={0}
        exponential
        height="70px"
        position="top"
        strength={2.5}
        target="page"
        zIndex={20}
      />
      <Header />
      {children}
    </div>
  )
}
