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
      index="17"
      intro="Reduced motion changes only the visual treatment; navigation, readiness, focus, scroll, and cleanup keep the same contract."
      title="Reduced Motion"
    >
      <p>
        Routeveil reads <code>prefers-reduced-motion: reduce</code> per request. It skips
        page, overlay, shared-element, and between motion while navigation, readiness,
        between content and its <code>while</code> and <code>minDuration</code>
        requirements, focus, scroll, and cleanup keep their normal contract. No
        provider flag is needed.
      </p>
      <CodeBlock filename="motion.css" language="css">{reducedMotion}</CodeBlock>
      <p>
        Routeveil handles its own motion. Use this CSS for application-owned animation.
      </p>
      <div className="doc-note">
        <strong>Navigation is never blocked</strong>
        <p>
          Navigation and readiness still finish. Playback resolves without changing
          location, so application code needs no alternate path.
        </p>
      </div>
    </DocSection>
  )
}
