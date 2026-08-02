import { RouteveilLink } from '../../../../react-router'
import { Arrow, CodeBlock } from '../../../shared/UI'
import { DocSection } from '../DocSection'
import { PropTable } from '../PropTable'

const builtInProvider = `import { Outlet } from 'react-router-dom'
import {
  RouteveilProvider,
  RouteveilView,
} from 'routeveil/react-router'

export function RootLayout() {
  return (
    <RouteveilProvider>
      <RouteveilView>
        <Outlet />
      </RouteveilView>
    </RouteveilProvider>
  )
}`

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
    await playTransition('push', {
      between: {
        content: <LoadingVisual />,
        minDuration: 1200,
      },
    })
  }

  return <button onClick={handlePreview}>Preview</button>
}`

const overlayPlaybackExample = `import type { MouseEvent } from 'react'

async function handleOverlayPreview(
  event: MouseEvent<HTMLButtonElement>,
) {
  await playTransition(
    {
      name: 'halo',
      color: '#111111',
      origin: 'cursor',
    },
    {
      clickPosition: {
        x: event.clientX,
        y: event.clientY,
      },
    },
  )
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

const betweenFallbackExample = `<RouteveilLink
  to="/dashboard"
  transition="fade"
  between={<BrandLogo />}
>
  Dashboard
</RouteveilLink>

navigate('/dashboard', {
  transition: 'fade',
  between: <BrandLogo />,
})

playTransition('push', {
  between: <BrandLogo />,
})`

const configuredBetweenExample = `<RouteveilLink
  to="/dashboard"
  transition="fade"
  between={{
    content: <BrandLogo />,
    minDuration: 500,
  }}
>
  Dashboard
</RouteveilLink>

navigate('/dashboard', {
  transition: 'fade',
  between: {
    content: <BrandLogo />,
    minDuration: 500,
  },
})`

const betweenLayoutExample = `<RouteveilBetween
  content={
    <div className="loading-screen">
      <BrandLogo />
    </div>
  }
/>`

const betweenLayoutStyles = `.loading-screen {
  display: grid;
  min-height: 100vh;
  place-items: center;
}`

const pageBetweenMotionExample = `<RouteveilLink
  to="/dashboard"
  transition={{
    exit: 'fade',
    enter: {
      name: 'slide',
      direction: 'left',
    },
  }}
  between={<BrandLogo />}
>
  Dashboard
</RouteveilLink>`

const incomingBetweenExample = `import { RouteveilBetween } from 'routeveil/react-router'

function Dashboard({ isLoading }: { isLoading: boolean }) {
  return (
    <>
      <RouteveilBetween
        content={<LoadingStatus />}
        while={isLoading}
        minDuration={500}
      />
      <DashboardContent />
    </>
  )
}`

export function ApiDocs() {
  return (
    <>
      <DocSection
        id="provider"
        index="05"
        intro="RouteveilProvider coordinates transitions for its subtree. Built-in effects work without configuration."
        title="Provider"
      >
        <CodeBlock filename="RootLayout.tsx" language="tsx">{builtInProvider}</CodeBlock>
        <p>
          Render it inside React Router context. There is no default effect: each
          request supplies <code>transition</code> or navigates normally.
        </p>
        <PropTable
          caption="RouteveilProvider props"
          rows={[
            { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'The subtree whose links, hooks, view, and shared elements belong to this provider.' },
            { name: 'transitions', type: 'Record<string, TransitionDefinition>', defaultValue: 'undefined', description: 'Custom page or overlay definitions. A matching name replaces that built-in inside this provider.' },
            { name: 'preload', type: 'RouteveilPreload', defaultValue: 'false', description: 'Default lazy-route preload strategy inherited by transitioned RouteveilLink instances.' },
          ]}
        />
        <h3>Custom transitions</h3>
        <p>
          <code>transitions</code> adds raw page or overlay definitions. A definition
          can add a name or replace a built-in within this subtree.
        </p>
        <CodeBlock filename="App.tsx" language="tsx">{customProvider}</CodeBlock>
        <div className="doc-note">
          <strong>Safe fallback</strong>
          <p>
            Unknown names and page effects without a view navigate without animation.
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
            { name: 'between', type: 'RouteveilBetweenInput', defaultValue: 'undefined', description: 'Immediate content for the optional between phase, with an optional minimum duration.' },
            { name: 'preload', type: 'RouteveilPreload', defaultValue: 'provider value', description: 'Overrides the provider lazy-route preload strategy for this link.' },
            { name: 'smoothScrollToTop', type: 'boolean', defaultValue: 'false', description: 'Smoothly resets scroll after navigation instead of using the default instant reset.' },
            { name: 'scrollToSharedElement', type: 'string', defaultValue: 'undefined', description: 'Vertically centers the exactly named incoming shared element before shared targets are measured.' },
            { name: 'sharedElements', type: "'auto' | 'all' | string | readonly string[] | false", defaultValue: "'auto'", description: 'Selects which outgoing shared elements may connect to the destination.' },
            { name: 'preventScrollReset', type: 'boolean', defaultValue: 'false', description: 'Preserves scroll unless a hash or valid scrollToSharedElement target takes precedence.' },
          ]}
        />
        <CodeBlock filename="DocsLink.tsx" language="tsx">{pageLinkExample}</CodeBlock>
        <p>
          Routeveil calls <code>onClick</code> first and respects
          {' '}<code>preventDefault()</code>. Eligible internal primary activations
          transition when pathname, search, or hash changes. Routeveil disables React
          Router&apos;s native <code>viewTransition</code> for that request.
        </p>
        <h3>Scroll behavior</h3>
        <p>
          Precedence is: URL hash → valid <code>scrollToSharedElement</code> →
          {' '}<code>preventScrollReset</code> → top reset. The reset is instant unless
          {' '}<code>smoothScrollToTop</code> is true. Invalid shared targets warn and
          fall through. Playback never scrolls; interruption adds no Routeveil reset.
        </p>
        <div className="doc-note">
          <strong>Native link behavior</strong>
          <p>
            Modified or non-primary clicks, external URLs, downloads,
            {' '}<code>reloadDocument</code>, non-self targets, prevented events, and
            same-location links stay native. Keyboard activation has no pointer
            coordinates, so pointer-aware overlays use the center fallback.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="routeveil-view"
        index="07"
        intro="RouteveilView marks the one routed region animated by page transitions."
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
          The wrapper stays registered while routes change. It exposes data attributes
          and becomes inert during page lifecycles; cleanup restores it.
        </p>
        <div className="doc-note">
          <strong>One active view</strong>
          <p>
            Use one active view per provider. Put animated route content inside and
            persistent interface outside.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="programmatic-navigation"
        index="08"
        intro="useRouteveilNavigate brings the same transition contract to buttons, workflows, and application code."
        title="Programmatic Navigation"
      >
        <CodeBlock filename="ContinueButton.tsx" language="tsx">{navigateExample}</CodeBlock>
        <p>
          Options combine React Router&apos;s <code>replace</code>, <code>state</code>,
          {' '}<code>relative</code>, and <code>preventScrollReset</code> with
          {' '}<code>transition</code>, <code>between</code>,
          {' '}<code>smoothScrollToTop</code>, <code>scrollToSharedElement</code>, and
          {' '}<code>sharedElements</code>. The promise resolves after cleanup.
        </p>
        <p>
          Without a transition or location change, the hook delegates to React Router.
          Pointer-aware overlays use the center fallback. Scroll follows
          {' '}<code>RouteveilLink</code>.
        </p>
      </DocSection>

      <DocSection
        id="route-preloading"
        index="09"
        intro="Preloading prepares matching Data Router lazy modules before transitioned navigation."
        title="Route Preloading"
      >
        <p>
          Set a provider default and override it per link. The four values are:
        </p>
        <div className="option-groups">
          <article>
            <h3>Intent</h3>
            <p><code>intent</code> starts on focus, pointer intent, press, or touch.</p>
          </article>
          <article>
            <h3>Viewport</h3>
            <p><code>viewport</code> starts when the link becomes visible.</p>
          </article>
          <article>
            <h3>Render</h3>
            <p><code>render</code> starts as soon as the link mounts.</p>
          </article>
          <article>
            <h3>Disabled</h3>
            <p><code>false</code> disables preloading and is the default.</p>
          </article>
        </div>
        <CodeBlock filename="App.tsx" language="tsx">{preloadProviderExample}</CodeBlock>
        <CodeBlock filename="Navigation.tsx" language="tsx">{preloadLinkExample}</CodeBlock>
        <p>
          Discovery requires a Data Router. Under declarative
          {' '}<code>BrowserRouter</code>, strategies safely do nothing.
        </p>
        <div className="doc-note">
          <strong>Modules only</strong>
          <p>
            Preloading caches lazy route modules. It does not render, run component
            effects, or execute loaders. Failure never blocks navigation.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="route-readiness"
        index="10"
        intro="useRouteveilPendingWork lets an incoming route delay enter or reveal until its own visual work is ready."
        title="Route Readiness"
      >
        <CodeBlock filename="ReportRoute.tsx" language="tsx">{pendingWorkExample}</CodeBlock>
        <p>
          Register while the incoming route mounts. Enter or reveal waits. Cleanup
          releases the work, rejection counts as settled, and a timeout prevents an
          indefinite wait.
        </p>
      </DocSection>

      <DocSection
        id="between-rendering"
        index="11"
        intro="Controlled React content can appear after exit or cover and before enter or reveal."
        title="Between Rendering"
      >
        <RouteveilLink to="/lab/between" transition="wipe">
          <div className="between-rendering-card">
            <div>
              <h2 className="between-rendering-card__title">
                Between rendering examples
              </h2>
              <p className="between-rendering-card__description">
                Check out the examples to see between rendering in action
              </p>
            </div>
            <Arrow diagonal />
          </div>
        </RouteveilLink>
        <h3>Navigation fallback</h3>
        <CodeBlock filename="Navigation.tsx" language="tsx">
          {betweenFallbackExample}
        </CodeBlock>
        <p>
          <code>RouteveilLink</code>, <code>useRouteveilNavigate</code>, and
          {' '}<code>useRouteveilTransition</code> accept a React node or a configured
          value with a minimum display time.
        </p>
        <p>
          Navigation-level page content follows
          {' '}<code>exit → between → navigate and prepare → enter</code>. Overlay
          content follows
          {' '}<code>cover → between → navigate and prepare → reveal</code>.
        </p>
        <CodeBlock filename="Navigation.tsx" language="tsx">
          {configuredBetweenExample}
        </CodeBlock>

        <h3>Incoming route control</h3>
        <CodeBlock filename="Dashboard.tsx" language="tsx">
          {incomingBetweenExample}
        </CodeBlock>
        <PropTable
          caption="RouteveilBetween props"
          rows={[
            { name: 'content', type: 'ReactNode', defaultValue: 'required', description: 'Content displayed during the between phase.' },
            { name: 'while', type: 'boolean', defaultValue: 'false', description: 'Keeps the between phase active while true. Unmounting releases the hold.' },
            { name: 'minDuration', type: 'number', defaultValue: '0', description: 'Minimum milliseconds from appearance start before disappearance may begin.' },
          ]}
        />
        <p>
          Incoming content replaces the fallback with a crossfade. Setting
          {' '}<code>while</code> to <code>true</code> holds enter or reveal; setting it
          to <code>false</code> or unmounting releases the hold.
          {' '}<code>minDuration</code> is a minimum, not a deadline. Readiness, pending
          work, and other registrations may extend it. Invalid, negative, or non-finite
          values are zero.
        </p>
        <p>
          Without navigation-level between content, navigation happens first. An
          incoming <code>RouteveilBetween</code> registration then shows between content
          before enter or reveal.
        </p>
        <div className="doc-split">
          <article>
            <h3>Nested registrations</h3>
            <p>
              The newest incoming registration is visible; all active registrations
              contribute holds and minimums. Unmounting falls back through older
              registrations, then navigation content. Replacement crossfades without
              restarting the lifecycle or clock. Outgoing registrations are ignored.
            </p>
          </article>
          <article>
            <h3>Shared elements</h3>
            <p>
              Shared movement and between rendering are mutually exclusive.
              Navigation-level between content disables shared movement. If shared
              movement has already started, Routeveil skips a later incoming between
              layer.
            </p>
          </article>
        </div>
        <h3>Content sizing and placement</h3>
        <p>
          Routeveil does not center or make between content fullscreen. The content
          controls its height and alignment; page between content does not inherit the
          incoming page&apos;s height. Overlay between content may cover the viewport through
          your styles. Use <code>min-height: 100vh</code> intentionally.
        </p>
        <CodeBlock filename="Dashboard.tsx" language="tsx">
          {betweenLayoutExample}
        </CodeBlock>
        <CodeBlock filename="loading.css" language="css">
          {betweenLayoutStyles}
        </CodeBlock>
        <h3>Page transition motion</h3>
        <CodeBlock filename="DashboardLink.tsx" language="tsx">
          {pageBetweenMotionExample}
        </CodeBlock>
        <p>
          The between content appears using the outgoing transition and disappears
          using the incoming transition. Routeveil uses each transition&apos;s complementary
          phase. In this example: outgoing fade exit → between fade appearance →
          between slide disappearance → incoming slide enter. Split phases resolve
          independently.
        </p>
        <p>
          Omitting <code>exit</code> or <code>enter</code> removes that page animation.
          Its corresponding between motion uses the layer&apos;s opacity fallback.
        </p>
        <h3>Overlay transition motion</h3>
        <p>
          Overlays keep their cover and reveal. The between content appears after cover
          and leaves before reveal using the overlay between layer&apos;s motion. The layer
          locks viewport scrolling; replacement crossfades without restarting.
        </p>
        <div className="doc-note">
          <strong>A transition is still required</strong>
          <p>
            Without <code>transition</code>, <code>between</code> creates no phase.
            Playback supports between content while keeping the route mounted.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="transition-playback"
        index="12"
        intro="useRouteveilTransition plays a page or overlay effect on the current route without navigating."
        title="Transition Playback"
      >
        <CodeBlock filename="PreviewButton.tsx" language="tsx">{playExample}</CodeBlock>
        <p>
          Playback does not navigate, change URL/history/location state, remount, or
          scroll. It supports <code>between</code> and <code>minDuration</code>. Its
          promise resolves after animation and cleanup.
        </p>
        <h3>Pointer-aware overlay</h3>
        <CodeBlock filename="OverlayPreview.tsx" language="tsx">
          {overlayPlaybackExample}
        </CodeBlock>
        <p>
          <code>clickPosition</code> supplies pointer coordinates; otherwise
          pointer-aware overlays use center fallback.
        </p>
      </DocSection>
    </>
  )
}
