import { safelyWaitForAnimation } from '../core/index.js'
import type { AnimationPhaseDefinition } from '../core/index.js'

type StyleOwnership = {
  element: HTMLElement
  name: string
  originalPriority: string
  originalValue: string
  ownedPriority: string
  ownedValue: string
}

type ViewportGeometry = {
  height: number
  transformOrigin: string
  width: number
}

export type ViewportSnapshot = {
  element: HTMLElement
  cleanup: () => void
}

export type ViewportBackground = {
  element: HTMLElement | null
  cleanup: () => void
}

type PageAnimationPauseState = {
  count: number
  originalAttribute: string | null
  ownedValue: string
  style: HTMLStyleElement
}

const PAGE_ANIMATION_PAUSE_ATTRIBUTE =
  'data-routeveil-page-animations-paused'
const pageAnimationPauseStates = new WeakMap<Document, PageAnimationPauseState>()
let pageAnimationPauseId = 0

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function getViewportGeometry(element: HTMLElement): ViewportGeometry | null {
  const ownerWindow = element.ownerDocument.defaultView

  if (!ownerWindow) {
    return null
  }

  const viewport = ownerWindow.visualViewport
  const viewportLeft = viewport?.offsetLeft ?? 0
  const viewportTop = viewport?.offsetTop ?? 0
  const viewportWidth = viewport?.width
    ?? ownerWindow.innerWidth
    ?? element.ownerDocument.documentElement.clientWidth
  const viewportHeight = viewport?.height
    ?? ownerWindow.innerHeight
    ?? element.ownerDocument.documentElement.clientHeight
  const rect = element.getBoundingClientRect()

  if (
    !Number.isFinite(rect.width)
    || !Number.isFinite(rect.height)
    || !Number.isFinite(viewportWidth)
    || !Number.isFinite(viewportHeight)
    || rect.width <= 0
    || rect.height <= 0
    || viewportWidth <= 0
    || viewportHeight <= 0
  ) {
    return null
  }

  const visibleLeft = clamp(viewportLeft - rect.left, 0, rect.width)
  const visibleTop = clamp(viewportTop - rect.top, 0, rect.height)
  const visibleRight = clamp(
    viewportLeft + viewportWidth - rect.left,
    0,
    rect.width,
  )
  const visibleBottom = clamp(
    viewportTop + viewportHeight - rect.top,
    0,
    rect.height,
  )
  const width = visibleRight - visibleLeft
  const height = visibleBottom - visibleTop

  if (width <= 0 || height <= 0) {
    return null
  }

  return {
    height,
    transformOrigin: `${String(visibleLeft + width / 2)}px ${String(
      visibleTop + height / 2,
    )}px`,
    width,
  }
}

function isZeroInset(value: string): boolean {
  return value === '0px' || value === '0'
}

function isViewportBackgroundCandidate(
  element: HTMLElement,
  ownerWindow: Window,
): boolean {
  const style = ownerWindow.getComputedStyle(element)

  return style.position === 'fixed'
    && style.pointerEvents === 'none'
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && isZeroInset(style.top)
    && isZeroInset(style.right)
    && isZeroInset(style.bottom)
    && isZeroInset(style.left)
}

function ownStyle(
  ownerships: StyleOwnership[],
  element: HTMLElement,
  name: string,
  value: string,
  priority = 'important',
): void {
  if (ownerships.some((ownership) => (
    ownership.element === element && ownership.name === name
  ))) {
    return
  }

  const style = element.style
  const ownership: StyleOwnership = {
    element,
    name,
    originalPriority: style.getPropertyPriority(name),
    originalValue: style.getPropertyValue(name),
    ownedPriority: priority,
    ownedValue: value,
  }

  style.setProperty(name, value, priority)
  ownerships.push(ownership)
}

function restoreOwnedStyles(ownerships: StyleOwnership[]): void {
  for (let index = ownerships.length - 1; index >= 0; index -= 1) {
    const ownership = ownerships[index]!
    const style = ownership.element.style

    if (
      style.getPropertyValue(ownership.name) !== ownership.ownedValue
      || style.getPropertyPriority(ownership.name)
        !== ownership.ownedPriority
    ) {
      continue
    }

    if (ownership.originalValue) {
      style.setProperty(
        ownership.name,
        ownership.originalValue,
        ownership.originalPriority,
      )
    } else {
      style.removeProperty(ownership.name)
    }
  }

  ownerships.length = 0
}

