import { CodeBlock } from '../../../shared/UI'
import compatibility from '../../../data/compatibility.json'
import { DocSection } from '../DocSection'
import { LifecycleDiagram } from '../LifecycleDiagram'

const installCommands = `npm install routeveil
pnpm add routeveil
yarn add routeveil`

const packageImports = `import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilNavigate,
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
        transition="slide"
        transitionOptions={{ direction: 'left' }}
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
        transition="slide"
        transitionOptions={{ direction: 'right' }}
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
        intro="Routeveil is a transition layer for React Router that coordinates animation phases around individual navigation requests."
        title="Overview"
      >
        <p>
          Each transitioned navigation selects an effect. Routeveil waits for the
          outgoing page to exit or an overlay to cover the viewport, commits the
          navigation, waits for the new location to render, then enters or reveals
          the next page before restoring idle state.
        </p>
        <LifecycleDiagram />
        <div className="doc-split">
          <article>
            <h3>Page transitions</h3>
            <p>
              Page transitions animate the registered <code>RouteveilView</code>.
              Headers, footers, and other interface outside that wrapper remain
              mounted while the route content changes.
            </p>
          </article>
          <article>
            <h3>Overlay transitions</h3>
            <p>
              Overlay transitions render above the application. They fully cover
              the viewport before navigation commits, then reveal the newly rendered
              route from above persistent interface.
            </p>
          </article>
        </div>
        <p>
          <code>RouteveilProvider</code> owns transition state and timing.
          <code> RouteveilView</code> identifies the page region used by page effects.
          <code> RouteveilLink</code> adds transitions to links, while
          <code> useRouteveilNavigate</code> handles programmatic navigation.
          <code> useRouteveilTransition</code> can play the same lifecycle without
          changing the route.
        </p>
        <div className="doc-note">
          <strong>Navigation remains opt-in</strong>
          <p>
            Regular React Router links and navigation continue to work normally.
            Transitions are selected per request, and only one Routeveil transition
            runs at a time. An additional Routeveil request reuses the active promise
            without queuing or committing another destination.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="installation"
        index="02"
        intro="Install Routeveil from npm with the package manager used by your React application."
        title="Installation"
      >
        <CodeBlock filename="install.sh" language="bash">{installCommands}</CodeBlock>
        <p>
          Run the command for your package manager. The npm package is
          <code> routeveil</code>, and its public React Router entry point is
          <code> routeveil/react-router</code>.
        </p>
        <CodeBlock filename="transitions.ts" language="typescript">{packageImports}</CodeBlock>
        <p>
          Routeveil expects React, React DOM, and React Router DOM to be installed
          in the consuming application. The package ships as an ES module with
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
        id="compatibility"
        index="03"
        intro="Review the React, React DOM, and React Router DOM versions verified against Routeveil's published package."
        title="Compatibility"
      >
        <p>
          Routeveil verifies its published package against the following peer
          dependency ranges. npm peer dependency warnings indicate that the
          consuming application is outside these supported versions.
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
          Routeveil is tested in CI across React 18 and 19 with supported React
          Router DOM 6 and 7 releases.
          React Router 5 and React Router 8 are not currently supported.{' '}
          <a style={{
            textDecoration: "underline"
          }} href="https://github.com/milkevich/routeveil/blob/main/src/app/data/compatibility.json">
            View the exact test matrix.
          </a>
        </p>
      </DocSection>

      <DocSection
        id="quick-start"
        index="04"
        intro="Place the provider inside router context, wrap route content in one persistent view, and choose a transition on each RouteveilLink."
        title="Quick Start"
      >
        <CodeBlock filename="main.tsx" language="tsx">{quickStartMain}</CodeBlock>
        <CodeBlock filename="App.tsx" language="tsx">{quickStartApp}</CodeBlock>
        <p>
          <code>main.tsx</code> creates the <code>BrowserRouter</code> context.
          <code> App.tsx</code> defines the persistent layout and routes, with
          <code> RouteveilProvider</code> beneath the router. <code>RouteveilView</code>
          wraps the content animated by page transitions while the header remains
          mounted outside that view. Each link chooses its own transition and options.
        </p>
        <div className="doc-note">
          <strong>Ordinary links still work</strong>
          <p>
            A <code>RouteveilLink</code> without a transition behaves like a regular
            React Router <code>Link</code>. Direct loads, refreshes, and navigation
            that does not use a Routeveil transition render without an entrance effect.
          </p>
        </div>
      </DocSection>
    </>
  )
}
