export type PropRow = Readonly<{
  name: string
  type: string
  defaultValue: string
  description: string
}>

export function PropTable({
  caption,
  rows,
}: {
  caption: string
  rows: readonly PropRow[]
}) {
  return (
    <div className="prop-table-wrap" tabIndex={0}>
      <table className="prop-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Default</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody className="prop-table-body">
          {rows.map((row) => (
            <tr key={row.name}>
              <td><code>{row.name}</code></td>
              <td><code>{row.type}</code></td>
              <td><code>{row.defaultValue}</code></td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
