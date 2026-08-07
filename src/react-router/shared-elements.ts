import { cancelAnimations } from '../core/index.js'
import type { AnimationPhaseDefinition } from '../core/index.js'
import type { SharedElementsOption } from './types.js'

export type SharedElementRegistrationToken = symbol

export type SharedElementRegistration = {
  token: SharedElementRegistrationToken
  name: string
  element: HTMLElement | SVGElement
  order: number
}

export type SharedElementSelection = {
  registrations: SharedElementRegistration[]
  duplicateNames: string[]
}

type SharedRect = {
  left: number
  top: number
  width: number
  height: number
}

type CapturedVisualRegion =
  | {
      status: 'invalid'
    }
  | {
      status: 'valid'
      rect: SharedRect
    }

type StyleOwnership = {
  style: CSSStyleDeclaration
  property: string
  originalValue: string
  originalPriority: string
  ownedValue: string
  ownedPriority: string
}

type CloneExclusionRecord = {
  style: CSSStyleDeclaration
  originalValue: string
  originalPriority: string
  tokens: Set<SharedElementRegistrationToken>
}

const FRAME_STYLE_PROPERTIES = [
  ['borderBottomColor', 'border-bottom-color'],
  ['borderBottomLeftRadius', 'border-bottom-left-radius'],
  ['borderBottomRightRadius', 'border-bottom-right-radius'],
  ['borderBottomStyle', 'border-bottom-style'],
  ['borderBottomWidth', 'border-bottom-width'],
  ['borderLeftColor', 'border-left-color'],
  ['borderLeftStyle', 'border-left-style'],
  ['borderLeftWidth', 'border-left-width'],
  ['borderRightColor', 'border-right-color'],
  ['borderRightStyle', 'border-right-style'],
  ['borderRightWidth', 'border-right-width'],
  ['borderTopColor', 'border-top-color'],
  ['borderTopLeftRadius', 'border-top-left-radius'],
  ['borderTopRightRadius', 'border-top-right-radius'],
  ['borderTopStyle', 'border-top-style'],
  ['borderTopWidth', 'border-top-width'],
] as const

type FrameStyleProperty = typeof FRAME_STYLE_PROPERTIES[number][0]
type FrameStyle = Record<FrameStyleProperty, string>

const STYLE_MORPH_PROPERTIES = [
  ['alignContent', 'align-content'],
  ['alignItems', 'align-items'],
  ['alignSelf', 'align-self'],
  ['aspectRatio', 'aspect-ratio'],
  ['backgroundColor', 'background-color'],
  ['backgroundImage', 'background-image'],
  ['backgroundOrigin', 'background-origin'],
  ['backgroundPosition', 'background-position'],
  ['backgroundRepeat', 'background-repeat'],
  ['backgroundSize', 'background-size'],
  ['borderSpacing', 'border-spacing'],
  ['borderRadius', 'border-radius'],
  ...FRAME_STYLE_PROPERTIES,
  ['bottom', 'bottom'],
  ['boxShadow', 'box-shadow'],
  ['clipPath', 'clip-path'],
  ['color', 'color'],
  ['columnGap', 'column-gap'],
  ['fill', 'fill'],
  ['fillOpacity', 'fill-opacity'],
  ['filter', 'filter'],
  ['flexBasis', 'flex-basis'],
  ['flexDirection', 'flex-direction'],
  ['flexGrow', 'flex-grow'],
  ['flexShrink', 'flex-shrink'],
  ['flexWrap', 'flex-wrap'],
  ['fontFamily', 'font-family'],
  ['fontFeatureSettings', 'font-feature-settings'],
  ['fontKerning', 'font-kerning'],
  ['fontOpticalSizing', 'font-optical-sizing'],
  ['fontSize', 'font-size'],
  ['fontStretch', 'font-stretch'],
  ['fontStyle', 'font-style'],
  ['fontVariantCaps', 'font-variant-caps'],
  ['fontVariantLigatures', 'font-variant-ligatures'],
  ['fontVariantNumeric', 'font-variant-numeric'],
  ['fontVariationSettings', 'font-variation-settings'],
  ['fontWeight', 'font-weight'],
  ['height', 'height'],
  ['justifyContent', 'justify-content'],
  ['justifyItems', 'justify-items'],
  ['justifySelf', 'justify-self'],
  ['left', 'left'],
  ['letterSpacing', 'letter-spacing'],
  ['lineHeight', 'line-height'],
  ['marginBottom', 'margin-bottom'],
  ['marginLeft', 'margin-left'],
  ['marginRight', 'margin-right'],
  ['marginTop', 'margin-top'],
  ['maxHeight', 'max-height'],
  ['maxWidth', 'max-width'],
  ['minHeight', 'min-height'],
  ['minWidth', 'min-width'],
  ['mixBlendMode', 'mix-blend-mode'],
  ['objectFit', 'object-fit'],
  ['objectPosition', 'object-position'],
  ['opacity', 'opacity'],
  ['outlineColor', 'outline-color'],
  ['outlineOffset', 'outline-offset'],
  ['outlineStyle', 'outline-style'],
  ['outlineWidth', 'outline-width'],
  ['overflowWrap', 'overflow-wrap'],
  ['overflowX', 'overflow-x'],
  ['overflowY', 'overflow-y'],
  ['paddingBottom', 'padding-bottom'],
  ['paddingLeft', 'padding-left'],
  ['paddingRight', 'padding-right'],
  ['paddingTop', 'padding-top'],
  ['paintOrder', 'paint-order'],
  ['right', 'right'],
  ['rotate', 'rotate'],
  ['rowGap', 'row-gap'],
  ['scale', 'scale'],
  ['stopColor', 'stop-color'],
  ['stopOpacity', 'stop-opacity'],
  ['stroke', 'stroke'],
  ['strokeDasharray', 'stroke-dasharray'],
  ['strokeDashoffset', 'stroke-dashoffset'],
  ['strokeLinecap', 'stroke-linecap'],
  ['strokeLinejoin', 'stroke-linejoin'],
  ['strokeMiterlimit', 'stroke-miterlimit'],
  ['strokeOpacity', 'stroke-opacity'],
  ['strokeWidth', 'stroke-width'],
  ['textAlign', 'text-align'],
  ['textDecorationColor', 'text-decoration-color'],
  ['textDecorationLine', 'text-decoration-line'],
  ['textDecorationStyle', 'text-decoration-style'],
  ['textDecorationThickness', 'text-decoration-thickness'],
  ['textIndent', 'text-indent'],
  ['textShadow', 'text-shadow'],
  ['textTransform', 'text-transform'],
  ['textUnderlineOffset', 'text-underline-offset'],
  ['top', 'top'],
  ['transform', 'transform'],
  ['transformOrigin', 'transform-origin'],
  ['translate', 'translate'],
  ['verticalAlign', 'vertical-align'],
  ['whiteSpace', 'white-space'],
  ['width', 'width'],
  ['wordBreak', 'word-break'],
  ['wordSpacing', 'word-spacing'],
] as const

type StyleMorphProperty = typeof STYLE_MORPH_PROPERTIES[number][0]
type StyleMorphSnapshot = Record<StyleMorphProperty, string>

type StyleMorphEntry = {
  clone: Element
  source: Partial<StyleMorphSnapshot>
  target: Partial<StyleMorphSnapshot>
}

type StackingLevel = {
  zIndex: number
  order: number
}

type StackingPath = readonly StackingLevel[]

type SourceEntry = {
  registration: SharedElementRegistration
  rect: SharedRect
  documentRect: SharedRect
  handoffRect: SharedRect | null
  borderRadius: string
  frameStyle: FrameStyle
  stackingPath: StackingPath
  visualOpacity: number
  visualIdentity: string
  wrapper: HTMLElement
  sourceClone: Element
  snapshotElement: Element | null
  snapshotOpacity: StyleOwnership | null
  cloneExclusions: CloneExclusionRecord[]
  sourceOpacity: StyleOwnership | null
  target: TargetEntry | null
}

type TargetEntry = {
  registration: SharedElementRegistration
  rect: SharedRect
  documentRect: SharedRect
  borderRadius: string
  frameStyle: FrameStyle
  stackingPath: StackingPath
  styleMorphs: StyleMorphEntry[]
  visualOpacity: number
  opacity: StyleOwnership
  clone: Element | null
}

type OccludingSurface = {
  element: HTMLElement
}

type OccluderGeometry = {
  element: Element
  rect: SharedRect
  stackingPath: StackingPath
}

type InlineStyleSnapshot = {
  element: HTMLElement | SVGElement
  value: string | null
}

type PromotedTargetCandidate = {
  element: HTMLElement | SVGElement
  documentRect: SharedRect
  rect: SharedRect
  stackingPath: StackingPath
  order: number
}

type PromotedTargetLayer = PromotedTargetCandidate & {
  placeholder: HTMLElement
  originalParent: Node
  originalNextSibling: ChildNode | null
  styleSnapshots: InlineStyleSnapshot[]
  wrapper: HTMLElement
  animations: Set<Animation>
}

type SharedMovement = {
  source: SharedRect
  target: SharedRect
}

export type SharedTargetPreparation = {
  matchedNames: string[]
  missingNames: string[]
  duplicateNames: string[]
}

export type SharedScrollTargetResolution =
  | {
      status: 'ready'
      rect: SharedRect
    }
  | {
      status: 'duplicate' | 'missing' | 'pending'
    }

const SHARED_DURATION_MS = 480
const SHARED_HANDOFF_DURATION_MS = 64
const SHARED_MEDIA_READY_TIMEOUT_MS = 1_200
const SHARED_TARGET_VISUAL_STABILITY_TIMEOUT_MS = 2_000
const SHARED_TARGET_VISUAL_PROPERTIES = new Set([
  'backdropFilter',
  'filter',
  'opacity',
  'visibility',
  'webkitBackdropFilter',
])
const SHARED_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const ROOT_FRAME_COMPARISON_PROPERTIES = new Set<string>([
  ...FRAME_STYLE_PROPERTIES.map(([, property]) => property),
])
const SVG_PRESENTATION_ATTRIBUTES = new Set([
  'class',
  'color',
  'fill',
  'fill-opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'opacity',
  'paint-order',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'style',
  'text-anchor',
  'transform',
  'vector-effect',
])
const HEADING_TAG_NAMES = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
])
let cloneId = 0

function isSupportedElement(
  element: Element,
): element is HTMLElement | SVGElement {
  const view = element.ownerDocument.defaultView

  if (!view) {
    return false
  }

  return (
    element instanceof view.HTMLElement
    || (
      typeof view.SVGElement !== 'undefined'
      && element instanceof view.SVGElement
    )
  )
}

function registrationsInView(
  registrations: Iterable<SharedElementRegistration>,
  view: HTMLElement,
): SharedElementRegistration[] {
  return [...registrations]
    .filter((registration) => (
      registration.element.isConnected
      && view.contains(registration.element)
      && isSupportedElement(registration.element)
    ))
    .sort((first, second) => first.order - second.order)
}

function groupedByName(
  registrations: readonly SharedElementRegistration[],
): Map<string, SharedElementRegistration[]> {
  const groups = new Map<string, SharedElementRegistration[]>()

  for (const registration of registrations) {
    const group = groups.get(registration.name) ?? []
    group.push(registration)
    groups.set(registration.name, group)
  }

  return groups
}

function isRelatedToTrigger(
  element: Element,
  trigger: Element,
): boolean {
  return (
    element === trigger
    || trigger.contains(element)
    || element.contains(trigger)
  )
}

export function selectSharedElementRegistrations({
  registrations,
  scrollToSharedElement,
  sharedElements,
  view,
  trigger,
}: {
  registrations: Iterable<SharedElementRegistration>
  scrollToSharedElement?: string
  sharedElements?: SharedElementsOption
  view: HTMLElement
  trigger: Element | null
}): SharedElementSelection {
  const candidates = registrationsInView(registrations, view)
  const validCandidates = candidates.filter(isValidSourceRegistration)
  const relatedCandidates = trigger
    ? validCandidates.filter((registration) => (
        isRelatedToTrigger(registration.element, trigger)
      ))
    : []
  const intent = sharedElements ?? 'auto'
  const selectedNames = Array.isArray(intent)
    ? new Set(intent.map((name) => name.trim()).filter(Boolean))
    : typeof intent === 'string' && intent !== 'all' && intent !== 'auto'
      ? new Set([intent.trim()].filter(Boolean))
      : null
  const scrollTargetName = scrollToSharedElement?.trim() || null
  const scrollCandidates = scrollTargetName
    ? validCandidates.filter((registration) => (
        registration.name === scrollTargetName
      ))
    : []

  const automaticCandidates = relatedCandidates.length > 0
    ? relatedCandidates
    : scrollCandidates.length > 0
      ? scrollCandidates
      : validCandidates

  const scopedCandidates = intent === false
    ? []
    : selectedNames
      ? validCandidates.filter((registration) => (
          selectedNames.has(registration.name)
        ))
      : intent === 'all'
        ? validCandidates
        : automaticCandidates

  const groups = groupedByName(scopedCandidates)
  const duplicateNames = [...groups]
    .filter(([, group]) => group.length > 1)
    .map(([name]) => name)
  const duplicateSet = new Set(duplicateNames)
  const uniqueCandidates = scopedCandidates.filter((registration) => (
    !duplicateSet.has(registration.name)
  ))
  const prioritizedCandidates = trigger
    ? uniqueCandidates.filter((registration) => (
        isRelatedToTrigger(registration.element, trigger)
      ))
    : []
  const prioritizedSet = new Set(prioritizedCandidates)
  const routeWideCandidates = [
    ...prioritizedCandidates,
    ...uniqueCandidates.filter((registration) => (
      !prioritizedSet.has(registration)
    )),
  ]

  return {
    registrations: routeWideCandidates,
    duplicateNames,
  }
}

function isValidSourceRegistration(
  registration: SharedElementRegistration,
): boolean {
  return measureRegistration(registration) !== null
}

function copyRect(rect: DOMRect): SharedRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function toDocumentRect(element: Element, rect: SharedRect): SharedRect {
  const view = element.ownerDocument.defaultView
  const scrollX = view && Number.isFinite(view.scrollX) ? view.scrollX : 0
  const scrollY = view && Number.isFinite(view.scrollY) ? view.scrollY : 0

  return {
    ...rect,
    left: rect.left + scrollX,
    top: rect.top + scrollY,
  }
}

function isUsableRect(rect: SharedRect): boolean {
  return (
    Number.isFinite(rect.left)
    && Number.isFinite(rect.top)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width > 0
    && rect.height > 0
  )
}

function intersectRects(
  first: SharedRect,
  second: SharedRect,
): SharedRect | null {
  const left = Math.max(first.left, second.left)
  const top = Math.max(first.top, second.top)
  const right = Math.min(
    first.left + first.width,
    second.left + second.width,
  )
  const bottom = Math.min(
    first.top + first.height,
    second.top + second.height,
  )

  if (right <= left || bottom <= top) {
    return null
  }

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

function getCapturedVisualRect(
  document: Document,
): CapturedVisualRegion {
  const window = document.defaultView

  if (!window) {
    return { status: 'invalid' }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (
    !Number.isFinite(viewportWidth)
    || !Number.isFinite(viewportHeight)
    || viewportWidth <= 0
    || viewportHeight <= 0
  ) {
    return { status: 'invalid' }
  }

  return {
    status: 'valid',
    rect: {
      left: 0,
      top: 0,
      width: viewportWidth,
      height: viewportHeight,
    },
  }
}

function filterHasZeroOpacity(filter: string): boolean {
  for (const match of filter.matchAll(/opacity\(([^)]+)\)/gu)) {
    const value = match[1].trim()
    const opacity = value.endsWith('%')
      ? Number.parseFloat(value) / 100
      : Number.parseFloat(value)

    if (Number.isFinite(opacity) && opacity <= 0) {
      return true
    }
  }

  return false
}

function parseOpacity(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const normalized = String(value).trim()
  const parsed = normalized.endsWith('%')
    ? Number.parseFloat(normalized) / 100
    : Number.parseFloat(normalized)

  return Number.isFinite(parsed)
    ? Math.min(1, Math.max(0, parsed))
    : null
}

function getTerminalAnimatedOpacity(element: Element): number | null {
  if (typeof element.getAnimations !== 'function') {
    return null
  }

  let animations: Animation[]

  try {
    animations = element.getAnimations()
  } catch {
    return null
  }

  let terminalOpacity: number | null = null

  for (const animation of animations) {
    const effect = animation.effect

    if (
      !effect
      || !('getKeyframes' in effect)
      || typeof effect.getKeyframes !== 'function'
    ) {
      continue
    }

    let keyframes: ComputedKeyframe[]

    try {
      keyframes = effect.getKeyframes()
    } catch {
      continue
    }

    for (let index = keyframes.length - 1; index >= 0; index -= 1) {
      const opacity = parseOpacity(keyframes[index]?.opacity)

      if (opacity !== null) {
        terminalOpacity = opacity
        break
      }
    }
  }

  return terminalOpacity
}

function getEffectiveOpacity(
  element: Element,
  style: CSSStyleDeclaration,
): number {
  return getTerminalAnimatedOpacity(element)
    ?? parseOpacity(style.opacity)
    ?? 1
}

function isVisuallyMeasurable(element: Element, rect: SharedRect): boolean {
  const view = element.ownerDocument.defaultView

  if (!view || !isUsableRect(rect)) {
    return false
  }

  const style = view.getComputedStyle(element)

  if (
    style.display === 'none'
    || style.visibility === 'hidden'
    || style.visibility === 'collapse'
    || style.contentVisibility === 'hidden'
  ) {
    return false
  }

  let current: Element | null = element

  while (current) {
    const currentStyle = view.getComputedStyle(current)

    if (
      currentStyle.display === 'none'
      || currentStyle.contentVisibility === 'hidden'
      || getEffectiveOpacity(current, currentStyle) <= 0
      || filterHasZeroOpacity(currentStyle.filter)
    ) {
      return false
    }

    current = current.parentElement
  }

  return true
}

function copyComputedStyle(source: Element, clone: Element): void {
  if (!isSupportedElement(clone)) {
    return
  }

  const view = source.ownerDocument.defaultView

  if (!view) {
    return
  }

  const computed = view.getComputedStyle(source)

  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index)
    clone.style.setProperty(
      property,
      computed.getPropertyValue(property),
      computed.getPropertyPriority(property),
    )
  }

  clone.style.setProperty('animation', 'none', 'important')
  clone.style.setProperty('transition', 'none', 'important')
  clone.style.setProperty('pointer-events', 'none', 'important')
  clone.style.setProperty('user-select', 'none', 'important')
  clone.style.setProperty('caret-color', 'transparent', 'important')
  clone.style.setProperty('display', computed.display || 'block', 'important')
}

