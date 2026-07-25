import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  version,
} from 'react'
import type {
  ReactElement,
  Ref,
  RefCallback,
  MutableRefObject,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useRouteveilContext } from './RouteveilContext.js'
import type { RouteveilSharedElementProps } from './types.js'
import { warnOnce } from './warnings.js'

const FORWARD_REF_TYPE = Symbol.for('react.forward_ref')
const MEMO_TYPE = Symbol.for('react.memo')
const REACT_MAJOR = Number.parseInt(version.split('.')[0] || '0', 10)

type RefCapableType = {
  $$typeof?: symbol
  type?: unknown
}

type ElementWithRef = ReactElement & {
  ref?: Ref<unknown>
}

type RefAttachment = {
  id: symbol
  detachChildRef: () => void
  releaseRegistration: (() => void) | null
}

function acceptsRef(type: unknown): boolean {
  if (typeof type === 'string') {
    return true
  }

  if (typeof type === 'function') {
    return REACT_MAJOR >= 19
  }

  if (!type || typeof type !== 'object') {
    return false
  }

  const descriptor = type as RefCapableType

  if (descriptor.$$typeof === FORWARD_REF_TYPE) {
    return true
  }

  return descriptor.$$typeof === MEMO_TYPE && acceptsRef(descriptor.type)
}

function getElementRef(element: ReactElement): Ref<unknown> | undefined {
  if (REACT_MAJOR >= 19) {
    return (element.props as { ref?: Ref<unknown> }).ref
  }

  return (element as ElementWithRef).ref
}

function setRef(
  ref: Ref<unknown> | undefined,
  value: unknown,
): void | (() => void) {
  if (typeof ref === 'function') {
    return (ref as RefCallback<unknown>)(value)
  }

  if (ref) {
    ;(ref as MutableRefObject<unknown>).current = value
  }
}

function isDomElement(value: unknown): value is HTMLElement | SVGElement {
  if (!value || typeof value !== 'object') {
    return false
  }

  const element = value as Element
  const view = element.ownerDocument?.defaultView

  if (!view) {
    return false
  }

  return (
    value instanceof view.HTMLElement
    || (
      typeof view.SVGElement !== 'undefined'
      && value instanceof view.SVGElement
    )
  )
}

function SharedElementChild({
  attach,
  child,
}: {
  attach: RefCallback<unknown>
  child: ReactElement
}): ReactElement {
  return cloneElement(child as ReactElement<{ ref?: Ref<unknown> }>, {
    ref: attach,
  })
}

export function RouteveilSharedElement({
  name,
  children,
}: RouteveilSharedElementProps): ReactElement {
  const { registerSharedElement } = useRouteveilContext()
  const location = useLocation()
  const tokenRef = useRef(Symbol('routeveil-shared-element'))
  const attachmentRef = useRef<RefAttachment | null>(null)

  const normalizedName = typeof name === 'string' ? name.trim() : ''
  const child = isValidElement(children) ? children : null
  const childRef = child ? getElementRef(child) : undefined
  const childAcceptsRef = Boolean(child && acceptsRef(child.type))
  const attachmentId = useMemo(
    () => Symbol([
      'routeveil-shared-element-attachment',
      location.key,
      location.pathname,
      location.search,
      location.hash,
      normalizedName,
      String(childRef),
      String(registerSharedElement),
    ].join(':')),
    [
      childRef,
      location.hash,
      location.key,
      location.pathname,
      location.search,
      normalizedName,
      registerSharedElement,
    ],
  )
  const mergedRef = useCallback((value: unknown) => {
    const currentAttachment = attachmentRef.current

    if (value === null && currentAttachment?.id !== attachmentId) {
      return
    }

    if (currentAttachment) {
      currentAttachment.releaseRegistration?.()
      currentAttachment.detachChildRef()
      attachmentRef.current = null
    }

    if (value === null) {
      return
    }

    const element = isDomElement(value) ? value : null
    const releaseRegistration = element && normalizedName
      ? registerSharedElement(tokenRef.current, normalizedName, element)
      : null
    const releaseChildRef = setRef(childRef, value)
    attachmentRef.current = {
      id: attachmentId,
      detachChildRef: typeof releaseChildRef === 'function'
        ? releaseChildRef
        : () => {
            setRef(childRef, null)
          },
      releaseRegistration,
    }

    if (!element) {
      warnOnce(
        `shared-element-non-dom:${normalizedName}`,
        `Routeveil: <RouteveilSharedElement name="${normalizedName}"> must resolve its child ref to one HTMLElement or SVGElement. Shared-element behavior was disabled for this instance.`,
      )
    }
  }, [attachmentId, childRef, normalizedName, registerSharedElement])

  useEffect(() => {
    if (
      child
      && childAcceptsRef
      && normalizedName
      && !attachmentRef.current
    ) {
      warnOnce(
        `shared-element-unresolved-ref:${normalizedName}`,
        `Routeveil: <RouteveilSharedElement name="${normalizedName}"> did not resolve its child ref to a DOM element. Shared-element behavior was disabled for this instance.`,
      )
    }
  }, [child, childAcceptsRef, normalizedName])

  if (!child) {
    warnOnce(
      'shared-element-invalid-child',
      'Routeveil: <RouteveilSharedElement> requires exactly one React element child that resolves to an HTMLElement or SVGElement.',
    )
    return <>{children}</>
  }

  if (!normalizedName) {
    warnOnce(
      'shared-element-invalid-name',
      'Routeveil: <RouteveilSharedElement> requires a non-empty name. Shared-element behavior was disabled for this instance.',
    )
    return child
  }

  if (!childAcceptsRef) {
    warnOnce(
      `shared-element-missing-ref:${normalizedName}`,
      `Routeveil: <RouteveilSharedElement name="${normalizedName}"> received a custom child that does not forward its ref to one DOM element. Shared-element behavior was disabled for this instance.`,
    )
    return child
  }

  return <SharedElementChild attach={mergedRef} child={child} />
}
