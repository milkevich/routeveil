import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'
import { useRouteveilTransition } from '../../../react-router'
import {
  overlayTransitions,
  pageTransitions,
} from '../../data/transitions'
import type { TransitionMeta } from '../../data/transitions'
import { PixelHeadingWord } from '../../shared/UI'
import { TransitionGroup } from './TransitionGroup'
import { CustomizationSection } from './CustomizationSection'

function LabContent() {
  const playTransition = useRouteveilTransition()

  const [busy, setBusy] = useState(false)

  const activateTransition = useCallback(
    async (
      transition: TransitionMeta,
      trigger: HTMLButtonElement,
    ) => {
      if (busy) return

      setBusy(true)

      const rect = trigger.getBoundingClientRect()

      try {
        await playTransition(transition.name, {
          transitionOptions: transition.previewOptions,
          clickPosition: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          },
        })
      } finally {
        flushSync(() => setBusy(false))
        trigger.focus({ preventScroll: true })
      }
    },
    [busy, playTransition],
  )

  return (
    <main className="page lab-page">
      <header className="lab-hero page-frame">
        <div className="lab-hero__heading-mask">
          <div className="lab-hero__heading-reveal">
            <PixelHeadingWord
              as="h1"
              initialFont="square"
              hoverFont="square"
            >
              Laboratory
            </PixelHeadingWord>
          </div>
        </div>

        <div className="lab-hero__description-mask">
          <div className="lab-hero__description-reveal">
            <p className="lab-hero__description">
              Select any transition to run it directly on the current
              page. The route, URL, scroll position, and browser history
              stay unchanged.
            </p>
          </div>
        </div>
      </header>

      <div className="lab-workbench page-frame">
        <div
          className="lab-catalog"
          aria-busy={busy || undefined}
        >
          <TransitionGroup
            busy={busy}
            description="Animate the current Lab page out and back in without leaving the route."
            index="01"
            onActivate={activateTransition}
            title="Page transitions"
            transitions={pageTransitions}
          />

          <TransitionGroup
            busy={busy}
            description="Cover and reveal the current Lab page without changing its content or route."
            index="02"
            onActivate={activateTransition}
            title="Overlay transitions"
            transitions={overlayTransitions}
          />

          <CustomizationSection />
        </div>
      </div>
    </main >
  )
}

export function LabRuntime() {
  return <LabContent />
}
