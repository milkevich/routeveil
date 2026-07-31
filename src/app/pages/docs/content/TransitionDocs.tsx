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

const transitionInputsExample = `navigate('/about', {
  transition: 'fade',
})

navigate('/about', {
  transition: {
    name: 'slide',
    direction: 'left',
  },
})

navigate('/about', {
  transition: {
    exit: 'fade',
    enter: 'slide',
  },
})

navigate('/about', {
  transition: {
    enter: 'slide',
  },
})`

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

const typedOptionsExample = `import {
  RouteveilLink,
  type TransitionOptionsFor,
} from 'routeveil/react-router'

const slideOptions = {
  direction: 'left',
} satisfies TransitionOptionsFor<'slide'>

<RouteveilLink
  to="/docs"
  transition={{ name: 'slide', ...slideOptions }}
>
  Documentation
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
        intro="Page transitions animate the route region you registered, with independent control over how the old page leaves and the new page arrives."
        title="Page Transitions"
      >
        <p>
          The default lifecycle is <code>exit → navigate → enter</code>. Routeveil
          animates the current <code>RouteveilView</code>, commits the destination,
          waits until the incoming route is rendered and ready, then animates the same
          view back in. The view remains inert until cleanup restores interaction.
        </p>
        <h3>Transition inputs</h3>
        <CodeBlock filename="Navigation.tsx" language="tsx">{transitionInputsExample}</CodeBlock>
        <p>
          A string uses the preset defaults. A <code>name</code> object configures one
          complete transition with its options beside the name. Use <code>exit</code>{' '}
          and <code>enter</code> to select the two page phases independently.
        </p>
        <h3>Configure each phase</h3>
        <CodeBlock filename="ConfiguredPhases.tsx" language="tsx">{configuredPhasesExample}</CodeBlock>
        <p>
          Each split phase resolves with its own configuration. Omitting one phase skips
          only that page animation. A missing phase does not fall back to the other
          phase and does not create a zero-duration substitute.
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
            Built-in page effects own their keyframes, duration, and easing.
            {' '}<code>slide</code> and <code>spin</code> accept up, down, left, or
            right; <code>rotate</code> accepts left or right. Other page presets need
            only their name.
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
          Wrap the matching source and destination elements with the same unique name, then start a page transition.
        </p>
        <p>
          Matching uses the <code>name</code>, not the element tag or route position.
          Names must be unique within each active route. Custom children must forward
          their ref to one HTML or SVG element.
        </p>
        <div className="doc-note">
          <strong>Coordinated lifecycle</strong>
          <p>
            When an exit phase exists, shared movement starts with a short lead and
            overlaps the page exit. Page enter starts after both have finished. Without
            an exit phase, shared movement finishes before page enter. Shared elements
            enhance a page transition; they are not a transition name.
          </p>
        </div>
        <div className="doc-split">
          <article>
            <h3>Source discovery</h3>
            <p>
              With the default <code>sharedElements=&quot;auto&quot;</code>, a clicked
              {' '}<code>RouteveilLink</code> selects shared elements on, inside, or
              around that link. Use <code>sharedElements</code> to select exact names,
              choose <code>all</code>, or disable sharing with <code>false</code>.
            </p>
          </article>
          <article>
            <h3>Matching</h3>
            <p>
              Missing destination names are skipped. Duplicate names are also skipped
              because they are ambiguous. Other valid shared elements continue without
              blocking the page transition.
            </p>
          </article>
        </div>
        <h3>Multiple elements</h3>
        <CodeBlock filename="ProjectLink.tsx" language="tsx">{multipleSharedElementsExample}</CodeBlock>
        <p>
          One navigation can connect multiple unique names. Valid matches move together,
          and Routeveil waits for them before starting the page enter phase.
        </p>
        <h3>Scroll anchor</h3>
        <p>
          Set <code>scrollToSharedElement</code> to an incoming shared-element name to
          center it vertically before the transition continues. A URL hash takes
          precedence. A valid shared-element target takes precedence over{' '}
          <code>preventScrollReset</code> and <code>smoothScrollToTop</code>. If the
          target is missing or duplicated, Routeveil warns and uses the normal scroll
          policy.
        </p>
        <h3>Supported behavior</h3>
        <p>
          Shared elements work with every page transition, including split and
          one-sided page phases. Overlay transitions and same-page playback ignore
          shared registrations. Reduced motion skips shared movement while navigation
          and valid <code>scrollToSharedElement</code> positioning still complete.
        </p>
        <div className="doc-note">
          <strong>Current limitations</strong>
          <p>
            Each wrapper needs one child that resolves to one HTML or SVG element;
            custom children must forward a ref. Back and Forward do not start shared
            movement. Video playback continuity is not preserved, and canvas, iframe,
            WebGL, audio, and pseudo-element fidelity is limited.
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
          <code>halo</code> is a built-in overlay transition. Overlay transitions use
          the <code>cover → navigate → reveal</code> lifecycle: they hide the current
          screen, commit navigation, wait for the destination, then reveal it. Because
          they cover the viewport, persistent interface outside{' '}
          <code>RouteveilView</code> is hidden too.
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
        <div className="doc-note">
          <strong>Coverage and origin</strong>
          <p>
            Most solid overlays accept <code>color</code>; <code>mosaic</code> accepts a
            palette through <code>colors</code>. Pointer-aware radial effects expand far
            enough to cover the farthest corner. The built-in <code>halo</code>{' '}
            transition accepts <code>origin: &apos;cursor&apos;</code> or{' '}
            <code>origin: &apos;center&apos;</code>. Links provide pointer coordinates;
            keyboard and programmatic navigation use the center fallback.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="configuring-transitions"
        index="16"
        intro="Configure a transition by placing only the options supported by that name directly beside name."
        title="Configuring Transitions"
      >
        <div className="option-groups">
          <article>
            <h3>Direction</h3>
            <p>
              Direction values depend on the effect. <code>slide</code> and
              {' '}<code>spin</code> use up, down, left, or right. <code>rotate</code> uses
              left or right. Overlay direction types are effect-specific: for example,
              clock uses clockwise or counterclockwise, while venetian uses horizontal
              or vertical. TypeScript prevents mixing these vocabularies.
            </p>
          </article>
          <article>
            <h3>Timing</h3>
            <p>
              Overlay effects accept <code>duration</code> where listed. Tunnel can set
              {' '}<code>coverDuration</code> and <code>revealDuration</code> separately.
              Segmented effects expose <code>stagger</code>, and effects that support
              timing curves expose <code>easing</code>. Built-in page timing is fixed.
            </p>
          </article>
          <article>
            <h3>Color</h3>
            <p>
              Most overlays use one opaque CSS <code>color</code>. Mosaic uses
              {' '}<code>colors</code> because each tile can select from a palette. Keep
              cover colors opaque so navigation cannot become visible mid-cover.
            </p>
          </article>
          <article>
            <h3>Origin</h3>
            <p>
              Origin controls where a spatial effect begins. <code>iris</code>,{' '}
              <code>halo</code>, <code>tunnel</code>, and <code>clock</code> accept{' '}
              <code>cursor</code> or <code>center</code>. <code>pixel</code> accepts{' '}
              <code>cursor</code>, <code>center</code>, <code>top-left</code>,{' '}
              <code>top-right</code>, <code>bottom-left</code>,{' '}
              <code>bottom-right</code>, or <code>random</code>. <code>mosaic</code>{' '}
              accepts <code>cursor</code>, <code>center</code>, or <code>random</code>.
              {' '}<code>RouteveilLink</code> supplies pointer coordinates. Requests
              without them fall back to the viewport center.
            </p>
          </article>
          <article>
            <h3>Scroll behavior</h3>
            <p>
              A successful transition resets to the top instantly unless another rule
              wins. Use <code>smoothScrollToTop</code> for a smooth reset or
              {' '}<code>preventScrollReset</code> to preserve position. URL hashes take
              highest precedence, followed by a valid{' '}
              <code>scrollToSharedElement</code> anchor. Playback and cancelled runs do
              not change scroll.
            </p>
          </article>
          <article>
            <h3>TypeScript inference</h3>
            <p>
              Keep <code>name</code> literal so Routeveil can select the corresponding
              option type. The same inference applies to links, programmatic navigation,
              playback, complete transitions, and each side of a split transition.
            </p>
          </article>
        </div>
        <CodeBlock filename="Navigation.tsx" language="tsx">{typedOptionsExample}</CodeBlock>
        <div className="doc-note">
          <strong>Match options to the transition</strong>
          <p>
            The transition name is the discriminator. Clockwise belongs to
            {' '}<code>clock</code>, not <code>slide</code>; <code>colors</code> belongs
            to <code>mosaic</code>, while tunnel uses <code>color</code>. Literal names
            turn those mistakes into immediate TypeScript errors.
          </p>
        </div>
      </DocSection>
    </>
  )
}
