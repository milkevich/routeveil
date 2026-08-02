import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  RouteveilLink,
  useRouteveilTransition,
} from '../../../../react-router'
import { overlayTransitions, pageTransitions } from '../../../data/transitions'
import type { TransitionMeta } from '../../../data/transitions'
import { Arrow, CodeBlock } from '../../../shared/UI'
import { DocSection } from '../DocSection'
import galleryThumbnail from '../../../../../public/gallery-card-thumbnail.png'
import { ArrowUpRight } from 'lucide-react'

const overlayExample = `import { RouteveilLink } from 'routeveil/react-router'

<RouteveilLink
  to="/lab"
  transition={{
    name: 'halo',
    origin: 'cursor',
    color: '#111',
  }}
>
  Open Lab
</RouteveilLink>`

const transitionInputsExample = `<RouteveilLink to="/about" transition="fade">
  About
</RouteveilLink>

<RouteveilLink
  to="/about"
  transition={{
    name: 'slide',
    direction: 'left',
  }}
>
  About
</RouteveilLink>

<RouteveilLink
  to="/about"
  transition={{
    exit: 'fade',
    enter: 'slide',
  }}
>
  About
</RouteveilLink>

<RouteveilLink
  to="/about"
  transition={{
    enter: 'slide',
  }}
>
  About
</RouteveilLink>`

const configuredPhasesExample = `navigate('/about', {
  transition: {
    exit: {
      name: 'slide',
      direction: 'left',
    },
    enter: {
      name: 'slide',
      direction: 'right',
    },
  },
})`

const sharedElementExample = `import {
  RouteveilLink,
  RouteveilSharedElement,
} from 'routeveil/react-router'

function ProjectCard() {
  return (
    <RouteveilLink to="/projects/routeveil" transition="slide">
      <RouteveilSharedElement name="project-cover">
        <img src="/project.jpg" alt="Project" />
      </RouteveilSharedElement>
      Open project
    </RouteveilLink>
  )
}

function ProjectDetail() {
  return (
    <RouteveilSharedElement name="project-cover">
      <img src="/project.jpg" alt="Project" />
    </RouteveilSharedElement>
  )
}`

const multipleSharedElementsExample = `<RouteveilLink
  to="/projects/routeveil"
  transition="fade"
  scrollToSharedElement="routeveil-image"
>
  <RouteveilSharedElement name="routeveil-image">
    <img src="/routeveil.png" alt="Routeveil" />
  </RouteveilSharedElement>
  <RouteveilSharedElement name="routeveil-title">
    <h2>Routeveil</h2>
  </RouteveilSharedElement>
</RouteveilLink>`

