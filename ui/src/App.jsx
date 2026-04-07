import { useMemo, useState } from 'react'
import DataPreviewTable from './components/DataPreviewTable'
import FinalScanSection from './components/FinalScanSection'
import HeroSection from './components/HeroSection'
import IssueThumbnails from './components/IssueThumbnails'
import MetricsSection from './components/MetricsSection'
import RecordEditor from './components/RecordEditor'

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

function clampScore(value) {
  return Math.max(0, Math.min(100, value))
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

      <HeroSection
        handleUpload={handleUpload}
        isLoading={isLoading}
        qualityBand={qualityBand}
        status={status}
        fileName={fileName}
      />

      <MetricsSection rowCount={rowCount} stats={stats} />

      <IssueThumbnails issueBuckets={issueBuckets} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} />

      <RecordEditor columns={columns} activeRow={activeRow} updateCell={updateCell} deleteColumn={deleteColumn} />

      <DataPreviewTable
        columns={columns}
        displayedRows={displayedRows}
        rows={rows}
        emptyState={emptyState}
        activeRowId={activeRowId}
        setActiveRowId={setActiveRowId}
        deleteRow={deleteRow}
      />

      <FinalScanSection runFinalScan={runFinalScan} rows={rows} scanMessage={scanMessage} scanResult={scanResult} scoreOrder={SCORE_ORDER} />
    </main>
  )
}