import {
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  cancelAnimation,
  cancelAnimations,
  safelyWaitForAnimation,
} from '../core/index.js'
import type { AnimationPhaseDefinition } from '../core/index.js'

const BETWEEN_FADE_DURATION_MS = 180
const BETWEEN_VIEWPORT_Z_INDEX = 2_147_483_647
const BLOCKED_INTERACTION_EVENTS = [
  'click',
  'contextmenu',
  'dblclick',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'dragstart',
  'drop',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'pointercancel',
  'pointerdown',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerup',
  'touchcancel',
  'touchend',
  'touchmove',
  'touchstart',
  'wheel',
] as const

export type BetweenLayerScope =
  | {
    preserveViewLayout: boolean
    type: 'page'
    view: HTMLElement
  }
  | {
    type: 'overlay'
    root: HTMLElement
  }

export type BetweenLayerHandle = {
  capture: (host: HTMLElement) => void
  element: HTMLElement
  appear: (onAnimation: (animation: Animation) => void) => Promise<void>
  disappear: (onAnimation: (animation: Animation) => void) => Promise<void>
  freeze: () => void
  refresh: (
    host: HTMLElement,
    onAnimation: (animation: Animation) => void,
  ) => Promise<void>
  reset: () => void
  show: (
    host: HTMLElement | null,
    onAnimation: (animation: Animation) => void,
  ) => Promise<void>
  updateScope: (scope: BetweenLayerScope) => boolean
}

type RouteveilBetweenLayerProps = {
  appearancePhase: AnimationPhaseDefinition | null
  disappearancePhase: AnimationPhaseDefinition | null
  fallback: ReactNode
  hasFallback: boolean
  id: number
  reducedMotion: boolean
  registerHandle: (id: number, handle: BetweenLayerHandle | null) => void
  scope: BetweenLayerScope
}

function styleContentHost(host: HTMLElement): void {
  for (const property of [
    'position',
    'inset',
    'top',
    'right',
    'bottom',
    'left',
    'width',
    'height',
    'place-items',
  ]) {
    host.style.removeProperty(property)
  }

  host.style.setProperty('display', 'block', 'important')
  host.style.setProperty('margin', '0', 'important')
  host.style.setProperty('padding', '0', 'important')
  host.style.setProperty('border', '0', 'important')
  host.style.setProperty('contain', 'none', 'important')
  host.style.setProperty('filter', 'none')
  host.style.setProperty('isolation', 'auto', 'important')
  host.style.setProperty('max-width', '100%', 'important')
  host.style.setProperty('pointer-events', 'none', 'important')
  host.style.setProperty('transform', 'none')
}

function styleContentSnapshot(host: HTMLElement): void {
  styleContentHost(host)
  host.style.setProperty('position', 'absolute', 'important')
  host.style.setProperty('top', '0', 'important')
  host.style.setProperty('left', '0', 'important')
  host.style.setProperty('width', '100%', 'important')
}

function cloneContentHost(host: HTMLElement): HTMLElement {
  const clone = host.cloneNode(true) as HTMLElement
  const sourceElements = [host, ...host.querySelectorAll<HTMLElement>('*')]
  const cloneElements = [clone, ...clone.querySelectorAll<HTMLElement>('*')]

  for (let index = 0; index < sourceElements.length; index += 1) {
    const source = sourceElements[index]
    const target = cloneElements[index]

    if (!source || !target) {
      continue
    }

    target.scrollLeft = source.scrollLeft
    target.scrollTop = source.scrollTop

    if (
      source instanceof HTMLInputElement
      && target instanceof HTMLInputElement
    ) {
      target.checked = source.checked
      target.indeterminate = source.indeterminate
      target.value = source.value
    } else if (
      source instanceof HTMLTextAreaElement
      && target instanceof HTMLTextAreaElement
    ) {
      target.value = source.value
    } else if (
      source instanceof HTMLSelectElement
      && target instanceof HTMLSelectElement
    ) {
      target.selectedIndex = source.selectedIndex
    } else if (
      source instanceof HTMLDetailsElement
      && target instanceof HTMLDetailsElement
    ) {
      target.open = source.open
    } else if (
      source instanceof HTMLCanvasElement
      && target instanceof HTMLCanvasElement
    ) {
      try {
        target.getContext('2d')?.drawImage(source, 0, 0)
      } catch {
        continue
      }
    }
  }

  clone.removeAttribute('data-routeveil-between-fallback')
  clone.removeAttribute('data-routeveil-between-registration')
  clone.setAttribute('data-routeveil-between-previous', '')
  clone.setAttribute('aria-hidden', 'true')
  clone.inert = true
  styleContentSnapshot(clone)
  clone.style.setProperty('opacity', '1')
  return clone
}

