import { forwardRef } from 'react'
import type {
  MouseEvent,
  ReactElement,
  RefAttributes,
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
    onClick,
    target,
    download,
    reloadDocument,
    replace,
    state,
    preventScrollReset,
    smoothScrollToTop,
    relative,
    viewTransition,
    defaultShouldRevalidate,
    mask,
    to,
    ...linkProps
  }, forwardedRef) {
  const { transitionTo } = useRouteveilContext()
  const navigate = useNavigate()
  const location = useLocation()
  const rootHref = useHref('/')
  const destination = getTransitionDestination(to, rootHref)
  const resolvedPath = useResolvedPath(destination.to, { relative })

  const isCurrentLocation =
    resolvedPath.pathname === location.pathname
    && resolvedPath.search === location.search
    && resolvedPath.hash === location.hash

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
      expectedPath: `${resolvedPath.pathname}${resolvedPath.search}${resolvedPath.hash}`,
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
    })
  }

  return (
    <Link
      ref={forwardedRef}
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
