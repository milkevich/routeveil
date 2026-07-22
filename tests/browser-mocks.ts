import { vi } from 'vitest'

export type ControlledAnimation = {
  animation: Animation
  element: Element
  finish: () => void
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null
  options?: number | KeyframeAnimationOptions
}

type BrowserMocksOptions = {
  reducedMotion?: boolean
}

function restoreProperty(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    Reflect.deleteProperty(target, property)
  }
}

export function installBrowserMocks({
  reducedMotion = false,
}: BrowserMocksOptions = {}) {
  const animateDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'animate',
  )
  const rafDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'requestAnimationFrame',
  )
  const cancelRafDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'cancelAnimationFrame',
  )
  const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'matchMedia',
  )
  const scrollToDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'scrollTo',
  )

  const animations: ControlledAnimation[] = []
  const frames = new Map<number, FrameRequestCallback>()
  let frameId = 0
  let frameTime = 0

  const animate = vi.fn(function animate(
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ): Animation {
    let resolveFinished!: () => void
    let finished = false
    const finishedPromise = new Promise<void>((resolve) => {
      resolveFinished = resolve
    })
    const cancel = vi.fn()
    const animation = {
      cancel,
      finished: finishedPromise,
    } as unknown as Animation

    animations.push({
      animation,
      element: this,
      finish: () => {
        if (!finished) {
          finished = true
          resolveFinished()
        }
      },
      keyframes,
      options,
    })

    return animation
  })

  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  const cancelAnimationFrame = vi.fn((id: number) => {
    frames.delete(id)
  })
  const matchMedia = vi.fn((query: string): MediaQueryList => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }))
  const scrollTo = vi.fn()

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: animate,
    writable: true,
  })
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    value: requestAnimationFrame,
    writable: true,
  })
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    value: cancelAnimationFrame,
    writable: true,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
    writable: true,
  })
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: scrollTo,
    writable: true,
  })

  return {
    animate,
    animations,
    flushFrame() {
      frameTime += 16
      const callbacks = [...frames.values()]
      frames.clear()

      for (const callback of callbacks) {
        callback(frameTime)
      }
    },
    get pendingFrames() {
      return frames.size
    },
    matchMedia,
    restore() {
      frames.clear()
      restoreProperty(Element.prototype, 'animate', animateDescriptor)
      restoreProperty(window, 'requestAnimationFrame', rafDescriptor)
      restoreProperty(window, 'cancelAnimationFrame', cancelRafDescriptor)
      restoreProperty(window, 'matchMedia', matchMediaDescriptor)
      restoreProperty(window, 'scrollTo', scrollToDescriptor)
    },
    scrollTo,
  }
}