function copyControlState(source: Element, clone: Element): void {
  const sourceTag = source.tagName.toLowerCase()

  if (sourceTag === 'img') {
    const sourceImage = source as HTMLImageElement
    const cloneImage = clone as HTMLImageElement
    cloneImage.src = sourceImage.currentSrc || sourceImage.src
    cloneImage.removeAttribute('srcset')
    cloneImage.removeAttribute('sizes')
    return
  }

  if (sourceTag === 'input') {
    const sourceInput = source as HTMLInputElement
    const cloneInput = clone as HTMLInputElement
    cloneInput.value = sourceInput.value
    cloneInput.checked = sourceInput.checked
    cloneInput.indeterminate = sourceInput.indeterminate
    return
  }

  if (sourceTag === 'textarea') {
    const sourceTextarea = source as HTMLTextAreaElement
    const cloneTextarea = clone as HTMLTextAreaElement
    cloneTextarea.value = sourceTextarea.value
    cloneTextarea.textContent = sourceTextarea.value
    return
  }

  if (sourceTag === 'select') {
    ;(clone as HTMLSelectElement).value = (source as HTMLSelectElement).value
  }
}

function neutralizeCloneElement(element: Element): void {
  for (const attribute of [...element.attributes]) {
    const attributeName = attribute.name.toLowerCase()

    if (
      attributeName.startsWith('on')
      || attributeName.startsWith('data-')
      || attributeName.startsWith('aria-')
      || attributeName === 'inert'
      || attributeName === 'role'
    ) {
      element.removeAttribute(attribute.name)
    }
  }

  element.removeAttribute('class')

  for (const attribute of [
    'name',
    'for',
    'form',
    'target',
    'download',
    'action',
    'formaction',
    'autofocus',
    'headers',
    'itemref',
    'list',
    'usemap',
    'aria-activedescendant',
    'aria-controls',
    'aria-describedby',
    'aria-details',
    'aria-errormessage',
    'aria-flowto',
    'aria-labelledby',
    'aria-live',
    'aria-owns',
  ]) {
    element.removeAttribute(attribute)
  }

  const tagName = element.tagName.toLowerCase()
  const isNavigationalLink = (
    tagName === 'a'
    || tagName === 'area'
  )

  if (isNavigationalLink) {
    element.removeAttribute('href')
    element.removeAttribute('xlink:href')
  }

  element.setAttribute('tabindex', '-1')

  if (tagName === 'img') {
    element.removeAttribute('alt')
  }

  if (
    tagName === 'iframe'
    || tagName === 'audio'
    || tagName === 'embed'
    || tagName === 'source'
    || tagName === 'track'
  ) {
    element.removeAttribute('src')
    element.removeAttribute('srcset')
  }

  if (tagName === 'iframe') {
    element.removeAttribute('srcdoc')
  }

  if (tagName === 'object') {
    element.removeAttribute('data')
  }

  if (
    tagName === 'base'
    || tagName === 'link'
    || tagName === 'script'
    || tagName === 'style'
  ) {
    element.removeAttribute('href')
    element.removeAttribute('src')
    element.textContent = ''
  }

  if (tagName === 'video') {
    const video = element as HTMLVideoElement
    video.muted = true
    video.defaultMuted = true
    video.autoplay = false
    video.removeAttribute('autoplay')
  }

  if ('disabled' in element) {
    ;(element as Element & { disabled: boolean }).disabled = true
  }

  if ('contentEditable' in element) {
    ;(element as Element & { contentEditable: string }).contentEditable = 'false'
  }
}

function isolateCloneIds(elements: readonly Element[]): void {
  const prefix = `routeveil-shared-clone-${++cloneId}-`
  const replacements = new Map<string, string>()
  let isolatedIdIndex = 0

  for (const element of elements) {
    const id = element.getAttribute('id')

    if (!id) {
      continue
    }

    const isolatedId = `${prefix}${String(++isolatedIdIndex)}-${id}`

    if (!replacements.has(id)) {
      replacements.set(id, isolatedId)
    }

    element.setAttribute('id', isolatedId)
  }

  if (replacements.size === 0) {
    return
  }

  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      let value = attribute.value

      for (const [originalId, isolatedId] of replacements) {
        if (value === `#${originalId}`) {
          value = `#${isolatedId}`
        }

        value = value
          .replaceAll(`url(#${originalId})`, `url(#${isolatedId})`)
          .replaceAll(`url("#${originalId}")`, `url("#${isolatedId}")`)
          .replaceAll(`url('#${originalId}')`, `url('#${isolatedId}')`)
      }

      if (value !== attribute.value) {
        element.setAttribute(attribute.name, value)
      }
    }
  }
}

function cloneVisualElement(
  source: Element,
): Element | null {
  try {
    const sourceTag = source.tagName.toLowerCase()

    if (
      sourceTag === 'canvas'
      || sourceTag === 'iframe'
      || sourceTag === 'audio'
    ) {
      return null
    }

    const clone = source.cloneNode(true)

    if (!(clone instanceof source.ownerDocument.defaultView!.Element)) {
      return null
    }

    const sourceElements = [source, ...source.querySelectorAll('*')]
    const cloneElements = [clone, ...clone.querySelectorAll('*')]

    if (sourceElements.length !== cloneElements.length) {
      return null
    }

    for (let index = 0; index < sourceElements.length; index += 1) {
      const sourceElement = sourceElements[index]
      const cloneElement = cloneElements[index]
      copyComputedStyle(sourceElement, cloneElement)
      copyControlState(sourceElement, cloneElement)
    }

    isolateCloneIds(cloneElements)

    for (const element of cloneElements) {
      neutralizeCloneElement(element)
    }

    return clone
  } catch {
    return null
  }
}

function createCloneExclusions(
  source: Element,
  clone: Element,
  registrations: readonly SharedElementRegistration[],
): CloneExclusionRecord[] {
  const sourceElements = [source, ...source.querySelectorAll('*')]
  const cloneElements = [clone, ...clone.querySelectorAll('*')]
  const nestedRegistrations = registrations.filter((registration) => (
    registration.element !== source
    && source.contains(registration.element)
  ))
  const exclusions: CloneExclusionRecord[] = []

  if (sourceElements.length !== cloneElements.length) {
    return exclusions
  }

  for (let index = 1; index < sourceElements.length; index += 1) {
    const sourceElement = sourceElements[index]
    const cloneElement = cloneElements[index]
    const tokens = new Set(
      nestedRegistrations
        .filter((registration) => (
          registration.element === sourceElement
          || registration.element.contains(sourceElement)
        ))
        .map((registration) => registration.token),
    )

    if (tokens.size === 0 || !isSupportedElement(cloneElement)) {
      continue
    }

    exclusions.push({
      style: cloneElement.style,
      originalValue: cloneElement.style.getPropertyValue('visibility'),
      originalPriority: cloneElement.style.getPropertyPriority('visibility'),
      tokens,
    })
    cloneElement.style.setProperty('visibility', 'hidden', 'important')
  }

  return exclusions
}

function updateCloneExclusions(
  exclusions: readonly CloneExclusionRecord[],
  activeTokens: ReadonlySet<SharedElementRegistrationToken>,
): void {
  for (const exclusion of exclusions) {
    const hidden = [...exclusion.tokens].some((token) => activeTokens.has(token))

    if (hidden) {
      exclusion.style.setProperty('visibility', 'hidden', 'important')
      continue
    }

    exclusion.style.setProperty(
      'visibility',
      exclusion.originalValue,
      exclusion.originalPriority,
    )

    if (!exclusion.originalValue) {
      exclusion.style.removeProperty('visibility')
    }
  }
}

type Matrix2D = {
  a: number
  b: number
  c: number
  d: number
}

function multiplyMatrices(
  first: Matrix2D,
  second: Matrix2D,
): Matrix2D {
  return {
    a: first.a * second.a + first.c * second.b,
    b: first.b * second.a + first.d * second.b,
    c: first.a * second.c + first.c * second.d,
    d: first.b * second.c + first.d * second.d,
  }
}

function parseTransformAngle(value: string): number | null {
  const normalized = value.trim().toLowerCase()
  const parsed = Number.parseFloat(normalized)

  if (!Number.isFinite(parsed)) {
    return null
  }

  if (normalized.endsWith('deg')) {
    return parsed * Math.PI / 180
  }

  if (normalized.endsWith('grad')) {
    return parsed * Math.PI / 200
  }

  if (normalized.endsWith('turn')) {
    return parsed * Math.PI * 2
  }

  if (normalized.endsWith('rad')) {
    return parsed
  }

  return parsed === 0 ? 0 : null
}

function parseTransformFunctions(transform: string): Matrix2D | null {
  const identity: Matrix2D = { a: 1, b: 0, c: 0, d: 1 }
  const pattern = /([a-z][a-z0-9]*)\(([^()]*)\)/giu
  let matrix = identity
  let cursor = 0
  let matched = false

  for (const match of transform.matchAll(pattern)) {
    if (transform.slice(cursor, match.index).trim()) {
      return null
    }

    matched = true
    cursor = (match.index ?? 0) + match[0].length
    const name = match[1].toLowerCase()
    const values = match[2]
      .trim()
      .split(/(?:\s*,\s*|\s+)/u)
      .filter(Boolean)
    let next: Matrix2D | null = null

    if (name === 'matrix') {
      const numbers = values.map(Number)

      if (numbers.length === 6 && numbers.every(Number.isFinite)) {
        next = {
          a: numbers[0],
          b: numbers[1],
          c: numbers[2],
          d: numbers[3],
        }
      }
    } else if (
      name === 'translate'
      || name === 'translatex'
      || name === 'translatey'
    ) {
      next = identity
    } else if (name === 'scale' || name === 'scalex' || name === 'scaley') {
      const numbers = values.map(Number)

      if (numbers.every(Number.isFinite)) {
        if (name === 'scale' && numbers.length >= 1 && numbers.length <= 2) {
          next = {
            a: numbers[0],
            b: 0,
            c: 0,
            d: numbers[1] ?? numbers[0],
          }
        } else if (name === 'scalex' && numbers.length === 1) {
          next = { a: numbers[0], b: 0, c: 0, d: 1 }
        } else if (name === 'scaley' && numbers.length === 1) {
          next = { a: 1, b: 0, c: 0, d: numbers[0] }
        }
      }
    } else if (name === 'rotate') {
      const angle = values.length === 1
        ? parseTransformAngle(values[0])
        : null

      if (angle !== null) {
        const cosine = Math.cos(angle)
        const sine = Math.sin(angle)
        next = { a: cosine, b: sine, c: -sine, d: cosine }
      }
    } else if (name === 'skewx' || name === 'skewy' || name === 'skew') {
      const angles = values.map(parseTransformAngle)

      if (angles.every((angle) => angle !== null)) {
        if (name === 'skewx' && angles.length === 1) {
          next = { a: 1, b: 0, c: Math.tan(angles[0]!), d: 1 }
        } else if (name === 'skewy' && angles.length === 1) {
          next = { a: 1, b: Math.tan(angles[0]!), c: 0, d: 1 }
        } else if (name === 'skew' && angles.length >= 1 && angles.length <= 2) {
          next = {
            a: 1,
            b: Math.tan(angles[1] ?? 0),
            c: Math.tan(angles[0]!),
            d: 1,
          }
        }
      }
    }

    if (!next) {
      return null
    }

    matrix = multiplyMatrices(matrix, next)
  }

  if (!matched || transform.slice(cursor).trim()) {
    return null
  }

  return matrix
}

function parseTransformMatrix(
  element: Element,
  transform: string,
): Matrix2D | null {
  const view = element.ownerDocument.defaultView as (Window & {
    DOMMatrixReadOnly?: new (transform?: string) => DOMMatrixReadOnly
  }) | null

  if (view?.DOMMatrixReadOnly) {
    try {
      const matrix = new view.DOMMatrixReadOnly(transform)

      if (
        matrix.is2D
        && [matrix.a, matrix.b, matrix.c, matrix.d].every(Number.isFinite)
      ) {
        return matrix
      }
    } catch {
      return null
    }
  }

  return parseTransformFunctions(transform)
}

type VisualTransform = {
  matrix: Matrix2D | null
  transformed: boolean
}

function getVisualTransform(
  element: Element,
  stopBefore: Element | null = null,
): VisualTransform {
  const view = element.ownerDocument.defaultView
  let matrix: Matrix2D = { a: 1, b: 0, c: 0, d: 1 }
  let transformed = false
  let current: Element | null = element

  if (!view) {
    return { matrix: null, transformed: false }
  }

  while (current && current !== stopBefore) {
    const transform = view.getComputedStyle(current).transform

    if (transform && transform !== 'none') {
      transformed = true
      const currentMatrix = parseTransformMatrix(current, transform)

      if (!currentMatrix) {
        return { matrix: null, transformed }
      }

      matrix = multiplyMatrices(currentMatrix, matrix)
    }

    current = current.parentElement
  }

  return { matrix, transformed }
}

function getUntransformedSize(
  element: Element,
  style: CSSStyleDeclaration,
): { height: number; width: number } | null {
  if (element instanceof element.ownerDocument.defaultView!.HTMLElement) {
    const htmlElement = element as HTMLElement

    if (htmlElement.offsetWidth > 0 && htmlElement.offsetHeight > 0) {
      return {
        height: htmlElement.offsetHeight,
        width: htmlElement.offsetWidth,
      }
    }
  }

  if ('getBBox' in element && typeof element.getBBox === 'function') {
    try {
      const box = element.getBBox()

      if (box.width > 0 && box.height > 0) {
        return { height: box.height, width: box.width }
      }
    } catch {
      return null
    }
  }

  const width = Number.parseFloat(style.width)
  const height = Number.parseFloat(style.height)

  return (
    Number.isFinite(width)
    && Number.isFinite(height)
    && width > 0
    && height > 0
  )
    ? { height, width }
    : null
}

