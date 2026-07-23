<div align="center">
  <a href="https://www.routeveil.dev">
  <img width="220" alt="favicon" src="https://github.com/user-attachments/assets/83315c80-4b6e-4328-a048-3afccb4adf77" />
  </a>
  <h1>Routeveil 
  <a href="https://www.npmjs.com/package/routeveil">
      <img src="https://img.shields.io/npm/v/routeveil?style=flat-square&label=npm" alt="npm version" />
    </a>
  </h1>
  
  <a href="https://www.routeveil.dev">
    VIEW DEMO
  </a>

  <p>Page and full-screen overlay transitions for React Router.</p>

  <p>
    Per-navigation effects, typed options, custom transitions, and no animation logic inside page components.
  </p>
</div>

---

## Why Routeveil

Routeveil wraps the part of your application rendered by React Router and coordinates the complete transition lifecycle:

1. animate the current route out
2. commit navigation while the view is hidden
3. wait for the next route to render
4. animate the next route in
5. restore interaction and clean up

Persistent UI can stay outside `RouteveilView`, while overlay transitions render through a `document.body` portal and cover the complete viewport.

```tsx
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
} from 'routeveil/react-router'
```

## Features

- Per-link and programmatic transitions
- Page transitions scoped to `RouteveilView`
- Full-screen overlay transitions
- Typed transition-specific options
- Cursor-aware radial effects
- Preview transitions without navigation
- Custom transition registry
- Reduced-motion support
- Native behavior for external links and modifier clicks
- No animation code inside page components

## Installation

```bash
npm install routeveil
```

Routeveil expects React, React DOM, and React Router DOM in the consuming application.

### Compatibility

| Dependency | Supported versions |
|---|---|
| React | `^18.0.0 || ^19.0.0` |
| React DOM | `^18.0.0 || ^19.0.0` |
| React Router DOM | `^6.27.0 || ^7.0.0` |

