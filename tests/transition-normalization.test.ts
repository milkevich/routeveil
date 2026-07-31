import { describe, expect, it, vi } from 'vitest'
import type {
  PageTransitionDefinition,
  PageTransitionPhases,
  TransitionDefinition,
} from '../src/core'
import { normalizeTransition } from '../src/react-router/normalize-transition'

function phases(exitOpacity: number, enterOpacity: number): PageTransitionPhases {
  return {
    exit: {
      keyframes: [{ opacity: 1 }, { opacity: exitOpacity }],
      options: { duration: 10 },
    },
    enter: {
      keyframes: [{ opacity: enterOpacity }, { opacity: 1 }],
      options: { duration: 20 },
    },
  }
}

const fadePhases = phases(0.11, 0.12)
const slideDefaultPhases = phases(0.21, 0.22)
const slideLeftPhases = phases(0.31, 0.32)
const slideRightPhases = phases(0.41, 0.42)

function directionFrom(options: unknown): unknown {
  return typeof options === 'object' && options !== null
    ? Reflect.get(options, 'direction')
    : undefined
}

function createRegistry() {
  const fadeResolver = vi.fn(() => fadePhases)
  const slideResolver = vi.fn((options?: unknown) => {
    const direction = directionFrom(options)

    return direction === 'left'
      ? slideLeftPhases
      : direction === 'right'
        ? slideRightPhases
        : slideDefaultPhases
  })
  const fade = {
    type: 'page',
    ...fadePhases,
    resolve: fadeResolver,
  } satisfies PageTransitionDefinition
  const slide = {
    type: 'page',
    ...slideDefaultPhases,
    resolve: slideResolver,
  } satisfies PageTransitionDefinition
  const customOverlay = {
    type: 'overlay',
    renderer: () => null,
  } satisfies TransitionDefinition<Record<string, unknown>>
  const registry = {
    'custom-overlay': customOverlay,
    fade,
    slide,
  } satisfies Record<string, TransitionDefinition>

  return { customOverlay, fade, fadeResolver, registry, slide, slideResolver }
}

