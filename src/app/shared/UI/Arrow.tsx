export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" className="icon-arrow" viewBox="0 0 20 20">
      <path d={diagonal ? 'M5 15 15 5M8 5h7v7' : 'M3 10h14M12 5l5 5-5 5'} />
    </svg>
  )
}
