import { CodeBlock } from '../../../shared/UI'
import { DocSection } from '../DocSection'
import { PropTable } from '../PropTable'

const customProvider = `import {
  RouteveilProvider,
  RouteveilView,
  type RouteveilProviderProps,
} from 'routeveil/react-router'

const transitions = {
  'brand-fade': {
    type: 'page',
    exit: {
      keyframes: [{ opacity: 1 }, { opacity: 0 }],
      options: { duration: 180, fill: 'forwards' },
    },
    enter: {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: { duration: 300, fill: 'both' },
    },
  },
} satisfies NonNullable<RouteveilProviderProps['transitions']>

function App() {
  return (
    <RouteveilProvider transitions={transitions}>
      <RouteveilView>
        <main>Application routes</main>
      </RouteveilView>
    </RouteveilProvider>
  )
}`

const pageLinkExample = `import { RouteveilLink } from 'routeveil/react-router'

<RouteveilLink
  to="/docs"
  transition="slide"
  transitionOptions={{ direction: 'left' }}
>
  Documentation
</RouteveilLink>`

const overlayLinkExample = `import { RouteveilLink } from 'routeveil/react-router'

<RouteveilLink
  to="/lab"
  transition="tunnel"
  transitionOptions={{
    color: '#000000',
    origin: 'cursor',
  }}
>
  Open Lab
</RouteveilLink>`

const preloadProviderExample = `<RouteveilProvider preload="viewport">
  <Header />
  <RouteveilView />
</RouteveilProvider>`

const preloadLinkExample = `<RouteveilLink
  to="/docs"
  transition="dissolve"
>
  Documentation
</RouteveilLink>

<RouteveilLink
  to="/dashboard"
  transition="fade"
  preload="intent"
>
  Dashboard
</RouteveilLink>

<RouteveilLink
  to="/editor"
  transition="slide"
  preload="render"
>
  Editor
</RouteveilLink>

<RouteveilLink
  to="/account"
  transition="fade"
  preload={false}
>
  Account
</RouteveilLink>`

const explicitViewExample = `<RouteveilView className="route-stage">
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/journal" element={<Journal />} />
  </Routes>
</RouteveilView>`

const outletViewExample = `function RootLayout() {
  return (
    <RouteveilProvider>
      <Header />
      <RouteveilView />
      <Footer />
    </RouteveilProvider>
  )
}`

const navigateExample = `import { useRouteveilNavigate } from 'routeveil/react-router'

function ContinueButton() {
  const navigate = useRouteveilNavigate()

  async function handleContinue() {
    await navigate('/checkout', {
      transition: 'dissolve',
      transitionOptions: {
        color: '#000000',
      },
    })
  }

  return (
    <button onClick={handleContinue}>
      Continue
    </button>
  )
}`

const playExample = `import { useRouteveilTransition } from 'routeveil/react-router'

function PreviewButton() {
  const playTransition = useRouteveilTransition()

  async function handlePreview() {
    await playTransition('dissolve', {
      transitionOptions: {
        color: '#000000',
      },
    })
  }

  return <button onClick={handlePreview}>Preview</button>
}`

