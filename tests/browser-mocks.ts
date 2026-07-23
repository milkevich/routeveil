import { vi } from 'vitest'

export type ControlledAnimation = {
  animation: Animation
  element: Element
  fail: (error?: unknown) => void
  finish: () => void
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null
  options?: number | KeyframeAnimationOptions
  readonly status: 'cancelled' | 'finished' | 'rejected' | 'running'
}

type BrowserMocksOptions = {
  reducedMotion?: boolean
  settleAnimationOnCancel?: boolean
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
  settleAnimationOnCancel = false,
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
  const getAnimationsDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'getAnimations',
  )
  const focusDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'focus',
  )
  const inertDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'inert',
  )

  const animations: ControlledAnimation[] = []
  const activeAnimations = new Set<Animation>()
  const animationsByElement = new WeakMap<Element, Set<Animation>>()
  const inertValues = new WeakMap<HTMLElement, boolean>()
  const frames = new Map<number, FrameRequestCallback>()
  let motionReduced = reducedMotion
  let frameId = 0
  let frameTime = 0

  const removeAnimation = (element: Element, animation: Animation) => {
    activeAnimations.delete(animation)
    animationsByElement.get(element)?.delete(animation)
  }

  const animate = vi.fn(function animate(
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ): Animation {
    let resolveFinished!: () => void
    let rejectFinished!: (error: unknown) => void
    let settled = false
    let status: ControlledAnimation['status'] = 'running'
    const finishedPromise = new Promise<void>((resolve, reject) => {
      resolveFinished = resolve
      rejectFinished = reject
    })
    const controlled = {} as ControlledAnimation
    const cancel = vi.fn(() => {
      if (status === 'running') {
        status = 'cancelled'
        removeAnimation(this, animation)
      }

      if (settleAnimationOnCancel && !settled) {
        settled = true
        rejectFinished(new DOMException('Animation cancelled', 'AbortError'))
      }
    })
    const animation = {
      cancel,
      finished: finishedPromise,
      finish: vi.fn(() => controlled.finish()),
    } as unknown as Animation

    Object.assign(controlled, {
      animation,
      element: this,
      fail: (error = new Error('Animation failed')) => {
        if (!settled) {
          settled = true
          status = 'rejected'
          removeAnimation(this, animation)
          rejectFinished(error)
        }
      },
      finish: () => {
        if (!settled) {
          settled = true
          status = 'finished'
          removeAnimation(this, animation)
          resolveFinished()
        }
      },
      keyframes,
      options,
    })
    Object.defineProperty(controlled, 'status', {
      enumerable: true,
      get: () => status,
    })

    animations.push(controlled)
    activeAnimations.add(animation)
    const elementAnimations = animationsByElement.get(this) ?? new Set()
    elementAnimations.add(animation)
    animationsByElement.set(this, elementAnimations)

    return animation
  })

  const getAnimations = vi.fn(function getAnimations(this: Element) {
    return [...(animationsByElement.get(this) ?? [])]
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
    matches: motionReduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }))
  const scrollTo = vi.fn()
  const originalFocus = HTMLElement.prototype.focus
  const focus = vi.fn(function focus(
    this: HTMLElement,
    options?: FocusOptions,
  ) {
    originalFocus.call(this, options)
  })

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
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: getAnimations,
    writable: true,
  })
  Object.defineProperty(HTMLElement.prototype, 'focus', {
    configurable: true,
    value: focus,
    writable: true,
  })
  if (!inertDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'inert', {
      configurable: true,
      get(this: HTMLElement) {
        return inertValues.get(this) ?? false
      },
      set(this: HTMLElement, value: boolean) {
        inertValues.set(this, Boolean(value))
      },
    })
  }

  return {
    animate,
    animations,
    focus,
    flushFrame() {
      frameTime += 16
      const callbacks = [...frames.values()]
      frames.clear()

      for (const callback of callbacks) {
        callback(frameTime)
      }
    },
    flushFrames(count: number) {
      for (let index = 0; index < count; index += 1) {
        this.flushFrame()
      }
    },
    get activeAnimations() {
      return [...activeAnimations]
    },
    get pendingFrames() {
      return frames.size
    },
    getAnimations,
    matchMedia,
    restore() {
      frames.clear()
      activeAnimations.clear()
      restoreProperty(Element.prototype, 'animate', animateDescriptor)
      restoreProperty(
        Element.prototype,
        'getAnimations',
        getAnimationsDescriptor,
      )
      restoreProperty(HTMLElement.prototype, 'focus', focusDescriptor)
      restoreProperty(HTMLElement.prototype, 'inert', inertDescriptor)
      restoreProperty(window, 'requestAnimationFrame', rafDescriptor)
      restoreProperty(window, 'cancelAnimationFrame', cancelRafDescriptor)
      restoreProperty(window, 'matchMedia', matchMediaDescriptor)
      restoreProperty(window, 'scrollTo', scrollToDescriptor)
    },
    scrollTo,
    setReducedMotion(reduced: boolean) {
      motionReduced = reduced
    },
  }
}
