import { CodeBlock } from '../../../shared/UI'
import compatibility from '../../../data/compatibility.json'
import { DocSection } from '../DocSection'
import { LifecycleDiagram } from '../LifecycleDiagram'
import { RouteveilLink } from '../../../../react-router'
import galleryThumbnail from '../../../../../public/gallery-card-thumbnail.png'
import { ArrowUpRight } from 'lucide-react'

const installCommands = `npm install routeveil
pnpm add routeveil
yarn add routeveil`

const packageImports = `import {
  RouteveilBetween,
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilPendingWork,
  useRouteveilTransition,
} from 'routeveil/react-router'`

const quickStartMain = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)`

const quickStartApp = `import { Route, Routes } from 'react-router-dom'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
} from 'routeveil/react-router'

function Home() {
  return (
    <main>
      <h1>Home</h1>
      <RouteveilLink
        to="/about"
        transition="fade"
      >
        About
      </RouteveilLink>
    </main>
  )
}

function About() {
  return (
    <main>
      <h1>About</h1>
      <RouteveilLink
        to="/"
        transition="fade"
      >
        Home
      </RouteveilLink>
    </main>
  )
}

export default function App() {
  return (
    <RouteveilProvider>
      <header>Persistent header</header>
      <RouteveilView>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </RouteveilView>
    </RouteveilProvider>
  )
}`

export function GettingStartedDocs() {
  return (
    <>
      <DocSection
        id="overview"
        index="01"
        intro="Routeveil adds explicit, per-navigation transitions to React Router without moving animation logic into your route components."
        title="Overview"
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
              Open the playground and watch one visual connect two different routes
            </span>
          </div>

          <div className="gallery-cta_media">
            <img src={galleryThumbnail} alt="Gallery thumbnail" />
          </div>
        </RouteveilLink>
        <p>
          React Router owns routing. Routeveil coordinates the visual handoff around a
          navigation, then restores normal interaction. Routes stay ordinary React
          components.
        </p>
        <LifecycleDiagram />
        <div className="doc-split">
          <article>
            <h3>Page transitions</h3>
            <p>
              Page transitions animate only <code>RouteveilView</code>. Put routed
              content inside it; keep persistent interface outside.
            </p>
          </article>
          <article>
            <h3>Overlay transitions</h3>
            <p>
              Overlay transitions cover the entire viewport, including persistent
              interface. They hide the old screen before navigation and reveal the
              destination afterward.
            </p>
          </article>
        </div>
        <p>
          <code>RouteveilProvider</code> coordinates requests;
          {' '}<code>RouteveilView</code> marks page content. Start navigation with
          {' '}<code>RouteveilLink</code> or <code>useRouteveilNavigate</code>, fill an
          optional handoff with <code>RouteveilBetween</code>, and preview effects with
          {' '}<code>useRouteveilTransition</code>.
        </p>
        <div className="doc-note">
          <strong>Navigation remains opt-in</strong>
          <p>
            A request must supply <code>transition</code>. Regular links, history,
            direct loads, and refreshes stay native. Concurrent Routeveil calls receive
            the active promise instead of queueing another destination.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="installation"
        index="02"
        intro="Install one package, then import the React Router integration from its dedicated public entry point."
        title="Installation"
      >
        <CodeBlock filename="install.sh" language="bash">{installCommands}</CodeBlock>
        <p>
          Run one command. Import application APIs from
          {' '}<code>routeveil/react-router</code>.
        </p>
        <h3>Available public imports</h3>
        <CodeBlock filename="imports.ts" language="typescript">{packageImports}</CodeBlock>
        <p>
          Your app provides the React and React Router peer dependencies. Routeveil is
          an ES module with TypeScript declarations.
        </p>
        <div className="doc-facts">
          <div><span>Package</span><strong>routeveil</strong></div>
          <div><span>Import entry</span><strong>routeveil/react-router</strong></div>
          <div><span>Module</span><strong>ES module</strong></div>
          <div><span>Types</span><strong>Included</strong></div>
        </div>
      </DocSection>

      <DocSection
        id="quick-start"
        index="03"
        intro="Put the provider inside React Router, mark one routed region as the view, and select a transition on the navigation that should animate."
        title="Quick Start"
      >
        <CodeBlock filename="main.tsx" language="tsx">{quickStartMain}</CodeBlock>
        <CodeBlock filename="App.tsx" language="tsx">{quickStartApp}</CodeBlock>
        <p>
          <code>BrowserRouter</code> provides router context,
          {' '}<code>RouteveilProvider</code> coordinates transitions, and
          {' '}<code>RouteveilView</code> wraps page content. The header stays mounted
          outside the view; each link chooses its own effect.
        </p>
        <div className="doc-note">
          <strong>Ordinary links still work</strong>
          <p>
            Without <code>transition</code>, <code>RouteveilLink</code> behaves like a
            React Router <code>Link</code>. Native navigation never invents an entrance.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="compatibility"
        index="04"
        intro="These peer-dependency ranges are the versions Routeveil supports and verifies as an installed package."
        title="Compatibility"
      >
        <p>
          Your app must satisfy all three ranges. An npm peer warning means an installed
          version is outside the supported contract.
        </p>
        <div className="prop-table-wrap" tabIndex={0}>
          <table className="prop-table">
            <caption>Supported versions</caption>
            <thead>
              <tr>
                <th>Dependency</th>
                <th>Range</th>
              </tr>
            </thead>
            <tbody className="prop-table-body">
              <tr>
                <td>React</td>
                <td><code>{compatibility.supported.react}</code></td>
              </tr>
              <tr>
                <td>React DOM</td>
                <td><code>{compatibility.supported.reactDom}</code></td>
              </tr>
              <tr>
                <td>React Router DOM</td>
                <td><code>{compatibility.supported.reactRouterDom}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          CI installs, typechecks, tests, and builds the packed library across React 18
          and 19 with React Router DOM 6 and 7. Versions 5 and 8 are unsupported.{' '}
          <a style={{
            textDecoration: "underline"
          }} href="https://github.com/milkevich/routeveil/blob/main/src/app/data/compatibility.json">
            View the exact test matrix.
          </a>
        </p>
      </DocSection>
    </>
  )
}
