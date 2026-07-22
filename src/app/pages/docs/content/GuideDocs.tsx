import { CodeBlock } from '../../../shared/UI'
import { DocSection } from '../DocSection'

const reducedMotion = `@media (prefers-reduced-motion: reduce) {
  .decorative-motion {
    animation: none;
    transition: none;
  }
}`

export function GuideDocs() {
  return (
    <DocSection
      id="reduced-motion"
      index="11"
      intro="Routeveil reads the user's motion preference before each transition request and keeps navigation functional when reduced motion is enabled."
      title="Reduced Motion"
    >
      <p>
        When <code>prefers-reduced-motion: reduce</code> matches, Routeveil skips its
        decorative exit, cover, enter, and reveal phases and completes navigation
        without mounting or running the requested effect. Links and hooks keep the
        same API, and no separate provider setting is required.
      </p>
      <CodeBlock filename="motion.css" language="css">{reducedMotion}</CodeBlock>
      <p>
        The CSS above belongs in the consuming application for animations that the
        application owns. Routeveil handles its built-in and custom transition
        lifecycle internally, while application-specific motion should respect the
        same media query independently.
      </p>
      <div className="doc-note">
        <strong>Navigation is never blocked</strong>
        <p>
          Reduced motion changes visual execution, not the navigation contract.
          Navigation requests still commit and settle their returned promise. Playback
          calls settle without changing the route, so the app does not need a separate
          reduced-motion code path.
        </p>
      </div>
    </DocSection>
  )
}
