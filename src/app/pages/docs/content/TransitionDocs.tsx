import { RouteveilLink } from '../../../../react-router'
import { overlayTransitions, pageTransitions } from '../../../data/transitions'
import { Arrow, CodeBlock } from '../../../shared/UI'
import { DocSection } from '../DocSection'

const pageExample = `import { RouteveilLink } from 'routeveil/react-router'

<RouteveilLink
  to="/docs"
  transition="slide"
  transitionOptions={{ direction: 'left' }}
>
  Documentation
</RouteveilLink>`

const overlayExample = `import { RouteveilLink } from 'routeveil/react-router'

<RouteveilLink
  to="/lab"
  transition="tunnel"
  transitionOptions={{
    color: '#000000',
    origin: 'cursor',
    coverDuration: 520,
    revealDuration: 680,
  }}
>
  Open Lab
</RouteveilLink>`

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
  transition="slide"
  transitionOptions={slideOptions}
>
  Documentation
</RouteveilLink>`

export function TransitionDocs() {
  return (
    <>
      <DocSection
        id="page-transitions"
        index="10"
        intro="Page transitions animate the registered RouteveilView while persistent interface outside it remains mounted."
        title="Page Transitions"
      >
        <CodeBlock filename="DocsLink.tsx" language="tsx">{pageExample}</CodeBlock>
        <p>
          A page transition animates the current view out, commits navigation, waits
          for the new location to render and paint, then animates the registered view
          back in. The provider keeps the view inert during this lifecycle and restores
          its previous state during reset.
        </p>
        <div className="built-in-group">
          <div className="built-in-list">
            {pageTransitions.map((transition, index) => (
              <article className="built-in-card" key={transition.name}>
                <div className="built-in-card__top">
                  <span className="built-in-card__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <RouteveilLink
                    aria-label={`Preview ${transition.name} transition`}
                    className="built-in-card__link"
                    to={`/lab?transition=${transition.name}`}
                    transition="slide"
                    transitionOptions={{ direction: 'left' }}
                  >
                    <Arrow diagonal />
                  </RouteveilLink>
                </div>

                <div className="built-in-card__content">
                  <strong>{transition.name}</strong>

                  <p>{transition.behavior}</p>

                  <code className="built-in-card__options">
                    {transition.options}
                  </code>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="doc-note">
          <strong>Preset timing</strong>
          <p>
            Built-in page transitions own their keyframes, duration, and easing.
            <code> slide</code> and <code>spin</code> accept a four-way direction,
            <code> rotate</code> accepts left or right, and the other page presets
            have no transition-specific options.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="shared-elements"
        index="11"
        intro="Shared elements connect the same conceptual visual across two routes while composing with any Routeveil page transition."
        title="Shared Elements"
      >
        <CodeBlock filename="ProjectRoutes.tsx" language="tsx">{sharedElementExample}</CodeBlock>
        <p>
          Wrap the matching real element on both routes with
          <code> RouteveilSharedElement</code> and give both instances the same unique
          <code> name</code>. The component clones its single child without adding a
          layout wrapper. A custom child must forward its ref to one HTML or SVG
          element.
        </p>
        <div className="doc-note">
          <strong>Sequential lifecycle</strong>
          <p>
            <code>page exit → shared-element movement → page enter</code>. Shared
            elements are a capability layered onto page transitions, not transitions
            named <code>shared</code> or <code>shared-element</code>. Routeveil completes
            each phase before starting the next, so they never overlap. The incoming
            page remains hidden and inert during movement. Each settled clone stays over
            its hidden real target throughout enter, then hands off after enter completes.
          </p>
        </div>
        <div className="doc-split">
          <article>
            <h3>Source discovery</h3>
            <p>
              A <code>RouteveilLink</code> selects uniquely named shared elements that
              are the triggering anchor, inside it, or contain it. An unrelated link
              starts no shared-element session. Programmatic navigation uses its
              <code> scrollToSharedElement</code> name as a source hint, then falls back
              only when the active <code>RouteveilView</code> has one unambiguous source.
              Use <code>sharedElements</code> to select exact names, opt into
              route-wide selection with <code>all</code>, or disable sharing. Duplicate
              names are skipped because they cannot be matched safely.
            </p>
          </article>
          <article>
            <h3>Matching</h3>
            <p>
              Matching uses <code>name</code>, not the HTML tag. Names must be unique
              within one active route. Same-tag visuals move and morph supported
              computed styles. Different tags or substantially different visuals move
              through the same geometry and crossfade before the real target takes
              over; Routeveil does not replace or semantically morph application DOM
              nodes.
            </p>
          </article>
        </div>
        <h3>Multiple elements</h3>
        <CodeBlock filename="ProjectLink.tsx" language="tsx">{multipleSharedElementsExample}</CodeBlock>
        <p>
          One route may register multiple uniquely named shared elements. Routeveil
          captures every valid element related to the same navigation trigger, moves
          valid matches concurrently during one middle stage, waits for every movement
          before starting the page enter, and keeps settled clones mounted until enter
          finishes. A missing or duplicate target is skipped immediately. A registered
          target waits only while its image or geometry is not ready, without blocking
          other matches after the readiness deadline.
        </p>
        <h3>Scroll anchor</h3>
        <p>
          Set <code>scrollToSharedElement</code> on a page-transition
          <code> RouteveilLink</code> or programmatic navigation request to match one incoming
          <code> RouteveilSharedElement</code> by its exact <code>name</code>. Routeveil
          instantly centers that element on the viewport&apos;s Y axis, preserves the X
          position, then measures every shared endpoint. A URL hash takes precedence.
          A valid anchor overrides <code>preventScrollReset</code> and
          <code> smoothScrollToTop</code>. If the named incoming element is missing,
          duplicated, or unmeasurable, Routeveil warns and falls back to the existing
          scroll policy. Reduced motion skips shared movement but still applies a valid
          anchor position.
        </p>
        <h3>Supported behavior</h3>
        <p>
          Shared elements activate automatically with page transitions such as
          <code> fade</code>, <code>blur</code>, <code>slide</code>,
          <code> spin</code>, <code>rotate</code>, <code>bounce</code>,
          <code> push</code>, and <code>pull</code>. Overlay transitions and same-page
          playback ignore shared registrations. Reduced motion skips cloning and
          movement while navigation continues normally.
        </p>
        <p>
          <RouteveilLink
            style={{ textDecoration: 'underline' }}
            to="/lab/shared-elements"
          >
            Open the shared elements playground
          </RouteveilLink>.
        </p>
        <div className="doc-note">
          <strong>Current limitations</strong>
          <p>
            Each wrapper accepts one React element child that resolves to one HTML or
            SVG element, and custom children must forward a ref. Browser history does
            not independently start shared movement, and video playback continuity is
            not guaranteed. Canvas, iframe, WebGL, audio, and pseudo-element fidelity
            is limited. Keep target layout stable when it mounts; overlay transitions
            do not support shared elements.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="overlay-transitions"
        index="12"
        intro="Overlay transitions mount above the complete application, cover the viewport before navigation, and reveal the incoming route only after it renders."
        title="Overlay Transitions"
      >
        <CodeBlock filename="LabLink.tsx" language="tsx">{overlayExample}</CodeBlock>
        <p>
          The provider mounts an overlay through <code>document.body</code>, waits for
          its cover phase to become fully opaque, commits navigation, then runs reveal.
          Reset removes the overlay after reveal completes. Fixed viewport geometry lets
          overlay effects cover headers, footers, and other interface outside
          <code> RouteveilView</code>.
        </p>
        <div className="built-in-group">
          <div className="built-in-list">
            {overlayTransitions.map((transition, index) => (
              <article className="built-in-card" key={transition.name}>
                <div className="built-in-card__top">
                  <span className="built-in-card__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <RouteveilLink
                    aria-label={`Preview ${transition.name} transition`}
                    className="built-in-card__link"
                    to={`/lab?transition=${transition.name}`}
                    transition="slide"
                    transitionOptions={{ direction: 'left' }}
                  >
                    <Arrow diagonal />
                  </RouteveilLink>
                </div>

                <div className="built-in-card__content">
                  <strong>{transition.name}</strong>

                  <p>{transition.behavior}</p>

                  <code className="built-in-card__options">
                    {transition.options}
                  </code>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="doc-note">
          <strong>Coverage and origin</strong>
          <p>
            Solid overlays accept <code>color</code>; <code>mosaic</code> accepts a
            <code> colors</code> array. Cursor-aware radial effects calculate their
            radius from the selected point to the farthest viewport corner. When no
            pointer coordinates are available, cursor origin falls back to center.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="transition-options"
        index="13"
        intro="For built-ins with configurable options, transitionOptions is selected from the chosen transition name and exposes the fields used by that implementation."
        title="Transition Options"
      >
        <div className="option-groups">
          <article>
            <h3>Direction</h3>
            <p>
              <code>slide</code> and <code>spin</code> accept up, down, left, or right
              and default to up. <code>rotate</code> accepts left or right and defaults
              to right. Wipe accepts right, left, down, or up; columns accepts down,
              up, or alternate; rows accepts right, left, or alternate; clock accepts
              clockwise or counterclockwise; and venetian accepts horizontal or vertical.
            </p>
          </article>
          <article>
            <h3>Timing</h3>
            <p>
              Every overlay accepts a per-phase <code>duration</code>. Tunnel also
              accepts <code>coverDuration</code> and <code>revealDuration</code>.
              Pixel, columns, rows, venetian, and mosaic accept <code>stagger</code>.
              Curtain, wipe, columns, rows, iris, halo, tunnel, and clock accept
              <code> easing</code>. Built-in page timing is fixed.
            </p>
          </article>
          <article>
            <h3>Color</h3>
            <p>
              Pixel, curtain, wipe, columns, rows, iris, halo, tunnel, clock,
              venetian, and dissolve accept one opaque CSS <code>color</code>.
              Mosaic uses <code>colors</code> because its tiles can draw from a palette.
            </p>
          </article>
          <article>
            <h3>Origin</h3>
            <p>
              Iris, halo, tunnel, and clock accept cursor or center. Pixel also accepts
              corner and random origins; mosaic accepts cursor, center, or random.
              Iris, halo, and tunnel default to cursor; clock, pixel, and mosaic default
              to center. RouteveilLink supplies pointer coordinates, while keyboard
              and programmatic navigation use the center fallback.
            </p>
          </article>
          <article>
            <h3>Scroll behavior</h3>
            <p>
              Successful transitioned navigation without a hash scrolls to the top
              instantly by default. Set <code>smoothScrollToTop</code> for smooth
              scrolling. <code>preventScrollReset</code> preserves the current position
              and takes precedence over smooth scrolling. A valid
              <code> scrollToSharedElement</code> anchor instead centers the exactly
              named incoming shared element vertically while preserving horizontal
              scroll. Hash destinations retain their native target behavior and take
              precedence over the shared anchor, while playback and cancelled runs do
              not change scroll position.
            </p>
          </article>
          <article>
            <h3>TypeScript inference</h3>
            <p>
              Keep an option-bearing transition name literal so Routeveil can infer its
              option type for RouteveilLink and useRouteveilNavigate. Optionless page
              presets ignore transitionOptions. The playback hook accepts unknown options
              because its transition name and options are not conditionally tied.
            </p>
          </article>
        </div>
        <CodeBlock filename="Navigation.tsx" language="tsx">{typedOptionsExample}</CodeBlock>
        <div className="doc-note">
          <strong>Match options to the transition</strong>
          <p>
            A clockwise direction belongs to <code>clock</code>, not <code>slide</code>.
            Likewise, <code>colors</code> belongs to <code>mosaic</code>, while tunnel
            and other solid overlays use <code>color</code>. Literal names let
            TypeScript report these mismatches before runtime.
          </p>
        </div>
      </DocSection>
    </>
  )
}
