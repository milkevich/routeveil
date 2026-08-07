export function canTransitionHistoryDelta(delta: number): boolean {
  if (
    !Number.isInteger(delta)
    || delta >= 0
    || typeof window === 'undefined'
  ) {
    return false
  }

  const state = window.history.state as { idx?: unknown } | null
  const index = state?.idx

  return (
    typeof index === 'number'
    && Number.isInteger(index)
    && index + delta >= 0
  )
}
