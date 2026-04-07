function humanize(metric) {
  return metric.replace(/_/g, ' ')
}

export default function FinalScanSection({ runFinalScan, rows, scanMessage, scanResult, scoreOrder }) {
  return (
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
            {scoreOrder.map((metric) => (
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
  )
}
