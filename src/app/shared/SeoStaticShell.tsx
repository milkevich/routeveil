import * as React from 'react'
import type { SeoRouteDefinition } from './lib/seoRoutes'

export function SeoStaticShell({
  route,
}: {
  route: SeoRouteDefinition
}) {
  return (
    <React.Fragment>
      <main
        className="seo-static-shell page page-frame"
        data-routeveil-static-shell=""
      >
        <header className="seo-static-shell__header">
          <p className="eyebrow">Routeveil</p>
          <h1>{route.heading}</h1>
          <p className="seo-static-shell__summary">
            {route.staticSummary}
          </p>
        </header>

        <div className="seo-static-shell__content">
          {route.staticContent.map((section) => (
            <section id={section.id} key={section.heading}>
              <h2>{section.heading}</h2>
              {section.code && (
                <pre><code>{section.code}</code></pre>
              )}
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <nav
          aria-label={`${route.heading} links`}
          className="seo-static-shell__links"
        >
          <h2>Continue exploring</h2>
          <ul>
            {route.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </React.Fragment>
  )
}
