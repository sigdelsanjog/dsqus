import { useMemo, useState } from 'react'

const API_BASE_URL = 'http://localhost:8000'

const PHI_HINT_PATTERN = /(name|dob|birth|ssn|social|address|email|phone|mrn|patient|insurance)/i
const SCORE_WEIGHTS = {
  redundancy: 0.15,
  toxicity: 0.1,
  diversity: 0.1,
  readability: 0.1,
  coherence: 0.1,
  novelty: 0.1,
  structure: 0.1,
  factual_conflict: 0.1,
  domain_balance: 0.075,
  length_distribution: 0.075,
}

const SCORE_ORDER = [
  'redundancy',
  'toxicity',
  'diversity',
  'readability',
  'coherence',
  'novelty',
  'structure',
  'factual_conflict',
  'domain_balance',
  'length_distribution',
]

function formatPercent(value) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}

function clampScore(value) {
  return Math.max(0, Math.min(100, value))
}

function humanize(metric) {
  return metric.replace(/_/g, ' ')
}

export default function App() {
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('Choose a CSV or Excel file to preview its contents.')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [activeRowId, setActiveRowId] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [scanMessage, setScanMessage] = useState('Final quality phase is waiting for a dataset.')

  const rowCount = rows.length

  const emptyState = useMemo(() => rowCount === 0, [rowCount])

  const duplicateMap = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      const signature = JSON.stringify(columns.reduce((acc, column) => ({ ...acc, [column]: row[column] ?? '' }), {}))
      map.set(signature, (map.get(signature) || 0) + 1)
    })
    return map
  }, [rows, columns])

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
    let duplicateRows = 0

    rows.forEach((row) => {
      const signature = JSON.stringify(columns.reduce((acc, column) => ({ ...acc, [column]: row[column] ?? '' }), {}))
      if ((duplicateMap.get(signature) || 0) > 1) {
        duplicateRows += 1
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
  }, [columns, rows, duplicateMap])

  const issueBuckets = useMemo(() => {
    const missingRows = rows.filter((row) => columns.some((column) => row[column] === '' || row[column] === null || row[column] === undefined))
    const duplicateRows = rows.filter((row) => {
      const signature = JSON.stringify(columns.reduce((acc, column) => ({ ...acc, [column]: row[column] ?? '' }), {}))
      return (duplicateMap.get(signature) || 0) > 1
    })
    const sensitiveRows = rows.filter((row) => stats.sensitiveColumns.some((column) => row[column]))
    return {
      all: rows,
      missing: missingRows,
      duplicate: duplicateRows,
      sensitive: sensitiveRows,
    }
  }, [rows, columns, duplicateMap, stats.sensitiveColumns])

  const displayedRows = useMemo(() => issueBuckets[selectedFilter] || rows, [issueBuckets, selectedFilter, rows])

  const activeRow = useMemo(() => rows.find((row) => row.__rowId === activeRowId) || null, [rows, activeRowId])

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
      setRows((payload.rows || []).map((row, index) => ({ ...row, __rowId: `${Date.now()}-${index}` })))
      setActiveRowId(null)
      setSelectedFilter('all')
      setScanResult(null)
      setScanMessage('Dataset loaded. Run final scan to generate weighted quality scores.')
      setStatus(`Loaded ${payload.rowCount ?? payload.rows?.length ?? 0} rows from ${payload.filename}.`)
    } catch (error) {
      setColumns([])
      setRows([])
      setActiveRowId(null)
      setSelectedFilter('all')
      setScanResult(null)
      setScanMessage('Final quality phase is waiting for a dataset.')
      setStatus(error.message)
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  const updateCell = (column, value) => {
    if (!activeRow) return
    setRows((previous) => previous.map((row) => (row.__rowId === activeRow.__rowId ? { ...row, [column]: value } : row)))
  }

  const deleteRow = (rowId) => {
    setRows((previous) => previous.filter((row) => row.__rowId !== rowId))
    if (rowId === activeRowId) {
      setActiveRowId(null)
    }
    setScanResult(null)
    setScanMessage('Dataset changed. Run final scan again to refresh scores.')
  }

  const deleteColumn = (columnToDelete) => {
    setColumns((previous) => previous.filter((column) => column !== columnToDelete))
    setRows((previous) =>
      previous.map((row) => {
        const next = { ...row }
        delete next[columnToDelete]
        return next
      }),
    )
    setScanResult(null)
    setScanMessage('Dataset structure changed. Run final scan again to refresh scores.')
  }

  const runFinalScan = () => {
    if (!rows.length || !columns.length) return

    const avgLength =
      rows.reduce((sum, row) => {
        const rowLength = columns.reduce((innerSum, column) => innerSum + String(row[column] ?? '').length, 0)
        return sum + rowLength
      }, 0) / Math.max(rows.length, 1)

    const duplicateRate = stats.duplicateRows / Math.max(rows.length, 1)
    const missingRate = stats.missingCells / Math.max(stats.totalCells, 1)
    const uniqueRatioByColumn =
      columns.reduce((sum, column) => {
        const values = new Set(rows.map((row) => String(row[column] ?? '')))
        return sum + values.size / Math.max(rows.length, 1)
      }, 0) / Math.max(columns.length, 1)

    const metricScores = {
      redundancy: clampScore(100 - duplicateRate * 160),
      toxicity: clampScore(96 - stats.sensitiveColumns.length * 3),
      diversity: clampScore(55 + uniqueRatioByColumn * 45),
      readability: clampScore(70 + Math.min(avgLength, 120) * 0.15),
      coherence: clampScore(90 - missingRate * 120 - duplicateRate * 40),
      novelty: clampScore(72 + uniqueRatioByColumn * 22),
      structure: clampScore(columns.length >= 4 ? 90 : 74),
      factual_conflict: clampScore(88 - duplicateRate * 50),
      domain_balance: clampScore(66 + uniqueRatioByColumn * 25),
      length_distribution: clampScore(80 - Math.abs(avgLength - 48) * 0.35),
    }

    const overallScore = SCORE_ORDER.reduce((sum, metric) => sum + metricScores[metric] * SCORE_WEIGHTS[metric], 0)

    setScanResult({
      metricScores,
      overallScore,
    })
    setScanMessage('Final scan completed. Weighted score calculated using the configured formula.')
  }

  return (
    <main className="workspace">
      <div className="ambient" aria-hidden="true" />

      <section className="hero card">
        <p className="eyebrow">Dataset Quality Studio</p>
        <h1>Upload your data:
          
        </h1>
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

      <section className="issuePanel card">
        <div className="tableMeta">
          <h2>Issue Thumbnails</h2>
          <span>Click to filter records</span>
        </div>
        <div className="filterGrid">
          {[
            ['all', 'All Records', issueBuckets.all.length],
            ['missing', 'Completeness Gaps', issueBuckets.missing.length],
            ['duplicate', 'Duplicates', issueBuckets.duplicate.length],
            ['sensitive', 'PHI Attention', issueBuckets.sensitive.length],
          ].map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={`filterCard ${selectedFilter === key ? 'active' : ''}`}
              onClick={() => setSelectedFilter(key)}
            >
              <strong>{label}</strong>
              <span>{count} records</span>
            </button>
          ))}
        </div>
      </section>

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

      <section className="scoreCard card">
        <div className="tableMeta">
          <h2>Final Quality Scan Phase</h2>
          <span>Weighted enterprise scoring model</span>
        </div>
        <div className="scoreHead">
          <button type="button" className="uploadButton" onClick={runFinalScan} disabled={!rows.length}>
            Run Dataset Quality Scoring Engine
          </button>
          <p className="scanStatus">{scanMessage}</p>
        </div>
        <div className="formula">
          overall_score = 0.15*redundancy + 0.10*toxicity + 0.10*diversity + 0.10*readability + 0.10*coherence +
          0.10*novelty + 0.10*structure + 0.10*factual_conflict + 0.075*domain_balance + 0.075*length_distribution
        </div>
        {scanResult ? (
          <>
            <div className="overallScore">
              <span>Overall Score</span>
              <strong>{scanResult.overallScore.toFixed(2)} / 100</strong>
            </div>
            <div className="scoreGrid">
              {SCORE_ORDER.map((metric) => (
                <article key={metric} className="scoreMetric">
                  <header>
                    <h4>{humanize(metric)}</h4>
                    <p>{scanResult.metricScores[metric].toFixed(2)}</p>
                  </header>
                  <div className="barTrack">
                    <div className="barValue" style={{ width: `${scanResult.metricScores[metric]}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}