function copyCanvasFrames(source: HTMLElement, clone: HTMLElement): void {
  const sourceCanvases = source.matches('canvas')
    ? [source as HTMLCanvasElement]
    : [...source.querySelectorAll<HTMLCanvasElement>('canvas')]
  const cloneCanvases = clone.matches('canvas')
    ? [clone as HTMLCanvasElement]
    : [...clone.querySelectorAll<HTMLCanvasElement>('canvas')]

  for (let index = 0; index < sourceCanvases.length; index += 1) {
    const sourceCanvas = sourceCanvases[index]
    const cloneCanvas = cloneCanvases[index]

    if (!sourceCanvas || !cloneCanvas) {
      continue
    }

    cloneCanvas.width = sourceCanvas.width
    cloneCanvas.height = sourceCanvas.height

    try {
      cloneCanvas.getContext('2d')?.drawImage(sourceCanvas, 0, 0)
    } catch {
      continue
    }
  }
}

function copyControlState(source: HTMLElement, clone: HTMLElement): void {
  const sourceElements = [source, ...source.querySelectorAll<HTMLElement>('*')]
  const cloneElements = [clone, ...clone.querySelectorAll<HTMLElement>('*')]

  for (let index = 0; index < sourceElements.length; index += 1) {
    const sourceElement = sourceElements[index]
    const cloneElement = cloneElements[index]

    if (!sourceElement || !cloneElement) {
      continue
    }

    if (
      sourceElement instanceof HTMLInputElement
      && cloneElement instanceof HTMLInputElement
    ) {
      cloneElement.value = sourceElement.value
      cloneElement.checked = sourceElement.checked
      cloneElement.indeterminate = sourceElement.indeterminate
      continue
    }

    if (
      sourceElement instanceof HTMLTextAreaElement
      && cloneElement instanceof HTMLTextAreaElement
    ) {
      cloneElement.value = sourceElement.value
      cloneElement.textContent = sourceElement.value
      continue
    }

    if (
      sourceElement instanceof HTMLSelectElement
      && cloneElement instanceof HTMLSelectElement
    ) {
      cloneElement.value = sourceElement.value
      continue
    }

    if (
      sourceElement instanceof HTMLVideoElement
      && cloneElement instanceof HTMLVideoElement
    ) {
      cloneElement.muted = true
      cloneElement.defaultMuted = true
      cloneElement.autoplay = false

      try {
        cloneElement.currentTime = sourceElement.currentTime
      } catch {
        continue
      }
    }
  }
}

function copyCustomProperties(
  source: HTMLElement,
  target: HTMLElement,
  ownerWindow: Window,
): void {
  const style = ownerWindow.getComputedStyle(source)

  for (let index = 0; index < style.length; index += 1) {
    const property = style.item(index)

    if (property.startsWith('--')) {
      target.style.setProperty(property, style.getPropertyValue(property))
    }
  }
}

function neutralizeSnapshot(clone: HTMLElement): void {
  clone.setAttribute('aria-hidden', 'true')
  clone.inert = true
  clone.removeAttribute('aria-busy')

  for (const element of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
    element.removeAttribute('autofocus')
    element.style.setProperty('pointer-events', 'none', 'important')
    element.style.setProperty('user-select', 'none', 'important')
    element.style.setProperty('caret-color', 'transparent', 'important')

    if (element instanceof HTMLVideoElement) {
      element.muted = true
      element.defaultMuted = true
      element.autoplay = false
      element.removeAttribute('autoplay')
    }
  }
}

const ANIMATION_METADATA_PROPERTIES = new Set([
  'composite',
  'computedOffset',
  'easing',
  'offset',
])

function toCssPropertyName(property: string): string {
  if (property.startsWith('--') || property.includes('-')) {
    return property
  }

  return property.replace(/[A-Z]/gu, (match) => `-${match.toLowerCase()}`)
}