function parseTransformOrigin(value: string, size: number): number {
  if (value.endsWith('%')) {
    return Number.parseFloat(value) * size / 100
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : size / 2
}

function parsePixelValue(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function prepareFillingImage(clone: Element, source: Element): void {
  if (!isSupportedElement(clone)) {
    return
  }

  const sourceChildren = [...source.children]
  const cloneChildren = [...clone.children]
  const sourceImage = sourceChildren[0]
  const cloneImage = cloneChildren[0]

  if (
    sourceChildren.length !== 1
    || cloneChildren.length !== 1
    || sourceImage?.tagName.toLowerCase() !== 'img'
    || cloneImage?.tagName.toLowerCase() !== 'img'
    || !isSupportedElement(cloneImage)
  ) {
    return
  }

  const view = source.ownerDocument.defaultView

  if (!view) {
    return
  }

  try {
    const frameRect = copyRect(source.getBoundingClientRect())
    const imageRect = copyRect(sourceImage.getBoundingClientRect())
    const frameStyle = view.getComputedStyle(source)
    const contentLeft = frameRect.left
      + parsePixelValue(frameStyle.borderLeftWidth)
      + parsePixelValue(frameStyle.paddingLeft)
    const contentTop = frameRect.top
      + parsePixelValue(frameStyle.borderTopWidth)
      + parsePixelValue(frameStyle.paddingTop)
    const contentRight = frameRect.left + frameRect.width
      - parsePixelValue(frameStyle.borderRightWidth)
      - parsePixelValue(frameStyle.paddingRight)
    const contentBottom = frameRect.top + frameRect.height
      - parsePixelValue(frameStyle.borderBottomWidth)
      - parsePixelValue(frameStyle.paddingBottom)
    const imageRight = imageRect.left + imageRect.width
    const imageBottom = imageRect.top + imageRect.height
    const tolerance = 2

    if (
      !isUsableRect(frameRect)
      || !isUsableRect(imageRect)
      || Math.abs(imageRect.left - contentLeft) > tolerance
      || Math.abs(imageRect.top - contentTop) > tolerance
      || Math.abs(imageRight - contentRight) > tolerance
      || Math.abs(imageBottom - contentBottom) > tolerance
    ) {
      return
    }

    cloneImage.style.setProperty('width', '100%', 'important')
    cloneImage.style.setProperty('height', '100%', 'important')
    cloneImage.style.setProperty('min-width', '0', 'important')
    cloneImage.style.setProperty('min-height', '0', 'important')
    cloneImage.style.setProperty('max-width', 'none', 'important')
    cloneImage.style.setProperty('max-height', 'none', 'important')
  } catch {
    return
  }
}

function prepareVisualRoot(
  element: Element,
  source: Element,
  stopBefore: Element | null,
): void {
  if (!isSupportedElement(element)) {
    return
  }

  const sourceStyle = source.ownerDocument.defaultView?.getComputedStyle(source)
  const sourceSize = sourceStyle
    ? getUntransformedSize(source, sourceStyle)
    : null
  const visualTransform = getVisualTransform(source, stopBefore)
  const matrix = visualTransform.matrix

  element.style.setProperty('position', 'absolute', 'important')
  element.style.setProperty('min-width', '0', 'important')
  element.style.setProperty('min-height', '0', 'important')
  element.style.setProperty('max-width', 'none', 'important')
  element.style.setProperty('max-height', 'none', 'important')
  element.style.setProperty('margin', '0', 'important')
  element.style.setProperty('box-sizing', 'border-box', 'important')
  element.style.setProperty('pointer-events', 'none', 'important')
  element.style.setProperty(
    'display',
    sourceStyle?.display || 'block',
    'important',
  )
  element.style.setProperty('visibility', 'visible', 'important')
  element.style.setProperty(
    'opacity',
    String(getVisualOpacity(source, stopBefore)),
  )
  element.style.setProperty('filter', getVisualFilter(source, stopBefore))
  prepareFillingImage(element, source)

  if (!sourceStyle || !visualTransform.transformed) {
    element.style.setProperty('left', '0', 'important')
    element.style.setProperty('top', '0', 'important')
    element.style.setProperty('width', '100%', 'important')
    element.style.setProperty('height', '100%', 'important')
    return
  }

  if (!sourceSize || !matrix) {
    element.style.setProperty('left', '0', 'important')
    element.style.setProperty('top', '0', 'important')
    element.style.setProperty('width', '100%', 'important')
    element.style.setProperty('height', '100%', 'important')
    element.style.setProperty('transform', 'none', 'important')
    return
  }

  const originParts = sourceStyle.transformOrigin.split(/\s+/u)
  const originX = parseTransformOrigin(originParts[0] || '50%', sourceSize.width)
  const originY = parseTransformOrigin(originParts[1] || '50%', sourceSize.height)
  const points = [
    [0, 0],
    [sourceSize.width, 0],
    [0, sourceSize.height],
    [sourceSize.width, sourceSize.height],
  ].map(([x, y]) => ({
    x: matrix.a * (x - originX) + matrix.c * (y - originY) + originX,
    y: matrix.b * (x - originX) + matrix.d * (y - originY) + originY,
  }))
  const minimumX = Math.min(...points.map((point) => point.x))
  const maximumX = Math.max(...points.map((point) => point.x))
  const minimumY = Math.min(...points.map((point) => point.y))
  const maximumY = Math.max(...points.map((point) => point.y))
  const transformedWidth = maximumX - minimumX
  const transformedHeight = maximumY - minimumY

  if (
    !Number.isFinite(transformedWidth)
    || !Number.isFinite(transformedHeight)
    || transformedWidth <= 0
    || transformedHeight <= 0
  ) {
    element.style.setProperty('left', '0', 'important')
    element.style.setProperty('top', '0', 'important')
    element.style.setProperty('width', '100%', 'important')
    element.style.setProperty('height', '100%', 'important')
    element.style.setProperty('transform', 'none', 'important')
    return
  }

  element.style.setProperty(
    'left',
    `${String(-minimumX / transformedWidth * 100)}%`,
    'important',
  )
  element.style.setProperty(
    'top',
    `${String(-minimumY / transformedHeight * 100)}%`,
    'important',
  )
  element.style.setProperty(
    'width',
    `${String(sourceSize.width / transformedWidth * 100)}%`,
    'important',
  )
  element.style.setProperty(
    'height',
    `${String(sourceSize.height / transformedHeight * 100)}%`,
    'important',
  )
  element.style.setProperty(
    'transform',
    `matrix(${String(matrix.a)}, ${String(matrix.b)}, ${String(matrix.c)}, ${String(matrix.d)}, 0, 0)`,
    'important',
  )
  element.style.setProperty(
    'transform-origin',
    `${String(originX / sourceSize.width * 100)}% ${String(originY / sourceSize.height * 100)}%`,
    'important',
  )
}

function ownOpacity(element: HTMLElement | SVGElement): StyleOwnership {
  const ownership: StyleOwnership = {
    style: element.style,
    property: 'opacity',
    originalValue: element.style.getPropertyValue('opacity'),
    originalPriority: element.style.getPropertyPriority('opacity'),
    ownedValue: '0',
    ownedPriority: 'important',
  }

  ownership.style.setProperty(
    ownership.property,
    ownership.ownedValue,
    ownership.ownedPriority,
  )
  return ownership
}

function ownsCurrentStyle(ownership: StyleOwnership): boolean {
  return (
    ownership.style.getPropertyValue(ownership.property) === ownership.ownedValue
    && ownership.style.getPropertyPriority(ownership.property) === ownership.ownedPriority
  )
}

function restoreStyle(ownership: StyleOwnership): void {
  if (!ownsCurrentStyle(ownership)) {
    return
  }

  ownership.style.setProperty(
    ownership.property,
    ownership.originalValue,
    ownership.originalPriority,
  )

  if (!ownership.originalValue) {
    ownership.style.removeProperty(ownership.property)
  }
}

function temporarilyRestoreStyle<T>(
  ownership: StyleOwnership | undefined,
  read: () => T,
): T {
  if (!ownership || !ownsCurrentStyle(ownership)) {
    return read()
  }

  ownership.style.setProperty(
    ownership.property,
    ownership.originalValue,
    ownership.originalPriority,
  )

  if (!ownership.originalValue) {
    ownership.style.removeProperty(ownership.property)
  }

  try {
    return read()
  } finally {
    const currentValue = ownership.style.getPropertyValue(ownership.property)
    const currentPriority = ownership.style.getPropertyPriority(ownership.property)

    if (
      currentValue === ownership.originalValue
      && currentPriority === ownership.originalPriority
    ) {
      ownership.style.setProperty(
        ownership.property,
        ownership.ownedValue,
        ownership.ownedPriority,
      )
    }
  }
}

function measureRegistration(
  registration: SharedElementRegistration,
  visibility?: StyleOwnership,
): SharedRect | null {
  return temporarilyRestoreStyle(visibility, () => {
    try {
      const rect = copyRect(registration.element.getBoundingClientRect())
      return isVisuallyMeasurable(registration.element, rect) ? rect : null
    } catch {
      return null
    }
  })
}

function hasReadyImages(element: Element): boolean {
  const images = element.tagName.toLowerCase() === 'img'
    ? [element as HTMLImageElement]
    : [...element.querySelectorAll<HTMLImageElement>('img')]

  return images.every((image) => {
    const source = image.currentSrc || image.src || image.getAttribute('src')
    return !source || (image.complete && image.naturalWidth > 0)
  })
}

function getElementImages(element: Element): HTMLImageElement[] {
  return element.tagName.toLowerCase() === 'img'
    ? [element as HTMLImageElement]
    : [...element.querySelectorAll<HTMLImageElement>('img')]
}

function getVisibleSnapshotImages(
  snapshotElements: ReadonlyMap<Element, Element>,
  capturedRegion: CapturedVisualRegion,
): HTMLImageElement[] {
  const images: HTMLImageElement[] = []

  for (const [sourceElement, snapshotElement] of snapshotElements) {
    if (
      sourceElement.tagName.toLowerCase() !== 'img'
      || snapshotElement.tagName.toLowerCase() !== 'img'
    ) {
      continue
    }

    if (capturedRegion.status === 'invalid') {
      images.push(snapshotElement as HTMLImageElement)
      continue
    }

    const capturedRect = capturedRegion.rect

    try {
      const sourceRect = copyRect(sourceElement.getBoundingClientRect())

      if (
        !intersectRects(sourceRect, capturedRect)
        || !isVisuallyMeasurable(sourceElement, sourceRect)
      ) {
        continue
      }
    } catch {
      continue
    }

    images.push(snapshotElement as HTMLImageElement)
  }

  return images
}

function waitForSharedFrame(
  document: Document,
  signal: AbortSignal,
): Promise<boolean> {
  const view = document.defaultView

  if (!view || signal.aborted) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    let settled = false
    let frame = 0
    let timer = 0

    const finish = (result: boolean) => {
      if (settled) {
        return
      }

      settled = true

      if (frame && typeof view.cancelAnimationFrame === 'function') {
        view.cancelAnimationFrame(frame)
      }

      if (timer) {
        view.clearTimeout(timer)
      }

      signal.removeEventListener('abort', abort)
      resolve(result)
    }
    const abort = () => finish(false)

    signal.addEventListener('abort', abort, { once: true })

    if (typeof view.requestAnimationFrame === 'function') {
      frame = view.requestAnimationFrame(() => finish(true))
    } else {
      timer = view.setTimeout(() => finish(true), 0)
    }
  })
}

async function waitForSharedPaint(
  document: Document,
  signal: AbortSignal,
  frames = 2,
): Promise<boolean> {
  for (let frame = 0; frame < frames; frame += 1) {
    if (!await waitForSharedFrame(document, signal)) {
      return false
    }
  }

  return !signal.aborted
}

function waitForImageLoad(
  image: HTMLImageElement,
  signal: AbortSignal,
): Promise<boolean> {
  const source = image.currentSrc || image.src || image.getAttribute('src')

  if (!source) {
    return Promise.resolve(true)
  }

  if (image.complete) {
    return Promise.resolve(image.naturalWidth > 0)
  }

  const view = image.ownerDocument.defaultView

  if (!view || signal.aborted) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    let settled = false
    let timer = 0

    const cleanup = () => {
      view.clearTimeout(timer)
      image.removeEventListener('load', load)
      image.removeEventListener('error', error)
      signal.removeEventListener('abort', abort)
    }
    const finish = (result: boolean) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      resolve(result)
    }
    const load = () => finish(image.naturalWidth > 0)
    const error = () => finish(false)
    const abort = () => finish(false)

    image.addEventListener('load', load, { once: true })
    image.addEventListener('error', error, { once: true })
    signal.addEventListener('abort', abort, { once: true })
    timer = view.setTimeout(
      () => finish(image.complete && image.naturalWidth > 0),
      SHARED_MEDIA_READY_TIMEOUT_MS,
    )
  })
}

function waitForImageDecode(
  image: HTMLImageElement,
  signal: AbortSignal,
): Promise<boolean> {
  if (
    signal.aborted
    || typeof image.decode !== 'function'
  ) {
    return Promise.resolve(!signal.aborted)
  }

  const view = image.ownerDocument.defaultView

  if (!view) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    let settled = false
    let timer = 0

    const cleanup = () => {
      view.clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
    const finish = (result: boolean) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      resolve(result)
    }
    const abort = () => finish(false)

    signal.addEventListener('abort', abort, { once: true })
    timer = view.setTimeout(
      () => finish(image.complete && image.naturalWidth > 0),
      SHARED_MEDIA_READY_TIMEOUT_MS,
    )

    void image.decode().then(
      () => finish(true),
      () => finish(image.complete && image.naturalWidth > 0),
    )
  })
}

async function waitForImagePaintReady(
  image: HTMLImageElement,
  signal: AbortSignal,
): Promise<boolean> {
  if (!await waitForImageLoad(image, signal)) {
    return false
  }

  return waitForImageDecode(image, signal)
}

async function waitForElementsPaintReady(
  elements: readonly Element[],
  signal: AbortSignal,
): Promise<boolean> {
  const images = [...new Set(elements.flatMap(getElementImages))]

  if (images.length === 0) {
    return !signal.aborted
  }

  const readiness = await Promise.all(
    images.map((image) => waitForImagePaintReady(image, signal)),
  )

  return !signal.aborted && readiness.every(Boolean)
}

function animationAffectsTargetVisual(animation: Animation): boolean {
  if (
    animation.playState === 'idle'
    || animation.playState === 'finished'
  ) {
    return false
  }

  const effect = animation.effect

  if (
    !effect
    || !('getKeyframes' in effect)
    || typeof effect.getKeyframes !== 'function'
  ) {
    return false
  }

  try {
    const timing = effect.getTiming()

    if (timing.iterations === Infinity) {
      return false
    }

    return effect.getKeyframes().some((keyframe: ComputedKeyframe) => (
      Object.keys(keyframe).some((property) => (
        SHARED_TARGET_VISUAL_PROPERTIES.has(property)
      ))
    ))
  } catch {
    return false
  }
}

function collectTargetVisualAnimations(
  elements: readonly Element[],
  boundary: Element,
): Animation[] {
  const animations = new Set<Animation>()

  for (const element of elements) {
    let current: Element | null = element

    while (current && current !== boundary) {
      if (typeof current.getAnimations === 'function') {
        try {
          for (const animation of current.getAnimations()) {
            if (animationAffectsTargetVisual(animation)) {
              animations.add(animation)
            }
          }
        } catch {
          continue
        }
      }

      current = current.parentElement
    }
  }

  return [...animations]
}

function waitForTargetVisualStability(
  elements: readonly Element[],
  boundary: Element,
  signal: AbortSignal,
): Promise<boolean> {
  const animations = collectTargetVisualAnimations(elements, boundary)
  const view = boundary.ownerDocument.defaultView

  if (animations.length === 0) {
    return Promise.resolve(!signal.aborted)
  }

  if (!view || signal.aborted) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    let settled = false
    let timer = 0

    const cleanup = () => {
      view.clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
    const finish = (result: boolean) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      resolve(result)
    }
    const abort = () => finish(false)

    signal.addEventListener('abort', abort, { once: true })
    timer = view.setTimeout(
      () => finish(!signal.aborted),
      SHARED_TARGET_VISUAL_STABILITY_TIMEOUT_MS,
    )

    void Promise.all(animations.map(async (animation) => {
      try {
        await animation.finished
      } catch {
        return
      }
    })).then(
      () => finish(!signal.aborted),
      () => finish(!signal.aborted),
    )
  })
}

type DetachedSharedHandoff = {
  cancel: () => void
  retain: () => void
  visualBoundary: Element
}

type FrozenSharedWrapper = {
  name: string
  rect: SharedRect
  target: Element
  targetRect: SharedRect
  wrapper: HTMLElement
}

type DetachedSharedWrapper = {
  name: string
  target: Element
  targetOffset: {
    left: number
    top: number
  }
  wrapper: HTMLElement
}

const detachedSharedHandoffs = new Set<DetachedSharedHandoff>()

export function clearSharedElementHandoffs(
  visualBoundary?: Element,
): void {
  for (const handoff of [...detachedSharedHandoffs]) {
    if (
      visualBoundary
      && handoff.visualBoundary !== visualBoundary
    ) {
      continue
    }

    handoff.cancel()
  }
}

export function captureSharedElementHandoffs(
  visualBoundary: Element,
): () => void {
  const captured = [...detachedSharedHandoffs].filter(
    (handoff) => handoff.visualBoundary === visualBoundary,
  )
  let cleared = false

  for (const handoff of captured) {
    handoff.retain()
  }

  return () => {
    if (cleared) {
      return
    }

    cleared = true

    for (const handoff of captured) {
      handoff.cancel()
    }
  }
}

function createDetachedHandoffRoot(
  portalRoot: HTMLElement,
  visualBoundary: Element,
): HTMLElement | null {
  const document = portalRoot.ownerDocument
  const root = document.createElement('routeveil-shared-handoff')
  root.setAttribute('data-routeveil-shared-handoff', '')
  root.setAttribute('aria-hidden', 'true')
  root.inert = true
  root.style.setProperty('all', 'initial')
  root.style.setProperty('display', 'block', 'important')
  root.style.setProperty('position', 'absolute', 'important')
  root.style.setProperty('inset', 'auto', 'important')
  root.style.setProperty('left', '0', 'important')
  root.style.setProperty('top', '0', 'important')
  root.style.setProperty('right', 'auto', 'important')
  root.style.setProperty('bottom', 'auto', 'important')
  root.style.setProperty('width', '0', 'important')
  root.style.setProperty('height', '0', 'important')
  root.style.setProperty('padding', '0', 'important')
  root.style.setProperty('margin', '0', 'important')
  root.style.setProperty('border', '0', 'important')
  root.style.setProperty('background', 'transparent', 'important')
  root.style.setProperty('opacity', '1', 'important')
  root.style.setProperty('visibility', 'visible', 'important')
  root.style.setProperty('transform', 'none', 'important')
  root.style.setProperty('filter', 'none', 'important')
  root.style.setProperty('overflow', 'visible', 'important')
  root.style.setProperty('pointer-events', 'none', 'important')
  root.style.setProperty('contain', 'layout style', 'important')
  root.style.setProperty(
    'z-index',
    document.defaultView?.getComputedStyle(portalRoot).zIndex || 'auto',
    'important',
  )

  try {
    if (portalRoot.parentElement === visualBoundary) {
      portalRoot.after(root)
    } else {
      visualBoundary.append(root)
    }
  } catch {
    root.remove()
    return null
  }

  return root
}

