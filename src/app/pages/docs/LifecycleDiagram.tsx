const lifecycle = [
  { number: '01', label: 'Exit' },
  { number: '02', label: 'Navigate' },
  { number: '03', label: 'Enter' },
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