export function TransitionDocs() {
  const playTransition = useRouteveilTransition()
  const [previewBusy, setPreviewBusy] = useState(false)

  const activateTransition = useCallback(
    async (
      transition: TransitionMeta,
      trigger: HTMLButtonElement,
    ) => {
      if (previewBusy) return

      setPreviewBusy(true)

      const rect = trigger.getBoundingClientRect()
      const transitionInput = (
        transition.previewOptions
        && typeof transition.previewOptions === 'object'
      )
        ? { name: transition.name, ...transition.previewOptions }
        : transition.name

      try {
        await playTransition(
          transitionInput as Parameters<typeof playTransition>[0],
          {
            clickPosition: {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            },
          },
        )
      } finally {
        flushSync(() => setPreviewBusy(false))
        trigger.focus({ preventScroll: true })
      }
    },
    [playTransition, previewBusy],
  )

  return (
    <>
      <DocSection
        id="page-transitions"
        index="13"
        intro="Page transitions animate RouteveilView and let the outgoing and incoming phases be selected independently."
        title="Page Transitions"
      >
        <p>
          The lifecycle is <code>exit → navigate and prepare → enter</code>. With
          navigation-level between content it is
          {' '}<code>exit → between → navigate and prepare → enter</code>. The
          between-rendering section covers holds, sizing, and motion.
        </p>
        <h3>Transition inputs</h3>
        <CodeBlock filename="Navigation.tsx" language="tsx">{transitionInputsExample}</CodeBlock>
        <p>
          A string uses preset defaults. An object accepts <code>name</code> and that
          effect&apos;s options. <code>exit</code> and <code>enter</code> select typed phases
          independently.
        </p>
        <h3>Configure each phase</h3>
        <CodeBlock filename="ConfiguredPhases.tsx" language="tsx">{configuredPhasesExample}</CodeBlock>
        <p>
          Each phase resolves its own configuration. An omitted phase is not copied or
          replaced.
        </p>
        <p>
          Exit-only reveals without enter. Enter-only hides without exit, then enters.
          With no valid phase, navigation has no animation or between layer.
        </p>
        <div className="built-in-group">
          <div className="built-in-list">
            {pageTransitions.map((transition, index) => (
              <button
                aria-label={`Play ${transition.name} transition`}
                className="built-in-card"
                disabled={previewBusy}
                key={transition.name}
                onClick={(event) => {
                  void activateTransition(transition, event.currentTarget)
                }}
                type="button"
              >
                <div className="built-in-card__top">
                  <span className="built-in-card__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span
                    aria-hidden="true"
                    className="built-in-card__link"
                  >
                    <Arrow diagonal />
                  </span>
                </div>

                <div className="built-in-card__content">
                  <strong>{transition.name}</strong>

                  <p>{transition.behavior}</p>

                  <code className="built-in-card__options">
                    {transition.options}
                  </code>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="doc-note">
          <strong>Preset timing</strong>
          <p>
            Built-ins own timing. <code>slide</code> and <code>spin</code> accept up,
            down, left, or right; <code>rotate</code> accepts left or right. Others have
            no public options.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="shared-elements"
        index="14"
        intro="Shared elements visually connect matching content across routes without replacing either route's real DOM."
        title="Shared Elements"
      >

        <RouteveilLink
          to="/lab/shared-elements"
          style={{
            marginTop: "-1rem"
          }}
          transition={{
            name: "tunnel",
            origin: "cursor",
            color: "#f5f5f5"
          }}
          className="gallery-cta_container"
        >
          <div className="gallery-cta_container-info">
            <h2>
              Shared Elements Playground
              <ArrowUpRight strokeWidth={3} />
            </h2>

            <span>
              Open the playground and inspect matching, movement, and handoff live
            </span>
          </div>

          <div className="gallery-cta_media">
            <img src={galleryThumbnail} alt="Gallery thumbnail" />
          </div>
        </RouteveilLink>

        <h3>Basic workflow</h3>
        <CodeBlock filename="ProjectRoutes.tsx" language="tsx">{sharedElementExample}</CodeBlock>
        <p>
          Give source and destination the same unique name, then start a page transition.
        </p>
        <p>
          Matching uses <code>name</code>, not tag or position. Names must be unique per
          route. Custom children must forward a ref to one HTML or SVG element.
        </p>
        <div className="doc-note">
          <strong>Coordinated lifecycle</strong>
          <p>
            Movement may overlap exit when the destination is ready; otherwise it runs
            afterward. Without exit it runs before enter. Shared movement and between
            rendering are mutually exclusive. Navigation-level between content disables
            shared movement. If shared movement has already started, Routeveil skips a
            later incoming between layer. Shared elements are not a transition name.
          </p>
        </div>
        <div className="doc-split">
          <article>
            <h3>Source discovery</h3>
            <p>
              <code>auto</code> selects elements on, inside, or around a clicked link.
              Use exact names, <code>all</code>, or <code>false</code> to override it.
            </p>
          </article>
          <article>
            <h3>Matching</h3>
            <p>
              Missing and duplicate names are skipped. Other valid matches continue.
            </p>
          </article>
        </div>
        <h3>Multiple elements</h3>
        <CodeBlock filename="ProjectLink.tsx" language="tsx">{multipleSharedElementsExample}</CodeBlock>
        <p>
          Multiple unique matches move together; page enter waits for them.
        </p>
        <h3>Scroll anchor</h3>
        <p>
          <code>scrollToSharedElement</code> centers one incoming name before measurement.
          Invalid names warn and use the <code>RouteveilLink</code> scroll rules.
        </p>
        <h3>Supported behavior</h3>
        <p>
          Sharing supports complete, split, and one-sided page transitions. Overlays
          and playback ignore it. Reduced motion skips movement but still navigates and
          positions a valid <code>scrollToSharedElement</code>.
        </p>
        <div className="doc-note">
          <strong>Current limitations</strong>
          <p>
            Wrappers need one HTML or SVG child. Back and Forward do not start movement.
            Video continuity is not preserved; canvas, iframe, WebGL, audio, and
            pseudo-element fidelity is limited.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="overlay-transitions"
        index="15"
        intro="Overlay transitions hide the entire application before navigation, making route replacement invisible until the destination is ready."
        title="Overlay Transitions"
      >
        <CodeBlock filename="LabLink.tsx" language="tsx">{overlayExample}</CodeBlock>
        <p>
          The lifecycle is <code>cover → navigate and prepare → reveal</code>. With
          navigation-level between content it is
          {' '}<code>cover → between → navigate and prepare → reveal</code>; cover
          finishes before between content appears, and reveal waits for it to leave.
        </p>
        <div className="built-in-group">
          <div className="built-in-list">
            {overlayTransitions.map((transition, index) => (
              <button
                aria-label={`Play ${transition.name} transition`}
                className="built-in-card"
                disabled={previewBusy}
                key={transition.name}
                onClick={(event) => {
                  void activateTransition(transition, event.currentTarget)
                }}
                type="button"
              >
                <div className="built-in-card__top">
                  <span className="built-in-card__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span
                    aria-hidden="true"
                    className="built-in-card__link"
                  >
                    <Arrow diagonal />
                  </span>
                </div>

                <div className="built-in-card__content">
                  <strong>{transition.name}</strong>

                  <p>{transition.behavior}</p>

                  <code className="built-in-card__options">
                    {transition.options}
                  </code>
                </div>
              </button>
            ))}
          </div>
        </div>
        <p>
          Use a string for defaults or a <code>name</code> object with listed options.
        </p>
        <div className="doc-note">
          <strong>Color and coverage</strong>
          <p>
            Most overlays accept <code>color</code>; <code>mosaic</code> accepts
            {' '}<code>colors</code>. Opaque colors keep the destination hidden.
          </p>
        </div>
        <div className="option-groups">
          <article>
            <h3>Origin</h3>
            <p>
              <code>iris</code>, <code>halo</code>, <code>tunnel</code>, and
              {' '}<code>clock</code>: <code>cursor</code> or <code>center</code>.
              {' '}<code>pixel</code> also accepts named corners and <code>random</code>;
              {' '}<code>mosaic</code> accepts <code>cursor</code>, <code>center</code>,
              or <code>random</code>. Cards list exact values.
            </p>
          </article>
          <article>
            <h3>Timing</h3>
            <p>
              Timing exists only where listed. <code>tunnel</code> separates
              {' '}<code>coverDuration</code> and <code>revealDuration</code>; segmented
              effects may expose <code>stagger</code>. Only listed effects accept
              {' '}<code>easing</code>.
            </p>
          </article>
          <article>
            <h3>Pointer coordinates</h3>
            <p>
              <code>RouteveilLink</code> supplies pointer coordinates. Keyboard and
              programmatic navigation use the center fallback. Playback may explicitly
              pass <code>clickPosition</code>.
            </p>
          </article>
        </div>
      </DocSection>

      <DocSection
        id="interrupted-navigation"
        index="16"
        intro="Routeveil runs one request at a time and cleans up safely when unrelated navigation interrupts it."
        title="Interrupted Navigation"
      >
        <p>
          Later links, navigation calls, and playback receive the active promise. They
          are not queued and do not replace its destination.
        </p>
        <div className="doc-split">
          <article>
            <h3>External navigation</h3>
            <p>
              Back, Forward, plain links, and unrelated location changes may interrupt.
              The latest location wins; committed navigation is never repeated.
            </p>
          </article>
          <article>
            <h3>Focus</h3>
            <p>
              Application focus is preserved when meaningful and connected. Otherwise
              the incoming view receives focus with <code>preventScroll</code>.
              Disconnected triggers are never focused; playback restores prior focus
              only when the application has not moved it.
            </p>
          </article>
        </div>
        <div className="doc-note">
          <strong>Cleanup guarantee</strong>
          <p>
            Success, interruption, failure, or unmount restores temporary visuals,
            interaction, focus, and overlays. Every promise settles safely.
          </p>
        </div>
      </DocSection>
    </>
  )
}
