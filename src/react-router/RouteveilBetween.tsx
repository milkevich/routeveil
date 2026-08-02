import {
  Component,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactPortal } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useRouteveilContext } from './RouteveilContext.js'
import { normalizeBetweenMinDuration } from './normalize-between.js'
import type { RouteveilBetweenProps } from './types.js'

type BetweenPortalProps = {
  content: RouteveilBetweenProps['content']
  host: HTMLElement
  prepareContentUpdate: () => void
}

class BetweenPortal extends Component<BetweenPortalProps> {
  getSnapshotBeforeUpdate(previous: BetweenPortalProps): null {
    if (!Object.is(previous.content, this.props.content)) {
      this.props.prepareContentUpdate()
    }

    return null
  }

  componentDidUpdate(): void {
    return
  }

  render(): ReactPortal {
    return createPortal(this.props.content, this.props.host)
  }
}

function createBetweenHost(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  const host = document.createElement('div')
  host.setAttribute('data-routeveil-between-registration', '')
  host.style.setProperty('display', 'block', 'important')
  host.style.setProperty('margin', '0', 'important')
  host.style.setProperty('padding', '0', 'important')
  host.style.setProperty('border', '0', 'important')
  host.style.setProperty('pointer-events', 'none', 'important')
  host.style.setProperty('opacity', '0')
  return host
}

export function RouteveilBetween({
  content,
  while: hold = false,
  minDuration = 0,
}: RouteveilBetweenProps) {
  const location = useLocation()
  const {
    captureBetween,
    registerBetween,
    updateBetween,
  } = useRouteveilContext()
  const [token] = useState(() => Symbol('routeveil-between'))
  const [host] = useState(createBetweenHost)
  const path = `${location.pathname}${location.search}${location.hash}`
  const normalizedMinDuration = normalizeBetweenMinDuration(minDuration)
  const input = useMemo(() => ({
    content,
    host: host!,
    location: {
      key: location.key,
      path,
    },
    while: hold === true,
    minDuration: normalizedMinDuration,
  }), [content, hold, host, location.key, normalizedMinDuration, path])
  const prepareContentUpdate = useCallback(() => {
    captureBetween(token)
  }, [captureBetween, token])

  useLayoutEffect(() => {
    if (!host) {
      return
    }

    return registerBetween(token, host)
  }, [host, registerBetween, token])

  useLayoutEffect(() => {
    if (!host) {
      return
    }

    updateBetween(token, input)
  }, [host, input, token, updateBetween])

  return host
    ? (
        <BetweenPortal
          content={content}
          host={host}
          prepareContentUpdate={prepareContentUpdate}
        />
      )
    : null
}
