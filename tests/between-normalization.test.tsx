import { createPortal } from 'react-dom'
import { describe, expect, it } from 'vitest'
import {
  normalizeBetweenInput,
  normalizeBetweenMinDuration,
} from '../src/react-router/normalize-between'

describe('between input normalization', () => {
  it('normalizes shorthand and configured content through one representation', () => {
    const shorthand = <span>Brand</span>
    const configured = <span>Status</span>

    expect(normalizeBetweenInput(shorthand)).toEqual({
      content: shorthand,
      minDuration: 0,
    })
    expect(normalizeBetweenInput({ content: configured })).toEqual({
      content: configured,
      minDuration: 0,
    })
    expect(normalizeBetweenInput({
      content: configured,
      minDuration: 500,
    })).toEqual({
      content: configured,
      minDuration: 500,
    })
  })

  it('does not mistake React elements, portals, or arrays for configuration objects', () => {
    const target = document.createElement('div')
    const element = <span>Element</span>
    const portal = createPortal(<span>Portal</span>, target)
    const list = [<span key="first">First</span>, 'second']

    expect(normalizeBetweenInput(element)?.content).toBe(element)
    expect(normalizeBetweenInput(portal)?.content).toBe(portal)
    expect(normalizeBetweenInput(list)?.content).toBe(list)
  })

  it('distinguishes an omitted input from valid empty React content', () => {
    expect(normalizeBetweenInput(undefined)).toBeNull()
    expect(normalizeBetweenInput(null)).toEqual({
      content: null,
      minDuration: 0,
    })
    expect(normalizeBetweenInput(false)).toEqual({
      content: false,
      minDuration: 0,
    })
    expect(normalizeBetweenInput({ content: null })).toEqual({
      content: null,
      minDuration: 0,
    })
  })

  it.each([
    undefined,
    null,
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    '500',
  ])('normalizes an invalid minimum duration to zero', (value) => {
    expect(normalizeBetweenMinDuration(value)).toBe(0)
    expect(normalizeBetweenInput({
      content: 'Status',
      minDuration: value as number,
    })?.minDuration).toBe(0)
  })

  it('preserves positive finite minimum durations', () => {
    expect(normalizeBetweenMinDuration(0.5)).toBe(0.5)
    expect(normalizeBetweenMinDuration(500)).toBe(500)
  })
})