function contentHostsMatch(first: HTMLElement, second: HTMLElement): boolean {
  const firstNodes = [...first.childNodes]
  const secondNodes = [...second.childNodes]

  return firstNodes.length === secondNodes.length
    && firstNodes.every((node, index) => node.isEqualNode(secondNodes[index]))
}

function createLayerElements(hasFallback: boolean, id: number): {
  fallbackHost: HTMLElement | null
  motionHost: HTMLElement | null
  root: HTMLElement | null
} {
  if (typeof document === 'undefined') {
    return { fallbackHost: null, motionHost: null, root: null }
  }

  const root = document.createElement('div')
  root.setAttribute('data-routeveil-between-root', '')
  root.setAttribute('data-routeveil-between-id', String(id))
  root.style.setProperty('display', 'block', 'important')
  root.style.setProperty('margin', '0', 'important')
  root.style.setProperty('padding', '0', 'important')
  root.style.setProperty('border', '0', 'important')
  root.style.setProperty('overflow', 'hidden', 'important')
  root.style.setProperty('background', 'transparent', 'important')
  root.style.setProperty('contain', 'none', 'important')
  root.style.setProperty('filter', 'none')
  root.style.setProperty('isolation', 'auto', 'important')
  root.style.setProperty('opacity', '1')
  root.style.setProperty('transform', 'none')
  root.style.setProperty('visibility', 'visible', 'important')
  root.style.setProperty('pointer-events', 'none', 'important')

  const motionHost = document.createElement('div')
  motionHost.setAttribute('data-routeveil-between-motion', '')
  motionHost.style.setProperty('display', 'block', 'important')
  motionHost.style.setProperty('position', 'relative', 'important')
  motionHost.style.setProperty('width', '100%', 'important')
  motionHost.style.setProperty('height', 'fit-content', 'important')
  motionHost.style.setProperty('min-height', '0', 'important')
  motionHost.style.setProperty('margin', '0', 'important')
  motionHost.style.setProperty('padding', '0', 'important')
  motionHost.style.setProperty('border', '0', 'important')
  motionHost.style.setProperty('contain', 'none', 'important')
  motionHost.style.setProperty('filter', 'none')
  motionHost.style.setProperty('isolation', 'auto', 'important')
  motionHost.style.setProperty('opacity', '0')
  motionHost.style.setProperty('transform', 'none')
  motionHost.style.setProperty('pointer-events', 'none', 'important')
  root.append(motionHost)

  if (!hasFallback) {
    return { fallbackHost: null, motionHost, root }
  }

  const fallbackHost = document.createElement('div')
  fallbackHost.setAttribute('data-routeveil-between-fallback', '')
  styleContentHost(fallbackHost)
  fallbackHost.style.setProperty('opacity', '1')
  motionHost.append(fallbackHost)
  return { fallbackHost, motionHost, root }
}

function clearScopeStyles(root: HTMLElement): void {
  for (const property of [
    'inset',
    'left',
    'top',
    'right',
    'bottom',
    'width',
    'height',
    'min-height',
    'max-height',
    'max-width',
    'margin-left',
    'align-self',
    'overscroll-behavior',
    'touch-action',
    'z-index',
  ]) {
    root.style.removeProperty(property)
  }
}

type InlineStyleSnapshot = {
  priority: string
  value: string
}