function freezeWrapperAtTarget(source: SourceEntry): FrozenSharedWrapper | null {
  const target = source.target

  if (!target || !source.wrapper.isConnected) {
    return null
  }

  let rect: SharedRect
  let targetRect: SharedRect

  try {
    rect = copyRect(source.wrapper.getBoundingClientRect())
    targetRect = copyRect(target.registration.element.getBoundingClientRect())
  } catch {
    return null
  }

  if (!isUsableRect(rect)) {
    return null
  }

  source.wrapper.style.setProperty('position', 'fixed', 'important')
  source.wrapper.style.setProperty('inset', 'auto', 'important')
  source.wrapper.style.setProperty('left', `${String(rect.left)}px`, 'important')
  source.wrapper.style.setProperty('top', `${String(rect.top)}px`, 'important')
  source.wrapper.style.setProperty('right', 'auto', 'important')
  source.wrapper.style.setProperty('bottom', 'auto', 'important')
  source.wrapper.style.setProperty('width', `${String(rect.width)}px`, 'important')
  source.wrapper.style.setProperty('height', `${String(rect.height)}px`, 'important')
  source.wrapper.style.setProperty(
    'border-radius',
    target.borderRadius,
    'important',
  )
  source.wrapper.style.setProperty('transform', 'translateZ(0)', 'important')
  source.wrapper.style.setProperty('pointer-events', 'none', 'important')
  source.wrapper.style.setProperty('opacity', '1')

  if (isSupportedElement(source.sourceClone)) {
    applyFrameStyle(source.sourceClone, target.frameStyle)

    if (target.clone) {
      source.sourceClone.style.setProperty('opacity', '0', 'important')
    }
  }

  for (const morph of target.styleMorphs) {
    applyStyleMorph(morph.clone, morph.target)
  }

  if (target.clone && isSupportedElement(target.clone)) {
    applyFrameStyle(target.clone, target.frameStyle)
    target.clone.style.setProperty(
      'opacity',
      String(target.visualOpacity),
      'important',
    )
  }

  try {
    cancelAnimations(source.wrapper.getAnimations({ subtree: true }))
  } catch {
    return {
      name: source.registration.name,
      rect,
      target: target.registration.element,
      targetRect,
      wrapper: source.wrapper,
    }
  }

  return {
    name: source.registration.name,
    rect,
    target: target.registration.element,
    targetRect,
    wrapper: source.wrapper,
  }
}

function anchorFrozenWrapper(
  root: HTMLElement,
  frozen: FrozenSharedWrapper,
): DetachedSharedWrapper | null {
  let rootRect: SharedRect

  try {
    rootRect = copyRect(root.getBoundingClientRect())
  } catch {
    return null
  }

  root.append(frozen.wrapper)
  frozen.wrapper.style.setProperty('position', 'absolute', 'important')
  frozen.wrapper.style.setProperty(
    'left',
    `${String(frozen.rect.left - rootRect.left)}px`,
    'important',
  )
  frozen.wrapper.style.setProperty(
    'top',
    `${String(frozen.rect.top - rootRect.top)}px`,
    'important',
  )

  return {
    name: frozen.name,
    target: frozen.target,
    targetOffset: {
      left: frozen.rect.left - frozen.targetRect.left,
      top: frozen.rect.top - frozen.targetRect.top,
    },
    wrapper: frozen.wrapper,
  }
}

function alignDetachedSharedWrappers(
  root: HTMLElement,
  entries: readonly DetachedSharedWrapper[],
): void {
  let rootRect: SharedRect

  try {
    rootRect = copyRect(root.getBoundingClientRect())
  } catch {
    return
  }

  for (const entry of entries) {
    if (
      !root.contains(entry.wrapper)
      || !entry.wrapper.isConnected
      || !entry.target.isConnected
    ) {
      continue
    }

    try {
      const targetRect = copyRect(entry.target.getBoundingClientRect())
      entry.wrapper.style.setProperty(
        'left',
        `${String(
          targetRect.left + entry.targetOffset.left - rootRect.left
        )}px`,
        'important',
      )
      entry.wrapper.style.setProperty(
        'top',
        `${String(
          targetRect.top + entry.targetOffset.top - rootRect.top
        )}px`,
        'important',
      )
    } catch {
      continue
    }
  }
}

function scheduleDetachedSharedHandoff(
  root: HTMLElement,
  entries: readonly DetachedSharedWrapper[],
  visualBoundary: Element,
): void {
  const document = root.ownerDocument
  const view = document.defaultView
  const targetElements = entries.map((entry) => entry.target)
  const controller = new AbortController()
  const fadeAnimations = new Set<Animation>()
  let observer: MutationObserver | null = null
  let disposed = false
  let retained = false

  const removeLifecycleListeners = () => {
    observer?.disconnect()
    observer = null
    view?.removeEventListener('resize', finish)
    view?.removeEventListener('orientationchange', finish)
    view?.removeEventListener('scroll', align, true)
  }
  const align = () => alignDetachedSharedWrappers(root, entries)
  const finish = () => {
    if (!retained) {
      handoff.cancel()
    }
  }

  const handoff: DetachedSharedHandoff = {
    cancel: () => {
      if (disposed) {
        return
      }

      disposed = true
      controller.abort()
      removeLifecycleListeners()
      cancelAnimations([...fadeAnimations])
      fadeAnimations.clear()
      root.remove()
      detachedSharedHandoffs.delete(handoff)
    },
    retain: () => {
      if (disposed || retained) {
        return
      }

      retained = true
      controller.abort()
      cancelAnimations([...fadeAnimations])
      fadeAnimations.clear()

      for (const { wrapper } of entries) {
        wrapper.style.setProperty('opacity', '1', 'important')
      }
    },
    visualBoundary,
  }

  detachedSharedHandoffs.add(handoff)
  view?.addEventListener('resize', finish, { once: true })
  view?.addEventListener('orientationchange', finish, { once: true })
  view?.addEventListener('scroll', align, true)

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      if (targetElements.every((element) => !element.isConnected)) {
        finish()
      }
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  }

  void (async () => {
    try {
      await waitForTargetVisualStability(
        targetElements,
        visualBoundary,
        controller.signal,
      )

      if (
        controller.signal.aborted
        || targetElements.every((element) => !element.isConnected)
      ) {
        return
      }

      if (!await waitForSharedPaint(document, controller.signal, 1)) {
        return
      }

      for (const { wrapper } of entries) {
        if (!wrapper.isConnected) {
          continue
        }

        wrapper.style.setProperty('opacity', '1')

        try {
          const animation = wrapper.animate([
            { opacity: 1 },
            { opacity: 0 },
          ], {
            duration: SHARED_HANDOFF_DURATION_MS,
            easing: 'linear',
            fill: 'forwards',
          })
          fadeAnimations.add(animation)
        } catch {
          wrapper.style.setProperty('opacity', '0', 'important')
        }
      }

      if (fadeAnimations.size > 0) {
        await Promise.all([...fadeAnimations].map(async (animation) => {
          try {
            await animation.finished
          } catch {
            return
          }
        }))
      }

      if (!controller.signal.aborted) {
        await waitForSharedPaint(document, controller.signal, 1)
      }
    } finally {
      finish()
    }
  })()
}

function measureTargetRegistration(
  registration: SharedElementRegistration,
  visibility?: StyleOwnership,
): SharedRect | null {
  const rect = measureRegistration(registration, visibility)
  return rect && hasReadyImages(registration.element) ? rect : null
}

export function resolveSharedElementScrollTarget({
  registrations,
  view,
  name,
  targetCutoff,
}: {
  registrations: Iterable<SharedElementRegistration>
  view: HTMLElement
  name: string
  targetCutoff: number
}): SharedScrollTargetResolution {
  const candidates = registrationsInView(registrations, view).filter(
    (registration) => (
      registration.name === name
      && registration.order > targetCutoff
    ),
  )

  if (candidates.length > 1) {
    return { status: 'duplicate' }
  }

  const registration = candidates[0]

  if (!registration) {
    return { status: 'missing' }
  }

  const rect = measureTargetRegistration(registration)

  return rect
    ? { status: 'ready', rect }
    : { status: 'pending' }
}

function hasUnsupportedPortalTransform(element: Element): boolean {
  const view = element.ownerDocument.defaultView
  let current: Element | null = element

  if (!view) {
    return true
  }

  while (current) {
    const style = view.getComputedStyle(current)
    const transform = style.transform

    if (transform && transform !== 'none') {
      const matrix = parseTransformMatrix(current, transform)

      if (
        !matrix
        || Math.abs(matrix.a - 1) > 0.000001
        || Math.abs(matrix.b) > 0.000001
        || Math.abs(matrix.c) > 0.000001
        || Math.abs(matrix.d - 1) > 0.000001
      ) {
        return true
      }
    }

    const scale = style.getPropertyValue('scale').trim()

    if (
      scale
      && scale !== 'none'
      && scale.split(/\s+/u).some((value) => Number.parseFloat(value) !== 1)
    ) {
      return true
    }

    const rotate = style.getPropertyValue('rotate').trim()

    if (
      rotate
      && rotate !== 'none'
      && Math.abs(parseTransformAngle(rotate) ?? 1) > 0.000001
    ) {
      return true
    }

    const perspective = style.getPropertyValue('perspective').trim()

    if (perspective && perspective !== 'none') {
      return true
    }

    const zoom = Number.parseFloat(style.getPropertyValue('zoom'))

    if (Number.isFinite(zoom) && Math.abs(zoom - 1) > 0.000001) {
      return true
    }

    current = current.parentElement
  }

  return false
}

function createPortalRoot(
  document: Document,
  anchor: HTMLElement,
): HTMLElement | null {
  if (!anchor.parentElement || anchor.ownerDocument !== document) {
    return null
  }

  const root = document.createElement('routeveil-shared-portal')
  root.setAttribute('data-routeveil-shared-portal', '')
  root.setAttribute('aria-hidden', 'true')
  root.inert = true
  root.style.setProperty('all', 'initial')
  root.style.setProperty('display', 'block', 'important')
  root.style.setProperty('position', 'fixed', 'important')
  root.style.setProperty('inset', '0', 'important')
  root.style.setProperty('box-sizing', 'border-box', 'important')
  root.style.setProperty('width', 'auto', 'important')
  root.style.setProperty('height', 'auto', 'important')
  root.style.setProperty('padding', '0', 'important')
  root.style.setProperty('margin', '0', 'important')
  root.style.setProperty('border', '0', 'important')
  root.style.setProperty('background', 'transparent', 'important')
  root.style.setProperty('opacity', '1', 'important')
  root.style.setProperty('visibility', 'visible', 'important')
  root.style.setProperty('transform', 'none', 'important')
  root.style.setProperty('filter', 'none', 'important')
  root.style.setProperty(
    'z-index',
    document.defaultView?.getComputedStyle(anchor).zIndex || 'auto',
    'important',
  )
  root.style.setProperty('overflow', 'hidden', 'important')
  root.style.setProperty('pointer-events', 'none', 'important')
  root.style.setProperty('contain', 'layout style paint', 'important')
  return root
}

function createViewSnapshotWrapper(
  document: Document,
  rect: SharedRect,
  borderRadius: string,
  overflow: string,
): HTMLElement {
  const wrapper = document.createElement('routeveil-shared-view')
  wrapper.setAttribute('data-routeveil-shared-view', '')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.inert = true
  wrapper.style.setProperty('all', 'initial')
  wrapper.style.setProperty('display', 'block', 'important')
  wrapper.style.setProperty('position', 'fixed', 'important')
  wrapper.style.setProperty('left', `${rect.left}px`)
  wrapper.style.setProperty('top', `${rect.top}px`)
  wrapper.style.setProperty('width', `${rect.width}px`)
  wrapper.style.setProperty('height', `${rect.height}px`)
  wrapper.style.setProperty('box-sizing', 'border-box', 'important')
  wrapper.style.setProperty('padding', '0', 'important')
  wrapper.style.setProperty('margin', '0', 'important')
  wrapper.style.setProperty('border', '0', 'important')
  wrapper.style.setProperty('background', 'transparent', 'important')
  wrapper.style.setProperty('z-index', '0', 'important')
  wrapper.style.setProperty('opacity', '0.001')
  wrapper.style.setProperty('visibility', 'visible', 'important')
  wrapper.style.setProperty('filter', 'none')
  wrapper.style.setProperty('transform', 'none')
  wrapper.style.setProperty('border-radius', borderRadius)
  wrapper.style.setProperty('overflow', overflow, 'important')
  wrapper.style.setProperty('pointer-events', 'none', 'important')
  wrapper.style.setProperty('backface-visibility', 'hidden', 'important')
  wrapper.style.setProperty('transform-origin', 'top left', 'important')
  wrapper.style.setProperty(
    'will-change',
    'opacity, transform, filter',
    'important',
  )
  return wrapper
}

function createWrapper(
  document: Document,
  name: string,
  rect: SharedRect,
  borderRadius: string,
  overflow: string,
): HTMLElement {
  const wrapper = document.createElement('routeveil-shared-element')
  wrapper.setAttribute('data-routeveil-shared-element', name)
  wrapper.style.setProperty('all', 'initial')
  wrapper.style.setProperty('display', 'block', 'important')
  wrapper.style.setProperty('position', 'fixed', 'important')
  wrapper.style.setProperty('left', `${rect.left}px`)
  wrapper.style.setProperty('top', `${rect.top}px`)
  wrapper.style.setProperty('width', `${rect.width}px`)
  wrapper.style.setProperty('height', `${rect.height}px`)
  wrapper.style.setProperty('box-sizing', 'border-box', 'important')
  wrapper.style.setProperty('padding', '0', 'important')
  wrapper.style.setProperty('margin', '0', 'important')
  wrapper.style.setProperty('border', '0', 'important')
  wrapper.style.setProperty('background', 'transparent', 'important')
  wrapper.style.setProperty('z-index', '1', 'important')
  wrapper.style.setProperty('opacity', '0.001', 'important')
  wrapper.style.setProperty('visibility', 'visible', 'important')
  wrapper.style.setProperty('filter', 'none', 'important')
  wrapper.style.setProperty('border-radius', borderRadius)
  wrapper.style.setProperty('overflow', overflow, 'important')
  wrapper.style.setProperty('pointer-events', 'none', 'important')
  wrapper.style.setProperty('backface-visibility', 'hidden', 'important')
  wrapper.style.setProperty('transform', 'translateZ(0)', 'important')
  wrapper.style.setProperty('transform-origin', 'top left', 'important')
  wrapper.style.setProperty(
    'will-change',
    'left, top, width, height, border-radius, opacity',
    'important',
  )
  return wrapper
}

function createOccludingSurfaceElement(
  document: Document,
  rect: SharedRect,
  phase: 'source' | 'target',
): HTMLElement {
  const surface = document.createElement('routeveil-shared-occluders')
  surface.setAttribute('data-routeveil-shared-occluders', phase)
  surface.setAttribute('aria-hidden', 'true')
  surface.inert = true
  surface.style.setProperty('all', 'initial')
  surface.style.setProperty('display', 'block', 'important')
  surface.style.setProperty('position', 'fixed', 'important')
  surface.style.setProperty('inset', 'auto', 'important')
  surface.style.setProperty('left', `${String(rect.left)}px`, 'important')
  surface.style.setProperty('top', `${String(rect.top)}px`, 'important')
  surface.style.setProperty('right', 'auto', 'important')
  surface.style.setProperty('bottom', 'auto', 'important')
  surface.style.setProperty('width', `${String(rect.width)}px`, 'important')
  surface.style.setProperty('height', `${String(rect.height)}px`, 'important')
  surface.style.setProperty('box-sizing', 'border-box', 'important')
  surface.style.setProperty('padding', '0', 'important')
  surface.style.setProperty('margin', '0', 'important')
  surface.style.setProperty('border', '0', 'important')
  surface.style.setProperty('background', 'transparent', 'important')
  surface.style.setProperty('z-index', '2', 'important')
  surface.style.setProperty('opacity', '0')
  surface.style.setProperty('visibility', 'visible', 'important')
  surface.style.setProperty('filter', 'none')
  surface.style.setProperty('transform', 'none')
  surface.style.setProperty('overflow', 'visible', 'important')
  surface.style.setProperty('pointer-events', 'none', 'important')
  surface.style.setProperty('transform-origin', 'top left', 'important')
  surface.style.setProperty(
    'will-change',
    phase === 'source' ? 'opacity, transform, filter' : 'opacity',
    'important',
  )
  return surface
}

function createOccludingLayerWrapper(
  document: Document,
  rect: SharedRect,
  surfaceRect: SharedRect,
  overflow: string,
): HTMLElement {
  const wrapper = document.createElement('routeveil-shared-occluder')
  wrapper.setAttribute('data-routeveil-shared-occluder', '')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.inert = true
  wrapper.style.setProperty('all', 'initial')
  wrapper.style.setProperty('display', 'block', 'important')
  wrapper.style.setProperty('position', 'absolute', 'important')
  wrapper.style.setProperty('inset', 'auto', 'important')
  wrapper.style.setProperty(
    'left',
    `${String(rect.left - surfaceRect.left)}px`,
    'important',
  )
  wrapper.style.setProperty(
    'top',
    `${String(rect.top - surfaceRect.top)}px`,
    'important',
  )
  wrapper.style.setProperty('right', 'auto', 'important')
  wrapper.style.setProperty('bottom', 'auto', 'important')
  wrapper.style.setProperty('width', `${String(rect.width)}px`, 'important')
  wrapper.style.setProperty('height', `${String(rect.height)}px`, 'important')
  wrapper.style.setProperty('box-sizing', 'border-box', 'important')
  wrapper.style.setProperty('padding', '0', 'important')
  wrapper.style.setProperty('margin', '0', 'important')
  wrapper.style.setProperty('border', '0', 'important')
  wrapper.style.setProperty('background', 'transparent', 'important')
  wrapper.style.setProperty('opacity', '1', 'important')
  wrapper.style.setProperty('visibility', 'visible', 'important')
  wrapper.style.setProperty('filter', 'none', 'important')
  wrapper.style.setProperty('transform', 'none', 'important')
  wrapper.style.setProperty('overflow', overflow, 'important')
  wrapper.style.setProperty('pointer-events', 'none', 'important')
  wrapper.style.setProperty('contain', 'layout style', 'important')
  wrapper.style.setProperty('transform-origin', 'top left', 'important')
  return wrapper
}

