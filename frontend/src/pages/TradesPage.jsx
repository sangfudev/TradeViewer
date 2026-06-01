import { useState, useEffect } from 'react'
import { getYears, getPositionsByYear } from '../api/client'

const fmt = (n) => n != null
  ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : '—'

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  : '—'

const pnlColor  = (v) => v == null ? '#8892a4' : v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#8892a4'
const fmtPnl    = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}$${fmt(v)}`

const RIGHT_COLS = new Set(['quantity', 'avgEntryPrice', 'avgExitPrice', 'totalCommission', 'pnL'])

const cols = [
  { key: 'openDate',        label: 'Opened' },
  { key: 'closeDate',       label: 'Closed' },
  { key: 'symbol',          label: 'Symbol' },
  { key: 'description',     label: 'Description' },
  { key: 'quantity',        label: 'Qty' },
  { key: 'avgEntryPrice',   label: 'Avg Entry' },
  { key: 'avgExitPrice',    label: 'Avg Exit' },
  { key: 'totalCommission', label: 'Commission' },
  { key: 'pnL',             label: 'P&L' },
]

export default function TradesPage() {
  const [years,   setYears]   = useState([])
  const [year,    setYear]    = useState(null)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('openDate')
  const [sortDir, setSortDir] = useState('asc')
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all') // 'all' | 'closed' | 'open'

  useEffect(() => {
    getYears().then(ys => {
      setYears(ys)
      if (ys.length > 0) setYear(ys[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!year) return
    setLoading(true)
    getPositionsByYear(year)
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoading(false))
  }, [year])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = positions
    .filter(p => {
      if (filter === 'closed' && !p.isClosed) return false
      if (filter === 'open'   &&  p.isClosed) return false
      if (!search) return true
      const q = search.toLowerCase()
      return p.symbol?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  const closed        = filtered.filter(p => p.isClosed)
  const totalPnL      = closed.reduce((s, p) => s + (p.pnL ?? 0), 0)
  const totalComm     = filtered.reduce((s, p) => s + (p.totalCommission ?? 0), 0)
  const winCount = closed.filter(p => p.pnL > 0).length
  const lossCount= closed.filter(p => p.pnL < 0).length
  const winRate  = (winCount + lossCount) > 0 ? (winCount / (winCount + lossCount)) * 100 : 0

  const SortIcon = ({ col }) =>
    sortKey !== col
      ? <span style={{ color: '#2e3248', marginLeft: 4 }}>↕</span>
      : <span style={{ color: '#6366f1', marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>

  const filterBtn = (value, label) => (
    <button onClick={() => setFilter(value)} style={{
      padding: '6px 14px', borderRadius: '8px', border: 'none',
      fontWeight: 600, fontSize: '13px', cursor: 'pointer',
      background: filter === value ? '#6366f1' : '#22263a',
      color:      filter === value ? '#fff'    : '#8892a4',
      transition: 'all 0.15s',
    }}>{label}</button>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Trade History</h1>
          <p style={{ color: '#8892a4' }}>One row per completed position — partial closes stay open until fully sold</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {years.length === 0 && <span style={{ color: '#8892a4', padding: '8px 0' }}>No data — import a file to get started</span>}
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)} style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
              background: year === y ? '#6366f1' : '#22263a',
              color:      year === y ? '#fff'    : '#8892a4',
            }}>{y}</button>
          ))}
        </div>
      </div>

      {/* Stats — closed positions only */}
      {closed.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Closed Trades', value: closed.length,         color: '#e2e8f0' },
            { label: 'Winners',       value: winCount,              color: '#22c55e' },
            { label: 'Losers',        value: lossCount,             color: '#ef4444' },
            { label: 'Win Rate',      value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? '#22c55e' : '#f59e0b' },
            { label: 'Total P&L',     value: fmtPnl(totalPnL),     color: pnlColor(totalPnL) },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1d27', border: '1px solid #2e3248', borderRadius: '10px', padding: '16px' }}>
              <p style={{ color: '#8892a4', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              <p style={{ fontWeight: 700, fontSize: '20px', color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {year && (
        <>
          {/* Toolbar */}
          <div style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by symbol or description…"
              style={{
                background: '#1a1d27', border: '1px solid #2e3248', borderRadius: '8px',
                padding: '8px 14px', color: '#e2e8f0', fontSize: '14px', outline: 'none', width: '260px',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '14px', cursor: 'pointer' }}>
                ✕ Clear
              </button>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
              {filterBtn('all',    'All')}
              {filterBtn('closed', 'Closed')}
              {filterBtn('open',   'Open')}
            </div>
            <span style={{ marginLeft: 'auto', color: '#8892a4', fontSize: '13px' }}>
              {filtered.length} position{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #2e3248' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#22263a' }}>
                  {cols.map(c => (
                    <th key={c.key} onClick={() => handleSort(c.key)} style={{
                      padding: '12px 16px',
                      textAlign: RIGHT_COLS.has(c.key) ? 'right' : 'left',
                      fontWeight: 600, fontSize: '12px', cursor: 'pointer', userSelect: 'none',
                      color: sortKey === c.key ? '#a5b4fc' : '#8892a4',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap', borderBottom: '1px solid #2e3248',
                    }}>
                      {c.label}<SortIcon col={c.key} />
                    </th>
                  ))}
                  {/* Status column — not sortable */}
                  <th style={{
                    padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '12px',
                    color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em',
                    whiteSpace: 'nowrap', borderBottom: '1px solid #2e3248',
                  }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#8892a4' }}>Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#8892a4' }}>
                    {positions.length === 0 ? `No positions for ${year}` : 'No matches'}
                  </td></tr>
                )}
                {!loading && filtered.map((p, i) => (
                  <tr key={`${p.symbol}-${p.openDate}-${i}`} style={{
                    background: i % 2 === 0 ? '#1a1d27' : '#1c2030', transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#252942'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#1a1d27' : '#1c2030'}
                  >
                    <td style={{ padding: '12px 16px', color: '#8892a4', whiteSpace: 'nowrap' }}>{fmtDate(p.openDate)}</td>
                    <td style={{ padding: '12px 16px', color: '#8892a4', whiteSpace: 'nowrap' }}>{p.isClosed ? fmtDate(p.closeDate) : '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {p.symbol}
                      {p.currency && p.currency !== 'USD' && (
                        <span style={{ marginLeft: 6, fontSize: '11px', color: '#8892a4', fontWeight: 400 }}>{p.currency}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8892a4' }}>{p.description || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{fmt(p.quantity)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.avgEntryPrice > 0 ? fmt(p.avgEntryPrice) : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#8892a4' }}>{p.avgExitPrice != null ? fmt(p.avgExitPrice) : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444' }}>{p.totalCommission > 0 ? `-$${fmt(p.totalCommission)}` : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: pnlColor(p.pnL) }}>
                      {fmtPnl(p.pnL)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 600,
                        background: p.isClosed ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                        color:      p.isClosed ? '#a5b4fc'               : '#f59e0b',
                      }}>{p.isClosed ? 'Closed' : 'Open'}</span>
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                {!loading && filtered.length > 0 && (
                  <tr style={{ background: '#22263a', borderTop: '2px solid #2e3248' }}>
                    <td colSpan={7} style={{
                      padding: '12px 16px', textAlign: 'right',
                      fontWeight: 600, fontSize: '12px', color: '#8892a4',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Totals ({closed.length} closed{positions.length - closed.length > 0 ? `, ${positions.length - closed.length} open` : ''})
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '14px', color: '#ef4444' }}>
                      {totalComm > 0 ? `-$${fmt(totalComm)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '15px', color: pnlColor(totalPnL) }}>
                      {fmtPnl(totalPnL)}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