See the [compatibility documentation](https://www.routeveil.dev/docs#compatibility) for the exact tested matrix and unsupported versions.

The public API is exposed from:

```ts
routeveil/react-router
```

The package root intentionally has no runtime entry point.

## Quick start

Keep persistent interface outside `RouteveilView`:

```tsx
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'
import {
  RouteveilProvider,
  RouteveilView,
} from 'routeveil/react-router'

function App() {
  return (
    <RouteveilProvider>
      <Header />

      <RouteveilView>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </RouteveilView>

      <Footer />
    </RouteveilProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
```

The header and footer remain mounted while the route view transitions. Move them inside `RouteveilView` when the entire layout should animate.

## Navigate with a transition

```tsx
import { RouteveilLink } from 'routeveil/react-router'

<RouteveilLink
  to="/about"
  transition="slide"
  transitionOptions={{ direction: 'left' }}
>
  About
</RouteveilLink>
```

Each navigation chooses its own transition and options:

```tsx
<RouteveilLink
  to="/projects"
  transition="pixel"
  transitionOptions={{
    origin: 'cursor',
    color: '#111111',
    columns: 18,
    rows: 12,
  }}
>
  Projects
</RouteveilLink>

<RouteveilLink
  to="/contact"
  transition="tunnel"
  transitionOptions={{
    origin: 'cursor',
    color: '#000000',
    coverDuration: 520,
    revealDuration: 680,
  }}
>
  Contact
</RouteveilLink>
```

Omit `transition` to use ordinary React Router navigation:

```tsx
<RouteveilLink to="/about">
  About without animation
</RouteveilLink>
```

## Data routers and layout routes

With `createBrowserRouter`, leave `RouteveilView` empty. It renders React Router's `Outlet` internally.

```tsx
import { createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom'
import {
  RouteveilProvider,
  RouteveilView,
} from 'routeveil/react-router'

function RootLayout() {
  return (
    <RouteveilProvider>
      <Header />
      <RouteveilView />
      <Footer />
    </RouteveilProvider>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />,
)
```

## Programmatic navigation

`useRouteveilNavigate` resolves after the complete transition finishes.

```tsx
import { useRouteveilNavigate } from 'routeveil/react-router'

function ContinueButton() {
  const navigate = useRouteveilNavigate()

  return (
    <button
      onClick={() => {
        void navigate('/success', {
          transition: 'clock',
          transitionOptions: {
            origin: 'center',
          },
          smoothScrollToTop: true,
          state: {
            source: 'onboarding',
          },
        })
      }}
    >
      Continue
    </button>
  )
}
```

## Interrupted navigation

Routeveil intentionally runs one transition at a time. While a transition is active, additional `RouteveilLink`, `useRouteveilNavigate`, and `useRouteveilTransition` requests receive the active promise without queueing or committing another destination.

Browser Back and Forward, ordinary React Router navigation, plain links, and direct history changes are external location changes. Routeveil respects the latest location, abandons an uncommitted Routeveil destination, cancels remaining visual work, and cleans up run-owned animations, inert state, temporary attributes, overlays, timers, location waiters, and phase state. After a successful or external route change, Routeveil preserves meaningful focus moved by the application or focuses the incoming `RouteveilView` with `preventScroll`; same-page playback and failed unchanged navigation restore prior focus when appropriate.

## Preview without navigating

`useRouteveilTransition` plays a transition on the current route without changing the URL, history, mounted route, or scroll position.

```tsx
import { useRouteveilTransition } from 'routeveil/react-router'

function TransitionPreview() {
  const playTransition = useRouteveilTransition()

  return (
    <button
      onClick={(event) => {
        void playTransition('tunnel', {
          clickPosition: {
            x: event.clientX,
            y: event.clientY,
          },
          transitionOptions: {
            color: '#111111',
            origin: 'cursor',
          },
        })
      }}
    >
      Preview tunnel
    </button>
  )
}
```

## Built-in transitions

Routeveil includes 20 built-in transitions.

### Page transitions

Page transitions animate only the registered `RouteveilView`.

| Transition | Description | Options |
| --- | --- | --- |
| `fade` | Quiet opacity crossfade | None |
| `blur` | Blur and opacity transition | None |
| `slide` | Directional route movement | `direction` |
| `spin` | 3D rotation with directional movement | `direction` |
| `rotate` | Restrained 2D wheel turn | `direction` |
| `bounce` | Soft cinematic depth motion | None |
| `push` | Old route grows toward the viewer | None |
| `pull` | Old route recedes as the next route arrives | None |

### Overlay transitions

Overlay transitions cover the complete viewport through a body portal.

| Transition | Description | Main options |
| --- | --- | --- |
| `pixel` | Square tile field | `columns`, `rows`, `color`, `duration`, `stagger`, `origin` |
| `curtain` | Two closing panels | `color`, `axis`, `duration`, `easing` |
| `wipe` | One panel crossing the viewport | `color`, `direction`, `duration`, `easing` |
| `columns` | Animated vertical strips | `columns`, `count`, `direction`, `order`, `color`, `duration`, `stagger`, `easing` |
| `rows` | Animated horizontal strips | `rows`, `count`, `direction`, `order`, `color`, `duration`, `stagger`, `easing` |
| `iris` | Old-film circular aperture | `color`, `origin`, `duration`, `easing` |
| `halo` | Expanding solid circle | `color`, `origin`, `duration`, `easing` |
| `tunnel` | Halo cover with iris reveal | `color`, `origin`, `duration`, `coverDuration`, `revealDuration`, `easing` |
| `clock` | Radial pie-sector sweep | `color`, `origin`, `duration`, `easing`, `direction`, `startAngle` |
| `venetian` | Dimensional rotating blinds | `direction`, `count`, `alternate`, `color`, `duration`, `stagger` |
| `mosaic` | Seeded irregular tile cover | `colors`, `columns`, `rows`, `duration`, `stagger`, `rotation`, `seed`, `origin` |
| `dissolve` | Procedural film-grain cover | `color`, `duration`, `grainSize`, `softness`, `seed` |

## Typed options

Transition options are selected from the transition name.

```tsx
import {
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
</RouteveilLink>
```

Keeping the transition name literal allows TypeScript to catch unsupported option combinations.

## Custom transitions

Custom provider transitions extend the built-in registry and override matching names.

```tsx
import { RouteveilProvider } from 'routeveil/react-router'

<RouteveilProvider
  transitions={{
    'brand-fade': {
      type: 'page',
      exit: {
        keyframes: [
          { opacity: 1 },
          { opacity: 0 },
        ],
        options: {
          duration: 180,
          fill: 'forwards',
        },
      },
      enter: {
        keyframes: [
          { opacity: 0 },
          { opacity: 1 },
        ],
        options: {
          duration: 300,
          fill: 'both',
        },
      },
    },
  }}
>
  <App />
</RouteveilProvider>
```

## Scroll behavior

Transitioned navigation scrolls to the top instantly by default.

Use `smoothScrollToTop` for a smooth reset:

```tsx
<RouteveilLink
  to="/journal"
  transition="rotate"
  transitionOptions={{ direction: 'left' }}
  smoothScrollToTop
>
  Journal
</RouteveilLink>
```

Use `preventScrollReset` to preserve the current position. It takes precedence over `smoothScrollToTop`.

## Reduced motion

When the user prefers reduced motion, Routeveil bypasses decorative animation and safely completes navigation.

## Current scope

- Direct URL loads and refreshes do not animate
- Standard React Router `Link` and `navigate` calls remain unanimated
- Browser back and forward remain native and unanimated
- Modifier clicks, external links, downloads, and non-self targets retain native behavior
- One active `RouteveilView` is supported per provider
- Missing views and unknown transitions fall back to safe normal navigation
- Concurrent Routeveil requests use the documented ignore-while-active policy
- Shared-element transitions, cloned route trees, Next.js integration, and the browser View Transitions API are not included

## Development

```bash
npm run typecheck
npm run lint
npm test
npm run test:consumer
npm run build
```

`npm run build` emits the library and declarations to `dist/` and the demo to `dist/demo/`.

`npm run check` runs the complete release gate used before packaging.

## License

MIT
