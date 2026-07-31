import { CodeBlock } from '../../../shared/UI'
import { DocSection } from '../DocSection'
import { PropTable } from '../PropTable'

const customProvider = `import { Outlet } from 'react-router-dom'
import {
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

export function RootLayout() {
  return (
    <RouteveilProvider transitions={transitions}>
      <RouteveilView>
        <Outlet />
      </RouteveilView>
    </RouteveilProvider>
  )
}`

const pageLinkExample = `import { RouteveilLink } from 'routeveil/react-router'

<RouteveilLink
  to="/docs"
  transition={{ name: 'slide', direction: 'left' }}
>
  Documentation
</RouteveilLink>`

const preloadProviderExample = `function RootLayout() {
  return (
    <RouteveilProvider preload="viewport">
      <Header />
      <RouteveilView />
    </RouteveilProvider>
  )
}`

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
      transition: {
        name: 'dissolve',
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
    await playTransition({
      name: 'dissolve',
      color: '#000000',
    })
  }

  return <button onClick={handlePreview}>Preview</button>
}`

const pendingWorkExample = `import { useEffect } from 'react'
import { useRouteveilPendingWork } from 'routeveil/react-router'

function ReportRoute({ chartsReady }: { chartsReady: Promise<void> }) {
  const registerPendingWork = useRouteveilPendingWork()

  useEffect(() => {
    return registerPendingWork(chartsReady)
  }, [chartsReady, registerPendingWork])

  return <main>Report</main>
}`

export function ApiDocs() {
  return (
    <>
      <DocSection
        id="provider"
        index="05"
        intro="RouteveilProvider is the runtime boundary: it resolves effects, coordinates navigation, and guarantees cleanup."
        title="Provider"
      >
        <PropTable
          caption="RouteveilProvider props"
          rows={[
            { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'The subtree whose links, hooks, view, and shared elements belong to this provider.' },
            { name: 'transitions', type: 'Record<string, TransitionDefinition>', defaultValue: 'undefined', description: 'Custom page or overlay definitions. A matching name replaces that built-in inside this provider.' },
            { name: 'preload', type: 'RouteveilPreload', defaultValue: 'false', description: 'Default lazy-route preload strategy inherited by transitioned RouteveilLink instances.' },
          ]}
        />
        <p>
          Render the provider below <code>BrowserRouter</code> or inside a Data Router
          layout because it reads React Router location state. Built-in transitions
          require no setup. Pass <code>transitions</code> only to add a custom effect or
          intentionally replace a built-in name for this provider subtree.
        </p>
        <CodeBlock filename="App.tsx" language="tsx">{customProvider}</CodeBlock>
        <div className="doc-note">
          <strong>Resolution and concurrency</strong>
          <p>
            The provider does not choose a default effect: each request either supplies
            {' '}<code>transition</code> or navigates normally. Unknown names and page
            effects without a registered view fall back to safe, unanimated navigation.
            While one request is active, another Routeveil request receives the same
            promise and its destination is ignored. Reduced motion skips decorative
            phases without changing the navigation contract.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="routeveil-link"
        index="06"
        intro="RouteveilLink is a React Router Link with an optional, typed transition for eligible internal clicks."
        title="RouteveilLink"
      >
        <PropTable
          caption="RouteveilLink additions"
          rows={[
            { name: 'transition', type: 'RouteveilTransition', defaultValue: 'undefined', description: 'A complete page or overlay effect, or independently selected page exit and enter phases.' },
            { name: 'preload', type: 'RouteveilPreload', defaultValue: 'provider value', description: 'Overrides the provider lazy-route preload strategy for this link.' },
            { name: 'smoothScrollToTop', type: 'boolean', defaultValue: 'false', description: 'Smoothly resets scroll after navigation instead of using the default instant reset.' },
            { name: 'scrollToSharedElement', type: 'string', defaultValue: 'undefined', description: 'Vertically centers the exactly named incoming shared element before shared targets are measured.' },
            { name: 'sharedElements', type: "'auto' | 'all' | string | readonly string[] | false", defaultValue: "'auto'", description: 'Selects which outgoing shared elements may connect to the destination.' },
            { name: 'preventScrollReset', type: 'boolean', defaultValue: 'false', description: 'Preserves scroll unless a hash or valid scrollToSharedElement target takes precedence.' },
          ]}
        />
        <CodeBlock filename="DocsLink.tsx" language="tsx">{pageLinkExample}</CodeBlock>
        <p>
          Routeveil first calls your <code>onClick</code> and stops if it prevents the
          event. It starts a transition only for an unmodified primary activation of an
          internal destination whose pathname, search, or hash differs from the current
          location. A selected Routeveil effect takes ownership of the lifecycle, so
          React Router&apos;s native <code>viewTransition</code> option is disabled for that
          request.
        </p>
        <div className="doc-note">
          <strong>Native link behavior</strong>
          <p>
            Routeveil does not intercept modified or non-primary clicks, external URLs,
            downloads, <code>reloadDocument</code>, non-self targets, prevented events,
            or same-location links. Keyboard activation can transition, but it has no
            pointer coordinates; overlays that depend on them therefore use their
            center fallback.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="route-preloading"
        index="07"
        intro="Preloading starts matching Data Router lazy modules before navigation so visual transitions do not wait on avoidable network work."
        title="Route Preloading"
      >
        <p>
          Set <code>preload</code> on <code>RouteveilProvider</code> once to establish a
          default for transitioned links. Override it per link when a destination has
          different priority. The default is <code>false</code>.
        </p>
        <CodeBlock filename="App.tsx" language="tsx">{preloadProviderExample}</CodeBlock>
        <p>
          This self-closing <code>RouteveilView</code> belongs in a Data Router layout,
          where omitted children render the current <code>Outlet</code>. Automatic lazy
          route discovery requires a Data Router such as{' '}
          <code>createBrowserRouter</code>. Under declarative{' '}
          <code>BrowserRouter</code>, preload strategies safely do nothing because React
          Router does not expose the route tree.
        </p>
        <div className="option-groups">
          <article>
            <h3>Intent</h3>
            <p>
              <code>intent</code> starts on focus, pointer intent, pointer press, or
              touch start. Use it for most links: likely destinations begin loading
              without preparing every link on the page.
            </p>
          </article>
          <article>
            <h3>Viewport</h3>
            <p>
              <code>viewport</code> starts when the link becomes visible. It suits
              primary navigation and touch interfaces where there may be no hover
              signal before activation.
            </p>
          </article>
          <article>
            <h3>Render</h3>
            <p>
              <code>render</code> starts when the link mounts, even outside the viewport.
              Reserve it for destinations important enough to prepare immediately.
            </p>
          </article>
          <article>
            <h3>Disabled</h3>
            <p>
              <code>false</code> disables preloading. A link-level value always wins over
              the provider default, including an explicit opt-out.
            </p>
          </article>
        </div>
        <CodeBlock filename="Navigation.tsx" language="tsx">{preloadLinkExample}</CodeBlock>
        <p>
          Only eligible internal <code>RouteveilLink</code> instances with a transition
          preload. When activated, a link reuses work it already started. Routeveil can
          overlap that work with a real exit animation; when there is no exit to cover
          the wait, the current page remains visible until preload settles.
        </p>
        <div className="doc-note">
          <strong>Module preparation, not destination rendering</strong>
          <p>
            Preloading downloads and evaluates lazy route modules, then caches their
            promises. It does not render the destination, run component effects, or
            execute loaders. If preparation rejects or times out, Routeveil continues
            navigation safely instead of trapping the current page.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="routeveil-view"
        index="08"
        intro="RouteveilView marks the one routed region that page transitions animate; everything outside it can remain persistent."
        title="RouteveilView"
      >
        <PropTable
          caption="RouteveilView props"
          rows={[
            { name: 'children', type: 'ReactNode', defaultValue: '<Outlet />', description: 'Declarative route content. When omitted in a Data Router layout, RouteveilView renders Outlet.' },
            { name: 'className', type: 'string', defaultValue: 'undefined', description: 'A class name forwarded to the registered wrapper element.' },
            { name: 'style', type: 'CSSProperties', defaultValue: 'undefined', description: 'Inline styles forwarded to the registered wrapper element.' },
          ]}
        />
        <h3>Explicit route content</h3>
        <CodeBlock filename="AppRoutes.tsx" language="tsx">{explicitViewExample}</CodeBlock>
        <h3>Outlet layout</h3>
        <CodeBlock filename="RootLayout.tsx" language="tsx">{outletViewExample}</CodeBlock>
        <p>
          The wrapper stays registered while React Router replaces its children, giving
          Routeveil one stable animation boundary. It exposes{' '}
          <code>data-routeveil-phase</code>, reports busy state during a lifecycle, and
          becomes inert during page transitions. Cleanup restores every prior value.
        </p>
        <div className="doc-note">
          <strong>One active view</strong>
          <p>
            Use one active <code>RouteveilView</code> per provider. Put only content that
            should exit and enter inside it; keep persistent headers, footers, and
            controls outside.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="programmatic-navigation"
        index="09"
        intro="useRouteveilNavigate brings the same transition contract to buttons, workflows, and application code."
        title="Programmatic Navigation"
      >
        <CodeBlock filename="ContinueButton.tsx" language="tsx">{navigateExample}</CodeBlock>
        <p>
          Options include React Router&apos;s <code>replace</code>, <code>state</code>,
          {' '}<code>relative</code>, and <code>preventScrollReset</code>, plus
          Routeveil&apos;s <code>transition</code>, <code>smoothScrollToTop</code>,
          {' '}<code>scrollToSharedElement</code>, and <code>sharedElements</code>. The
          returned promise resolves only after the visual lifecycle and cleanup finish.
        </p>
        <p>
          Without a transition, the hook delegates directly to React Router. An
          unchanged pathname, search, and hash also skip animation. Programmatic calls
          have no pointer coordinates, so overlays that depend on them use their
          center fallback.
        </p>
      </DocSection>

      <DocSection
        id="transition-playback"
        index="10"
        intro="useRouteveilTransition previews a page or overlay effect on the current route without navigating."
        title="Transition Playback"
      >
        <CodeBlock filename="PreviewButton.tsx" language="tsx">{playExample}</CodeBlock>
        <p>
          Playback does not change the URL, history, location state, mounted route, or
          scroll position. The returned promise resolves after the effect and cleanup
          finish. Pass <code>clickPosition</code> when the control should provide the
          origin for a pointer-aware overlay.
        </p>
      </DocSection>

      <DocSection
        id="route-readiness"
        index="11"
        intro="useRouteveilPendingWork lets an incoming route delay enter or reveal until its own visual work is ready."
        title="Route Readiness"
      >
        <CodeBlock filename="ReportRoute.tsx" language="tsx">{pendingWorkExample}</CodeBlock>
        <p>
          Register a promise while the incoming route is mounting. Routeveil waits for
          it before enter or reveal. The returned cleanup function releases the work on
          unmount, rejections count as settled, and a safety timeout keeps navigation
          from waiting indefinitely.
        </p>
      </DocSection>

      <DocSection
        id="interrupted-navigation"
        index="12"
        intro="Routeveil has one predictable concurrency rule and a separate safety path for location changes it did not start."
        title="Interrupted Navigation"
      >
        <p>
          Routeveil runs one transition at a time. A second{' '}
          <code>RouteveilLink</code>, <code>useRouteveilNavigate</code>, or{' '}
          <code>useRouteveilTransition</code> request made during an active transition
          is ignored and receives the active transition promise. It is not queued and
          does not replace the current request.
        </p>
        <div className="doc-split">
          <article>
            <h3>Interaction blocking</h3>
            <p>
              A page transition makes <code>RouteveilView</code> inert. An overlay
              blocks pointer input across the viewport. Persistent controls outside the
              view may still be interactive, and browser history or application code
              can still change location.
            </p>
          </article>
          <article>
            <h3>Browser history</h3>
            <p>
              Back, Forward, ordinary React Router navigation, plain links, and direct
              history changes can interrupt an effect. The latest location wins.
              Routeveil cancels the remaining animation, abandons a destination it has
              not committed, and never repeats navigation that already committed.
            </p>
          </article>
        </div>
        <h3>Accessibility and Focus</h3>
        <p>
          If the application moved focus to a meaningful connected element, Routeveil
          leaves it there. Otherwise it focuses the incoming <code>RouteveilView</code>{' '}
          with <code>preventScroll</code>. It never focuses a disconnected outgoing
          trigger. Playback and failed unchanged navigation restore prior focus only
          when it is still connected and the application has not moved focus elsewhere.
        </p>
        <div className="doc-note">
          <strong>Cleanup guarantees</strong>
          <p>
            After success, interruption, failure, or provider unmount, Routeveil
            restores temporary animation state, interaction, visibility, focus, and
            overlays. Every returned transition promise settles safely.
          </p>
        </div>
      </DocSection>
    </>
  )
}
