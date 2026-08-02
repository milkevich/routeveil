import { isValidElement } from 'react'
import type { ReactNode } from 'react'
import type { RouteveilBetweenInput } from './types.js'

const REACT_PORTAL_TYPE = Symbol.for('react.portal')

type BetweenConfiguration = Readonly<{
  content: ReactNode
  minDuration?: number
}>

export type NormalizedRouteveilBetween = Readonly<{
  content: ReactNode
  minDuration: number
}>

function isReactPortal(value: unknown): boolean {
  return Boolean(
    value
    && typeof value === 'object'
    && Reflect.get(value, '$$typeof') === REACT_PORTAL_TYPE,
  )
}

function isBetweenConfiguration(
  value: RouteveilBetweenInput,
): value is BetweenConfiguration {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && !isValidElement(value)
    && !isReactPortal(value)
    && Object.prototype.hasOwnProperty.call(value, 'content'),
  )
}

export function normalizeBetweenMinDuration(value: unknown): number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
    ? value
    : 0
}

export function normalizeBetweenInput(
  input: RouteveilBetweenInput | undefined,
): NormalizedRouteveilBetween | null {
  if (input === undefined) {
    return null
  }

  if (isBetweenConfiguration(input)) {
    return {
      content: input.content,
      minDuration: normalizeBetweenMinDuration(input.minDuration),
    }
  }

  return {
    content: input,
    minDuration: 0,
  }
}