function freezeSnapshotAnimations(
  source: HTMLElement,
  clone: HTMLElement,
): void {
  const ownerWindow = source.ownerDocument.defaultView

  if (!ownerWindow) {
    return
  }

  const sourceElements = [source, ...source.querySelectorAll<HTMLElement>('*')]
  const cloneElements = [clone, ...clone.querySelectorAll<HTMLElement>('*')]
  const count = Math.min(sourceElements.length, cloneElements.length)

  for (let index = 0; index < count; index += 1) {
    const sourceElement = sourceElements[index]
    const cloneElement = cloneElements[index]

    if (!sourceElement || !cloneElement) {
      continue
    }

    let cloneAnimations: Animation[]

    try {
      cloneAnimations = cloneElement.getAnimations()
    } catch {
      cloneAnimations = []
    }

    if (cloneAnimations.length > 0) {
      const sourceStyle = ownerWindow.getComputedStyle(sourceElement)
      const animatedProperties = new Set<string>()

      for (const animation of cloneAnimations) {
        const effect = animation.effect

        if (
          effect
          && 'getKeyframes' in effect
          && typeof effect.getKeyframes === 'function'
        ) {
          try {
            for (const keyframe of effect.getKeyframes()) {
              for (const property of Object.keys(keyframe)) {
                if (!ANIMATION_METADATA_PROPERTIES.has(property)) {
                  animatedProperties.add(toCssPropertyName(property))
                }
              }
            }
          } catch {
            continue
          }
        }
      }

      for (const property of animatedProperties) {
        const value = sourceStyle.getPropertyValue(property)

        if (value) {
          cloneElement.style.setProperty(property, value, 'important')
        }
      }
    }

    for (const animation of cloneAnimations) {
      try {
        animation.cancel()
      } catch {
        continue
      }
    }

    cloneElement.style.setProperty('animation', 'none', 'important')
    cloneElement.style.setProperty('transition', 'none', 'important')
  }
}

export function pausePageViewAnimations(
  document: Document,
): () => void {
  const existing = pageAnimationPauseStates.get(document)

  if (existing) {
    existing.count += 1
    let released = false

    return () => {
      if (released) {
        return
      }

      released = true
      existing.count -= 1

      if (existing.count > 0) {
        return
      }

      const root = document.documentElement

      if (
        root.getAttribute(PAGE_ANIMATION_PAUSE_ATTRIBUTE)
          === existing.ownedValue
      ) {
        if (existing.originalAttribute === null) {
          root.removeAttribute(PAGE_ANIMATION_PAUSE_ATTRIBUTE)
        } else {
          root.setAttribute(
            PAGE_ANIMATION_PAUSE_ATTRIBUTE,
            existing.originalAttribute,
          )
        }
      }

      existing.style.remove()
      pageAnimationPauseStates.delete(document)
    }
  }

  const root = document.documentElement
  const host = document.head ?? root
  const ownedValue = String(++pageAnimationPauseId)
  const style = document.createElement('style')
  const state: PageAnimationPauseState = {
    count: 1,
    originalAttribute: root.getAttribute(PAGE_ANIMATION_PAUSE_ATTRIBUTE),
    ownedValue,
    style,
  }

  style.setAttribute('data-routeveil-page-animation-pause', '')
  style.textContent = [
    `:root[${PAGE_ANIMATION_PAUSE_ATTRIBUTE}="${ownedValue}"] [data-routeveil-view],`,
    `:root[${PAGE_ANIMATION_PAUSE_ATTRIBUTE}="${ownedValue}"] [data-routeveil-view] *,`,
    `:root[${PAGE_ANIMATION_PAUSE_ATTRIBUTE}="${ownedValue}"] [data-routeveil-view]::before,`,
    `:root[${PAGE_ANIMATION_PAUSE_ATTRIBUTE}="${ownedValue}"] [data-routeveil-view]::after,`,
    `:root[${PAGE_ANIMATION_PAUSE_ATTRIBUTE}="${ownedValue}"] [data-routeveil-view] *::before,`,
    `:root[${PAGE_ANIMATION_PAUSE_ATTRIBUTE}="${ownedValue}"] [data-routeveil-view] *::after {`,
    '  animation-play-state: paused !important;',
    '}',
  ].join('\n')

  try {
    host.append(style)
    root.setAttribute(PAGE_ANIMATION_PAUSE_ATTRIBUTE, ownedValue)
  } catch {
    style.remove()
    return () => undefined
  }

  pageAnimationPauseStates.set(document, state)
  let released = false

  return () => {
    if (released) {
      return
    }

    released = true
    state.count -= 1

    if (state.count > 0) {
      return
    }

    if (
      root.getAttribute(PAGE_ANIMATION_PAUSE_ATTRIBUTE)
        === state.ownedValue
    ) {
      if (state.originalAttribute === null) {
        root.removeAttribute(PAGE_ANIMATION_PAUSE_ATTRIBUTE)
      } else {
        root.setAttribute(
          PAGE_ANIMATION_PAUSE_ATTRIBUTE,
          state.originalAttribute,
        )
      }
    }

    state.style.remove()
    pageAnimationPauseStates.delete(document)
  }
}

