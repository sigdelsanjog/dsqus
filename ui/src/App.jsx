import { useMemo, useState } from 'react'

const API_BASE_URL = 'http://localhost:8000'

const PHI_HINT_PATTERN = /(name|dob|birth|ssn|social|address|email|phone|mrn|patient|insurance)/i

function formatPercent(value) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}

export default function App() {
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('Choose a CSV or Excel file to preview its contents.')
  const [isLoading, setIsLoading] = useState(false)

  const rowCount = rows.length

  const emptyState = useMemo(() => rowCount === 0, [rowCount])

  const stats = useMemo(() => {
    if (!columns.length || !rows.length) {
      return {
        totalCells: 0,
        missingCells: 0,
        completeness: 0,
        duplicateRows: 0,
        sensitiveColumns: [],
      }
    }

    let missingCells = 0
    const seen = new Set()
    let duplicateRows = 0

    rows.forEach((row) => {
      const signature = JSON.stringify(row)
      if (seen.has(signature)) {
        duplicateRows += 1
      } else {
        seen.add(signature)
      }

      columns.forEach((column) => {
        const value = row[column]
        if (value === '' || value === null || value === undefined) {
          missingCells += 1
        }
      })
    })

    const totalCells = rows.length * columns.length
    const completeness = totalCells > 0 ? ((totalCells - missingCells) / totalCells) * 100 : 0
    const sensitiveColumns = columns.filter((column) => PHI_HINT_PATTERN.test(column))

    return {
      totalCells,
      missingCells,
      completeness,
      duplicateRows,
      sensitiveColumns,
    }
  }, [columns, rows])

  const qualityBand = useMemo(() => {
    if (!rowCount) return 'No data yet'
    if (stats.completeness >= 97 && stats.duplicateRows === 0) return 'High quality'
    if (stats.completeness >= 90) return 'Needs review'
    return 'Action required'
  }, [rowCount, stats.completeness, stats.duplicateRows])

  const handleUpload = async (event) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    setFileName(selectedFile.name)
    setStatus('Uploading and parsing file...')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.detail || 'Upload failed.')
      }

      const payload = await response.json()
      setColumns(payload.columns || [])
      setRows(payload.rows || [])
      setStatus(`Loaded ${payload.rowCount ?? payload.rows?.length ?? 0} rows from ${payload.filename}.`)
    } catch (error) {
      setColumns([])
      setRows([])
      setStatus(error.message)
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  return (
    <main className="workspace">
      <div className="ambient" aria-hidden="true" />

      <section className="hero card">
        <p className="eyebrow">Healthcare Dataset Quality Studio</p>
        <h1>Upload clinical data and get an immediate quality pulse.</h1>
        <p className="lede">
          This interface previews your uploaded dataset and highlights practical quality indicators for healthcare standards: completeness,
          duplicate records, and potential sensitive-field exposure.
        </p>

        <div className="heroActions">
          <label className="uploadButton">
            <input accept=".csv,.xls,.xlsx" type="file" onChange={handleUpload} />
            {isLoading ? 'Analyzing...' : 'Upload Dataset'}
          </label>
          <p className="qualityBadge" data-band={qualityBand}>
            {qualityBand}
          </p>
        </div>

        <div className="statusBar">
          <span>{status}</span>
          {fileName ? <span>{fileName}</span> : null}
        </div>
      </section>

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

      <section className="tableCard card">
        <div className="tableMeta">
          <h2>Data Preview Grid</h2>
          <span>{columns.length} columns</span>
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
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((column) => (
                      <td key={column}>{row[column] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}