describe('transition normalization', () => {
  it('normalizes complete shorthand once and uses both resolved phases', () => {
    const { fade, fadeResolver, registry } = createRegistry()
    const normalized = normalizeTransition('fade', registry)

    expect(normalized.type).toBe('page')

    if (normalized.type !== 'page') {
      return
    }

    expect(fadeResolver).toHaveBeenCalledOnce()
    expect(fadeResolver).toHaveBeenCalledWith(undefined)
    expect(normalized.exit).toEqual({
      definition: fade,
      name: 'fade',
      options: undefined,
      phase: fadePhases.exit,
    })
    expect(normalized.enter).toEqual({
      definition: fade,
      name: 'fade',
      options: undefined,
      phase: fadePhases.enter,
    })
    expect(normalized.issues).toEqual([])
  })

  it('strips name from a configured complete transition and resolves once', () => {
    const { registry, slide, slideResolver } = createRegistry()
    const normalized = normalizeTransition({
      name: 'slide',
      direction: 'left',
    }, registry)

    expect(normalized.type).toBe('page')

    if (normalized.type !== 'page') {
      return
    }

    expect(slideResolver).toHaveBeenCalledOnce()
    expect(slideResolver).toHaveBeenCalledWith({ direction: 'left' })
    expect(normalized.exit).toEqual({
      definition: slide,
      name: 'slide',
      options: { direction: 'left' },
      phase: slideLeftPhases.exit,
    })
    expect(normalized.enter).toEqual({
      definition: slide,
      name: 'slide',
      options: { direction: 'left' },
      phase: slideLeftPhases.enter,
    })
  })

  it('normalizes shorthand and configured overlays with flattened options', () => {
    const { customOverlay, registry } = createRegistry()

    expect(normalizeTransition('custom-overlay', registry)).toEqual({
      definition: customOverlay,
      issues: [],
      name: 'custom-overlay',
      options: undefined,
      type: 'overlay',
    })
    expect(normalizeTransition({
      name: 'custom-overlay',
      intensity: 0.75,
      color: '#111',
    }, registry)).toEqual({
      definition: customOverlay,
      issues: [],
      name: 'custom-overlay',
      options: { color: '#111', intensity: 0.75 },
      type: 'overlay',
    })
  })

  it('selects only the requested phases from split shorthand definitions', () => {
    const { fade, fadeResolver, registry, slide, slideResolver } = createRegistry()
    const normalized = normalizeTransition({
      exit: 'fade',
      enter: 'slide',
    }, registry)

    expect(normalized.type).toBe('page')

    if (normalized.type !== 'page') {
      return
    }

    expect(fadeResolver).toHaveBeenCalledOnce()
    expect(slideResolver).toHaveBeenCalledOnce()
    expect(normalized.exit).toEqual({
      definition: fade,
      name: 'fade',
      options: undefined,
      phase: fadePhases.exit,
    })
    expect(normalized.enter).toEqual({
      definition: slide,
      name: 'slide',
      options: undefined,
      phase: slideDefaultPhases.enter,
    })
  })

  it('resolves configured split phases independently without sharing options', () => {
    const { registry, slide, slideResolver } = createRegistry()
    const normalized = normalizeTransition({
      exit: { name: 'slide', direction: 'left' },
      enter: { name: 'slide', direction: 'right' },
    }, registry)

    expect(normalized.type).toBe('page')

    if (normalized.type !== 'page') {
      return
    }

    expect(slideResolver).toHaveBeenCalledTimes(2)
    expect(slideResolver).toHaveBeenNthCalledWith(1, { direction: 'left' })
    expect(slideResolver).toHaveBeenNthCalledWith(2, { direction: 'right' })
    expect(normalized.exit).toEqual({
      definition: slide,
      name: 'slide',
      options: { direction: 'left' },
      phase: slideLeftPhases.exit,
    })
    expect(normalized.enter).toEqual({
      definition: slide,
      name: 'slide',
      options: { direction: 'right' },
      phase: slideRightPhases.enter,
    })
  })

  it('represents an omitted page phase as null', () => {
    const { registry } = createRegistry()
    const exitOnly = normalizeTransition({ exit: 'fade' }, registry)
    const enterOnly = normalizeTransition({ enter: 'slide' }, registry)

    expect(exitOnly.type).toBe('page')
    expect(enterOnly.type).toBe('page')

    if (exitOnly.type !== 'page' || enterOnly.type !== 'page') {
      return
    }

    expect(exitOnly.exit?.phase).toBe(fadePhases.exit)
    expect(exitOnly.enter).toBeNull()
    expect(enterOnly.exit).toBeNull()
    expect(enterOnly.enter?.phase).toBe(slideDefaultPhases.enter)
  })

  it('keeps a valid split phase when the other phase is unknown', () => {
    const { registry } = createRegistry()
    const invalidExit = normalizeTransition({
      exit: 'missing-exit',
      enter: 'slide',
    }, registry)
    const invalidEnter = normalizeTransition({
      exit: 'fade',
      enter: 'missing-enter',
    }, registry)

    expect(invalidExit.type).toBe('page')
    expect(invalidEnter.type).toBe('page')

    if (invalidExit.type !== 'page' || invalidEnter.type !== 'page') {
      return
    }

    expect(invalidExit.exit).toBeNull()
    expect(invalidExit.enter?.phase).toBe(slideDefaultPhases.enter)
    expect(invalidExit.issues).toEqual([{
      name: 'missing-exit',
      phase: 'exit',
      type: 'unknown-transition',
    }])
    expect(invalidEnter.exit?.phase).toBe(fadePhases.exit)
    expect(invalidEnter.enter).toBeNull()
    expect(invalidEnter.issues).toEqual([{
      name: 'missing-enter',
      phase: 'enter',
      type: 'unknown-transition',
    }])
  })

  it('rejects overlays in either split phase while preserving a valid page phase', () => {
    const { registry } = createRegistry()
    const invalidExit = normalizeTransition({
      exit: 'custom-overlay',
      enter: 'slide',
    }, registry)
    const invalidEnter = normalizeTransition({
      exit: 'fade',
      enter: 'custom-overlay',
    }, registry)

    expect(invalidExit.type).toBe('page')
    expect(invalidEnter.type).toBe('page')

    if (invalidExit.type !== 'page' || invalidEnter.type !== 'page') {
      return
    }

    expect(invalidExit.exit).toBeNull()
    expect(invalidExit.enter?.phase).toBe(slideDefaultPhases.enter)
    expect(invalidExit.issues).toEqual([{
      name: 'custom-overlay',
      phase: 'exit',
      type: 'overlay-page-phase',
    }])
    expect(invalidEnter.exit?.phase).toBe(fadePhases.exit)
    expect(invalidEnter.enter).toBeNull()
    expect(invalidEnter.issues).toEqual([{
      name: 'custom-overlay',
      phase: 'enter',
      type: 'overlay-page-phase',
    }])
  })

  it('contains resolver failures to the complete transition or affected split phase', () => {
    const { registry } = createRegistry()
    const failure = new Error('resolver failed')
    const brokenResolver = vi.fn((): PageTransitionPhases => {
      throw failure
    })
    const broken = {
      type: 'page',
      ...phases(0.51, 0.52),
      resolve: brokenResolver,
    } satisfies PageTransitionDefinition
    const throwingRegistry = { ...registry, broken }
    const complete = normalizeTransition('broken', throwingRegistry)
    const brokenExit = normalizeTransition({
      exit: 'broken',
      enter: 'slide',
    }, throwingRegistry)
    const brokenEnter = normalizeTransition({
      exit: 'fade',
      enter: 'broken',
    }, throwingRegistry)

    expect(complete).toEqual({
      issues: [{
        error: failure,
        name: 'broken',
        phase: 'complete',
        type: 'resolution-error',
      }],
      type: 'invalid',
    })
    expect(brokenExit.type).toBe('page')
    expect(brokenEnter.type).toBe('page')

    if (brokenExit.type !== 'page' || brokenEnter.type !== 'page') {
      return
    }

    expect(brokenExit.exit).toBeNull()
    expect(brokenExit.enter?.phase).toBe(slideDefaultPhases.enter)
    expect(brokenExit.issues).toEqual([{
      error: failure,
      name: 'broken',
      phase: 'exit',
      type: 'resolution-error',
    }])
    expect(brokenEnter.exit?.phase).toBe(fadePhases.exit)
    expect(brokenEnter.enter).toBeNull()
    expect(brokenEnter.issues).toEqual([{
      error: failure,
      name: 'broken',
      phase: 'enter',
      type: 'resolution-error',
    }])
    expect(brokenResolver).toHaveBeenCalledTimes(3)
  })

  it('returns invalid when no complete or split phase can be normalized', () => {
    const { registry } = createRegistry()

    expect(normalizeTransition('missing-complete', registry)).toEqual({
      issues: [{
        name: 'missing-complete',
        phase: 'complete',
        type: 'unknown-transition',
      }],
      type: 'invalid',
    })
    expect(normalizeTransition({}, registry)).toEqual({
      issues: [{ phase: 'complete', type: 'invalid-input' }],
      type: 'invalid',
    })
    expect(normalizeTransition({
      name: 'fade',
      exit: 'slide',
    }, registry)).toEqual({
      issues: [{ phase: 'complete', type: 'invalid-input' }],
      type: 'invalid',
    })
    expect(normalizeTransition({
      exit: 'missing-exit',
      enter: 'custom-overlay',
    }, registry)).toEqual({
      issues: [
        {
          name: 'missing-exit',
          phase: 'exit',
          type: 'unknown-transition',
        },
        {
          name: 'custom-overlay',
          phase: 'enter',
          type: 'overlay-page-phase',
        },
      ],
      type: 'invalid',
    })
  })

})
