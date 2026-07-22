import { describe, expect, it } from 'vitest'
import {
  createPixelDelays,
  createPixelGridGeometry,
} from '../src/core/overlays/pixel-order'

describe('pixel overlay geometry and ordering', () => {
  it('creates a centered covering grid made of exact square tiles', () => {
    const widthBound = createPixelGridGeometry({
      columns: 16,
      rows: 10,
      viewportWidth: 1_366,
      viewportHeight: 768,
    })
    const heightBound = createPixelGridGeometry({
      columns: 16,
      rows: 10,
      viewportWidth: 1_024,
      viewportHeight: 700,
    })

    expect(widthBound.tileSize).toBeCloseTo(1_366 / 16)
    expect(widthBound.gridWidth).toBeCloseTo(1_366)
    expect(widthBound.gridHeight).toBeGreaterThanOrEqual(768)
    expect(widthBound.offsetY).toBeLessThan(0)

    expect(heightBound.tileSize).toBe(70)
    expect(heightBound.gridHeight).toBe(700)
    expect(heightBound.gridWidth).toBe(1_120)
    expect(heightBound.offsetX).toBe(-48)
  })

  it('orders tiles outward from corners and the center', () => {
    const topLeft = createPixelDelays({
      columns: 3,
      maximumDelay: 100,
      origin: 'top-left',
      randomSeed: 0,
      rows: 3,
    })
    const center = createPixelDelays({
      columns: 3,
      maximumDelay: 100,
      origin: 'center',
      randomSeed: 0,
      rows: 3,
    })

    expect(topLeft[0]).toBe(0)
    expect(topLeft[8]).toBe(100)
    expect(topLeft[2]).toBeCloseTo(topLeft[6])
    expect(center[4]).toBe(0)
    expect(center[0]).toBe(100)
    expect(center[0]).toBeCloseTo(center[2])
    expect(center[0]).toBeCloseTo(center[6])
    expect(center[0]).toBeCloseTo(center[8])
  })

  it('maps cursor coordinates into the grid and clamps to its edges', () => {
    const delays = createPixelDelays({
      clickPosition: { x: 2_000, y: -100 },
      columns: 4,
      maximumDelay: 80,
      origin: 'cursor',
      randomSeed: 0,
      rows: 2,
      viewportHeight: 500,
      viewportWidth: 1_000,
    })

    expect(delays[3]).toBe(0)
    expect(delays[4]).toBe(80)
  })

  it('creates stable seeded random ordering normalized to the requested range', () => {
    const options = {
      columns: 4,
      maximumDelay: 240,
      origin: 'random' as const,
      randomSeed: 0.42,
      rows: 3,
    }
    const first = createPixelDelays(options)
    const second = createPixelDelays(options)
    const differentSeed = createPixelDelays({ ...options, randomSeed: 0.84 })

    expect(second).toEqual(first)
    expect(differentSeed).not.toEqual(first)
    expect(Math.min(...first)).toBe(0)
    expect(Math.max(...first)).toBe(240)
    expect(createPixelDelays({ ...options, columns: 0 })).toEqual([])
  })
})
