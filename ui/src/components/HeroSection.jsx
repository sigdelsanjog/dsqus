export default function HeroSection({ handleUpload, isLoading, qualityBand, status, fileName }) {
  return (
    <section className="hero card">
      <p className="eyebrow">Dataset Quality Studio</p>
      <h1>Upload your data and orchestrate quality workflows.</h1>
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
  )
}