function parseStackingZIndex(style: CSSStyleDeclaration): number {
  const parsed = Number.parseInt(style.zIndex, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function createsStackingContext(
  element: Element,
  style: CSSStyleDeclaration,
): boolean {
  const position = style.position
  const zIndex = style.zIndex.trim()
  const parent = element.parentElement
  const parentStyle = parent
    ? element.ownerDocument.defaultView?.getComputedStyle(parent)
    : null
  const parentDisplay = parentStyle?.display || ''
  const isFlexOrGridItem = (
    parentDisplay.includes('flex')
    || parentDisplay.includes('grid')
  )

  if (position === 'fixed' || position === 'sticky') {
    return true
  }

  if (
    zIndex !== ''
    && zIndex !== 'auto'
    && (
      position === 'absolute'
      || position === 'relative'
      || isFlexOrGridItem
    )
  ) {
    return true
  }

  const opacity = Number.parseFloat(style.opacity)
  const contain = style.contain
  const willChange = style.willChange
  const backdropFilter = style.getPropertyValue('backdrop-filter')
    || style.getPropertyValue('-webkit-backdrop-filter')
  const mask = style.getPropertyValue('mask')
    || style.getPropertyValue('-webkit-mask')
  const maskImage = style.getPropertyValue('mask-image')
    || style.getPropertyValue('-webkit-mask-image')
  const containerType = style.getPropertyValue('container-type')
  const hasEffect = (value: string) => value !== '' && value !== 'none'

  return (
    (Number.isFinite(opacity) && opacity < 1)
    || (style.mixBlendMode !== '' && style.mixBlendMode !== 'normal')
    || hasEffect(style.transform)
    || hasEffect(style.filter)
    || hasEffect(backdropFilter)
    || hasEffect(style.perspective)
    || hasEffect(style.clipPath)
    || (mask !== '' && mask !== 'none')
    || (maskImage !== '' && maskImage !== 'none')
    || style.isolation === 'isolate'
    || contain.split(/\s+/u).some((value) => (
      value === 'layout'
      || value === 'paint'
      || value === 'strict'
      || value === 'content'
    ))
    || willChange.split(/\s*,\s*/u).some((value) => (
      value === 'opacity'
      || value === 'transform'
      || value === 'filter'
      || value === 'perspective'
      || value === 'clip-path'
      || value === 'mask'
      || value === 'mix-blend-mode'
    ))
    || (containerType !== '' && containerType !== 'normal')
  )
}

function isIndependentStackingLayer(style: CSSStyleDeclaration): boolean {
  const zIndex = style.zIndex.trim()

  return (
    style.position === 'fixed'
    || style.position === 'sticky'
    || (zIndex !== '' && zIndex !== 'auto')
  )
}

function getElementOrderMap(view: HTMLElement): Map<Element, number> {
  const order = new Map<Element, number>()
  const elements = [view, ...view.querySelectorAll('*')]

  for (let index = 0; index < elements.length; index += 1) {
    order.set(elements[index]!, index)
  }

  return order
}

function getStackingPath(
  element: Element,
  boundary: Element,
  order: ReadonlyMap<Element, number>,
): StackingPath {
  const ownerWindow = element.ownerDocument.defaultView

  if (!ownerWindow) {
    return []
  }

  const chain: Element[] = []
  let current: Element | null = element

  while (current && current !== boundary) {
    chain.push(current)
    current = current.parentElement
  }

  if (current !== boundary) {
    return []
  }

  chain.reverse()
  const path: StackingLevel[] = []

  for (const candidate of chain) {
    const style = ownerWindow.getComputedStyle(candidate)

    if (candidate === element || createsStackingContext(candidate, style)) {
      path.push({
        zIndex: parseStackingZIndex(style),
        order: order.get(candidate) ?? 0,
      })
    }
  }

  return path
}

function compareStackingPaths(
  first: StackingPath,
  second: StackingPath,
): number {
  const length = Math.max(first.length, second.length)

  for (let index = 0; index < length; index += 1) {
    const firstLevel = first[index]
    const secondLevel = second[index]

    if (!firstLevel || !secondLevel) {
      return first.length - second.length
    }

    if (firstLevel.zIndex !== secondLevel.zIndex) {
      return firstLevel.zIndex - secondLevel.zIndex
    }

    if (firstLevel.order !== secondLevel.order) {
      return firstLevel.order - secondLevel.order
    }
  }

  return 0
}

function getElementDepth(
  element: Element,
  boundary: Element,
): number {
  let depth = 0
  let current: Element | null = element

  while (current && current !== boundary) {
    depth += 1
    current = current.parentElement
  }

  return depth
}

function sampleIntersectionPoints(rect: SharedRect): Array<{
  x: number
  y: number
}> {
  const insetX = Math.min(2, rect.width / 4)
  const insetY = Math.min(2, rect.height / 4)
  const left = rect.left + insetX
  const right = rect.left + rect.width - insetX
  const top = rect.top + insetY
  const bottom = rect.top + rect.height - insetY
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  return [
    { x: centerX, y: centerY },
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ]
}

function getSubtreePaintIndex(
  stack: readonly Element[],
  root: Element,
): number {
  return stack.findIndex((element) => (
    element === root || root.contains(element)
  ))
}

function paintsAboveAtIntersection(
  candidate: Element,
  shared: Element,
  intersection: SharedRect,
): boolean {
  const document = candidate.ownerDocument

  if (typeof document.elementsFromPoint !== 'function') {
    return false
  }

  for (const point of sampleIntersectionPoints(intersection)) {
    let stack: Element[]

    try {
      stack = document.elementsFromPoint(point.x, point.y)
    } catch {
      continue
    }

    const candidateIndex = getSubtreePaintIndex(stack, candidate)
    const sharedIndex = getSubtreePaintIndex(stack, shared)

    if (
      candidateIndex >= 0
      && sharedIndex >= 0
      && candidateIndex < sharedIndex
    ) {
      return true
    }
  }

  return false
}

function isRelatedToAnySharedElement(
  element: Element,
  sharedElements: readonly Element[],
): boolean {
  return sharedElements.some((shared) => (
    element === shared
    || element.contains(shared)
    || shared.contains(element)
  ))
}

function getOccluderRoot(
  element: Element,
  sharedElements: readonly Element[],
  view: HTMLElement,
): Element {
  let current = element

  while (current.parentElement && current.parentElement !== view) {
    const parent = current.parentElement

    if (
      !view.contains(parent)
      || sharedElements.some((shared) => parent.contains(shared))
    ) {
      break
    }

    current = parent
  }

  return current
}

function collectOccluderCandidates({
  geometries,
  movementRegions,
  order,
  view,
}: {
  geometries: readonly OccluderGeometry[]
  movementRegions?: readonly SharedRect[]
  order: ReadonlyMap<Element, number>
  view: HTMLElement
}): OccluderGeometry[] {
  if (geometries.length === 0) {
    return []
  }

  const ownerWindow = view.ownerDocument.defaultView

  if (!ownerWindow) {
    return []
  }

  const sharedElements = geometries.map((geometry) => geometry.element)
  const capturedRegion = getCapturedVisualRect(view.ownerDocument)
  const roots = new Map<Element, OccluderGeometry>()

  for (const element of view.querySelectorAll('*')) {
    if (
      !isSupportedElement(element)
      || isRelatedToAnySharedElement(element, sharedElements)
    ) {
      continue
    }

    let rect: SharedRect

    try {
      rect = copyRect(element.getBoundingClientRect())
    } catch {
      continue
    }

    if (!isVisuallyMeasurable(element, rect)) {
      continue
    }

    if (
      capturedRegion.status === 'valid'
      && !intersectRects(rect, capturedRegion.rect)
    ) {
      continue
    }

    const directOccluder = geometries.some((geometry) => {
      const intersection = intersectRects(rect, geometry.rect)
      return Boolean(
        intersection
        && paintsAboveAtIntersection(
          element,
          geometry.element,
          intersection,
        )
      )
    })
    const style = ownerWindow.getComputedStyle(element)
    const intersectsMovement = !movementRegions || movementRegions.some(
      (region) => intersectRects(rect, region) !== null,
    )
    const stackingPath = getStackingPath(element, view, order)
    const independentOccluder = (
      intersectsMovement
      && isIndependentStackingLayer(style)
      && createsStackingContext(element, style)
      && geometries.some((geometry) => (
        compareStackingPaths(stackingPath, geometry.stackingPath) > 0
      ))
    )

    if (!directOccluder && !independentOccluder) {
      continue
    }

    const root = getOccluderRoot(element, sharedElements, view)

    if (
      isRelatedToAnySharedElement(root, sharedElements)
      || roots.has(root)
    ) {
      continue
    }

    let rootRect: SharedRect

    try {
      rootRect = copyRect(root.getBoundingClientRect())
    } catch {
      continue
    }

    if (!isVisuallyMeasurable(root, rootRect)) {
      continue
    }

    roots.set(root, {
      element: root,
      rect: rootRect,
      stackingPath: getStackingPath(root, view, order),
    })
  }

  const candidates = [...roots.values()].sort((first, second) => (
    getElementDepth(first.element, view)
      - getElementDepth(second.element, view)
    || (order.get(first.element) ?? 0) - (order.get(second.element) ?? 0)
  ))
  const selected: OccluderGeometry[] = []

  for (const candidate of candidates) {
    if (!selected.some((earlier) => (
      earlier.element.contains(candidate.element)
    ))) {
      selected.push(candidate)
    }
  }

  selected.sort((first, second) => (
    compareStackingPaths(first.stackingPath, second.stackingPath)
    || (order.get(first.element) ?? 0) - (order.get(second.element) ?? 0)
  ))
  return selected
}

function collectPromotedTargetCandidates({
  geometries,
  order,
  view,
}: {
  geometries: readonly OccluderGeometry[]
  order: ReadonlyMap<Element, number>
  view: HTMLElement
}): PromotedTargetCandidate[] {
  if (geometries.length === 0) {
    return []
  }

  const ownerWindow = view.ownerDocument.defaultView

  if (!ownerWindow) {
    return []
  }

  const sharedElements = geometries.map((geometry) => geometry.element)
  const capturedRegion = getCapturedVisualRect(view.ownerDocument)
  const candidates: PromotedTargetCandidate[] = []

  for (const element of view.querySelectorAll('*')) {
    if (
      !isSupportedElement(element)
      || isRelatedToAnySharedElement(element, sharedElements)
    ) {
      continue
    }

    const style = ownerWindow.getComputedStyle(element)

    if (
      !isIndependentStackingLayer(style)
      || !createsStackingContext(element, style)
    ) {
      continue
    }

    const stackingPath = getStackingPath(element, view, order)

    if (!geometries.some((geometry) => (
      compareStackingPaths(stackingPath, geometry.stackingPath) > 0
    ))) {
      continue
    }

    let rect: SharedRect

    try {
      rect = copyRect(element.getBoundingClientRect())
    } catch {
      continue
    }

    if (!isVisuallyMeasurable(element, rect)) {
      continue
    }

    if (
      capturedRegion.status === 'valid'
      && !intersectRects(rect, capturedRegion.rect)
    ) {
      continue
    }

    candidates.push({
      element,
      documentRect: toDocumentRect(element, rect),
      rect,
      stackingPath,
      order: order.get(element) ?? 0,
    })
  }

  candidates.sort((first, second) => (
    getElementDepth(first.element, view)
      - getElementDepth(second.element, view)
    || first.order - second.order
  ))

  const selected: PromotedTargetCandidate[] = []

  for (const candidate of candidates) {
    if (!selected.some((earlier) => (
      earlier.element.contains(candidate.element)
    ))) {
      selected.push(candidate)
    }
  }

  selected.sort((first, second) => (
    compareStackingPaths(first.stackingPath, second.stackingPath)
    || first.order - second.order
  ))
  return selected
}

function captureAndFreezeInlineStyles(
  root: HTMLElement | SVGElement,
): InlineStyleSnapshot[] {
  const elements = [root, ...root.querySelectorAll('*')]
    .filter(isSupportedElement)
  const frozen = elements.map((element) => {
    const computed = element.ownerDocument.defaultView?.getComputedStyle(element)
    const properties = computed
      ? Array.from({ length: computed.length }, (_, index) => {
          const property = computed.item(index)
          return {
            property,
            value: computed.getPropertyValue(property),
            priority: computed.getPropertyPriority(property),
          }
        })
      : []

    return {
      element,
      original: element.getAttribute('style'),
      properties,
    }
  })

  for (const entry of frozen) {
    for (const { property, value, priority } of entry.properties) {
      if (
        property.startsWith('animation-')
        || property === 'animation'
        || property.startsWith('transition-')
        || property === 'transition'
      ) {
        continue
      }

      entry.element.style.setProperty(property, value, priority)
    }
  }

  return frozen.map(({ element, original }) => ({
    element,
    value: original,
  }))
}

function restoreInlineStyles(
  snapshots: readonly InlineStyleSnapshot[],
): void {
  for (const snapshot of snapshots) {
    if (snapshot.value === null) {
      snapshot.element.removeAttribute('style')
    } else {
      snapshot.element.setAttribute('style', snapshot.value)
    }
  }
}

function createPromotedTargetPlaceholder(
  element: HTMLElement | SVGElement,
  rect: SharedRect,
): HTMLElement {
  const document = element.ownerDocument
  const placeholder = document.createElement('routeveil-shared-placeholder')
  const style = document.defaultView?.getComputedStyle(element)

  placeholder.setAttribute('data-routeveil-shared-placeholder', '')
  placeholder.setAttribute('aria-hidden', 'true')
  placeholder.inert = true
  placeholder.style.setProperty('all', 'initial')
  placeholder.style.setProperty('visibility', 'hidden', 'important')
  placeholder.style.setProperty('pointer-events', 'none', 'important')

  if (!style) {
    placeholder.style.setProperty('display', 'block', 'important')
    placeholder.style.setProperty('width', `${String(rect.width)}px`, 'important')
    placeholder.style.setProperty('height', `${String(rect.height)}px`, 'important')
    return placeholder
  }

  // Absolutely/fixed positioned elements do not reserve layout space. The
  // placeholder only acts as a stable DOM restoration marker for them.
  if (style.position === 'absolute' || style.position === 'fixed') {
    placeholder.style.setProperty('display', 'none', 'important')
    return placeholder
  }

  const display = style.display === 'inline' ? 'inline-block' : style.display

  placeholder.style.setProperty('display', display || 'block', 'important')
  placeholder.style.setProperty('box-sizing', 'border-box', 'important')
  placeholder.style.setProperty('width', `${String(rect.width)}px`, 'important')
  placeholder.style.setProperty('height', `${String(rect.height)}px`, 'important')
  placeholder.style.setProperty('min-width', `${String(rect.width)}px`, 'important')
  placeholder.style.setProperty('min-height', `${String(rect.height)}px`, 'important')
  placeholder.style.setProperty('max-width', `${String(rect.width)}px`, 'important')
  placeholder.style.setProperty('max-height', `${String(rect.height)}px`, 'important')
  placeholder.style.setProperty('margin-top', style.marginTop, 'important')
  placeholder.style.setProperty('margin-right', style.marginRight, 'important')
  placeholder.style.setProperty('margin-bottom', style.marginBottom, 'important')
  placeholder.style.setProperty('margin-left', style.marginLeft, 'important')
  placeholder.style.setProperty('vertical-align', style.verticalAlign, 'important')
  placeholder.style.setProperty('float', style.cssFloat, 'important')
  placeholder.style.setProperty('clear', style.clear, 'important')

  // Preserve flex/grid item participation so removing the real element does
  // not reflow siblings while it is temporarily promoted above the portal.
  placeholder.style.setProperty('flex-grow', style.flexGrow, 'important')
  placeholder.style.setProperty('flex-shrink', style.flexShrink, 'important')
  placeholder.style.setProperty('flex-basis', style.flexBasis, 'important')
  placeholder.style.setProperty('order', style.order, 'important')
  placeholder.style.setProperty('align-self', style.alignSelf, 'important')
  placeholder.style.setProperty('justify-self', style.justifySelf, 'important')
  placeholder.style.setProperty('grid-area', style.gridArea, 'important')
  placeholder.style.setProperty('grid-row-start', style.gridRowStart, 'important')
  placeholder.style.setProperty('grid-row-end', style.gridRowEnd, 'important')
  placeholder.style.setProperty('grid-column-start', style.gridColumnStart, 'important')
  placeholder.style.setProperty('grid-column-end', style.gridColumnEnd, 'important')

  // Inline-level boxes derive their line-box contribution from a baseline.
  // An empty custom placeholder gets a synthesized baseline that can differ
  // from the real element's content baseline (notably inline-grid/flex
  // controls). That changes the following block's Y position by a few pixels
  // while the real element is promoted, which makes the shared target and the
  // promoted element snap together when the real node is restored. Keep a
  // non-visual full-size baseline participant so the placeholder contributes
  // the same bottom-edge baseline as the occupied inline box without cloning
  // any user content.
  if (display.startsWith('inline')) {
    const baseline = document.createElement('routeveil-shared-placeholder-baseline')
    baseline.setAttribute('aria-hidden', 'true')
    baseline.inert = true
    baseline.style.setProperty('all', 'initial')
    baseline.style.setProperty('display', 'block', 'important')
    baseline.style.setProperty('width', '100%', 'important')
    baseline.style.setProperty('height', '100%', 'important')
    baseline.style.setProperty('min-width', '0', 'important')
    baseline.style.setProperty('min-height', '0', 'important')
    baseline.style.setProperty('margin', '0', 'important')
    baseline.style.setProperty('padding', '0', 'important')
    baseline.style.setProperty('border', '0', 'important')
    baseline.style.setProperty('pointer-events', 'none', 'important')
    placeholder.append(baseline)
  }

  return placeholder
}

function createPromotedTargetWrapper(
  document: Document,
  rect: SharedRect,
  rootOrigin: { left: number; top: number },
  transformOrigin: { x: number; y: number },
): HTMLElement {
  const wrapper = document.createElement('routeveil-shared-promoted-target')
  wrapper.setAttribute('data-routeveil-shared-promoted-target', '')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.inert = true
  wrapper.style.setProperty('all', 'initial')
  wrapper.style.setProperty('display', 'block', 'important')
  wrapper.style.setProperty('position', 'absolute', 'important')
  wrapper.style.setProperty('inset', 'auto', 'important')
  wrapper.style.setProperty(
    'left',
    `${String(rect.left - rootOrigin.left)}px`,
    'important',
  )
  wrapper.style.setProperty(
    'top',
    `${String(rect.top - rootOrigin.top)}px`,
    'important',
  )
  wrapper.style.setProperty('right', 'auto', 'important')
  wrapper.style.setProperty('bottom', 'auto', 'important')
  wrapper.style.setProperty('width', `${String(rect.width)}px`, 'important')
  wrapper.style.setProperty('height', `${String(rect.height)}px`, 'important')
  wrapper.style.setProperty('box-sizing', 'border-box', 'important')
  wrapper.style.setProperty('padding', '0', 'important')
  wrapper.style.setProperty('margin', '0', 'important')
  wrapper.style.setProperty('border', '0', 'important')
  wrapper.style.setProperty('background', 'transparent', 'important')
  // These are animated by WAAPI during enter, so they cannot be !important.
  wrapper.style.setProperty('opacity', '1')
  wrapper.style.setProperty('visibility', 'visible', 'important')
  wrapper.style.setProperty('filter', 'none')
  wrapper.style.setProperty('transform', 'none')
  wrapper.style.setProperty('overflow', 'visible', 'important')
  wrapper.style.setProperty('pointer-events', 'none', 'important')
  wrapper.style.setProperty(
    'transform-origin',
    `${String(transformOrigin.x)}px ${String(transformOrigin.y)}px`,
    'important',
  )
  wrapper.style.setProperty(
    'will-change',
    'opacity, transform, filter',
    'important',
  )
  return wrapper
}

function createOccludingSurface({
  candidates,
  phase,
  view,
  visualBoundary,
}: {
  candidates: readonly OccluderGeometry[]
  phase: 'source' | 'target'
  view: HTMLElement
  visualBoundary: Element
}): OccludingSurface | null {
  if (candidates.length === 0) {
    return null
  }

  let viewRect: SharedRect

  try {
    viewRect = copyRect(view.getBoundingClientRect())
  } catch {
    return null
  }

  if (!isUsableRect(viewRect)) {
    return null
  }

  const surface = createOccludingSurfaceElement(
    view.ownerDocument,
    viewRect,
    phase,
  )
  let appended = 0

  for (const candidate of candidates) {
    const clone = cloneVisualElement(candidate.element)

    if (!clone) {
      continue
    }

    const wrapper = createOccludingLayerWrapper(
      view.ownerDocument,
      candidate.rect,
      viewRect,
      getOverflow(candidate.element),
    )
    wrapper.style.setProperty(
      'z-index',
      String(appended + 1),
      'important',
    )
    prepareVisualRoot(clone, candidate.element, visualBoundary)
    wrapper.append(clone)
    surface.append(wrapper)
    appended += 1
  }

  return appended > 0 ? { element: surface } : null
}

function getBorderRadius(element: Element): string {
  return element.ownerDocument.defaultView?.getComputedStyle(element)
    .borderRadius || '0px'
}

function getFrameStyle(element: Element): FrameStyle {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)
  const frame = {} as FrameStyle

  for (const [property, cssProperty] of FRAME_STYLE_PROPERTIES) {
    frame[property] = style?.getPropertyValue(cssProperty) || ''
  }

  return frame
}

function applyFrameStyle(element: Element, frame: FrameStyle): void {
  if (!isSupportedElement(element)) {
    return
  }

  for (const [property, cssProperty] of FRAME_STYLE_PROPERTIES) {
    element.style.setProperty(cssProperty, frame[property], 'important')
  }
}

function equalFrameStyles(first: FrameStyle, second: FrameStyle): boolean {
  return FRAME_STYLE_PROPERTIES.every(([property]) => (
    first[property] === second[property]
  ))
}

function getStyleMorphSnapshots(
  element: Element,
): StyleMorphSnapshot[] {
  return [element, ...element.querySelectorAll('*')].map((candidate) => {
    const style = isSupportedElement(candidate) ? candidate.style : null
    const snapshot = {} as StyleMorphSnapshot

    for (const [property, cssProperty] of STYLE_MORPH_PROPERTIES) {
      snapshot[property] = style?.getPropertyValue(cssProperty) || ''
    }

    return snapshot
  })
}

function createStyleMorphEntries(
  sourceClone: Element,
  targetClone: Element,
): StyleMorphEntry[] | null {
  const sourceElements = [sourceClone, ...sourceClone.querySelectorAll('*')]
  const targetElements = [targetClone, ...targetClone.querySelectorAll('*')]
  const sourceStyles = getStyleMorphSnapshots(sourceClone)
  const targetStyles = getStyleMorphSnapshots(targetClone)

  if (
    sourceStyles.length !== sourceElements.length
    || sourceStyles.length !== targetElements.length
    || sourceStyles.length !== targetStyles.length
  ) {
    return null
  }

  const entries: StyleMorphEntry[] = []

  for (let index = 0; index < sourceStyles.length; index += 1) {
    const sourceStyle = sourceStyles[index]
    const targetStyle = targetStyles[index]
    const clone = sourceElements[index]
    const source: Partial<StyleMorphSnapshot> = {}
    const destination: Partial<StyleMorphSnapshot> = {}

    if (!sourceStyle || !targetStyle || !clone) {
      return null
    }

    for (const [property, cssProperty] of STYLE_MORPH_PROPERTIES) {
      if (
        index === 0
        && ROOT_FRAME_COMPARISON_PROPERTIES.has(cssProperty)
      ) {
        continue
      }

      if (
        property === 'transformOrigin'
        && (!sourceStyle.transform || sourceStyle.transform === 'none')
        && (!targetStyle.transform || targetStyle.transform === 'none')
      ) {
        continue
      }

      if (sourceStyle[property] === targetStyle[property]) {
        continue
      }

      if (
        sourceStyle[property].includes('url(#routeveil-shared-clone-')
        || targetStyle[property].includes('url(#routeveil-shared-clone-')
      ) {
        continue
      }

      source[property] = sourceStyle[property]
      destination[property] = targetStyle[property]
    }

    if (Object.keys(source).length > 0) {
      entries.push({
        clone,
        source,
        target: destination,
      })
    }
  }

  return entries
}

function applyStyleMorph(
  element: Element,
  style: Partial<StyleMorphSnapshot>,
): void {
  if (!isSupportedElement(element)) {
    return
  }

  for (const [property, cssProperty] of STYLE_MORPH_PROPERTIES) {
    const value = style[property]

    if (value !== undefined) {
      element.style.setProperty(cssProperty, value, 'important')
    }
  }
}

function getOverflow(element: Element): string {
  return element.ownerDocument.defaultView?.getComputedStyle(element)
    .overflow || 'visible'
}

function getVisualOpacity(
  element: Element,
  stopBefore: Element | null = null,
): number {
  const view = element.ownerDocument.defaultView
  let opacity = 1
  let current: Element | null = element

  if (!view) {
    return opacity
  }

  while (current && current !== stopBefore) {
    const currentStyle = view.getComputedStyle(current)
    const value = getEffectiveOpacity(current, currentStyle)

    if (Number.isFinite(value)) {
      opacity *= value
    }

    current = current.parentElement
  }

  return Math.min(1, Math.max(0, opacity))
}

function getVisualFilter(
  element: Element,
  stopBefore: Element | null = null,
): string {
  const view = element.ownerDocument.defaultView
  const filters: string[] = []
  let current: Element | null = element

  if (!view) {
    return 'none'
  }

  while (current && current !== stopBefore) {
    const filter = view.getComputedStyle(current).filter

    if (filter && filter !== 'none') {
      filters.push(filter)
    }

    current = current.parentElement
  }

  return filters.length > 0 ? filters.join(' ') : 'none'
}

function getElementIdentityState(element: Element): string {
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'img') {
    const image = element as HTMLImageElement
    return image.currentSrc || image.src || image.getAttribute('src') || ''
  }

  if (tagName === 'video') {
    const video = element as HTMLVideoElement
    return JSON.stringify([
      video.currentSrc || video.src || video.getAttribute('src') || '',
      video.poster,
    ])
  }

  if (tagName === 'input') {
    const input = element as HTMLInputElement
    return JSON.stringify([
      input.type,
      input.value,
      input.checked,
      input.indeterminate,
    ])
  }

  if (tagName === 'textarea') {
    return (element as HTMLTextAreaElement).value
  }

  if (tagName === 'select') {
    return (element as HTMLSelectElement).value
  }

  if (tagName === 'source') {
    return JSON.stringify([
      element.getAttribute('src') || '',
      element.getAttribute('srcset') || '',
      element.getAttribute('media') || '',
      element.getAttribute('type') || '',
    ])
  }

  if (tagName === 'iframe' || tagName === 'audio' || tagName === 'embed') {
    return element.getAttribute('src') || ''
  }

  if (tagName === 'object') {
    return element.getAttribute('data') || ''
  }

  return ''
}

