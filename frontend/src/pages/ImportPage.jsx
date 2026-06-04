import { useState, useRef } from 'react'
import { importFile } from '../api/client'
import './css/ImportPage.css'

export default function ImportPage() {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', message, count }
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setStatus(null)
    try {
      const result = await importFile(file)
      setStatus({ type: 'success', message: result.message, count: result.importedCount })
      setFile(null)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Import failed.'
      setStatus({ type: 'error', message: typeof msg === 'string' ? msg : JSON.stringify(msg) })
    } finally {
      setLoading(false)
    }
  }

  const dropZoneClass = [
    'import-drop-zone',
    dragging ? 'import-drop-zone--dragging' : '',
    file && !dragging ? 'import-drop-zone--has-file' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="import-page">
      <h1>Import Trades</h1>
      <p className="import-subtitle">
        Upload a <strong>.csv</strong> or <strong>.xml</strong> file containing your trade history.
      </p>

      <div
        className={dropZoneClass}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xml"
          className="import-file-input"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <div className="import-drop-icon">{file ? '✅' : '📂'}</div>
        {file ? (
          <>
            <p className="import-filename">{file.name}</p>
            <p className="import-filesize">{(file.size / 1024).toFixed(1)} KB — click to change</p>
          </>
        ) : (
          <>
            <p className="import-placeholder-title">Drop your file here or click to browse</p>
            <p className="import-placeholder-hint">Supports .csv and .xml</p>
          </>
        )}
      </div>

      <div className="card import-format-guide">
        <p className="import-format-label">Expected format</p>
        <div className="import-format-grid">
          <div>
            <p className="import-format-title">CSV</p>
            <pre className="import-code-preview">{`Date,Symbol,Action,Quantity,EntryPrice,ExitPrice,PnL
2024-01-15,AAPL,Buy,100,150.00,165.00,1500.00
2024-02-20,MSFT,Sell,50,380.00,370.00,-500.00`}</pre>
          </div>
          <div>
            <p className="import-format-title">XML</p>
            <pre className="import-code-preview">{`<Trades>
  <Trade>
    <Date>2024-01-15</Date>
    <Symbol>AAPL</Symbol>
    <Action>Buy</Action>
    <Quantity>100</Quantity>
    <EntryPrice>150.00</EntryPrice>
    <ExitPrice>165.00</ExitPrice>
    <PnL>1500.00</PnL>
  </Trade>
</Trades>`}</pre>
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary import-submit"
        onClick={handleSubmit}
        disabled={!file || loading}
      >
        {loading ? 'Importing…' : 'Import Trades'}
      </button>

      {status && (
        <div className={`import-status import-status--${status.type}`}>
          {status.message}
          {status.count > 0 && <span className="import-status-count">({status.count} trades)</span>}
        </div>
      )}
    </div>
  )
}