type OverlayScrollLockEntry = InlineStyleSnapshot & {
  element: HTMLElement
}

type OverlayScrollLock = {
  entries: OverlayScrollLockEntry[]
  preventScroll: (event: Event) => void
  users: number
}

const overlayScrollLocks = new WeakMap<Document, OverlayScrollLock>()

function captureInlineStyle(
  element: HTMLElement,
  property: string,
): InlineStyleSnapshot {
  return {
    priority: element.style.getPropertyPriority(property),
    value: element.style.getPropertyValue(property),
  }
}

function restoreInlineStyle(
  element: HTMLElement,
  property: string,
  snapshot: InlineStyleSnapshot,
): void {
  if (snapshot.value) {
    element.style.setProperty(property, snapshot.value, snapshot.priority)
  } else {
    element.style.removeProperty(property)
  }
}

function restoreOverlayScrollLock(
  document: Document,
  lock: OverlayScrollLock,
): void {
  lock.users -= 1

  if (lock.users > 0) {
    return
  }

  overlayScrollLocks.delete(document)
  document.removeEventListener('touchmove', lock.preventScroll, true)
  document.removeEventListener('wheel', lock.preventScroll, true)

  for (const entry of lock.entries) {
    const style = entry.element.style

    if (
      style.getPropertyValue('overflow') !== 'hidden'
      || style.getPropertyPriority('overflow') !== 'important'
    ) {
      continue
    }

    restoreInlineStyle(entry.element, 'overflow', entry)
  }
}

function retainOverlayScrollLock(document: Document): () => void {
  let lock = overlayScrollLocks.get(document)

  if (lock) {
    lock.users += 1
  } else {
    const entries = [document.documentElement, document.body].map((element) => ({
      ...captureInlineStyle(element, 'overflow'),
      element,
    }))
    const preventScroll = (event: Event) => event.preventDefault()

    for (const entry of entries) {
      entry.element.style.setProperty('overflow', 'hidden', 'important')
    }

    document.addEventListener('touchmove', preventScroll, {
      capture: true,
      passive: false,
    })
    document.addEventListener('wheel', preventScroll, {
      capture: true,
      passive: false,
    })
    lock = { entries, preventScroll, users: 1 }
    overlayScrollLocks.set(document, lock)
  }

  const retainedLock = lock
  let released = false

  return () => {
    if (released) {
      return
    }

    released = true
    restoreOverlayScrollLock(document, retainedLock)
  }
}

const MULTIPLE_BLEND_MODES = Symbol('multiple-blend-modes')

type BetweenBlendMode = string | null | typeof MULTIPLE_BLEND_MODES

function getElementBlendMode(
  ownerWindow: Window,
  element: HTMLElement,
): string {
  const inlineBlendMode = element.style
    .getPropertyValue('mix-blend-mode')
    .trim()

  try {
    return ownerWindow.getComputedStyle(element)
      .getPropertyValue('mix-blend-mode')
      .trim() || inlineBlendMode
  } catch {
    return inlineBlendMode
  }
}

function getBetweenBlendMode(root: HTMLElement): BetweenBlendMode {
  const ownerWindow = root.ownerDocument.defaultView

  if (!ownerWindow) {
    return null
  }

  let blendMode: string | null = null
  const elements = [root, ...root.querySelectorAll<HTMLElement>('*')]

  for (const element of elements) {
    const candidate = getElementBlendMode(ownerWindow, element)

    if (!candidate || candidate === 'normal') {
      continue
    }

    if (blendMode && blendMode !== candidate) {
      return MULTIPLE_BLEND_MODES
    }

    blendMode = candidate
  }

  return blendMode
}

function retainAnimationBlendMode(
  host: HTMLElement,
  blendMode: Exclude<BetweenBlendMode, typeof MULTIPLE_BLEND_MODES>,
): () => void {
  if (!blendMode) {
    return () => undefined
  }

  const snapshot = captureInlineStyle(host, 'mix-blend-mode')
  host.style.setProperty('mix-blend-mode', blendMode, 'important')
  let released = false

  return () => {
    if (released) {
      return
    }

    released = true

    if (
      host.style.getPropertyValue('mix-blend-mode') !== blendMode
      || host.style.getPropertyPriority('mix-blend-mode') !== 'important'
    ) {
      return
    }

    restoreInlineStyle(host, 'mix-blend-mode', snapshot)
  }
}

