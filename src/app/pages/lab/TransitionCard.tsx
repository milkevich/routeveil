import type { MouseEvent } from 'react'
import type { TransitionMeta } from '../../data/transitions'
import { Arrow } from '../../shared/UI'

export function TransitionCard({
  busy,
  index,
  transition,
  onActivate,
}: {
  busy: boolean
  index: number
  transition: TransitionMeta
  onActivate: (
    transition: TransitionMeta,
    trigger: HTMLButtonElement,
  ) => void
}) {
  const handleClick = (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    onActivate(transition, event.currentTarget)
  }

  return (
    <button
      aria-label={`Play ${transition.name} transition`}
      className="transition-card"
      data-category={transition.category}
      data-transition={transition.name}
      disabled={busy}
      onClick={handleClick}
      type="button"
    >
      <span className="transition-card__index">
        {String(index + 1).padStart(2, '0')}
      </span>

      <span
        aria-hidden="true"
        className="transition-card__arrow"
      >
        <Arrow diagonal />
      </span>

      <span className="transition-card__content">
        <strong>{transition.name}</strong>

        <span className="transition-card__description">
          {transition.description}
        </span>
      </span>
    </button>
  )
}