export function suppressPageView(view: HTMLElement): () => void {
  const ownerships: StyleOwnership[] = []

  ownStyle(ownerships, view, 'visibility', 'hidden')

  let released = false

  return () => {
    if (released) {
      return
    }

    released = true
    restoreOwnedStyles(ownerships)
  }
}

export function containViewportElementOverflow(
  element: HTMLElement,
): () => void {
  const parent = element.parentElement

  if (!parent || !element.isConnected) {
    return () => undefined
  }

  const ownerships: StyleOwnership[] = []

  ownStyle(ownerships, parent, 'overflow-y', 'clip')

  let released = false

  return () => {
    if (released) {
      return
    }

    released = true
    restoreOwnedStyles(ownerships)
  }
}

export function createViewportSnapshot(
  view: HTMLElement,
): ViewportSnapshot | null {
  const document = view.ownerDocument
  const ownerWindow = document.defaultView
  const parent = view.parentElement ?? document.body

  if (!ownerWindow || !parent) {
    return null
  }

  let rect: DOMRect

  try {
    rect = view.getBoundingClientRect()
  } catch {
    return null
  }

  if (
    !Number.isFinite(rect.left)
    || !Number.isFinite(rect.top)
    || !Number.isFinite(rect.width)
    || !Number.isFinite(rect.height)
    || rect.width <= 0
    || rect.height <= 0
  ) {
    return null
  }

  let clone: HTMLElement

  try {
    clone = view.cloneNode(true) as HTMLElement
  } catch {
    return null
  }

  const surface = document.createElement('routeveil-page-snapshot')
  const viewZIndex = Number.parseInt(
    ownerWindow.getComputedStyle(view).zIndex,
    10,
  )

  surface.setAttribute('aria-hidden', 'true')
  surface.inert = true
  surface.style.setProperty('position', 'fixed', 'important')
  surface.style.setProperty('inset', '0', 'important')
  surface.style.setProperty('display', 'block', 'important')
  surface.style.setProperty('width', '100vw', 'important')
  surface.style.setProperty('height', '100vh', 'important')
  surface.style.setProperty('margin', '0', 'important')
  surface.style.setProperty('padding', '0', 'important')
  surface.style.setProperty('border', '0', 'important')
  surface.style.setProperty('overflow', 'hidden', 'important')
  surface.style.setProperty('background', 'transparent', 'important')
  surface.style.setProperty('visibility', 'visible', 'important')
  surface.style.setProperty('pointer-events', 'none', 'important')
  surface.style.setProperty('isolation', 'isolate', 'important')
  surface.style.setProperty('contain', 'layout style paint', 'important')
  surface.style.setProperty('transform-origin', 'center center', 'important')
  surface.style.setProperty('backface-visibility', 'hidden', 'important')
  surface.style.setProperty(
    'z-index',
    String(Number.isFinite(viewZIndex) ? viewZIndex : 0),
    'important',
  )

  copyCustomProperties(view, surface, ownerWindow)
  copyCustomProperties(view, clone, ownerWindow)
  copyCanvasFrames(view, clone)
  copyControlState(view, clone)
  neutralizeSnapshot(clone)

  clone.style.setProperty('position', 'absolute', 'important')
  clone.style.setProperty('left', `${String(rect.left)}px`, 'important')
  clone.style.setProperty('top', `${String(rect.top)}px`, 'important')
  clone.style.setProperty('width', `${String(rect.width)}px`, 'important')
  clone.style.setProperty('height', `${String(rect.height)}px`, 'important')
  clone.style.setProperty('min-width', '0', 'important')
  clone.style.setProperty('max-width', 'none', 'important')
  clone.style.setProperty('min-height', '0', 'important')
  clone.style.setProperty('max-height', 'none', 'important')
  clone.style.setProperty('margin', '0', 'important')
  clone.style.setProperty('visibility', 'visible', 'important')
  clone.style.setProperty('transform', 'none', 'important')
  clone.style.setProperty('transform-origin', 'center center', 'important')
  clone.style.setProperty('clip-path', 'none', 'important')

  surface.append(clone)

  try {
    parent.insertBefore(surface, view.nextSibling)
  } catch {
    surface.remove()
    return null
  }

  freezeSnapshotAnimations(view, clone)

  let cleaned = false

  return {
    element: surface,
    cleanup: () => {
      if (cleaned) {
        return
      }

      cleaned = true

      for (const animation of surface.getAnimations({ subtree: true })) {
        try {
          animation.cancel()
        } catch {
          continue
        }
      }

      surface.remove()
      surface.replaceChildren()
    },
  }
}