function getIdentityAttributes(element: Element): string {
  if (element.namespaceURI !== 'http://www.w3.org/2000/svg') {
    return ''
  }

  return [...element.attributes]
    .filter((attribute) => (
      !SVG_PRESENTATION_ATTRIBUTES.has(attribute.name.toLowerCase())
      || attribute.value.includes('url(')
    ))
    .map((attribute) => [attribute.namespaceURI, attribute.name, attribute.value])
    .sort((first, second) => String(first[1]).localeCompare(String(second[1])))
    .map((attribute) => JSON.stringify(attribute))
    .join('\u0000')
}

function getVisualIdentity(element: Element): string {
  const serialize = (node: Node, root: boolean): string => {
    if (node.nodeType === 3) {
      return `t:${JSON.stringify(node.textContent || '')}`
    }

    if (node.nodeType !== 1) {
      return ''
    }

    const candidate = node as Element
    const tagName = candidate.tagName.toLowerCase()
    const children = tagName === 'script' || tagName === 'style'
      ? ''
      : [...candidate.childNodes]
          .map((child) => serialize(child, false))
          .join('\u0001')
    const identityTag = root && HEADING_TAG_NAMES.has(tagName)
      ? 'heading'
      : tagName

    return JSON.stringify([
      candidate.namespaceURI,
      identityTag,
      getElementIdentityState(candidate),
      getIdentityAttributes(candidate),
      children,
    ])
  }

  return serialize(element, true)
}

function containsVideo(element: Element): boolean {
  return (
    element.tagName.toLowerCase() === 'video'
    || element.querySelector('video') !== null
  )
}

function targetCandidates(
  source: SourceEntry,
  registrations: Iterable<SharedElementRegistration>,
  view: HTMLElement,
  targetCutoff: number,
): SharedElementRegistration[] {
  return registrationsInView(registrations, view).filter((registration) => (
    registration !== source.registration
    && registration.name === source.registration.name
    && registration.order > targetCutoff
  ))
}

export class SharedElementSession {
  readonly names: readonly string[]

  private readonly root: HTMLElement
  private readonly sources: SourceEntry[]
  private readonly visualBoundary: Element
  private readonly snapshotWrapper: HTMLElement
  private readonly snapshotReadinessElements: readonly Element[]
  private readonly sourceOccluderSurface: OccludingSurface | null
  private readonly targetPromotionCandidates: PromotedTargetCandidate[] = []
  private readonly promotedTargetLayers: PromotedTargetLayer[] = []
  private readonly viewOpacity = new Map<HTMLElement, StyleOwnership>()
  private readonly sessionAnimations = new Set<Animation>()
  private readonly sourceOccluderAnimations = new Set<Animation>()
  private releaseFixedTracking: (() => void) | null = null
  private sourceHandoffFrozen = false
  private sourceOccluderAnimationsMirrored = false
  private snapshotRemoved = false
  private activated = false
  private cleaned = false
  private targetCutoff: number

  constructor(
    root: HTMLElement,
    sources: SourceEntry[],
    visualBoundary: Element,
    snapshotWrapper: HTMLElement,
    snapshotClone: Element,
    sourceOccluderSurface: OccludingSurface | null,
    targetCutoff: number,
    snapshotReadinessElements?: readonly Element[],
  ) {
    this.root = root
    this.sources = sources
    this.visualBoundary = visualBoundary
    this.snapshotWrapper = snapshotWrapper
    this.sourceOccluderSurface = sourceOccluderSurface
    this.snapshotReadinessElements = snapshotReadinessElements
      ?? [snapshotClone]
    this.targetCutoff = targetCutoff
    this.names = sources.map((source) => source.registration.name)
    const view = root.ownerDocument.defaultView

    if (view) {
      const align = () => this.alignFixedSources()
      view.addEventListener('scroll', align, true)
      this.releaseFixedTracking = () => {
        view.removeEventListener('scroll', align, true)
        this.releaseFixedTracking = null
      }
    }
  }

  async activate(
    view: HTMLElement,
    signal: AbortSignal,
  ): Promise<boolean> {
    if (this.cleaned || signal.aborted) {
      return false
    }

    if (this.activated) {
      return true
    }

    const ready = await waitForElementsPaintReady(
      [
        ...this.snapshotReadinessElements,
        ...this.sources.map((source) => source.sourceClone),
        ...(this.sourceOccluderSurface
          ? [this.sourceOccluderSurface.element]
          : []),
      ],
      signal,
    )

    if (
      !ready
      || this.cleaned
      || signal.aborted
      || !await waitForSharedPaint(this.root.ownerDocument, signal)
    ) {
      return false
    }

    this.snapshotWrapper.style.setProperty('opacity', '1')
    this.suppressView(view)
    this.stageSourceCoverage()

    if (!await waitForSharedPaint(this.root.ownerDocument, signal, 2)) {
      return false
    }

    this.activated = true
    return true
  }

  setTargetCutoff(order: number, freezeSourceHandoff: boolean): void {
    this.targetCutoff = order

    if (freezeSourceHandoff) {
      this.freezeSourceHandoff()
    }
  }

  suppressView(view: HTMLElement): void {
    if (!this.viewOpacity.has(view)) {
      this.viewOpacity.set(view, ownOpacity(view))
    }
  }

  resolveScrollTarget(
    registrations: Iterable<SharedElementRegistration>,
    view: HTMLElement,
    name: string,
  ): SharedScrollTargetResolution {
    const viewOwnership = this.viewOpacity.get(view)

    return temporarilyRestoreStyle(viewOwnership, () => (
      resolveSharedElementScrollTarget({
        registrations,
        view,
        name,
        targetCutoff: this.targetCutoff,
      })
    ))
  }

  targetsReady(
    registrations: Iterable<SharedElementRegistration>,
    view: HTMLElement,
    measureGeometry: boolean,
  ): boolean {
    const registrationList = [...registrations]
    const viewOwnership = this.viewOpacity.get(view)
    const check = () => this.sources.every((source) => {
      const candidates = targetCandidates(
        source,
        registrationList,
        view,
        this.targetCutoff,
      )
      const registration = candidates.length === 1 ? candidates[0] : null

      if (!registration) {
        return true
      }

      if (!hasReadyImages(registration.element)) {
        return false
      }

      if (!measureGeometry) {
        return true
      }

      return measureTargetRegistration(
        registration,
        registration.element === source.registration.element
          ? source.sourceOpacity ?? undefined
          : undefined,
      ) !== null
    })

    return measureGeometry
      ? temporarilyRestoreStyle(viewOwnership, check)
      : check()
  }

