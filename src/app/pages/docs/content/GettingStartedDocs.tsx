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
          React Router still owns routing. Routeveil owns the short visual lifecycle
          around a navigation: prepare the current screen, commit the destination at
          the safe moment, wait for the next route to render, reveal it, and restore
          normal interaction. Your pages remain ordinary React components.
        </p>
        <LifecycleDiagram />
        <div className="doc-split">
          <article>
            <h3>Page transitions</h3>
            <p>
              Page transitions animate only <code>RouteveilView</code>. Put routed
              content inside that view and keep persistent headers, navigation, and
              footers outside it when they should stay in place.
            </p>
          </article>
          <article>
            <h3>Overlay transitions</h3>
            <p>
              Overlay transitions cover the entire viewport, including persistent
              interface. Navigation commits only after the overlay has hidden the old
              screen; the overlay then reveals the rendered destination.
            </p>
          </article>
        </div>
        <p>
          Routeveil&apos;s API is divided into a few focused responsibilities.{' '}
          <code>RouteveilProvider</code> coordinates transitions, while{' '}
          <code>RouteveilView</code> marks the animated route region.{' '}
          <code>RouteveilLink</code> and <code>useRouteveilNavigate</code> start
          transition-aware navigation. <code>useRouteveilTransition</code> previews an
          effect without changing the location.
        </p>
        <div className="doc-note">
          <strong>Navigation remains opt-in</strong>
          <p>
            Nothing animates unless that navigation supplies <code>transition</code>.{' '}
            Regular React Router links, browser history, direct loads, and refreshes
            keep their normal behavior. Routeveil runs one request at a time; another
            Routeveil request made while one is active returns the active promise and
            does not queue a second destination.
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
          Run exactly one command above. The package name is <code>routeveil</code>;{' '}
          application code imports from <code>routeveil/react-router</code>.
        </p>
        <CodeBlock filename="imports.ts" language="typescript">{packageImports}</CodeBlock>
        <p>
          React, React DOM, and React Router DOM are peer dependencies, so your
          application provides them. Routeveil ships as an ES module and includes its
          TypeScript declarations.
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
          Read the tree from the outside in: <code>BrowserRouter</code> provides router
          context, <code>RouteveilProvider</code> coordinates transitions, and{' '}
          <code>RouteveilView</code> wraps exactly the route content that page effects
          should animate. The header stays mounted because it sits outside the view.
          Each <code>RouteveilLink</code> chooses the effect for its own navigation.
        </p>
        <div className="doc-note">
          <strong>Ordinary links still work</strong>
          <p>
            Omit <code>transition</code> and <code>RouteveilLink</code> behaves like a
            React Router <code>Link</code>. Direct loads, refreshes, Back and Forward,
            and ordinary React Router navigation do not invent an entrance animation.
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
          Your application must satisfy all three ranges. A peer-dependency warning
          from npm means at least one installed version falls outside this supported
          contract.
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
          CI installs the packed library into isolated React 18 and 19 applications
          using supported React Router DOM 6 and 7 releases, then typechecks, tests,
          and builds each fixture. React Router 5 and 8 are not supported.{' '}
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