function readWithSuppressedViewVisible<T>(
  view: HTMLElement,
  read: () => T,
): T {
  const style = view.style
  const visibility = style.getPropertyValue('visibility')
  const priority = style.getPropertyPriority('visibility')
  const ownsSuppression = visibility.trim() === 'hidden'
    && priority === 'important'

  if (!ownsSuppression) {
    return read()
  }

  style.removeProperty('visibility')

  try {
    return read()
  } finally {
    style.setProperty('visibility', visibility, priority)
  }
}

export function retainViewportBackground(
  view: HTMLElement,
  phase?: AnimationPhaseDefinition,
): ViewportBackground {
  const document = view.ownerDocument
  const ownerWindow = document.defaultView
  const parent = document.body

  if (!ownerWindow || !parent) {
    return {
      element: null,
      cleanup: () => undefined,
    }
  }

  const candidates = readWithSuppressedViewVisible(view, () => (
    [...view.querySelectorAll<HTMLElement>('*')].filter((element) => (
      isViewportBackgroundCandidate(element, ownerWindow)
    ))
  ))

  if (candidates.length === 0) {
    return {
      element: null,
      cleanup: () => undefined,
    }
  }

  const ownerships: StyleOwnership[] = []
  const viewZIndex = Number.parseInt(
    ownerWindow.getComputedStyle(view).zIndex,
    10,
  )
  const surface = document.createElement('div')

  surface.setAttribute('aria-hidden', 'true')
  surface.setAttribute('data-routeveil-viewport-background', '')
  surface.style.setProperty('position', 'fixed', 'important')
  surface.style.setProperty('inset', '0', 'important')
  surface.style.setProperty('display', 'block', 'important')
  surface.style.setProperty('width', '100vw', 'important')
  surface.style.setProperty('height', '100vh', 'important')
  surface.style.setProperty('margin', '0', 'important')
  surface.style.setProperty('overflow', 'hidden', 'important')
  surface.style.setProperty('pointer-events', 'none', 'important')
  surface.style.setProperty(
    'z-index',
    String(Number.isFinite(viewZIndex) ? viewZIndex - 1 : 0),
    'important',
  )

  const initialOpacity = phase?.keyframes[0]?.opacity

  if (
    typeof initialOpacity === 'number'
    || typeof initialOpacity === 'string'
  ) {
    surface.style.setProperty(
      'opacity',
      String(initialOpacity),
    )
  }

  for (const candidate of candidates) {
    const clone = candidate.cloneNode(true) as HTMLElement

    copyCanvasFrames(candidate, clone)
    copyCustomProperties(candidate, clone, ownerWindow)
    clone.setAttribute('aria-hidden', 'true')
    clone.style.setProperty('position', 'absolute', 'important')
    clone.style.setProperty('inset', '0', 'important')
    clone.style.setProperty('display', 'block', 'important')
    clone.style.setProperty('width', '100%', 'important')
    clone.style.setProperty('height', '100%', 'important')
    clone.style.setProperty('margin', '0', 'important')
    clone.style.setProperty('pointer-events', 'none', 'important')
    clone.style.setProperty('visibility', 'visible', 'important')
    surface.append(clone)
    ownStyle(ownerships, candidate, 'visibility', 'hidden')
  }

  try {
    parent.append(surface)
  } catch {
    restoreOwnedStyles(ownerships)
    return {
      element: null,
      cleanup: () => undefined,
    }
  }

  let released = false

  return {
    element: surface,
    cleanup: () => {
      if (released) {
        return
      }

      released = true
      restoreOwnedStyles(ownerships)
      surface.remove()
    },
  }
}

function createOpacityKeyframes(
  phase: AnimationPhaseDefinition,
): Keyframe[] | null {
  const hasOpacity = phase.keyframes.some((keyframe) => (
    keyframe.opacity !== undefined
  ))

  if (!hasOpacity) {
    return null
  }

  return phase.keyframes.map((keyframe) => {
    const opacityKeyframe: Keyframe = {}

    for (const property of [
      'composite',
      'easing',
      'offset',
      'opacity',
    ] as const) {
      const value = keyframe[property]

      if (value !== undefined) {
        opacityKeyframe[property] = value as never
      }
    }

    return opacityKeyframe
  })
}

