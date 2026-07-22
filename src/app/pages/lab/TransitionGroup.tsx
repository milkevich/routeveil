import type { TransitionMeta } from '../../data/transitions'
import { PixelHeadingWord } from '../../shared/UI'
import { TransitionCard } from './TransitionCard'

export function TransitionGroup({
  busy,
  index,
  title,
  description,
  transitions,
  onActivate,
}: {
  busy: boolean
  index: string
  title: string
  description: string
  transitions: readonly TransitionMeta[]
  onActivate: (
    transition: TransitionMeta,
    trigger: HTMLButtonElement,
  ) => void
}) {
  return (
    <section className="lab-group">
      <header className="lab-group__header">
        <div className="lab-group__title">
          <span>{index}</span>
          <PixelHeadingWord
            as="h2"
            initialFont="square"
            hoverFont="square"
          >
            {title}
          </PixelHeadingWord>
        </div>

        <p>{description}</p>
      </header>

      <div className="lab-card-grid">
        {transitions.map((transition, transitionIndex) => (
          <TransitionCard
            busy={busy}
            index={transitionIndex}
            key={transition.name}
            onActivate={onActivate}
            transition={transition}
          />
        ))}
      </div>
    </section>
  )
}
