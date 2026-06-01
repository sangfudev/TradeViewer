import { useState, useRef } from 'react'
import { importFile } from '../api/client'

const cardStyle = {
  background: '#1a1d27',
  border: '1px solid #2e3248',
  borderRadius: '12px',
  padding: '28px',
}

const btnStyle = (variant = 'primary') => ({
  padding: '10px 22px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 600,
  fontSize: '14px',
  background: variant === 'primary' ? '#6366f1' : '#22263a',
  color: '#fff',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
})

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

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Import Trades</h1>
      <p style={{ color: '#8892a4', marginBottom: '24px' }}>
        Upload a <strong style={{ color: '#e2e8f0' }}>.csv</strong> or <strong style={{ color: '#e2e8f0' }}>.xml</strong> file containing your trade history.
      </p>

      {/* Drop Zone */}
      <div
        style={{
          ...cardStyle,
          border: `2px dashed ${dragging ? '#6366f1' : file ? '#22c55e' : '#2e3248'}`,
          background: dragging ? '#1e2035' : '#1a1d27',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          marginBottom: '20px',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xml"
          style={{ display: 'none' }}
          onChange={(e) => setFile(e.target.files[0])}
        />
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>
          {file ? '✅' : '📂'}
        </div>
        {file ? (
          <>
            <p style={{ fontWeight: 600, color: '#22c55e' }}>{file.name}</p>
            <p style={{ color: '#8892a4', fontSize: '12px', marginTop: '4px' }}>
              {(file.size / 1024).toFixed(1)} KB — click to change
            </p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Drop your file here or click to browse</p>
            <p style={{ color: '#8892a4', fontSize: '12px' }}>Supports .csv and .xml</p>
          </>
        )}
      </div>

      {/* Format Guide */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <p style={{ fontWeight: 600, marginBottom: '12px', color: '#8892a4', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected format</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>CSV</p>
            <pre style={{ background: '#0f1117', borderRadius: '6px', padding: '12px', fontSize: '11px', color: '#a5b4fc', overflow: 'auto' }}>{`Date,Symbol,Action,Quantity,EntryPrice,ExitPrice,PnL
2024-01-15,AAPL,Buy,100,150.00,165.00,1500.00
2024-02-20,MSFT,Sell,50,380.00,370.00,-500.00`}</pre>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>XML</p>
            <pre style={{ background: '#0f1117', borderRadius: '6px', padding: '12px', fontSize: '11px', color: '#a5b4fc', overflow: 'auto' }}>{`<Trades>
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
        style={{ ...btnStyle(), opacity: (!file || loading) ? 0.5 : 1 }}
        onClick={handleSubmit}
        disabled={!file || loading}
      >
        {loading ? 'Importing…' : 'Import Trades'}
      </button>

      {status && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          borderRadius: '10px',
          background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${status.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: status.type === 'success' ? '#22c55e' : '#ef4444',
          fontWeight: 500,
        }}>
          {status.message}
          {status.count > 0 && <span style={{ color: '#8892a4', fontWeight: 400, marginLeft: '8px' }}>({status.count} trades)</span>}
        </div>
      )}
    </div>
  )
}
