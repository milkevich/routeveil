import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import type {
  FocusEvent,
  MouseEvent,
  PointerEvent,
  ReactElement,
  Ref,
  RefAttributes,
  TouchEvent,
} from 'react'
import {
  Link,
  useHref,
  useLocation,
  useNavigate,
  useResolvedPath,
} from 'react-router-dom'
import { useRouteveilContext } from './RouteveilContext.js'
import type {
  RouteveilLinkProps,
  TransitionName,
} from './types.js'
import { warnOnce } from './warnings.js'

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value)
    return
  }

  if (ref) {
    const mutableRef = ref as { current: T | null }
    mutableRef.current = value
  }
}

type TransitionDestination = {
  external: boolean
  to: RouteveilLinkProps['to']
}

function getTransitionDestination(
  to: RouteveilLinkProps['to'],
  rootHref: string,
): TransitionDestination {
  if (
    typeof to !== 'string'
    || !(/^[a-z][a-z\d+.-]*:/i.test(to) || to.startsWith('//'))
  ) {
    return { external: false, to }
  }

  if (typeof window === 'undefined') {
    return { external: true, to: '/' }
  }

  try {
    const url = new URL(to, window.location.href)

    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:')
      || url.origin !== window.location.origin
    ) {
      return { external: true, to: '/' }
    }

    const rootPath = new URL(rootHref, window.location.href)
      .pathname
      .replace(/\/+$/, '') || '/'
    let pathname = url.pathname

    if (rootPath !== '/') {
      if (pathname === rootPath) {
        pathname = '/'
      } else if (pathname.startsWith(`${rootPath}/`)) {
        pathname = pathname.slice(rootPath.length)
      } else {
        return { external: true, to: '/' }
      }
    }

    return {
      external: false,
      to: `${pathname}${url.search}${url.hash}`,
    }
  } catch {
    return { external: true, to: '/' }
  }
}

const RouteveilLinkWithRef = forwardRef<HTMLAnchorElement, RouteveilLinkProps>(
  function RouteveilLink({
    transition,
    transitionOptions,
    preload: preloadOverride,
    onClick,
    onFocus,
    onPointerDown,
    onPointerEnter,
    onTouchStart,
    target,
    download,
    reloadDocument,
    replace,
    state,
    preventScrollReset,
    smoothScrollToTop,
    scrollToSharedElement,
    sharedElements,
    relative,
    viewTransition,
    defaultShouldRevalidate,
    mask,
    to,
    ...linkProps
  }, forwardedRef) {
  const {
    defaultPreload,
    preloadRoute,
    transitionTo,
  } = useRouteveilContext()
  const navigate = useNavigate()
  const location = useLocation()
  const rootHref = useHref('/')
  const linkRef = useRef<HTMLAnchorElement | null>(null)
  const destination = getTransitionDestination(to, rootHref)
  const resolvedPath = useResolvedPath(destination.to, { relative })
  const expectedPath = `${resolvedPath.pathname}${resolvedPath.search}${resolvedPath.hash}`
  const preload = preloadOverride ?? defaultPreload

  const isCurrentLocation =
    resolvedPath.pathname === location.pathname
    && resolvedPath.search === location.search
    && resolvedPath.hash === location.hash

  const canPreload = Boolean(
    transition
    && preload !== false
    && !destination.external
    && !isCurrentLocation,
  )

  const setLinkRef = useCallback((element: HTMLAnchorElement | null) => {
    linkRef.current = element
    assignRef(forwardedRef, element)
  }, [forwardedRef])

  const preloadDestination = useCallback((): Promise<void> => {
    if (!canPreload) {
      return Promise.resolve()
    }

    return preloadRoute(expectedPath)
  }, [canPreload, expectedPath, preloadRoute])

  const startPreload = useCallback(() => {
    void preloadDestination().catch(() => undefined)
  }, [preloadDestination])

  useEffect(() => {
    if (!canPreload) {
      return
    }

    if (preload === 'render') {
      startPreload()
      return
    }

    if (preload !== 'viewport') {
      return
    }

    const element = linkRef.current

    if (!element) {
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      startPreload()
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        startPreload()
        observer.disconnect()
      }
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [canPreload, preload, startPreload])

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(event)

    if (!event.defaultPrevented && preload === 'intent') {
      startPreload()
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerDown?.(event)

    if (!event.defaultPrevented && preload === 'intent') {
      startPreload()
    }
  }

  const handlePointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerEnter?.(event)

    if (!event.defaultPrevented && preload === 'intent') {
      startPreload()
    }
  }

  const handleTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
    onTouchStart?.(event)

    if (!event.defaultPrevented && preload === 'intent') {
      startPreload()
    }
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (
      !transition
      || event.defaultPrevented
      || event.button !== 0
      || isModifiedEvent(event)
      || (target && target !== '_self')
      || download !== undefined
      || reloadDocument
      || destination.external
      || isCurrentLocation
    ) {
      return
    }

    event.preventDefault()

    if (viewTransition) {
      warnOnce(
        'native-view-transition',
        'Routeveil: React Router’s viewTransition option is ignored when a Routeveil transition is selected.',
      )
    }

    void transitionTo({
      to: destination.to,
      expectedPath,
      transition,
      commit: () => {
        return navigate(destination.to, {
          replace,
          state,
          preventScrollReset,
          relative,
          viewTransition: false,
          defaultShouldRevalidate,
          mask,
        })
      },
      transitionOptions,
      smoothScrollToTop,
      scrollToSharedElement,
      sharedElements,
      preload: preload === false ? undefined : preloadDestination,
      clickPosition: event.detail === 0
        ? undefined
        : {
            x: event.clientX,
            y: event.clientY,
          },
      navigateOptions: {
        replace,
        state,
        preventScrollReset,
        relative,
        viewTransition: false,
        defaultShouldRevalidate,
        mask,
      },
      sharedElementSource: {
        kind: 'link',
        trigger: event.currentTarget,
      },
    })
  }

  return (
    <Link
      ref={setLinkRef}
      {...linkProps}
      to={to}
      target={target}
      download={download}
      reloadDocument={reloadDocument || download !== undefined}
      replace={replace}
      state={state}
      preventScrollReset={preventScrollReset}
      relative={relative}
      viewTransition={viewTransition}
      defaultShouldRevalidate={defaultShouldRevalidate}
      mask={mask}
      onClick={handleClick}
      onFocus={handleFocus}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onTouchStart={handleTouchStart}
    />
  )
  },
)

type RouteveilLinkComponent = <
  TTransition extends TransitionName = TransitionName,
>(
  props: RouteveilLinkProps<TTransition> & RefAttributes<HTMLAnchorElement>,
) => ReactElement | null

export const RouteveilLink = RouteveilLinkWithRef as RouteveilLinkComponent
