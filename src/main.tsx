import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import './index.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Routeveil application root is missing.')
}

const mountApplication = () => {
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

if (router.state.initialized && !router.state.errors) {
  mountApplication()
} else {
  const unsubscribe = router.subscribe((state) => {
    if (state.errors) {
      unsubscribe()
      return
    }

    if (!state.initialized) return

    unsubscribe()
    mountApplication()
  })
}
