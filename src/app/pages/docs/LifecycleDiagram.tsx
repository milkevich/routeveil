const lifecycle = [
  { number: '01', label: 'Exit or Cover' },
  { number: '02', label: 'Commit Navigation' },
  { number: '03', label: 'Enter or Reveal' },
  { number: '04', label: 'Reset' },
]

export function LifecycleDiagram() {
  return (
    <ol aria-label="Routeveil transition lifecycle" className="lifecycle-diagram">
      {lifecycle.map((step) => (
        <li key={step.number}>
          <span>{step.number}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  )
}