  prepareTargets(
    registrations: Iterable<SharedElementRegistration>,
    view: HTMLElement,
  ): SharedTargetPreparation {
    const matchedNames: string[] = []
    const missingNames: string[] = []
    const duplicateNames: string[] = []
    const registrationList = [...registrations]
    const viewOwnership = this.viewOpacity.get(view)
    const stackingOrder = getElementOrderMap(view)
    const preparations = temporarilyRestoreStyle(viewOwnership, () => (
      this.sources.map((source) => {
        const candidates = targetCandidates(
          source,
          registrationList,
          view,
          this.targetCutoff,
        )
        const measuredCandidates = candidates.flatMap((registration) => {
          const sourceOpacity = registration.element
            === source.registration.element
            ? source.sourceOpacity ?? undefined
            : undefined
          const rect = measureTargetRegistration(registration, sourceOpacity)

          return rect ? [{ registration, rect, sourceOpacity }] : []
        })

        if (measuredCandidates.length > 1) {
          duplicateNames.push(source.registration.name)
          return null
        }

        const measured = measuredCandidates[0]

        if (!measured) {
          missingNames.push(source.registration.name)
          return null
        }

        const { registration, rect, sourceOpacity } = measured

        return temporarilyRestoreStyle(sourceOpacity, () => {
          try {
            const targetVisualIdentity = getVisualIdentity(registration.element)
            const differentVisual = (
              containsVideo(source.registration.element)
              || containsVideo(registration.element)
              || source.visualIdentity !== targetVisualIdentity
            )
            const clone = cloneVisualElement(registration.element)

            if (!clone) {
              missingNames.push(source.registration.name)
              return null
            }

            return {
              source,
              registration,
              rect,
              borderRadius: getBorderRadius(registration.element),
              frameStyle: getFrameStyle(registration.element),
              stackingPath: getStackingPath(
                registration.element,
                view,
                stackingOrder,
              ),
              visualOpacity: getVisualOpacity(
                registration.element,
                this.visualBoundary,
              ),
              clone,
              differentVisual,
            }
          } catch {
            missingNames.push(source.registration.name)
            return null
          }
        })
      })
    ))
    const matchedPreparations = preparations.filter(
      (preparation) => preparation !== null,
    )
    const matchedTargetRegistrations = matchedPreparations.map(
      (preparation) => preparation.registration,
    )
    const matchedSourceTokens = new Set(matchedPreparations.map(
      (preparation) => preparation.source.registration.token,
    ))

    temporarilyRestoreStyle(viewOwnership, () => {
      const targetGeometries: OccluderGeometry[] = matchedPreparations.map(
        (preparation) => ({
          element: preparation.registration.element,
          rect: preparation.rect,
          stackingPath: preparation.stackingPath,
        }),
      )
      this.replaceTargetPromotionCandidates(collectPromotedTargetCandidates({
        geometries: targetGeometries,
        order: stackingOrder,
        view,
      }))

      for (const preparation of matchedPreparations) {
        createCloneExclusions(
          preparation.registration.element,
          preparation.clone,
          matchedTargetRegistrations,
        )
        prepareVisualRoot(
          preparation.clone,
          preparation.registration.element,
          this.visualBoundary,
        )
        const styleMorphs = preparation.differentVisual
          ? null
          : createStyleMorphEntries(
              preparation.source.sourceClone,
              preparation.clone,
            )
        const visualClone = styleMorphs === null ? preparation.clone : null
        const target: TargetEntry = {
          registration: preparation.registration,
          rect: preparation.rect,
          documentRect: toDocumentRect(
            preparation.registration.element,
            preparation.rect,
          ),
          borderRadius: preparation.borderRadius,
          frameStyle: preparation.frameStyle,
          stackingPath: preparation.stackingPath,
          styleMorphs: styleMorphs || [],
          visualOpacity: preparation.visualOpacity,
          opacity: ownOpacity(preparation.registration.element),
          clone: visualClone,
        }
        preparation.source.target = target
        matchedNames.push(preparation.source.registration.name)

        if (target.clone) {
          if (isSupportedElement(target.clone)) {
            target.clone.style.opacity = '0'
          }

          preparation.source.wrapper.append(target.clone)
        }
      }
    })

    const matchedSet = new Set(matchedNames)

    for (const source of this.sources) {
      updateCloneExclusions(source.cloneExclusions, matchedSourceTokens)

      if (!matchedSet.has(source.registration.name)) {
        if (source.snapshotOpacity) {
          restoreStyle(source.snapshotOpacity)
          source.snapshotOpacity = null
        }

        source.wrapper.remove()
        continue
      }

      if (source.snapshotElement && isSupportedElement(source.snapshotElement)) {
        source.snapshotOpacity ??= ownOpacity(source.snapshotElement)
      }

      source.wrapper.style.setProperty('opacity', '1', 'important')
    }

    return {
      matchedNames,
      missingNames: [...new Set(missingNames)],
      duplicateNames: [...new Set(duplicateNames)],
    }
  }

  async prepareMovement(signal: AbortSignal): Promise<boolean> {
    if (this.cleaned || signal.aborted) {
      return false
    }

    const elements: Element[] = []

    for (const source of this.sources) {
      if (!source.target) {
        continue
      }

      elements.push(source.sourceClone)

      if (source.target.clone) {
        elements.push(source.target.clone)
      }
    }

    const ready = (
      await waitForElementsPaintReady(elements, signal)
      && await waitForSharedPaint(this.root.ownerDocument, signal)
    )

    return ready
  }

  async animate(
    signal: AbortSignal,
    onAnimation: (animation: Animation) => void,
    startDelay = 0,
  ): Promise<boolean> {
    if (signal.aborted) {
      return false
    }

    const animations: Animation[] = []
    const movementRects = this.prepareDocumentMovement()
    this.mirrorSnapshotAnimationsToSourceOccluders()

    for (const source of this.sources) {
      const target = source.target
      const movement = movementRects.get(source)

      if (!target || !movement) {
        continue
      }

      try {
        const animation = source.wrapper.animate([
          {
            left: `${movement.source.left}px`,
            top: `${movement.source.top}px`,
            width: `${movement.source.width}px`,
            height: `${movement.source.height}px`,
            borderRadius: source.borderRadius,
          },
          {
            left: `${movement.target.left}px`,
            top: `${movement.target.top}px`,
            width: `${movement.target.width}px`,
            height: `${movement.target.height}px`,
            borderRadius: target.borderRadius,
          },
        ], {
          delay: startDelay,
          duration: SHARED_DURATION_MS,
          easing: SHARED_EASING,
          fill: 'forwards',
        })
        animations.push(animation)
        this.sessionAnimations.add(animation)
        onAnimation(animation)
      } catch {
        source.wrapper.style.left = `${movement.target.left}px`
        source.wrapper.style.top = `${movement.target.top}px`
        source.wrapper.style.width = `${movement.target.width}px`
        source.wrapper.style.height = `${movement.target.height}px`
        source.wrapper.style.borderRadius = target.borderRadius
      }

      if (
        !target.clone
        && isSupportedElement(source.sourceClone)
        && !equalFrameStyles(source.frameStyle, target.frameStyle)
      ) {
        try {
          const frameAnimation = source.sourceClone.animate([
            { ...source.frameStyle },
            { ...target.frameStyle },
          ], {
            delay: startDelay,
            duration: SHARED_DURATION_MS,
            easing: SHARED_EASING,
            fill: 'forwards',
          })
          animations.push(frameAnimation)
          this.sessionAnimations.add(frameAnimation)
          onAnimation(frameAnimation)
        } catch {
          applyFrameStyle(source.sourceClone, target.frameStyle)
        }
      }

      if (!target.clone) {
        for (const morph of target.styleMorphs) {
          try {
            const styleAnimation = morph.clone.animate([
              { ...morph.source },
              { ...morph.target },
            ], {
              delay: startDelay,
              duration: SHARED_DURATION_MS,
              easing: SHARED_EASING,
              fill: 'forwards',
            })
            animations.push(styleAnimation)
            this.sessionAnimations.add(styleAnimation)
            onAnimation(styleAnimation)
          } catch {
            applyStyleMorph(morph.clone, morph.target)
          }
        }
      }

      if (target.clone && isSupportedElement(target.clone)) {
        const fadeAnimations: Animation[] = []

        try {
          const sourceFade = source.sourceClone.animate([
            {
              borderRadius: source.borderRadius,
              opacity: source.visualOpacity,
              offset: 0,
            },
            {
              borderRadius: source.borderRadius,
              opacity: source.visualOpacity,
              offset: 0.68,
            },
            {
              borderRadius: target.borderRadius,
              opacity: 0,
              offset: 1,
            },
          ], {
            delay: startDelay,
            duration: SHARED_DURATION_MS,
            easing: SHARED_EASING,
            fill: 'forwards',
          })
          fadeAnimations.push(sourceFade)

          const targetFade = target.clone.animate([
            {
              borderRadius: source.borderRadius,
              opacity: 0,
              offset: 0,
            },
            {
              borderRadius: source.borderRadius,
              opacity: 0,
              offset: 0.68,
            },
            {
              borderRadius: target.borderRadius,
              opacity: target.visualOpacity,
              offset: 1,
            },
          ], {
            delay: startDelay,
            duration: SHARED_DURATION_MS,
            easing: SHARED_EASING,
            fill: 'forwards',
          })
          fadeAnimations.push(targetFade)

          for (const fadeAnimation of fadeAnimations) {
            animations.push(fadeAnimation)
            this.sessionAnimations.add(fadeAnimation)
            onAnimation(fadeAnimation)
          }
        } catch {
          cancelAnimations(fadeAnimations)

          if (isSupportedElement(source.sourceClone)) {
            applyFrameStyle(source.sourceClone, target.frameStyle)
            source.sourceClone.style.opacity = '0'
          }

          applyFrameStyle(target.clone, target.frameStyle)
          target.clone.style.opacity = String(target.visualOpacity)
        }
      }
    }

    if (animations.length === 0) {
      this.settleAtTargets(movementRects)
      return true
    }

    const view = this.root.ownerDocument.defaultView
    let animationRejected = false

    const completed = await new Promise<boolean>((resolve) => {
      let settled = false

      const finish = (result: boolean) => {
        if (settled) {
          return
        }

        settled = true
        signal.removeEventListener('abort', abort)
        view?.removeEventListener('resize', preserveAtTarget)
        view?.removeEventListener('orientationchange', preserveAtTarget)
        resolve(result)
      }
      const abort = () => {
        cancelAnimations(animations)
        finish(false)
      }
      const preserveAtTarget = () => {
        cancelAnimations(animations)
        this.settleAtTargets(movementRects)
        finish(true)
      }

      if (signal.aborted) {
        abort()
        return
      }

      signal.addEventListener('abort', abort, { once: true })
      view?.addEventListener('resize', preserveAtTarget, { once: true })
      view?.addEventListener(
        'orientationchange',
        preserveAtTarget,
        { once: true },
      )
      void Promise.all(animations.map(async (animation) => {
        try {
          await animation.finished
        } catch {
          animationRejected = true
          return
        }
      })).then(
        () => finish(true),
        () => finish(true),
      )
    })

    if (completed && animationRejected) {
      this.settleAtTargets(movementRects)
    }

    return completed
  }

  async handoff(
    signal: AbortSignal,
    onAnimation: (animation: Animation) => void,
  ): Promise<void> {
    void onAnimation

    if (signal.aborted || this.cleaned) {
      return
    }

    this.releaseFixedTracking?.()
    const targetElements = this.sources.flatMap((source) => (
      source.target ? [source.target.registration.element] : []
    ))

    await waitForElementsPaintReady(targetElements, signal)

    if (signal.aborted || this.cleaned) {
      return
    }

    // When real target stacking layers are promoted into the shared portal,
    // keep the shared wrapper in that same stacking root for handoff. Moving
    // it into a detached sibling root would create a new top-level stacking
    // context that paints above the promoted real elements, briefly flipping
    // their z-order during the final shared fade.
    const detachedRoot = this.promotedTargetLayers.length > 0
      ? null
      : createDetachedHandoffRoot(
          this.root,
          this.visualBoundary,
        )
    const detachedEntries = detachedRoot
      ? this.sources.flatMap((source) => {
          const frozen = freezeWrapperAtTarget(source)

          if (!frozen) {
            return []
          }

          const entry = anchorFrozenWrapper(detachedRoot, frozen)

          return entry ? [entry] : []
        })
      : []

    if (detachedRoot && detachedEntries.length > 0) {
      this.revealTargets()
      scheduleDetachedSharedHandoff(
        detachedRoot,
        detachedEntries,
        this.visualBoundary,
      )
      await waitForSharedPaint(this.root.ownerDocument, signal, 1)
      return
    }

    detachedRoot?.remove()

    await waitForTargetVisualStability(
      targetElements,
      this.visualBoundary,
      signal,
    )

    if (signal.aborted || this.cleaned) {
      return
    }

    await waitForSharedPaint(this.root.ownerDocument, signal, 1)

    if (signal.aborted || this.cleaned) {
      return
    }

    this.revealTargets()

    if (!await waitForSharedPaint(this.root.ownerDocument, signal)) {
      return
    }

    const animations: Animation[] = []

    for (const source of this.sources) {
      if (!source.target) {
        continue
      }

      try {
        const animation = source.wrapper.animate([
          { opacity: 1 },
          { opacity: 0 },
        ], {
          duration: SHARED_HANDOFF_DURATION_MS,
          easing: 'linear',
          fill: 'forwards',
        })
        animations.push(animation)
        this.sessionAnimations.add(animation)
      } catch {
        source.wrapper.style.setProperty('opacity', '0', 'important')
      }
    }

    if (animations.length > 0) {
      await Promise.all(animations.map(async (animation) => {
        try {
          await animation.finished
        } catch {
          return
        }
      }))
    }

    if (!signal.aborted && !this.cleaned) {
      await waitForSharedPaint(this.root.ownerDocument, signal, 1)
    }
  }

  private replaceTargetPromotionCandidates(
    candidates: readonly PromotedTargetCandidate[],
  ): void {
    this.restorePromotedTargetLayers()
    this.targetPromotionCandidates.length = 0
    this.targetPromotionCandidates.push(...candidates)
  }

  promoteTargetLayers(view: HTMLElement): void {
    if (
      this.cleaned
      || this.promotedTargetLayers.length > 0
      || this.targetPromotionCandidates.length === 0
    ) {
      return
    }

    let rootOrigin = { left: 0, top: 0 }
    let viewRect: SharedRect

    try {
      const rootRect = toDocumentRect(
        this.root,
        copyRect(this.root.getBoundingClientRect()),
      )
      rootOrigin = {
        left: rootRect.left,
        top: rootRect.top,
      }
      viewRect = copyRect(view.getBoundingClientRect())
    } catch {
      return
    }

    const ownerWindow = view.ownerDocument.defaultView
    const viewStyle = ownerWindow?.getComputedStyle(view)
    const originParts = viewStyle?.transformOrigin.split(/\s+/u) ?? []
    const viewOriginX = viewRect.left + parseTransformOrigin(
      originParts[0] || '50%',
      viewRect.width,
    )
    const viewOriginY = viewRect.top + parseTransformOrigin(
      originParts[1] || '50%',
      viewRect.height,
    )

    for (const candidate of this.targetPromotionCandidates) {
      const element = candidate.element

      if (!element.isConnected || !view.contains(element)) {
        continue
      }

      const originalParent = element.parentNode

      if (!originalParent) {
        continue
      }

      const originalNextSibling = element.nextSibling
      let rect: SharedRect

      // Target candidates are discovered while the incoming route is being
      // prepared, which can be several frames before its enter phase starts.
      // Scroll stabilization, font metrics, responsive layout, or other route
      // work may move the real element in that time. Always promote from its
      // live geometry so the temporary wrapper and the restored DOM position
      // are pixel-identical at handoff.
      try {
        rect = copyRect(element.getBoundingClientRect())
      } catch {
        continue
      }

      if (!isUsableRect(rect)) {
        continue
      }

      const documentRect = toDocumentRect(element, rect)
      const placeholder = createPromotedTargetPlaceholder(
        element,
        rect,
      )
      const styleSnapshots = captureAndFreezeInlineStyles(element)
      const wrapper = createPromotedTargetWrapper(
        element.ownerDocument,
        documentRect,
        rootOrigin,
        {
          x: viewOriginX - rect.left,
          y: viewOriginY - rect.top,
        },
      )

      try {
        originalParent.insertBefore(placeholder, element)
        wrapper.append(element)
        this.root.append(wrapper)

        element.style.setProperty('position', 'absolute', 'important')
        element.style.setProperty('inset', 'auto', 'important')
        element.style.setProperty('left', '0', 'important')
        element.style.setProperty('top', '0', 'important')
        element.style.setProperty('right', 'auto', 'important')
        element.style.setProperty('bottom', 'auto', 'important')
        element.style.setProperty('width', '100%', 'important')
        element.style.setProperty('height', '100%', 'important')
        element.style.setProperty('margin', '0', 'important')
        element.style.setProperty('pointer-events', 'none', 'important')

        this.promotedTargetLayers.push({
          ...candidate,
          rect,
          documentRect,
          placeholder,
          originalParent,
          originalNextSibling,
          styleSnapshots,
          wrapper,
          animations: new Set<Animation>(),
        })
      } catch {
        wrapper.remove()
        placeholder.remove()

        try {
          originalParent.insertBefore(element, originalNextSibling)
        } catch {
          // The incoming route changed while promotion was being prepared.
        }

        restoreInlineStyles(styleSnapshots)
      }
    }

    this.applySharedStacking(true)
  }

  async animatePromotedTargetLayers(
    phase: AnimationPhaseDefinition,
    onAnimation: (animation: Animation) => void,
  ): Promise<void> {
    if (this.cleaned || this.promotedTargetLayers.length === 0) {
      return
    }

    const animations: Animation[] = []

    for (const layer of this.promotedTargetLayers) {
      if (!layer.wrapper.isConnected) {
        continue
      }

      try {
        const animation = layer.wrapper.animate(
          phase.keyframes,
          phase.options,
        )
        animations.push(animation)
        layer.animations.add(animation)
        this.sessionAnimations.add(animation)
        onAnimation(animation)
      } catch {
        continue
      }
    }

    await Promise.all(animations.map(async (animation) => {
      try {
        await animation.finished
      } catch {
        return
      }
    }))
  }