export async function animateViewportBackgroundPhase(
  background: ViewportBackground,
  phase: AnimationPhaseDefinition,
  onAnimation?: (animation: Animation) => void,
): Promise<Animation | null> {
  const element = background.element
  const keyframes = createOpacityKeyframes(phase)

  if (!element || !keyframes || typeof element.animate !== 'function') {
    return null
  }

  let animation: Animation

  try {
    animation = element.animate(keyframes, phase.options)
  } catch {
    return null
  }

  onAnimation?.(animation)
  await safelyWaitForAnimation(animation)
  return animation
}

function createTransformProbe(
  element: HTMLElement,
  geometry: ViewportGeometry,
): HTMLElement | null {
  const document = element.ownerDocument
  const ownerWindow = document.defaultView
  const parent = document.body ?? document.documentElement

  if (!ownerWindow || !parent) {
    return null
  }

  const probe = document.createElement('div')
  const sourceStyle = ownerWindow.getComputedStyle(element)

  probe.style.setProperty('position', 'fixed', 'important')
  probe.style.setProperty('inset', '0 auto auto 0', 'important')
  probe.style.setProperty('display', 'block', 'important')
  probe.style.setProperty('box-sizing', 'border-box', 'important')
  probe.style.setProperty('width', `${String(geometry.width)}px`, 'important')
  probe.style.setProperty('height', `${String(geometry.height)}px`, 'important')
  probe.style.setProperty('margin', '0', 'important')
  probe.style.setProperty('border', '0', 'important')
  probe.style.setProperty('padding', '0', 'important')
  probe.style.setProperty('visibility', 'hidden', 'important')
  probe.style.setProperty('pointer-events', 'none', 'important')
  probe.style.setProperty('transform-box', sourceStyle.transformBox, 'important')

  for (let index = 0; index < sourceStyle.length; index += 1) {
    const property = sourceStyle.item(index)

    if (property.startsWith('--')) {
      probe.style.setProperty(property, sourceStyle.getPropertyValue(property))
    }
  }

  try {
    parent.append(probe)
  } catch {
    return null
  }

  return probe
}

function resolveViewportKeyframes(
  element: HTMLElement,
  phase: AnimationPhaseDefinition,
  geometry: ViewportGeometry,
): Keyframe[] {
  const ownerWindow = element.ownerDocument.defaultView
  const probe = createTransformProbe(element, geometry)

  try {
    return phase.keyframes.map((keyframe) => {
      const resolved: Keyframe = {
        ...keyframe,
        transformOrigin: geometry.transformOrigin,
      }
      const transform = keyframe.transform

      if (
        probe
        && ownerWindow
        && typeof transform === 'string'
        && transform.trim()
        && transform !== 'none'
      ) {
        probe.style.setProperty('transform', transform, 'important')
        const computedTransform = ownerWindow
          .getComputedStyle(probe)
          .getPropertyValue('transform')
          .trim()

        if (computedTransform && computedTransform !== 'none') {
          resolved.transform = computedTransform
        }
      }

      return resolved
    })
  } finally {
    probe?.remove()
  }
}

export async function animateViewportElementPhase(
  element: HTMLElement,
  phase: AnimationPhaseDefinition,
  onAnimation?: (animation: Animation) => void,
): Promise<Animation | null> {
  if (typeof element.animate !== 'function') {
    return null
  }

  const geometry = getViewportGeometry(element)
  const keyframes = geometry
    ? resolveViewportKeyframes(element, phase, geometry)
    : phase.keyframes
  let animation: Animation

  try {
    animation = element.animate(keyframes, phase.options)
  } catch {
    return null
  }

  onAnimation?.(animation)
  await safelyWaitForAnimation(animation)
  return animation
}

export async function animateViewportSnapshotPhase(
  snapshot: ViewportSnapshot,
  phase: AnimationPhaseDefinition,
  onAnimation?: (animation: Animation) => void,
): Promise<Animation | null> {
  const element = snapshot.element

  if (typeof element.animate !== 'function') {
    return null
  }

  let animation: Animation

  try {
    animation = element.animate(phase.keyframes, phase.options)
  } catch {
    return null
  }

  onAnimation?.(animation)
  await safelyWaitForAnimation(animation)
  return animation
}