# Routeveil

Per-navigation page and full-screen overlay transitions for React Router, with no animation code inside page components.

```tsx
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
} from 'routeveil/react-router'
```

Routeveil animates one persistent view around whatever React Router renders. The current page exits, navigation commits while it is hidden, and the same wrapper brings the next page in. Overlay transitions render through a `document.body` portal and cover the complete viewport.

## Install

```bash
npm install routeveil react react-dom react-router-dom
```

Install the npm package as `routeveil`. Its public API is intentionally exposed
only from `routeveil/react-router`; the package root has no entry point.

## Declarative router

Keep persistent UI outside `RouteveilView`:

```tsx
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
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

The header and footer stay mounted. Move them inside `RouteveilView` if the whole layout should animate.

## Data router and layout routes

With `createBrowserRouter`, leave `RouteveilView` empty. It renders React Router’s `Outlet` internally.

```tsx
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
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

## Navigate with a transition

Every navigation selects its own effect:

```tsx
<RouteveilLink
  to="/about"
  transition="slide"
  transitionOptions={{ direction: 'up' }}
>
  About
</RouteveilLink>

<RouteveilLink
  to="/archive"
  transition="spin"
  transitionOptions={{ direction: 'right' }}
>
  Archive
</RouteveilLink>

<RouteveilLink
  to="/journal"
  transition="rotate"
  transitionOptions={{ direction: 'left' }}
  smoothScrollToTop
>
  Journal
</RouteveilLink>

<RouteveilLink
  to="/projects"
  transition="pixel"
  transitionOptions={{
    origin: 'cursor',
    color: '#17151c',
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
    color: '#6d3df5',
    coverDuration: 520,
    revealDuration: 680,
  }}
>
  Contact
</RouteveilLink>

<RouteveilLink
  to="/story"
  transition="clock"
  transitionOptions={{
    origin: 'cursor',
    color: '#17151c',
    startAngle: -90,
  }}
>
  Story
</RouteveilLink>
```

For `clock`, `origin: 'cursor'` starts the radial sweep at the link’s click
position. It remains centered by default; `origin: 'center'` also keeps it
fixed at the viewport center explicitly.

After a transitioned navigation, Routeveil resets the viewport to the top
instantly by default—even when the page uses CSS smooth scrolling. Add
`smoothScrollToTop` to a link to opt into a smooth reset. If
`preventScrollReset` is also set, it takes precedence and Routeveil leaves the
scroll position unchanged.

Omit `transition` to get ordinary React Router navigation:

```tsx
<RouteveilLink to="/about">About without animation</RouteveilLink>
```

Programmatic navigation uses the same rule and resolves after the complete transition:

```tsx
function ContinueButton() {
  const navigate = useRouteveilNavigate()

  return (
    <button
      onClick={() => {
        void navigate('/success', {
          transition: 'clock',
          transitionOptions: { origin: 'cursor' },
          smoothScrollToTop: true,
          state: { source: 'onboarding' },
        })
      }}
    >
      Continue
    </button>
  )
}
```

The hook accepts the same `smoothScrollToTop` and `preventScrollReset` options
as `RouteveilLink`. Programmatic navigation has no click coordinates, so
`clock` falls back to the viewport center when `origin: 'cursor'` is requested.

## Preview without navigating

`useRouteveilTransition` plays the complete exit-and-enter or cover-and-reveal
lifecycle while keeping the current location and mounted route unchanged:

