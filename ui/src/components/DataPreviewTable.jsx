export default function DataPreviewTable({
  columns,
  displayedRows,
  rows,
  emptyState,
  activeRowId,
  setActiveRowId,
  deleteRow,
}) {
  return (
    <section className="tableCard card">
      <div className="tableMeta">
        <h2>Data Preview Grid</h2>
        <span>
          {displayedRows.length} of {rows.length} records
        </span>
      </div>

      {emptyState ? (
        <div className="emptyState">Upload a dataset to start profiling data quality.</div>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row) => (
                <tr key={row.__rowId} className={row.__rowId === activeRowId ? 'activeRow' : ''}>
                  {columns.map((column) => (
                    <td key={column}>{row[column] ?? ''}</td>
                  ))}
                  <td>
                    <div className="rowActions">
                      <button type="button" onClick={() => setActiveRowId(row.__rowId)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteRow(row.__rowId)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
