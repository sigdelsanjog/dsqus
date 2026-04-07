const FILTERS = [
  ['all', 'All Records'],
  ['missing', 'Completeness Gaps'],
  ['duplicate', 'Duplicates'],
  ['sensitive', 'PHI Attention'],
]

export default function IssueThumbnails({ issueBuckets, selectedFilter, setSelectedFilter }) {
  return (
    <section className="issuePanel card">
      <div className="tableMeta">
        <h2>Issue Thumbnails</h2>
        <span>Click to filter records</span>
      </div>
      <div className="filterGrid">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`filterCard ${selectedFilter === key ? 'active' : ''}`}
            onClick={() => setSelectedFilter(key)}
          >
            <strong>{label}</strong>
            <span>{issueBuckets[key].length} records</span>
          </button>
        ))}
      </div>
    </section>
  )
}