function scopesMatch(
  first: BetweenLayerScope | null,
  second: BetweenLayerScope,
): boolean {
  if (!first || first.type !== second.type) {
    return false
  }

  if (first.type === 'page' && second.type === 'page') {
    return first.view === second.view
      && first.preserveViewLayout === second.preserveViewLayout
  }

  return first.type === 'overlay'
    && second.type === 'overlay'
    && first.root === second.root
}

function attachLayer(
  root: HTMLElement,
  scope: BetweenLayerScope,
): (() => void) | null {
  if (scope.type === 'overlay') {
    if (!scope.root.isConnected) {
      return null
    }

    const viewportScoped = scope.root === scope.root.ownerDocument.body

    try {
      scope.root.append(root)
    } catch {
      return null
    }

    root.setAttribute('data-routeveil-between-scope', scope.type)
    root.removeAttribute('data-routeveil-between-layout')
    clearScopeStyles(root)
    root.style.setProperty(
      'position',
      viewportScoped ? 'fixed' : 'absolute',
      'important',
    )
    root.style.setProperty('top', '0', 'important')
    root.style.setProperty('left', '0', 'important')
    root.style.setProperty('width', '100%', 'important')
    root.style.setProperty('height', '100%', 'important')
    root.style.setProperty('min-height', '0', 'important')
    root.style.setProperty('max-height', '100%', 'important')
    root.style.setProperty('overscroll-behavior', 'none', 'important')
    root.style.setProperty('touch-action', 'none', 'important')

    if (viewportScoped) {
      root.style.setProperty(
        'z-index',
        String(BETWEEN_VIEWPORT_Z_INDEX),
        'important',
      )
    }

    return retainOverlayScrollLock(scope.root.ownerDocument)
  }

  const view = scope.view
  const parent = view.parentElement
  const ownerWindow = view.ownerDocument.defaultView

  if (!parent || !ownerWindow || !view.isConnected) {
    return null
  }

  const pageWindow = ownerWindow
  const displaySnapshot = scope.preserveViewLayout
    ? null
    : captureInlineStyle(view, 'display')

  try {
    parent.insertBefore(root, view)

    if (!scope.preserveViewLayout) {
      view.style.setProperty('display', 'none', 'important')
    }
  } catch {
    if (displaySnapshot) {
      restoreInlineStyle(view, 'display', displaySnapshot)
    }

    return null
  }

  root.setAttribute('data-routeveil-between-scope', scope.type)
  root.setAttribute(
    'data-routeveil-between-layout',
    scope.preserveViewLayout ? 'preserve' : 'replace',
  )
  clearScopeStyles(root)
  root.style.setProperty('display', 'block', 'important')
  root.style.setProperty('height', 'fit-content', 'important')
  root.style.setProperty('min-height', '0', 'important')
  root.style.setProperty('max-height', 'none', 'important')
  root.style.setProperty('max-width', 'none', 'important')

  if (scope.preserveViewLayout) {
    root.style.setProperty('position', 'fixed', 'important')
    root.style.setProperty('top', '0', 'important')
    root.style.setProperty('left', '0', 'important')
    root.style.setProperty('width', '100vw', 'important')
    return () => undefined
  }

  root.style.setProperty('position', 'relative', 'important')
  root.style.setProperty('width', '100%', 'important')
  root.style.setProperty('align-self', 'start', 'important')

  const documentElement = view.ownerDocument.documentElement
  let released = false
  let syncFrame = 0
  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(() => schedulePageWidthSync())

  function syncPageWidth(): void {
    if (released || !root.isConnected) {
      return
    }

    root.style.setProperty('width', '100%', 'important')
    root.style.setProperty('max-width', 'none', 'important')
    root.style.setProperty('margin-left', '0', 'important')

    let naturalLeft: number

    try {
      naturalLeft = root.getBoundingClientRect().left
    } catch {
      return
    }

    const viewportWidth = documentElement.clientWidth

    if (
      !Number.isFinite(naturalLeft)
      || !Number.isFinite(viewportWidth)
      || viewportWidth <= 0
    ) {
      return
    }

    root.style.setProperty(
      'width',
      `${String(viewportWidth)}px`,
      'important',
    )
    root.style.setProperty('max-width', 'none', 'important')
    root.style.setProperty(
      'margin-left',
      `${String(-naturalLeft)}px`,
      'important',
    )
  }

  function schedulePageWidthSync(): void {
    if (released || syncFrame) {
      return
    }

    syncFrame = pageWindow.requestAnimationFrame(() => {
      syncFrame = 0
      syncPageWidth()
    })
  }

  syncPageWidth()
  pageWindow.addEventListener('resize', schedulePageWidthSync)
  pageWindow.addEventListener('scroll', schedulePageWidthSync, true)
  pageWindow.visualViewport?.addEventListener(
    'resize',
    schedulePageWidthSync,
  )
  pageWindow.visualViewport?.addEventListener(
    'scroll',
    schedulePageWidthSync,
  )
  resizeObserver?.observe(parent)
  resizeObserver?.observe(documentElement)

  return () => {
    if (released) {
      return
    }

    released = true
    pageWindow.removeEventListener('resize', schedulePageWidthSync)
    pageWindow.removeEventListener('scroll', schedulePageWidthSync, true)
    pageWindow.visualViewport?.removeEventListener(
      'resize',
      schedulePageWidthSync,
    )
    pageWindow.visualViewport?.removeEventListener(
      'scroll',
      schedulePageWidthSync,
    )
    resizeObserver?.disconnect()

    if (syncFrame) {
      pageWindow.cancelAnimationFrame(syncFrame)
      syncFrame = 0
    }

    if (
      displaySnapshot
      && view.style.getPropertyValue('display') === 'none'
      && view.style.getPropertyPriority('display') === 'important'
    ) {
      restoreInlineStyle(view, 'display', displaySnapshot)
    }
  }
}