export function ApiDocs() {
  return (
    <>
      <DocSection
        id="provider"
        index="05"
        intro="RouteveilProvider resolves transitions, coordinates their lifecycle, commits navigation at the correct phase, and restores visual state when the request finishes."
        title="Provider"
      >
        <PropTable
          caption="RouteveilProvider props"
          rows={[
            { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'The application subtree that can use Routeveil components and hooks.' },
            { name: 'transitions', type: 'Record<string, TransitionDefinition>', defaultValue: 'undefined', description: 'Custom page or overlay definitions merged over the built-in registry.' },
            { name: 'preload', type: 'RouteveilPreload', defaultValue: 'false', description: 'Default preload behavior inherited by transitioned RouteveilLink destinations.' },
          ]}
        />
        <p>
          The provider calls React Router location hooks, so it must render beneath
          router context. Built-ins are available automatically. Custom definitions
          extend that registry, and a custom definition with a built-in name replaces
          that built-in for the provider subtree.
        </p>
        <CodeBlock filename="App.tsx" language="tsx">{customProvider}</CodeBlock>
        <div className="doc-note">
          <strong>Resolution and concurrency</strong>
          <p>
            There is no provider-level default transition. An unknown transition or
            a page transition without a registered view falls back to navigation
            without animation. While a transition is active, another Routeveil request
            returns the active promise and its destination is not committed. When
            reduced motion is active, the provider skips decorative phases and commits
            the request normally.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="routeveil-link"
        index="06"
        intro="RouteveilLink extends React Router Link and adds an optional transition to eligible internal navigation."
        title="RouteveilLink"
      >
        <PropTable
          caption="RouteveilLink additions"
          rows={[
            { name: 'transition', type: 'TransitionName', defaultValue: 'undefined', description: 'Built-in or custom transition selected for this navigation.' },
            { name: 'transitionOptions', type: 'TransitionOptionsFor<T>', defaultValue: 'undefined', description: 'Options inferred from a literal built-in transition name.' },
            { name: 'preload', type: 'RouteveilPreload', defaultValue: 'provider value', description: 'Overrides the provider preload behavior for this transitioned link.' },
            { name: 'smoothScrollToTop', type: 'boolean', defaultValue: 'false', description: 'Uses smooth scrolling after a successful transitioned navigation instead of the default instant reset.' },
            { name: 'scrollToSharedElement', type: 'string', defaultValue: 'undefined', description: 'Centers the exactly named incoming shared element on the Y axis before shared endpoints are measured.' },
            { name: 'sharedElements', type: "'auto' | 'all' | string | readonly string[] | false", defaultValue: "'auto'", description: 'Controls outgoing shared-element selection. Auto scopes links to their trigger and programmatic requests to a scroll hint or sole source.' },
            { name: 'preventScrollReset', type: 'boolean', defaultValue: 'false', description: 'Inherited from React Router. Preserves scroll unless a valid scrollToSharedElement anchor is supplied.' },
          ]}
        />
        <h3>Page transition</h3>
        <CodeBlock filename="DocsLink.tsx" language="tsx">{pageLinkExample}</CodeBlock>
        <h3>Overlay transition</h3>
        <CodeBlock filename="LabLink.tsx" language="tsx">{overlayLinkExample}</CodeBlock>
        <p>
          Routeveil runs the consumer <code>onClick</code> first and respects a prevented
          event. It intercepts an unmodified primary-button click only when the target
          is internal, differs from the current pathname, search, or hash, and names a
          transition. Selected Routeveil transitions disable React Router&apos;s native
          <code> viewTransition</code> option for that request.
        </p>
        <div className="doc-note">
          <strong>Native link behavior</strong>
          <p>
            Modified or non-primary clicks, external URLs, downloads,
            <code> reloadDocument</code>, non-self targets, prevented events, and
            same-location links are not intercepted by Routeveil. Keyboard activation
            can run a transition, but it does not provide pointer coordinates. A
            cursor-origin effect therefore uses its center fallback.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="route-preloading"
        index="07"
        intro="Routeveil can prepare matching lazy route modules before a transitioned link starts its exit or cover phase."
        title="Route Preloading"
      >
        <p>
          Set <code>preload</code> on <code>RouteveilProvider</code> to choose one
          default for transitioned links in its subtree. The default is
          <code> false</code>, so preloading remains opt-in.
        </p>
        <CodeBlock filename="App.tsx" language="tsx">{preloadProviderExample}</CodeBlock>
        <div className="option-groups">
          <article>
            <h3>Intent</h3>
            <p>
              <code>intent</code> starts when the link receives focus, pointer intent,
              a pointer press, or a touch start. It avoids loading destinations that the
              user never approaches.
            </p>
          </article>
          <article>
            <h3>Viewport</h3>
            <p>
              <code>viewport</code> starts when the link enters the viewport. This is
              useful for primary navigation and mobile links that should already be
              prepared before the first tap.
            </p>
          </article>
          <article>
            <h3>Render</h3>
            <p>
              <code>render</code> starts as soon as the link mounts, including links
              outside the current viewport. Use it for high-priority destinations that
              should begin loading immediately.
            </p>
          </article>
          <article>
            <h3>Disabled</h3>
            <p>
              <code>false</code> disables preloading. A link-level value overrides the
              provider default, so individual destinations can use a different strategy
              or opt out.
            </p>
          </article>
        </div>
        <CodeBlock filename="Navigation.tsx" language="tsx">{preloadLinkExample}</CodeBlock>
        <p>
          Routeveil preloads only eligible internal <code>RouteveilLink</code> instances
          that also select a transition. External destinations, same-location links, and
          ordinary links without a transition keep their normal React Router behavior.
          When navigation begins, Routeveil reuses and awaits any unfinished preload
          before starting the visual transition.
        </p>
        <div className="doc-note">
          <strong>Data Router route tree</strong>
          <p>
            Automatic route discovery requires a React Router Data Router such as
            <code> createBrowserRouter</code>. Routeveil matches the destination against
            that router&apos;s route tree and runs the matching <code>route.lazy</code>
            functions. A declarative <code>BrowserRouter</code> with
            <code> Routes</code> does not expose a route tree for automatic lazy-route
            preloading, so these modes become a no-op there.
          </p>
        </div>
        <div className="doc-note">
          <strong>Module preparation, not destination rendering</strong>
          <p>
            Preloading downloads and evaluates matching lazy route modules and caches
            the resulting promises. It does not render the destination, run component
            effects, or execute route data loaders. If preloading rejects or exceeds
            its safety timeout, Routeveil continues navigation without the requested
            animation instead of leaving the current page trapped in a transition.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="routeveil-view"
        index="08"
        intro="RouteveilView registers the persistent wrapper animated by page transitions while leaving surrounding interface mounted."
        title="RouteveilView"
      >
        <PropTable
          caption="RouteveilView props"
          rows={[
            { name: 'children', type: 'ReactNode', defaultValue: '<Outlet />', description: 'Explicit route content. When omitted, the view renders a React Router Outlet.' },
            { name: 'className', type: 'string', defaultValue: 'undefined', description: 'Class forwarded to the registered wrapper div.' },
            { name: 'style', type: 'CSSProperties', defaultValue: 'undefined', description: 'Inline styles forwarded to the registered wrapper div.' },
          ]}
        />
        <h3>Explicit route content</h3>
        <CodeBlock filename="AppRoutes.tsx" language="tsx">{explicitViewExample}</CodeBlock>
        <h3>Outlet layout</h3>
        <CodeBlock filename="RootLayout.tsx" language="tsx">{outletViewExample}</CodeBlock>
        <p>
          The provider animates the same registered wrapper around outgoing and incoming
          route content. The view exposes <code>data-routeveil-phase</code> and becomes
          busy while any Routeveil lifecycle is active. During page transitions it also
          becomes inert until cleanup restores its previous state.
        </p>
        <div className="doc-note">
          <strong>One active view</strong>
          <p>
            One active <code>RouteveilView</code> is supported per provider. Keep headers,
            footers, and controls outside the view when they should remain mounted and
            unaffected by page-transition transforms.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="programmatic-navigation"
        index="09"
        intro="useRouteveilNavigate provides transition-aware navigation for buttons, flows, and application logic."
        title="Programmatic Navigation"
      >
        <CodeBlock filename="ContinueButton.tsx" language="tsx">{navigateExample}</CodeBlock>
        <p>
          The hook accepts React Router navigation options such as <code>replace</code>,
          <code> state</code>, <code>relative</code>, and
          <code> preventScrollReset</code>, plus <code>transition</code>,
          <code> transitionOptions</code>, <code>smoothScrollToTop</code>,
          <code> scrollToSharedElement</code>, and <code>sharedElements</code>. For a
          transitioned request, the returned promise resolves after exit and enter or
          cover and reveal have finished and cleanup has restored idle state.
        </p>
        <p>
          When no transition is supplied, or when the resolved pathname, search, and
          hash are unchanged, the hook delegates directly to React Router without a
          Routeveil animation. Programmatic navigation has no pointer coordinates, so
          cursor-origin overlays fall back to the viewport center.
        </p>
        <h3>Play without navigating</h3>
        <CodeBlock filename="PreviewButton.tsx" language="tsx">{playExample}</CodeBlock>
        <p>
          <code>useRouteveilTransition</code> runs a real page or overlay lifecycle on
          the current route without changing the URL, history, location state, or scroll
          position. Its promise resolves after reset. It also accepts an explicit
          <code> clickPosition</code> when a playback control needs a custom origin.
        </p>
      </DocSection>

      <DocSection
        id="interrupted-navigation"
        index="10"
        intro="Routeveil runs one transition at a time, distinguishes additional Routeveil requests from external location changes, and always settles visual work before returning to idle."
        title="Interrupted Navigation"
      >
        <p>
          One transition run and one transition promise may be active at a time. An
          additional <code>RouteveilLink</code>, <code>useRouteveilNavigate</code>, or
          <code> useRouteveilTransition</code> request receives that active promise. Its
          destination or playback request is ignored rather than queued, committed,
          cancelled and restarted, or allowed to replace the current run.
        </p>
        <div className="doc-split">
          <article>
            <h3>Interaction blocking</h3>
            <p>
              During a page transition, <code>RouteveilView</code> becomes inert while
              Routeveil owns the outgoing and incoming phases. During an overlay
              transition, the full-screen overlay blocks pointer interaction. Persistent
              interface outside <code>RouteveilView</code> may remain interactive, and
              programmatic code or browser history can still change the location.
            </p>
          </article>
          <article>
            <h3>Browser history</h3>
            <p>
              Back, Forward, ordinary React Router navigation, plain links, and direct
              history changes are external location changes. Routeveil respects the
              latest location, cancels the current visual work, and abandons its pending
              commit when the external change happens first. A route already committed
              by Routeveil is never committed a second time.
            </p>
          </article>
        </div>
        <h3>Accessibility and Focus</h3>
        <p>
          After successful Routeveil navigation or an external route change, meaningful
          focus already moved by the application is preserved. Otherwise Routeveil
          focuses the incoming <code>RouteveilView</code> with
          <code> preventScroll</code>. It never tries to focus a disconnected outgoing
          trigger. Same-page playback restores the previously focused element when
          appropriate, and a failed navigation that leaves the location unchanged
          restores prior focus when it is still valid and focus has not intentionally
          moved elsewhere.
        </p>
        <div className="doc-note">
          <strong>Cleanup guarantees</strong>
          <p>
            Completed, failed, interrupted, and unmounted runs clean up every resource
            owned by that run: animations, inert state, temporary attributes, overlays,
            timers, location waiters, and transition phase. A stale run cannot resume,
            navigate, move focus, scroll, or clear visual state owned by a newer run.
          </p>
        </div>
        <div className="doc-note">
          <strong>Current concurrency model</strong>
          <p>
            Routeveil intentionally uses ignore-while-active. It does not currently
            support cancellation and replacement, transition request queues, or a
            last-request-wins mode.
          </p>
        </div>
      </DocSection>
    </>
  )
}
