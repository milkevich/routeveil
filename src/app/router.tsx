import { createBrowserRouter } from 'react-router-dom'
import App from './App'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('./pages/home/HomePage')).HomePage,
        }),
      },
      {
        path: 'docs',
        lazy: async () => ({
          Component: (await import('./pages/docs/DocsPage')).DocsPage,
        }),
      },
      {
        path: 'releases',
        lazy: async () => ({
          Component: (await import('./pages/releases/ReleasesPage')).ReleasesPage,
        }),
      },
      {
        path: 'lab',
        lazy: async () => ({
          Component: (await import('./pages/lab/LabPage')).LabPage,
        }),
      },
      {
        path: 'lab/between',
        lazy: async () => ({
          Component: (
            await import('./pages/lab/between/BetweenDemoPage')
          ).BetweenDemoPage,
        }),
      },
      {
        path: 'lab/shared-elements',
        lazy: async () => ({
          Component: (
            await import(
              './pages/lab/shared-elements/SharedElementsDemoPage'
            )
          ).SharedElementsDemoPage,
        }),
      },
      {
        path: 'lab/shared-elements/detail',
        lazy: async () => ({
          Component: (
            await import(
              './pages/lab/shared-elements/SharedElementsDemoPage'
            )
          ).SharedElementsDetailPage,
        }),
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('./pages/not-found/NotFoundPage')).NotFoundPage,
        }),
      },
    ],
  },
])
