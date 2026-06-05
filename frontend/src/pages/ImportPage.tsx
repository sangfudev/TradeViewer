import { useState, useRef } from 'react'
import { importFile } from '../api/client'
import styles from './css/ImportPage.module.css'

interface ImportStatus {
  type: 'success' | 'error'
  message: string
  count?: number
}

export function ImportPage() {
  const [file,     setFile]     = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [status,   setStatus]   = useState<ImportStatus | null>(null)
  const [loading,  setLoading]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
      const axiosErr = err as { response?: { data?: { message?: string } | string } }
      const msg = axiosErr.response?.data
        ? (typeof axiosErr.response.data === 'string'
            ? axiosErr.response.data
            : (axiosErr.response.data as { message?: string }).message ?? 'Import failed.')
        : 'Import failed.'
      setStatus({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  const dropZoneClass = [
    styles['import-drop-zone'],
    dragging ? styles['import-drop-zone--dragging'] : '',
    file && !dragging ? styles['import-drop-zone--has-file'] : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={styles['import-page']}>
      <h1>Import Trades</h1>
      <p className={styles['import-subtitle']}>
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
          className={styles['import-file-input']}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className={styles['import-drop-icon']}>{file ? '✅' : '📂'}</div>
        {file ? (
          <>
            <p className={styles['import-filename']}>{file.name}</p>
            <p className={styles['import-filesize']}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
          </>
        ) : (
          <>
            <p className={styles['import-placeholder-title']}>Drop your file here or click to browse</p>
            <p className={styles['import-placeholder-hint']}>Supports .csv and .xml</p>
          </>
        )}
      </div>

      <div className={`card ${styles['import-format-guide']}`}>
        <p className={styles['import-format-label']}>Expected format</p>
        <div className={styles['import-format-grid']}>
          <div>
            <p className={styles['import-format-title']}>CSV</p>
            <pre className={styles['import-code-preview']}>{`Date,Symbol,Action,Quantity,EntryPrice,ExitPrice,PnL
2024-01-15,AAPL,Buy,100,150.00,165.00,1500.00
2024-02-20,MSFT,Sell,50,380.00,370.00,-500.00`}</pre>
          </div>
          <div>
            <p className={styles['import-format-title']}>XML</p>
            <pre className={styles['import-code-preview']}>{`<Trades>
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
        className={`btn btn-primary ${styles['import-submit']}`}
        onClick={handleSubmit}
        disabled={!file || loading}
      >
        {loading ? 'Importing…' : 'Import Trades'}
      </button>

      {status && (
        <div className={`${styles['import-status']} ${styles[`import-status--${status.type}`]}`}>
          {status.message}
          {status.count != null && status.count > 0 && (
            <span className={styles['import-status-count']}>({status.count} trades)</span>
          )}
        </div>
      )}
    </div>
  )
}
