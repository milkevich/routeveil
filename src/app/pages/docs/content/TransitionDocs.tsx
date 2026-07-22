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
        index="08"
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
        id="overlay-transitions"
        index="09"
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
        index="10"
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
              Successful transitioned navigation scrolls to the top instantly by
              default. Set <code>smoothScrollToTop</code> for smooth scrolling.
              <code> preventScrollReset</code> preserves the current position and
              takes precedence over smooth scrolling.
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