  private restorePromotedTargetLayers(): void {
    for (const layer of [...this.promotedTargetLayers].reverse()) {
      cancelAnimations([...layer.animations])

      for (const animation of layer.animations) {
        this.sessionAnimations.delete(animation)
      }

      layer.animations.clear()

      try {
        if (layer.placeholder.parentNode) {
          layer.placeholder.parentNode.insertBefore(
            layer.element,
            layer.placeholder,
          )
        } else if (layer.originalParent.isConnected) {
          const nextSibling = (
            layer.originalNextSibling
            && layer.originalNextSibling.parentNode === layer.originalParent
          )
            ? layer.originalNextSibling
            : null
          layer.originalParent.insertBefore(layer.element, nextSibling)
        }
      } catch {
        // If React already removed the incoming subtree, wrapper removal below
        // safely removes the promoted node with it.
      }

      restoreInlineStyles(layer.styleSnapshots)
      layer.placeholder.remove()
      layer.wrapper.remove()
    }

    this.promotedTargetLayers.length = 0
  }

  private applySharedStacking(targetPhase: boolean): void {
    const participants = [
      ...this.sources.flatMap((source) => {
        const path = targetPhase
          ? source.target?.stackingPath
          : source.stackingPath

        return path
          ? [{
              order: source.registration.order,
              path,
              wrapper: source.wrapper,
            }]
          : []
      }),
      ...(targetPhase
        ? this.promotedTargetLayers.map((layer) => ({
            order: layer.order,
            path: layer.stackingPath,
            wrapper: layer.wrapper,
          }))
        : []),
    ]

    participants.sort((first, second) => (
      compareStackingPaths(first.path, second.path)
      || first.order - second.order
    ))

    for (let index = 0; index < participants.length; index += 1) {
      participants[index]!.wrapper.style.setProperty(
        'z-index',
        String(index + 1),
        'important',
      )
    }

    const occluderZIndex = String(Math.max(2, participants.length + 1))
    this.sourceOccluderSurface?.element.style.setProperty(
      'z-index',
      occluderZIndex,
      'important',
    )
  }

  private mirrorSnapshotAnimationsToSourceOccluders(): void {
    const surface = this.sourceOccluderSurface?.element

    if (
      !surface
      || this.sourceOccluderAnimationsMirrored
      || this.snapshotRemoved
    ) {
      return
    }

    this.sourceOccluderAnimationsMirrored = true
    let animations: Animation[]

    try {
      animations = this.snapshotWrapper.getAnimations()
    } catch {
      return
    }

    for (const sourceAnimation of animations) {
      const effect = sourceAnimation.effect

      if (
        !effect
        || !('getKeyframes' in effect)
        || typeof effect.getKeyframes !== 'function'
      ) {
        continue
      }

      try {
        const animation = surface.animate(
          effect.getKeyframes() as Keyframe[],
          effect.getTiming(),
        )
        animation.playbackRate = sourceAnimation.playbackRate

        if (sourceAnimation.currentTime !== null) {
          animation.currentTime = sourceAnimation.currentTime
        }

        if (sourceAnimation.playState === 'paused') {
          animation.pause()
        }

        this.sourceOccluderAnimations.add(animation)
        this.sessionAnimations.add(animation)
      } catch {
        continue
      }
    }
  }

  private removeSourceOccluders(): void {
    cancelAnimations([...this.sourceOccluderAnimations])

    for (const animation of this.sourceOccluderAnimations) {
      this.sessionAnimations.delete(animation)
    }

    this.sourceOccluderAnimations.clear()
    this.sourceOccluderSurface?.element.remove()
  }

  private alignFixedSources(): void {
    if (this.cleaned || this.root.style.position !== 'fixed') {
      return
    }

    let rootRect: SharedRect

    try {
      rootRect = copyRect(this.root.getBoundingClientRect())
    } catch {
      return
    }

    for (const source of this.sources) {
      try {
        const view = source.registration.element.ownerDocument.defaultView
        const rect = source.registration.element.isConnected
          ? copyRect(source.registration.element.getBoundingClientRect())
          : {
              ...source.documentRect,
              left: source.documentRect.left - (view?.scrollX || 0),
              top: source.documentRect.top - (view?.scrollY || 0),
            }
        source.wrapper.style.setProperty(
          'left',
          `${String(rect.left - rootRect.left)}px`,
        )
        source.wrapper.style.setProperty(
          'top',
          `${String(rect.top - rootRect.top)}px`,
        )
      } catch {
        continue
      }
    }
  }

  private stageSourceCoverage(): void {
    this.applySharedStacking(false)
    this.sourceOccluderSurface?.element.style.setProperty('opacity', '1')

    for (const source of this.sources) {
      if (source.snapshotElement && isSupportedElement(source.snapshotElement)) {
        source.snapshotOpacity ??= ownOpacity(source.snapshotElement)
      }

      source.wrapper.style.setProperty('opacity', '1', 'important')
    }
  }

  private freezeSourceHandoff(alignToDocument = false): void {
    if (this.sourceHandoffFrozen) {
      return
    }

    if (alignToDocument) {
      this.alignFixedSources()
    }

    this.sourceHandoffFrozen = true
    const rootRect = (() => {
      try {
        return copyRect(this.root.getBoundingClientRect())
      } catch {
        return {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
        }
      }
    })()

    for (const source of this.sources) {
      try {
        const wrapperRect = copyRect(source.wrapper.getBoundingClientRect())

        if (isUsableRect(wrapperRect)) {
          source.handoffRect = wrapperRect
          continue
        }
      } catch {
        source.handoffRect = null
      }

      const left = Number.parseFloat(source.wrapper.style.left)
      const top = Number.parseFloat(source.wrapper.style.top)
      const width = Number.parseFloat(source.wrapper.style.width)
      const height = Number.parseFloat(source.wrapper.style.height)
      source.handoffRect = {
        left: rootRect.left + (Number.isFinite(left) ? left : source.rect.left),
        top: rootRect.top + (Number.isFinite(top) ? top : source.rect.top),
        width: Number.isFinite(width) && width > 0 ? width : source.rect.width,
        height: Number.isFinite(height) && height > 0 ? height : source.rect.height,
      }
    }

    this.releaseFixedTracking?.()
  }

  private anchorRootToDocument(): { left: number; top: number } {
    this.releaseFixedTracking?.()
    this.root.style.setProperty('position', 'absolute', 'important')
    this.root.style.setProperty('inset', 'auto', 'important')
    this.root.style.setProperty('left', '0', 'important')
    this.root.style.setProperty('top', '0', 'important')
    this.root.style.setProperty('right', 'auto', 'important')
    this.root.style.setProperty('bottom', 'auto', 'important')
    this.root.style.setProperty('width', '0', 'important')
    this.root.style.setProperty('height', '0', 'important')
    this.root.style.setProperty('overflow', 'visible', 'important')
    this.root.style.setProperty('contain', 'none', 'important')

    let rootLeft = 0
    let rootTop = 0

    try {
      const rootRect = toDocumentRect(
        this.root,
        copyRect(this.root.getBoundingClientRect()),
      )

      if (Number.isFinite(rootRect.left)) {
        rootLeft = rootRect.left
      }

      if (Number.isFinite(rootRect.top)) {
        rootTop = rootRect.top
      }
    } catch {
      rootLeft = 0
      rootTop = 0
    }

    return { left: rootLeft, top: rootTop }
  }

  private prepareDocumentMovement(): Map<SourceEntry, SharedMovement> {
    this.freezeSourceHandoff(true)
    const root = this.anchorRootToDocument()
    const movements = new Map<SourceEntry, SharedMovement>()
    const view = this.root.ownerDocument.defaultView
    const scrollX = view && Number.isFinite(view.scrollX) ? view.scrollX : 0
    const scrollY = view && Number.isFinite(view.scrollY) ? view.scrollY : 0

    for (const source of this.sources) {
      const target = source.target

      if (!target) {
        continue
      }

      const sourceViewportRect = source.handoffRect ?? source.rect
      const sourceDocumentRect = {
        ...sourceViewportRect,
        left: sourceViewportRect.left + scrollX,
        top: sourceViewportRect.top + scrollY,
      }
      const targetDocumentRect = target.documentRect
      const sourceRect = {
        ...sourceDocumentRect,
        left: sourceDocumentRect.left - root.left,
        top: sourceDocumentRect.top - root.top,
      }
      const targetRect = {
        ...targetDocumentRect,
        left: targetDocumentRect.left - root.left,
        top: targetDocumentRect.top - root.top,
      }

      source.wrapper.style.setProperty('position', 'absolute', 'important')
      source.wrapper.style.setProperty('left', `${String(sourceRect.left)}px`)
      source.wrapper.style.setProperty('top', `${String(sourceRect.top)}px`)
      source.wrapper.style.setProperty('width', `${String(sourceRect.width)}px`)
      source.wrapper.style.setProperty('height', `${String(sourceRect.height)}px`)
      movements.set(source, {
        source: sourceRect,
        target: targetRect,
      })
    }

    return movements
  }

  private settleAtTargets(
    movements: ReadonlyMap<SourceEntry, SharedMovement>,
  ): void {
    for (const [source, movement] of movements) {
      const target = source.target

      if (!target) {
        continue
      }

      source.wrapper.style.setProperty('position', 'absolute', 'important')
      source.wrapper.style.setProperty(
        'left',
        `${String(movement.target.left)}px`,
        'important',
      )
      source.wrapper.style.setProperty(
        'top',
        `${String(movement.target.top)}px`,
        'important',
      )
      source.wrapper.style.setProperty(
        'width',
        `${String(movement.target.width)}px`,
        'important',
      )
      source.wrapper.style.setProperty(
        'height',
        `${String(movement.target.height)}px`,
        'important',
      )
      source.wrapper.style.setProperty(
        'border-radius',
        target.borderRadius,
        'important',
      )

      if (isSupportedElement(source.sourceClone)) {
        applyFrameStyle(source.sourceClone, target.frameStyle)

        if (target.clone) {
          source.sourceClone.style.opacity = '0'
        }
      }

      for (const morph of target.styleMorphs) {
        applyStyleMorph(morph.clone, morph.target)
      }

      if (target.clone && isSupportedElement(target.clone)) {
        applyFrameStyle(target.clone, target.frameStyle)
        target.clone.style.opacity = String(target.visualOpacity)
      }
    }
  }

  getExitElement(): HTMLElement {
    return this.snapshotWrapper
  }

  removeSnapshot(): void {
    if (this.snapshotRemoved) {
      return
    }

    this.snapshotRemoved = true
    this.snapshotWrapper.remove()
    this.removeSourceOccluders()
    this.applySharedStacking(true)
  }

  revealViews(): void {
    for (const ownership of this.viewOpacity.values()) {
      restoreStyle(ownership)
    }

    this.viewOpacity.clear()
  }

  revealTargets(): void {
    for (const source of this.sources) {
      if (source.target) {
        restoreStyle(source.target.opacity)
      }
    }
  }

  cleanup(): void {
    if (this.cleaned) {
      return
    }

    this.cleaned = true
    this.releaseFixedTracking?.()
    cancelAnimations([...this.sessionAnimations])
    this.sessionAnimations.clear()
    this.revealTargets()

    for (const source of this.sources) {
      if (source.sourceOpacity) {
        restoreStyle(source.sourceOpacity)
      }
    }

    this.restorePromotedTargetLayers()
    this.targetPromotionCandidates.length = 0
    this.revealViews()
    this.removeSourceOccluders()
    this.snapshotWrapper.remove()
    this.root.remove()
    this.root.replaceChildren()
    this.sources.length = 0
  }
}

export function createSharedElementSession(
  registrations: readonly SharedElementRegistration[],
  view: HTMLElement,
  targetCutoff: number,
): SharedElementSession | null {
  const firstRegistration = registrations[0]

  if (!firstRegistration || typeof document === 'undefined') {
    return null
  }

  const ownerDocument = firstRegistration.element.ownerDocument
  const visualBoundary = view.parentElement

  if (
    !visualBoundary
    || view.ownerDocument !== ownerDocument
    || hasUnsupportedPortalTransform(visualBoundary)
  ) {
    return null
  }

  const root = createPortalRoot(ownerDocument, view)

  if (!root) {
    return null
  }

  let viewRect: SharedRect

  try {
    viewRect = copyRect(view.getBoundingClientRect())
  } catch {
    return null
  }

  if (!isUsableRect(viewRect)) {
    return null
  }

  const snapshotClone = cloneVisualElement(view)

  if (!snapshotClone) {
    return null
  }

  const sourceTree = [view, ...view.querySelectorAll('*')]
  const snapshotTree = [snapshotClone, ...snapshotClone.querySelectorAll('*')]

  if (sourceTree.length !== snapshotTree.length) {
    return null
  }

  const snapshotElements = new Map<Element, Element>()

  for (let index = 0; index < sourceTree.length; index += 1) {
    const sourceElement = sourceTree[index]
    const snapshotElement = snapshotTree[index]

    if (sourceElement && snapshotElement) {
      snapshotElements.set(sourceElement, snapshotElement)
    }
  }

  const snapshotWrapper = createViewSnapshotWrapper(
    ownerDocument,
    viewRect,
    getBorderRadius(view),
    getOverflow(view),
  )
  prepareVisualRoot(snapshotClone, view, visualBoundary)
  snapshotWrapper.append(snapshotClone)

  const sourceStackingOrder = getElementOrderMap(view)
  const measurements = registrations.map((registration) => {
    try {
      const rect = copyRect(registration.element.getBoundingClientRect())

      if (!isVisuallyMeasurable(registration.element, rect)) {
        return null
      }

      return {
        registration,
        rect,
        documentRect: toDocumentRect(registration.element, rect),
        handoffRect: null,
        borderRadius: getBorderRadius(registration.element),
        frameStyle: getFrameStyle(registration.element),
        stackingPath: getStackingPath(
          registration.element,
          view,
          sourceStackingOrder,
        ),
        overflow: getOverflow(registration.element),
        visualOpacity: getVisualOpacity(registration.element, visualBoundary),
        visualIdentity: getVisualIdentity(registration.element),
      }
    } catch {
      return null
    }
  }).filter((entry) => entry !== null)
  const clonedMeasurements = measurements.map((measurement) => {
    const clone = cloneVisualElement(measurement.registration.element)

    return clone ? { ...measurement, clone } : null
  }).filter((entry) => entry !== null)
  const preparedRegistrations = clonedMeasurements.map(
    (entry) => entry.registration,
  )
  const prepared = clonedMeasurements.map((measurement) => {
    const {
      registration,
      rect,
      documentRect,
      handoffRect,
      borderRadius,
      frameStyle,
      stackingPath,
      overflow,
      visualOpacity,
      visualIdentity,
      clone,
    } = measurement

    const wrapper = createWrapper(
      ownerDocument,
      registration.name,
      rect,
      borderRadius,
      overflow,
    )
    const cloneExclusions = createCloneExclusions(
      registration.element,
      clone,
      preparedRegistrations,
    )
    prepareVisualRoot(clone, registration.element, visualBoundary)
    wrapper.append(clone)

    return {
      registration,
      rect,
      documentRect,
      handoffRect,
      borderRadius,
      frameStyle,
      stackingPath,
      visualOpacity,
      visualIdentity,
      wrapper,
      sourceClone: clone,
      snapshotElement: snapshotElements.get(registration.element) ?? null,
      snapshotOpacity: null,
      cloneExclusions,
    }
  })

  if (prepared.length === 0) {
    return null
  }

  const sourceGeometries: OccluderGeometry[] = measurements.map(
    (measurement) => ({
      element: measurement.registration.element,
      rect: measurement.rect,
      stackingPath: measurement.stackingPath,
    }),
  )
  const sourceOccluders = collectOccluderCandidates({
    geometries: sourceGeometries,
    order: sourceStackingOrder,
    view,
  })
  const sourceOccluderSurface = createOccludingSurface({
    candidates: sourceOccluders,
    phase: 'source',
    view,
    visualBoundary,
  })

  const snapshotReadinessElements = getVisibleSnapshotImages(
    snapshotElements,
    getCapturedVisualRect(ownerDocument),
  )
  const sources: SourceEntry[] = []

  try {
    visualBoundary.insertBefore(root, view.nextSibling)
    root.append(snapshotWrapper)

    let rootLeft = 0
    let rootTop = 0

    try {
      const rootRect = copyRect(root.getBoundingClientRect())
      rootLeft = Number.isFinite(rootRect.left) ? rootRect.left : 0
      rootTop = Number.isFinite(rootRect.top) ? rootRect.top : 0
    } catch {
      rootLeft = 0
      rootTop = 0
    }

    for (const entry of prepared) {
      entry.wrapper.style.setProperty(
        'left',
        `${String(entry.rect.left - rootLeft)}px`,
      )
      entry.wrapper.style.setProperty(
        'top',
        `${String(entry.rect.top - rootTop)}px`,
      )
      root.append(entry.wrapper)
    }

    if (sourceOccluderSurface) {
      root.append(sourceOccluderSurface.element)
    }

    for (const entry of prepared) {
      sources.push({
        ...entry,
        sourceOpacity: null,
        target: null,
      })
    }

    return new SharedElementSession(
      root,
      sources,
      visualBoundary,
      snapshotWrapper,
      snapshotClone,
      sourceOccluderSurface,
      targetCutoff,
      snapshotReadinessElements,
    )
  } catch {
    for (const source of sources) {
      if (source.sourceOpacity) {
        restoreStyle(source.sourceOpacity)
      }
    }

    root.remove()
    return null
  }
}