function createAnimation(
  element: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  onAnimation: (animation: Animation) => void,
): Animation | null {
  if (typeof element.animate !== 'function') {
    return null
  }

  try {
    const animation = element.animate(keyframes, options)
    onAnimation(animation)
    return animation
  } catch {
    return null
  }
}

function createLayerHandle(
  root: HTMLElement,
  motionHost: HTMLElement,
  fallbackHost: HTMLElement | null,
  reducedMotion: boolean,
  appearancePhase: AnimationPhaseDefinition | null,
  disappearancePhase: AnimationPhaseDefinition | null,
): BetweenLayerHandle {
  let currentHost = fallbackHost
  let currentSnapshot = fallbackHost ? cloneContentHost(fallbackHost) : null
  let contentGeneration = 0
  let contentAnimations = new Set<Animation>()
  const contentAnimationWaiters = new Set<() => void>()
  const previousVisuals = new Set<HTMLElement>()
  const layerAnimations = new Set<Animation>()
  let hostObserver: MutationObserver | null = null
  let interactionHost: HTMLElement | null = null
  let scopeCleanup: () => void = () => undefined
  let currentScope: BetweenLayerScope | null = null
  let snapshotCaptured = false
  let snapshotEpoch = 0
  let reset = false

  const clearPreviousVisuals = () => {
    for (const visual of previousVisuals) {
      visual.remove()
    }

    previousVisuals.clear()
  }

  const replaceContentAnimations = () => {
    cancelAnimations([...contentAnimations])

    for (const settle of contentAnimationWaiters) {
      settle()
    }

    contentAnimations = new Set()
    contentAnimationWaiters.clear()
    clearPreviousVisuals()
  }

  const blockInteraction = (event: Event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  const observeHost = (host: HTMLElement | null) => {
    hostObserver?.disconnect()
    hostObserver = null

    if (interactionHost) {
      for (const eventName of BLOCKED_INTERACTION_EVENTS) {
        interactionHost.removeEventListener(eventName, blockInteraction, true)
      }
    }

    interactionHost = host

    if (!host) {
      return
    }

    for (const eventName of BLOCKED_INTERACTION_EVENTS) {
      host.addEventListener(eventName, blockInteraction, true)
    }

    if (typeof MutationObserver === 'undefined') {
      return
    }

    hostObserver = new MutationObserver(() => {
      const epoch = snapshotEpoch

      queueMicrotask(() => {
        if (
          reset
          || snapshotCaptured
          || epoch !== snapshotEpoch
          || currentHost !== host
        ) {
          return
        }

        currentSnapshot = cloneContentHost(host)
      })
    })
    hostObserver.observe(host, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })
  }

  const finishAnimation = async (
    animation: Animation | null,
    collection: Set<Animation>,
  ) => {
    if (!animation) {
      return
    }

    await safelyWaitForAnimation(animation)
    collection.delete(animation)
  }

  const finishContentAnimation = (animation: Animation | null) => {
    if (!animation) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      let settled = false
      const settle = () => {
        if (settled) {
          return
        }

        settled = true
        contentAnimationWaiters.delete(settle)
        contentAnimations.delete(animation)
        resolve()
      }

      contentAnimationWaiters.add(settle)
      void safelyWaitForAnimation(animation).then(settle)
    })
  }

  const animateContentChange = async (
    host: HTMLElement | null,
    previousHost: HTMLElement | null,
    onAnimation: (animation: Animation) => void,
  ) => {
    contentGeneration += 1
    const generation = contentGeneration
    snapshotEpoch += 1
    replaceContentAnimations()
    const outgoingHost = currentSnapshot
      ?? (previousHost ? cloneContentHost(previousHost) : null)
    currentSnapshot = host ? cloneContentHost(host) : null
    snapshotCaptured = false

    if (host) {
      styleContentHost(host)
      host.style.setProperty('opacity', reducedMotion ? '1' : '0')
      motionHost.append(host)
    }

    if (previousHost !== host) {
      observeHost(host)
    }

    if (
      previousHost === host
      && outgoingHost
      && host
      && contentHostsMatch(outgoingHost, host)
    ) {
      host.style.setProperty('opacity', '1')
      return
    }

    if (!outgoingHost || reducedMotion) {
      if (previousHost && previousHost !== host) {
        previousHost.remove()
        previousHost.style.setProperty('opacity', '0')
      }

      host?.style.setProperty('opacity', '1')
      return
    }

    previousVisuals.add(outgoingHost)

    if (host) {
      styleContentSnapshot(outgoingHost)
    } else {
      styleContentHost(outgoingHost)
    }

    motionHost.insertBefore(outgoingHost, host)

    if (previousHost && previousHost !== host) {
      previousHost.remove()
      previousHost.style.setProperty('opacity', '0')
    }

    const outgoingBlendMode = getBetweenBlendMode(outgoingHost)
    const incomingBlendMode = host ? getBetweenBlendMode(host) : null

    if (
      outgoingBlendMode === MULTIPLE_BLEND_MODES
      || incomingBlendMode === MULTIPLE_BLEND_MODES
    ) {
      outgoingHost.remove()
      previousVisuals.delete(outgoingHost)
      host?.style.setProperty('opacity', '1')
      return
    }

    const releaseOutgoingBlend = retainAnimationBlendMode(
      outgoingHost,
      outgoingBlendMode,
    )
    const releaseIncomingBlend = host
      ? retainAnimationBlendMode(host, incomingBlendMode)
      : () => undefined

    try {
      const outgoing = createAnimation(outgoingHost, [
        { opacity: 1 },
        { opacity: 0 },
      ], {
        duration: BETWEEN_FADE_DURATION_MS,
        easing: 'cubic-bezier(0, 0, 0, 1)',
        fill: 'forwards',
      }, (animation) => {
        contentAnimations.add(animation)
        onAnimation(animation)
      })
      const incoming = host
        ? createAnimation(host, [
          { opacity: 0 },
          { opacity: 1 },
        ], {
          duration: BETWEEN_FADE_DURATION_MS,
          easing: 'ease-out',
          fill: 'forwards',
        }, (animation) => {
          contentAnimations.add(animation)
          onAnimation(animation)
        })
        : null

      await Promise.all([
        finishContentAnimation(outgoing),
        finishContentAnimation(incoming),
      ])

      if (!reset && generation === contentGeneration) {
        outgoingHost.remove()
        previousVisuals.delete(outgoingHost)
        host?.style.setProperty('opacity', '1')
        cancelAnimation(outgoing)
        cancelAnimation(incoming)
      }
    } finally {
      releaseOutgoingBlend()
      releaseIncomingBlend()
    }
  }

  const animateLayer = async (
    phase: AnimationPhaseDefinition | null,
    fallbackKeyframes: Keyframe[],
    fallbackEasing: string,
    finalOpacity: string,
    onAnimation: (animation: Animation) => void,
  ) => {
    if (reducedMotion || reset) {
      motionHost.style.setProperty('opacity', finalOpacity)
      return
    }

    const blendMode = getBetweenBlendMode(motionHost)

    if (blendMode === MULTIPLE_BLEND_MODES) {
      motionHost.style.setProperty('opacity', finalOpacity)
      return
    }

    const releaseBlend = retainAnimationBlendMode(motionHost, blendMode)

    try {
      const initialOpacity = phase
        ? '1'
        : finalOpacity === '1'
          ? '0'
          : '1'

      motionHost.style.setProperty('opacity', initialOpacity)
      const animation = createAnimation(
        motionHost,
        phase?.keyframes ?? fallbackKeyframes,
        phase?.options ?? {
          duration: BETWEEN_FADE_DURATION_MS,
          easing: fallbackEasing,
          fill: 'forwards',
        },
        (created) => {
          layerAnimations.add(created)
          onAnimation(created)
        },
      )
      await finishAnimation(animation, layerAnimations)

      if (!reset) {
        motionHost.style.setProperty('opacity', finalOpacity)
        cancelAnimation(animation)
      }
    } finally {
      releaseBlend()
    }
  }

  const show = async (
    requestedHost: HTMLElement | null,
    onAnimation: (animation: Animation) => void,
  ) => {
    const host = requestedHost ?? fallbackHost

    if (!host && !currentHost) {
      return
    }

    if (reset || currentHost === host) {
      return
    }

    host?.removeAttribute('data-routeveil-between-frozen')
    const previousHost = currentHost
    currentHost = host
    await animateContentChange(host, previousHost, onAnimation)
  }

  observeHost(currentHost)

  return {
    capture: (host) => {
      if (reset || currentHost !== host) {
        return
      }

      snapshotEpoch += 1
      currentSnapshot = cloneContentHost(host)
      snapshotCaptured = true
    },
    element: root,
    appear: (onAnimation) => animateLayer(
      appearancePhase,
      [{ opacity: 0 }, { opacity: 1 }],
      'ease-out',
      '1',
      onAnimation,
    ),
    disappear: (onAnimation) => animateLayer(
      disappearancePhase,
      [{ opacity: 1 }, { opacity: 0 }],
      'ease-in',
      '0',
      onAnimation,
    ),
    freeze: () => {
      if (reset) {
        return
      }

      replaceContentAnimations()
      snapshotEpoch += 1
      snapshotCaptured = true
      hostObserver?.disconnect()
      hostObserver = null

      if (currentHost?.hasChildNodes()) {
        currentSnapshot = null
        currentHost.removeAttribute('data-routeveil-between-previous')
        currentHost.setAttribute('data-routeveil-between-frozen', '')
        styleContentHost(currentHost)
        currentHost.style.setProperty('opacity', '1')
        return
      }

      const visual = currentSnapshot

      currentHost?.remove()
      observeHost(null)
      currentHost = null
      currentSnapshot = null

      if (!visual) {
        return
      }

      visual.removeAttribute('data-routeveil-between-previous')
      visual.setAttribute('data-routeveil-between-frozen', '')
      styleContentHost(visual)
      visual.style.setProperty('opacity', '1')
      motionHost.append(visual)
      currentHost = visual
      observeHost(visual)
    },
    refresh: async (host, onAnimation) => {
      if (reset || currentHost !== host) {
        return
      }

      await animateContentChange(host, host, onAnimation)
    },
    reset: () => {
      if (reset) {
        return
      }

      reset = true
      contentGeneration += 1
      cancelAnimations([...contentAnimations, ...layerAnimations])

      for (const settle of contentAnimationWaiters) {
        settle()
      }

      contentAnimations.clear()
      contentAnimationWaiters.clear()
      layerAnimations.clear()
      clearPreviousVisuals()
      currentHost?.removeAttribute('data-routeveil-between-frozen')
      currentHost?.remove()
      currentHost = null
      hostObserver?.disconnect()
      hostObserver = null

      if (interactionHost) {
        for (const eventName of BLOCKED_INTERACTION_EVENTS) {
          interactionHost.removeEventListener(eventName, blockInteraction, true)
        }
      }

      interactionHost = null
      scopeCleanup()
      scopeCleanup = () => undefined
      currentScope = null
      currentSnapshot = null
      root.remove()
    },
    show,
    updateScope: (nextScope) => {
      if (reset) {
        return false
      }

      if (scopesMatch(currentScope, nextScope)) {
        return true
      }

      const nextCleanup = attachLayer(root, nextScope)

      if (!nextCleanup) {
        return false
      }

      scopeCleanup()
      scopeCleanup = nextCleanup
      currentScope = nextScope
      return true
    },
  }
}

