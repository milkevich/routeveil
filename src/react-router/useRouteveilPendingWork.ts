import { useRouteveilContext } from './RouteveilContext.js'
import type { RouteveilPendingWorkRegistrar } from './types.js'

export function useRouteveilPendingWork(): RouteveilPendingWorkRegistrar {
  return useRouteveilContext().registerPendingWork
}
