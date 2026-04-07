export default function RecordEditor({ columns, activeRow, updateCell, deleteColumn }) {
  return (
    <section className="editorCard card">
      <div className="tableMeta">
        <h2>Record Editing Workspace</h2>
        <span>Select a row to edit values, or delete row/columns</span>
      </div>
      <div className="columnChips">
        {columns.map((column) => (
          <button key={column} type="button" className="chip" onClick={() => deleteColumn(column)}>
            Remove column: {column}
          </button>
        ))}
      </div>
      {activeRow ? (
        <div className="editorGrid">
          {columns.map((column) => (
            <label key={column}>
              <span>{column}</span>
              <input value={String(activeRow[column] ?? '')} onChange={(event) => updateCell(column, event.target.value)} />
            </label>
          ))}
        </div>
      ) : (
        <div className="emptyEditor">Pick a record from the table below to edit. Changes are local UI prototype actions for now.</div>
      )}
    </section>
  )
}