```tsx
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
            color: '#17151c',
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

## Built-ins

Routeveil includes twenty transitions. The eight page transitions animate only `RouteveilView`:

| Transition | Behavior and options |
| --- | --- |
| `fade` | A quiet opacity crossfade. |
| `blur` | Blurs the complete route view while exit opacity moves from `1` to `0`. |
| `slide` | Moves the route with `direction: 'up' \| 'down' \| 'left' \| 'right'`. |
| `spin` | Combines 3D rotation and movement for a scrolling-wheel feel; accepts the same four directions as `slide`. |
| `rotate` | A restrained 2D wheel turn with `direction: 'left' \| 'right'`. |
| `bounce` | A soft cinematic depth motion that gently recedes and returns. |
| `push` | The old route grows toward the viewer while the new route follows from slightly behind. |
| `pull` | The opposite of `push`: the old route recedes while the larger new route is pulled into place. |

`push` and `pull` use matched cinematic timing so their opposite depth movements feel related rather than springy.

The twelve overlay transitions cover the complete viewport through a body portal:

| Transition | Behavior and options |
| --- | --- |
| `pixel` | A uniform field of square tiles. Accepts `columns`, `rows`, `color`, `duration`, `stagger`, and an `origin` of `center`, `cursor`, `random`, or a viewport corner. The centered grid expands past one edge when necessary, keeping every tile square. |
| `curtain` | Two panels close and open. Accepts `color`, `axis: 'horizontal' \| 'vertical'`, `duration`, and `easing`. |
| `wipe` | One panel crosses the viewport. Accepts `color`, `direction: 'up' \| 'down' \| 'left' \| 'right'`, `duration`, and `easing`. |
| `columns` | Flat vertical strips with configurable `columns` or `count`, `direction`, `order`, `color`, `duration`, `stagger`, and `easing`. |
| `rows` | Flat horizontal strips with configurable `rows` or `count`, `direction`, `order`, `color`, `duration`, `stagger`, and `easing`. |
| `iris` | An old-film circular aperture. `origin: 'cursor'` uses the click position and falls back to center; `origin: 'center'` is fixed. Its radius uses the farthest viewport corner so cover is complete. Also accepts `color`, `duration`, and `easing`. |
| `halo` | The opposite of `iris`: a solid circle grows from the cursor or center to cover the viewport, then shrinks to reveal the next route. Accepts the same `color`, `origin: 'cursor' \| 'center'`, `duration`, and `easing` options as `iris`. |
| `tunnel` | A halo cover followed by an iris reveal, creating a circular tunnel through the route change. Accepts `color`, `origin: 'cursor' \| 'center'`, shared `duration`, phase-specific `coverDuration` and `revealDuration`, and `easing`. |
| `clock` | A pie-sector sweep from the clicked link when `origin: 'cursor'`, falling back to center when no click position exists; `origin: 'center'` is always centered. Begins at twelve o’clock by default and also accepts `color`, `duration`, `easing`, `direction: 'clockwise' \| 'counterclockwise'`, and `startAngle` in degrees. |
| `venetian` | Thin dimensional blinds rotate shut and open with perspective and `rotateX` or `rotateY`, unlike flat rows and columns. Accepts `direction: 'horizontal' \| 'vertical'`, `count`, `alternate`, `color`, `duration`, and `stagger`. |
| `mosaic` | Stable, seeded irregular rectangles grow and rotate into a gap-free cover. Accepts `colors`, `columns`, `rows`, `duration`, `stagger`, `rotation`, `seed`, and `origin: 'cursor' \| 'center' \| 'random'`. Its layout remains fixed for the transition run. |
| `dissolve` | A stable procedural noise field fills a canvas like film grain, without thousands of DOM nodes. Accepts `color`, `duration`, `grainSize`, `softness`, and `seed`. |

Every overlay finishes with a fully opaque cover before navigation, then reverses to reveal and cleans up its active animation.

## Custom transitions

Provider transitions extend the built-in registry and intentionally override matching names:

```tsx
<RouteveilProvider
  transitions={{
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
  }}
>
  <App />
</RouteveilProvider>
```

## Behavior and current scope

- Opening a URL directly or refreshing never animates.
- Normal React Router `Link` and `navigate` calls remain unanimated.
- Browser back and forward remain native and unanimated in version one.
- Modifier clicks, external links, downloads, and non-self targets retain normal anchor behavior.
- Reduced-motion preferences bypass decorative animation.
- One active `RouteveilView` is supported per provider.
- A missing view or unknown transition falls back to safe normal navigation.
- Concurrent Routeveil requests use an ignore-while-active policy.
- Next.js, shared-element transitions, cloned route trees, and the browser View Transitions API are not included.

## Development

```bash
npm run typecheck
npm run lint
npm test
npm run test:consumer
npm run build
```

`npm run build` emits the library and type declarations in `dist/`, and the demo in `dist/demo/`.
`npm run check` runs the complete release gate used automatically before packing.
# routeveil
