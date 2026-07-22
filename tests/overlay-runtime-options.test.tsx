import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CurtainOverlay,
  type CurtainOverlayOptions,
} from '../src/core/overlays/CurtainOverlay'
import {
  MosaicOverlay,
  type MosaicOverlayOptions,
} from '../src/core/overlays/MosaicOverlay'
import {
  PixelOverlay,
  type PixelOverlayOptions,
} from '../src/core/overlays/PixelOverlay'
import {
  ColumnsOverlay,
  type ColumnsOverlayOptions,
  RowsOverlay,
  type RowsOverlayOptions,
} from '../src/core/overlays/StripOverlays'
import {
  VenetianOverlay,
  type VenetianOverlayOptions,
} from '../src/core/overlays/VenetianOverlay'
import {
  WipeOverlay,
  type WipeOverlayOptions,
} from '../src/core/overlays/WipeOverlay'
import type { OverlayAnimationHandle } from '../src/core/transitions/types'
import {
  installBrowserMocks,
  type ControlledAnimation,
} from './browser-mocks'

type BrowserMocks = ReturnType<typeof installBrowserMocks>

let browser: BrowserMocks

function withRuntimeValue<T extends object>(
  options: T,
  property: PropertyKey,
  value: unknown,
): T {
  Reflect.set(options, property, value)
  return options
}

function animationDelay(animation: ControlledAnimation): number {
  expect(animation.options).toBeTypeOf('object')
  return Number((animation.options as KeyframeAnimationOptions).delay ?? 0)
}

async function finishAnimations(
  animations: readonly ControlledAnimation[],
  phase: Promise<void>,
): Promise<void> {
  await act(async () => {
    animations.forEach((animation) => animation.finish())
    await phase
  })
}

beforeEach(() => {
  browser = installBrowserMocks()
})

afterEach(() => {
  browser.restore()
  vi.restoreAllMocks()
})

describe('overlay runtime option fallbacks', () => {
  it('defaults an invalid pixel origin to center', async () => {
    const fillRect = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      fillRect,
      fillStyle: '',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D)
    const controller = createRef<OverlayAnimationHandle>()
    const options = withRuntimeValue<PixelOverlayOptions>(
      { columns: 3, duration: 10, rows: 1, stagger: 90 },
      'origin',
      'edge',
    )
    render(<PixelOverlay controllerRef={controller} options={options} />)

    let cover!: Promise<void>
    act(() => {
      cover = controller.current!.cover()
    })
    act(() => browser.flushFrame())
    act(() => browser.flushFrame())

    expect(fillRect).toHaveBeenCalledWith(8, 0, 8, 8)
    expect(fillRect).not.toHaveBeenCalledWith(0, 0, 8, 8)
    expect(fillRect).not.toHaveBeenCalledWith(16, 0, 8, 8)
    act(() => controller.current!.reset())
    await cover
  })

  it('defaults invalid wipe and curtain geometry values', () => {
    const wipeOptions = withRuntimeValue<WipeOverlayOptions>(
      {},
      'direction',
      'sideways',
    )
    const curtainOptions = withRuntimeValue<CurtainOverlayOptions>(
      {},
      'axis',
      'diagonal',
    )
    const { container } = render(
      <>
        <WipeOverlay
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={wipeOptions}
        />
        <CurtainOverlay
          controllerRef={createRef<OverlayAnimationHandle>()}
          options={curtainOptions}
        />
      </>,
    )
    const wipe = container.querySelector<HTMLElement>('[data-routeveil-wipe]')!
    const panels = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-routeveil-curtain-panel]',
      ),
    ]

    expect(wipe.style.transform).toBe('translate3d(-101%, 0, 0)')
    expect(panels).toHaveLength(2)
    expect(panels[0]?.style.width).toBe('calc(50% + 1px)')
    expect(panels[0]?.style.transform).toBe('scaleX(0)')
    expect(panels[0]?.style.transformOrigin).toBe('left center')
    expect(panels[1]?.style.transformOrigin).toBe('right center')
  })

  it('defaults invalid strip directions and ordering', async () => {
    const columnsController = createRef<OverlayAnimationHandle>()
    const rowsController = createRef<OverlayAnimationHandle>()
    const columnsOptions = withRuntimeValue<ColumnsOverlayOptions>(
      withRuntimeValue<ColumnsOverlayOptions>(
        { columns: 2, duration: 10, stagger: 40 },
        'direction',
        'sideways',
      ),
      'order',
      'outside-in',
    )
    const rowsOptions = withRuntimeValue<RowsOverlayOptions>(
      withRuntimeValue<RowsOverlayOptions>(
        { duration: 10, rows: 2, stagger: 40 },
        'direction',
        'vertical',
      ),
      'order',
      'outside-in',
    )
    const { container } = render(
      <>
        <ColumnsOverlay
          controllerRef={columnsController}
          options={columnsOptions}
        />
        <RowsOverlay controllerRef={rowsController} options={rowsOptions} />
      </>,
    )
    const columns = [
      ...container.querySelectorAll<HTMLElement>('[data-routeveil-column]'),
    ]
    const rows = [
      ...container.querySelectorAll<HTMLElement>('[data-routeveil-row]'),
    ]

    expect(columns.map((strip) => strip.style.transformOrigin)).toEqual([
      'center top',
      'center bottom',
    ])
    expect(rows.map((strip) => strip.style.transformOrigin)).toEqual([
      'left center',
      'right center',
    ])

    let columnsCover!: Promise<void>
    let rowsCover!: Promise<void>
    act(() => {
      columnsCover = columnsController.current!.cover()
      rowsCover = rowsController.current!.cover()
    })
    const animations = browser.animations.slice()

    expect(animations.map(animationDelay)).toEqual([0, 40, 0, 40])
    await finishAnimations(
      animations,
      Promise.all([columnsCover, rowsCover]).then(() => undefined),
    )
  })

  it('defaults invalid venetian and mosaic modes', async () => {
    const venetianOptions = withRuntimeValue<VenetianOverlayOptions>(
      { count: 2 },
      'direction',
      'diagonal',
    )
    const venetian = render(
      <VenetianOverlay
        controllerRef={createRef<OverlayAnimationHandle>()}
        options={venetianOptions}
      />,
    )

    expect(
      venetian.container.querySelector('[data-routeveil-venetian]'),
    ).toHaveAttribute('data-direction', 'horizontal')
    venetian.unmount()

    const readMosaicDelays = async (options: MosaicOverlayOptions) => {
      const controller = createRef<OverlayAnimationHandle>()
      const start = browser.animations.length
      const view = render(
        <MosaicOverlay controllerRef={controller} options={options} />,
      )
      let cover!: Promise<void>
      act(() => {
        cover = controller.current!.cover()
      })
      const animations = browser.animations.slice(start)
      const delays = animations.map(animationDelay)
      await finishAnimations(animations, cover)
      view.unmount()
      return delays
    }
    const invalidOptions = withRuntimeValue<MosaicOverlayOptions>(
      { columns: 2, rows: 2, seed: 7, stagger: 100 },
      'origin',
      'edge',
    )

    expect(await readMosaicDelays(invalidOptions)).toEqual(
      await readMosaicDelays({
        columns: 2,
        origin: 'center',
        rows: 2,
        seed: 7,
        stagger: 100,
      }),
    )
  })
})
