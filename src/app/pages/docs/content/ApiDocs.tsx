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
        index="04"
        intro="RouteveilProvider resolves transitions, coordinates their lifecycle, commits navigation at the correct phase, and restores visual state when the request finishes."
        title="Provider"
      >
        <PropTable
          caption="RouteveilProvider props"
          rows={[
            { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'The application subtree that can use Routeveil components and hooks.' },
            { name: 'transitions', type: 'Record<string, TransitionDefinition>', defaultValue: 'undefined', description: 'Custom page or overlay definitions merged over the built-in registry.' },
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
        index="05"
        intro="RouteveilLink extends React Router Link and adds an optional transition to eligible internal navigation."
        title="RouteveilLink"
      >
        <PropTable
          caption="RouteveilLink additions"
          rows={[
            { name: 'transition', type: 'TransitionName', defaultValue: 'undefined', description: 'Built-in or custom transition selected for this navigation.' },
            { name: 'transitionOptions', type: 'TransitionOptionsFor<T>', defaultValue: 'undefined', description: 'Options inferred from a literal built-in transition name.' },
            { name: 'smoothScrollToTop', type: 'boolean', defaultValue: 'false', description: 'Uses smooth scrolling after a successful transitioned navigation instead of the default instant reset.' },
            { name: 'preventScrollReset', type: 'boolean', defaultValue: 'false', description: 'Inherited from React Router. When true, it prevents Routeveil scrolling and takes precedence over smoothScrollToTop.' },
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
        id="routeveil-view"
        index="06"
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
        index="07"
        intro="useRouteveilNavigate provides transition-aware navigation for buttons, flows, and application logic."
        title="Programmatic Navigation"
      >
        <CodeBlock filename="ContinueButton.tsx" language="tsx">{navigateExample}</CodeBlock>
        <p>
          The hook accepts React Router navigation options such as <code>replace</code>,
          <code> state</code>, <code>relative</code>, and
          <code> preventScrollReset</code>, plus <code>transition</code>,
          <code> transitionOptions</code>, and <code>smoothScrollToTop</code>. For a
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
    </>
  )
}
