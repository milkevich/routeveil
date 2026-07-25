import type { RouteveilPreload } from './types.js'

const preloadPromises = new WeakMap<RouteveilPreload, Promise<void>>()

export function preloadRoute(preload: RouteveilPreload): Promise<void> {
  const existingPromise = preloadPromises.get(preload)

  if (existingPromise) {
    return existingPromise
  }

  const promise = Promise.resolve()
    .then(preload)
    .then(() => undefined)

  preloadPromises.set(preload, promise)

  void promise.catch(() => {
    if (preloadPromises.get(preload) === promise) {
      preloadPromises.delete(preload)
    }
  })

  return promise
}