export function RouteveilBetweenLayer({
  appearancePhase,
  disappearancePhase,
  fallback,
  hasFallback,
  id,
  reducedMotion,
  registerHandle,
  scope,
}: RouteveilBetweenLayerProps) {
  const elements = useMemo(
    () => createLayerElements(hasFallback, id),
    [hasFallback, id],
  )
  const effectVersionRef = useRef(0)
  const handleRef = useRef<{
    appearancePhase: AnimationPhaseDefinition | null
    disappearancePhase: AnimationPhaseDefinition | null
    handle: BetweenLayerHandle
    reducedMotion: boolean
    root: HTMLElement
  } | null>(null)

  useLayoutEffect(() => {
    const { fallbackHost, motionHost, root } = elements

    if (!motionHost || !root) {
      return
    }

    const version = ++effectVersionRef.current
    let entry = handleRef.current

    if (
      !entry
      || entry.root !== root
      || entry.reducedMotion !== reducedMotion
      || entry.appearancePhase !== appearancePhase
      || entry.disappearancePhase !== disappearancePhase
    ) {
      entry?.handle.reset()
      entry = {
        appearancePhase,
        disappearancePhase,
        handle: createLayerHandle(
          root,
          motionHost,
          fallbackHost,
          reducedMotion,
          appearancePhase,
          disappearancePhase,
        ),
        reducedMotion,
        root,
      }
      handleRef.current = entry
    }

    const { handle } = entry

    if (!handle.updateScope(scope)) {
      handle.reset()
      handleRef.current = null
      registerHandle(id, null)
      return
    }

    registerHandle(id, handle)

    const isCurrentEffect = () => effectVersionRef.current === version

    return () => {
      registerHandle(id, null)
      queueMicrotask(() => {
        if (!isCurrentEffect()) {
          return
        }

        handle.reset()

        if (handleRef.current?.handle === handle) {
          handleRef.current = null
        }
      })
    }
  }, [
    appearancePhase,
    disappearancePhase,
    elements,
    id,
    reducedMotion,
    registerHandle,
    scope,
  ])

  return elements.fallbackHost
    ? createPortal(fallback, elements.fallbackHost)
    : null
}
