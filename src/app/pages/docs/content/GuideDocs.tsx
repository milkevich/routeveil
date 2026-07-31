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
        Before every request, Routeveil reads{' '}
        <code>prefers-reduced-motion: reduce</code>. When it matches, Routeveil skips
        page, overlay, and shared-element animation, commits navigation safely, waits
        for the destination, applies the normal scroll and focus rules, and cleans up.
        No provider flag or alternate navigation path is required.
      </p>
      <CodeBlock filename="motion.css" language="css">{reducedMotion}</CodeBlock>
      <p>
        This CSS is for motion your application owns. Routeveil already applies the
        preference to built-in and custom transition lifecycles; your component
        animations should honor the same media query independently.
      </p>
      <div className="doc-note">
        <strong>Navigation is never blocked</strong>
        <p>
          Links and navigation hooks still commit and resolve their promises. Playback
          calls resolve without changing location. Application code can therefore use
          one path for every motion preference.
        </p>
      </div>
    </DocSection>
  )
}
