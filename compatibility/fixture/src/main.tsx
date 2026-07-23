import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Route,
  RouterProvider,
  Routes,
  createBrowserRouter,
} from 'react-router-dom'
import {
  RouteveilLink,
  RouteveilProvider,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
} from 'routeveil/react-router'

export function Controls() {
  const navigate = useRouteveilNavigate()
  const play = useRouteveilTransition()

  return (
    <nav>
      <RouteveilLink
        preventScrollReset
        relative="path"
        replace
        state={{ source: 'link' }}
        to={{
          pathname: '/details',
          search: '?tab=api',
          hash: '#usage',
        }}
        transition="slide"
        transitionOptions={{ direction: 'left' }}
        viewTransition
      >
        Details
      </RouteveilLink>
      <button
        onClick={() => {
          void navigate('../programmatic?source=hook#result', {
            preventScrollReset: true,
            relative: 'path',
            replace: true,
            state: { source: 'hook' },
            transition: 'wipe',
            transitionOptions: { direction: 'right' },
            viewTransition: true,
          })
        }}
        type="button"
      >
        Navigate
      </button>
      <button
        onClick={() => {
          void play('fade')
        }}
        type="button"
      >
        Play
      </button>
    </nav>
  )
}

export function Page({ name }: { name: string }) {
  return <main>{name}</main>
}

export function DeclarativeApp() {
  return (
    <BrowserRouter>
      <RouteveilProvider>
        <Controls />
        <RouteveilView>
          <Routes>
            <Route element={<Page name="Home" />} path="/" />
            <Route element={<Page name="Details" />} path="/details" />
            <Route element={<Page name="Programmatic" />} path="/programmatic" />
          </Routes>
        </RouteveilView>
      </RouteveilProvider>
    </BrowserRouter>
  )
}

export function DataLayout() {
  return (
    <RouteveilProvider>
      <Controls />
      <RouteveilView />
    </RouteveilProvider>
  )
}

const dataRouter = createBrowserRouter([
  {
    path: '/',
    element: <DataLayout />,
    children: [
      { index: true, element: <Page name="Home" /> },
      { path: 'details', element: <Page name="Details" /> },
      { path: 'programmatic', element: <Page name="Programmatic" /> },
    ],
  },
])

const root = document.getElementById('root')

if (!root) {
  throw new Error('Compatibility fixture root is missing.')
}

createRoot(root).render(
  <StrictMode>
    {window.location.search.includes('data-router')
      ? <RouterProvider router={dataRouter} />
      : <DeclarativeApp />}
  </StrictMode>,
)
