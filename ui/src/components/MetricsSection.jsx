function formatPercent(value) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}

export default function MetricsSection({ rowCount, stats }) {
  return (
    <section className="metrics">
      <article className="metricCard card lift">
        <h3>Rows</h3>
        <p>{rowCount.toLocaleString()}</p>
        <small>Records loaded from uploaded file</small>
      </article>
      <article className="metricCard card lift">
        <h3>Completeness</h3>
        <p>{formatPercent(stats.completeness)}</p>
        <small>{stats.missingCells.toLocaleString()} missing values</small>
      </article>
      <article className="metricCard card lift">
        <h3>Duplicate Rows</h3>
        <p>{stats.duplicateRows.toLocaleString()}</p>
        <small>Potential duplicate patient events</small>
      </article>
      <article className="metricCard card lift">
        <h3>Sensitive Columns</h3>
        <p>{stats.sensitiveColumns.length}</p>
        <small>{stats.sensitiveColumns.slice(0, 2).join(', ') || 'No obvious PHI hints detected'}</small>
      </article>
    </section>
  )
}
