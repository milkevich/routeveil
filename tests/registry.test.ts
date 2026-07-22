import { describe, expect, it } from 'vitest'
import { builtInTransitions } from '../src/core/transitions/built-ins'

describe('built-in transition registry', () => {
  it('contains all page and overlay presets with explicit strategies', () => {
    expect(Object.keys(builtInTransitions)).toEqual([
      'fade',
      'blur',
      'slide',
      'spin',
      'rotate',
      'bounce',
      'push',
      'pull',
      'pixel',
      'curtain',
      'wipe',
      'columns',
      'rows',
      'iris',
      'halo',
      'tunnel',
      'clock',
      'venetian',
      'mosaic',
      'dissolve',
    ])

    for (const name of [
      'fade',
      'blur',
      'slide',
      'spin',
      'rotate',
      'bounce',
      'push',
      'pull',
    ] as const) {
      expect(builtInTransitions[name].type).toBe('page')
    }

    for (const name of [
      'pixel',
      'curtain',
      'wipe',
      'columns',
      'rows',
      'iris',
      'halo',
      'tunnel',
      'clock',
      'venetian',
      'mosaic',
      'dissolve',
    ] as const) {
      expect(builtInTransitions[name].type).toBe('overlay')
    }

    expect('fade-up' in builtInTransitions).toBe(false)
    expect('slide-up' in builtInTransitions).toBe(false)
    expect('slide-down' in builtInTransitions).toBe(false)
    expect('slide-left' in builtInTransitions).toBe(false)
    expect('slide-right' in builtInTransitions).toBe(false)
    expect('scale' in builtInTransitions).toBe(false)
    expect('glitch' in builtInTransitions).toBe(false)
    expect('liquid' in builtInTransitions).toBe(false)
  })

  it('preserves bounce behavior and defines opposing push and pull depth', () => {
    expect(builtInTransitions.bounce.exit.keyframes).toEqual([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.94)' },
    ])
    expect(builtInTransitions.bounce.enter.keyframes).toEqual([
      { opacity: 0, transform: 'scale(0.96)' },
      { opacity: 1, transform: 'scale(1)' },
    ])
    expect(builtInTransitions.bounce.exit.options).toEqual({
      duration: 240,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'forwards',
    })
    expect(builtInTransitions.bounce.enter.options).toEqual({
      duration: 420,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'both',
    })

    expect(builtInTransitions.push.exit.keyframes).toEqual([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(1.08)' },
    ])
    expect(builtInTransitions.push.enter.keyframes).toEqual([
      { opacity: 0, transform: 'scale(0.92)' },
      { opacity: 1, transform: 'scale(1)' },
    ])
    expect(builtInTransitions.pull.exit.keyframes).toEqual([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.92)' },
    ])
    expect(builtInTransitions.pull.enter.keyframes).toEqual([
      { opacity: 0, transform: 'scale(1.08)' },
      { opacity: 1, transform: 'scale(1)' },
    ])

    expect(builtInTransitions.push.exit.options).toEqual(
      builtInTransitions.pull.exit.options,
    )
    expect(builtInTransitions.push.enter.options).toEqual(
      builtInTransitions.pull.enter.options,
    )
    expect(builtInTransitions.push.exit.options).toMatchObject({
      duration: 420,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    })
    expect(builtInTransitions.push.enter.options).toMatchObject({
      duration: 420,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    })
  })

  it('resolves restrained 2D rotate motion in left and right directions', () => {
    const rotateLeft = builtInTransitions.rotate.resolve?.({
      direction: 'left',
    })
    const rotateRight = builtInTransitions.rotate.resolve?.({
      direction: 'right',
    })
    const invalidDirection = builtInTransitions.rotate.resolve?.({
      direction: 'up',
    })

    expect(rotateLeft?.exit.keyframes.at(-1)).toMatchObject({
      opacity: 0,
      transform: 'translate3d(-40%, 0, 0) rotate(-18deg)',
    })
    expect(rotateRight?.exit.keyframes.at(-1)).toMatchObject({
      opacity: 0,
      transform: 'translate3d(40%, 0, 0) rotate(18deg)',
    })
    expect(rotateRight?.enter.keyframes[0]).toMatchObject({
      transform: 'translate3d(-40%, 0, 0) rotate(-18deg)',
    })
    expect(invalidDirection).toEqual(rotateRight)
  })

  it('defines blur as a blur plus opacity exit and resolves directions', () => {
    const blurExit = builtInTransitions.blur.exit.keyframes
    expect(blurExit[0]).toMatchObject({ filter: 'blur(0px)', opacity: 1 })
    expect(blurExit.at(-1)).toMatchObject({
      filter: 'blur(20px)',
      opacity: 0,
    })

    const slideLeft = builtInTransitions.slide.resolve?.({
      direction: 'left',
    })
    const slideRight = builtInTransitions.slide.resolve?.({
      direction: 'right',
    })
    const spinUp = builtInTransitions.spin.resolve?.({ direction: 'up' })
    const spinDown = builtInTransitions.spin.resolve?.({ direction: 'down' })

    expect(slideLeft?.exit.keyframes.at(-1)).toMatchObject({
      transform: 'translate3d(-96px, 0, 0)',
    })
    expect(slideRight?.exit.keyframes.at(-1)).toMatchObject({
      transform: 'translate3d(96px, 0, 0)',
    })
    expect(spinUp?.exit.keyframes.at(-1)).not.toEqual(
      spinDown?.exit.keyframes.at(-1),
    )
    expect(String(spinUp?.exit.keyframes.at(-1)?.transform))
      .toContain('rotateX')
  })
})
