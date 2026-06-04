import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Customized,
} from 'recharts'
import { getYears, getPositionsByYear, getChart } from '../api/client'
import './css/TradesPage.css'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => n != null
  ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : '—'

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  : '—'

const isoDate = (d) => d ? new Date(d).toISOString().split('T')[0] : null

const pnlColor = (v) => v == null ? 'var(--text-muted)' : v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-muted)'
const fmtPnl   = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}$${fmt(v)}`

// ── indicator math ────────────────────────────────────────────────────────────

function computeEMA(closes, period) {
  if (closes.length < period) return closes.map(() => null)
  const k = 2 / (period + 1)
  const result = new Array(period - 1).fill(null)
  result.push(closes.slice(0, period).reduce((a, b) => a + b, 0) / period)
  for (let i = period; i < closes.length; i++)
    result.push(closes[i] * k + result[result.length - 1] * (1 - k))
  return result
}

function computeSMA(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null
    return closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  })
}

// ── candlestick SVG (rendered via Customized, receives chartData as extra prop) ──

function CandlestickRenderer({ xAxisMap, yAxisMap, chartData, entryDate, exitDate }) {
  const xAxis = xAxisMap && (xAxisMap[0] ?? Object.values(xAxisMap)[0])
  const yAxis = yAxisMap && (yAxisMap[0] ?? Object.values(yAxisMap)[0])
  if (!xAxis?.scale || !yAxis?.scale || !chartData?.length) return null

  const bw    = typeof xAxis.scale.bandwidth === 'function' ? xAxis.scale.bandwidth() : 8
  const toY   = (p) => yAxis.scale(p)
  const bodyW = Math.max(2, bw * 0.65)
  const aw    = Math.max(8, bw * 0.8)
  const ah    = 9
  const gap   = 4

  return (
    <g>
      {chartData.map((c, i) => {
        const xPos = xAxis.scale(c.date)
        if (xPos == null || isNaN(xPos)) return null

        const highY  = toY(c.high)
        const lowY   = toY(c.low)
        const openY  = toY(c.open)
        const closeY = toY(c.close)
        const bull   = c.close >= c.open
        const stroke = bull ? '#22c55e' : '#ef4444'
        const fill   = bull ? '#166534' : '#7f1d1d'
        const cx     = xPos + bw / 2
        const bodyTop = Math.min(openY, closeY)
        const bodyH   = Math.max(1, Math.abs(closeY - openY))

        const isEntry = c.date === entryDate
        const isExit  = c.date === exitDate
        const arrowTipY  = highY - gap
        const arrowBaseY = arrowTipY - ah

        return (
          <g key={i}>
            <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={stroke} strokeWidth={1.5} />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
              fill={fill} stroke={stroke} strokeWidth={1} />

            {isEntry && !isExit && (
              <g>
                <polygon points={`${cx - aw / 2},${arrowBaseY} ${cx + aw / 2},${arrowBaseY} ${cx},${arrowTipY}`} fill="#22c55e" />
                <text x={cx} y={arrowBaseY - 3} textAnchor="middle" fill="#22c55e" fontSize={9} fontWeight="700">B</text>
              </g>
            )}
            {isEntry && isExit && (
              <g>
                <polygon points={`${cx - aw / 2},${arrowBaseY} ${cx + aw / 2},${arrowBaseY} ${cx},${arrowTipY}`} fill="#ef4444" />
                <text x={cx} y={arrowBaseY - 3} textAnchor="middle" fill="#ef4444" fontSize={9} fontWeight="700">S</text>
                <polygon points={`${cx - aw / 2},${lowY + gap} ${cx + aw / 2},${lowY + gap} ${cx},${lowY + gap + ah}`} fill="#22c55e" />
                <text x={cx} y={lowY + gap + ah + 10} textAnchor="middle" fill="#22c55e" fontSize={9} fontWeight="700">B</text>
              </g>
            )}
            {isExit && !isEntry && (
              <g>
                <polygon points={`${cx - aw / 2},${arrowBaseY} ${cx + aw / 2},${arrowBaseY} ${cx},${arrowTipY}`} fill="#ef4444" />
                <text x={cx} y={arrowBaseY - 3} textAnchor="middle" fill="#ef4444" fontSize={9} fontWeight="700">S</text>
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ── tooltip ───────────────────────────────────────────────────────────────────

const MA_SERIES = [
  { key: 'ema9',   label: 'EMA 9',   color: '#f59e0b' },
  { key: 'ema21',  label: 'EMA 21',  color: '#a78bfa' },
  { key: 'ema50',  label: 'EMA 50',  color: '#38bdf8' },
  { key: 'sma100', label: 'SMA 100', color: '#fb923c' },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const bull = d.close >= d.open

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">
        {new Date(label + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <div className="chart-tooltip-grid">
        <span className="chart-tooltip-key">O</span><span className="chart-tooltip-val">${fmt(d.open)}</span>
        <span className="chart-tooltip-key">H</span><span className="chart-tooltip-high">${fmt(d.high)}</span>
        <span className="chart-tooltip-key">L</span><span className="chart-tooltip-low">${fmt(d.low)}</span>
        <span className="chart-tooltip-key">C</span>
        <span className="chart-tooltip-close" style={{ color: bull ? 'var(--green)' : 'var(--red)' }}>${fmt(d.close)}</span>
        {MA_SERIES.map(m => d[m.key] != null && (
          <>
            <span key={m.key + 'l'} className="chart-tooltip-key">{m.label}</span>
            <span key={m.key + 'v'} style={{ color: m.color }}>${fmt(d[m.key])}</span>
          </>
        ))}
      </div>
    </div>
  )
}

// ── chart modal ───────────────────────────────────────────────────────────────

function Stat({ label, value, color = 'var(--text)' }) {
  return (
    <div className="stat-group">
      <p className="stat-group-label">{label}</p>
      <p className="stat-group-value" style={{ color }}>{value}</p>
    </div>
  )
}

function ChartModal({ position, onClose }) {
  const [candles,      setCandles]      = useState([])
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError,   setChartError]   = useState(null)
  const [view,         setView]         = useState('trade') // 'trade' | 'year'

  useEffect(() => {
    const openYear = new Date(position.openDate).getFullYear()
    const today    = isoDate(new Date())
    const from = view === 'year' ? `${openYear}-01-01` : isoDate(position.openDate)
    const to   = view === 'year'
      ? (`${openYear}-12-31` > today ? today : `${openYear}-12-31`)
      : (position.closeDate ? isoDate(position.closeDate) : today)
    setChartLoading(true)
    setChartError(null)
    getChart(position.symbol, from, to)
      .then(setCandles)
      .catch(() => setChartError('Could not load price data for this symbol.'))
      .finally(() => setChartLoading(false))
  }, [position, view])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const chartData = useMemo(() => {
    if (!candles.length) return []
    const closes = candles.map(c => c.close)
    const ema9   = computeEMA(closes, 9)
    const ema21  = computeEMA(closes, 21)
    const ema50  = computeEMA(closes, 50)
    const sma100 = computeSMA(closes, 100)
    return candles.map((c, i) => ({
      ...c,
      ema9:   ema9[i]   != null ? +ema9[i].toFixed(4)   : null,
      ema21:  ema21[i]  != null ? +ema21[i].toFixed(4)  : null,
      ema50:  ema50[i]  != null ? +ema50[i].toFixed(4)  : null,
      sma100: sma100[i] != null ? +sma100[i].toFixed(4) : null,
    }))
  }, [candles])

  const yDomain = useMemo(() => {
    if (!candles.length) return [0, 100]
    const prices = candles.flatMap(c => [c.high, c.low])
    if (position.avgEntryPrice) prices.push(Number(position.avgEntryPrice))
    if (position.avgExitPrice)  prices.push(Number(position.avgExitPrice))
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const pad  = (maxP - minP) * 0.08
    return [+(minP - pad).toFixed(2), +(maxP + pad).toFixed(2)]
  }, [candles, position])

  const entryDate = isoDate(position.openDate)
  const exitDate  = position.closeDate ? isoDate(position.closeDate) : null
  const tickFmt   = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const hasChart = !chartLoading && !chartError && chartData.length > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chart-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="symbol-row">
              <h2 className="symbol-title">{position.symbol}</h2>
              {position.currency && position.currency !== 'USD' &&
                <span className="symbol-currency">{position.currency}</span>}
              <span className={`badge badge--${position.isClosed ? 'closed' : 'open'}`}>
                {position.isClosed ? 'Closed' : 'Open'}
              </span>
            </div>
            <p className="symbol-meta">
              {position.description ? position.description + ' · ' : ''}
              {fmtDate(position.openDate)}{position.isClosed ? ` → ${fmtDate(position.closeDate)}` : ' → present'}
            </p>
          </div>
          <div className="modal-right">
            <Stat label="Entry" value={position.avgEntryPrice ? `$${fmt(position.avgEntryPrice)}` : '—'} />
            {position.isClosed && <Stat label="Exit" value={position.avgExitPrice != null ? `$${fmt(position.avgExitPrice)}` : '—'} />}
            {position.isClosed && <Stat label="P&L" value={fmtPnl(position.pnL)} color={pnlColor(position.pnL)} />}
            <div className="period-toggle">
              {[['trade', 'Trade'], ['year', `${new Date(position.openDate).getFullYear()}`]].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`period-btn${view === v ? ' period-btn--active' : ''}`}
                >{label}</button>
              ))}
            </div>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {hasChart && (
          <div className="ma-legend">
            {MA_SERIES.map(m => (
              <div key={m.key} className="ma-legend-item">
                <div className="ma-legend-line" style={{ background: m.color }} />
                <span style={{ color: m.color }}>{m.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="chart-area">
          {chartLoading && <div className="chart-empty-state chart-empty-state--muted">Loading price data…</div>}
          {chartError && <div className="chart-empty-state chart-empty-state--error">{chartError}</div>}
          {!chartLoading && !chartError && chartData.length === 0 && (
            <div className="chart-empty-state chart-empty-state--muted">No price data available for this symbol.</div>
          )}
          {hasChart && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} barCategoryGap="20%">
                <CartesianGrid stroke="#2e3248" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8892a4', fontSize: 11 }}
                  tickFormatter={tickFmt}
                  tickLine={false}
                  axisLine={{ stroke: '#2e3248' }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fill: '#8892a4', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v.toFixed(2)}`}
                  width={72}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: '#3e4466', strokeWidth: 1, strokeDasharray: '4 2' }}
                />
                <Line dataKey="close" stroke="transparent" strokeWidth={0}
                  dot={false} activeDot={false} isAnimationActive={false} legendType="none" />
                <Customized component={CandlestickRenderer}
                  chartData={chartData} entryDate={entryDate} exitDate={exitDate} />
                {MA_SERIES.map(m => (
                  <Line key={m.key} dataKey={m.key} type="monotone"
                    stroke={m.color} strokeWidth={1.5}
                    dot={false} activeDot={false}
                    isAnimationActive={false} legendType="none"
                  />
                ))}
                {position.avgEntryPrice > 0 && (
                  <ReferenceLine y={Number(position.avgEntryPrice)}
                    stroke="#22c55e" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: `Entry $${fmt(position.avgEntryPrice)}`, position: 'insideTopRight', fill: '#22c55e', fontSize: 11 }} />
                )}
                {position.isClosed && position.avgExitPrice != null && (
                  <ReferenceLine y={Number(position.avgExitPrice)}
                    stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: `Exit $${fmt(position.avgExitPrice)}`, position: 'insideBottomRight', fill: '#ef4444', fontSize: 11 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <p className="chart-footer">Price data via Yahoo Finance · click outside or Esc to close</p>
      </div>
    </div>
  )
}

// ── table ─────────────────────────────────────────────────────────────────────

const RIGHT_COLS = new Set(['quantity', 'avgEntryPrice', 'avgExitPrice', 'totalCommission', 'pnL', 'gainPct'])

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
  { key: 'gainPct',         label: 'Gain %' },
]

const gainPct = (p) =>
  p.avgEntryPrice > 0 && p.avgExitPrice != null
    ? (p.avgExitPrice - p.avgEntryPrice) / p.avgEntryPrice * 100
    : null

const fmtPct = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`

// ── page ──────────────────────────────────────────────────────────────────────

export default function TradesPage() {
  const [years,     setYears]     = useState([])
  const [year,      setYear]      = useState(null)
  const [positions, setPositions] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [sortKey,   setSortKey]   = useState('openDate')
  const [sortDir,   setSortDir]   = useState('asc')
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [selected,  setSelected]  = useState(null)

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

  const closeModal = useCallback(() => setSelected(null), [])

  const filtered = positions
    .filter(p => {
      if (filter === 'closed' && !p.isClosed) return false
      if (filter === 'open'   &&  p.isClosed) return false
      if (!search) return true
      const q = search.toLowerCase()
      return p.symbol?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const av = sortKey === 'gainPct' ? gainPct(a) : a[sortKey]
      const bv = sortKey === 'gainPct' ? gainPct(b) : b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  const closed    = filtered.filter(p => p.isClosed)
  const totalPnL  = closed.reduce((s, p) => s + (p.pnL ?? 0), 0)
  const totalComm = filtered.reduce((s, p) => s + (p.totalCommission ?? 0), 0)
  const winners   = closed.filter(p => p.pnL > 0)
  const losers    = closed.filter(p => p.pnL < 0)
  const winCount  = winners.length
  const lossCount = losers.length
  const winRate   = (winCount + lossCount) > 0 ? (winCount / (winCount + lossCount)) * 100 : 0

  const holdDays = (p) => p.closeDate
    ? Math.round((new Date(p.closeDate) - new Date(p.openDate)) / 86_400_000)
    : 0
  const avgDays = (arr) => arr.length
    ? Math.round(arr.reduce((s, p) => s + holdDays(p), 0) / arr.length)
    : null

  const SortIcon = ({ col }) =>
    sortKey !== col
      ? <span className="sort-icon">↕</span>
      : <span className="sort-icon sort-icon--active">{sortDir === 'asc' ? '↑' : '↓'}</span>

  return (
    <div>
      {selected && <ChartModal position={selected} onClose={closeModal} />}

      <div className="trades-header">
        <div>
          <h1 className="trades-page-title">Trade History</h1>
          <p className="trades-page-subtitle">One row per completed position — click any row to view the price chart</p>
        </div>
        <div className="trades-year-btns">
          {years.length === 0 && <span className="no-data-hint">No data — import a file to get started</span>}
          {years.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`btn btn-secondary year-btn${year === y ? ' year-btn--active' : ''}`}
            >{y}</button>
          ))}
        </div>
      </div>

      {closed.length > 0 && (
        <div className="stats-grid">
          {[
            { label: 'Closed Trades',   value: closed.length,            color: 'var(--text)' },
            { label: 'Winners',         value: winCount,                 color: 'var(--green)' },
            { label: 'Losers',          value: lossCount,                color: 'var(--red)' },
            { label: 'Win Rate',        value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'var(--green)' : 'var(--yellow)' },
            { label: 'Total P&L',       value: fmtPnl(totalPnL),        color: pnlColor(totalPnL) },
            { label: 'Avg Hold (Win)',  value: avgDays(winners) != null ? `${avgDays(winners)}d` : '—', color: 'var(--green)' },
            { label: 'Avg Hold (Loss)', value: avgDays(losers)  != null ? `${avgDays(losers)}d`  : '—', color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="stat-label">{s.label}</p>
              <p className="stat-value" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {year && (
        <>
          <div className="trades-toolbar">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by symbol or description…"
              className="search-input"
            />
            {search && (
              <button onClick={() => setSearch('')} className="clear-btn">✕ Clear</button>
            )}
            <div className="filter-group">
              {['all', 'closed', 'open'].map(v => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`btn btn-secondary filter-btn${filter === v ? ' filter-btn--active' : ''}`}
                >{v.charAt(0).toUpperCase() + v.slice(1)}</button>
              ))}
            </div>
            <span className="result-count">
              {filtered.length} position{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="table-wrap">
            <table className="trades-table">
              <thead>
                <tr>
                  {cols.map(c => (
                    <th
                      key={c.key}
                      onClick={() => handleSort(c.key)}
                      className={[
                        RIGHT_COLS.has(c.key) ? 'th-right' : '',
                        sortKey === c.key ? 'th-sort-active' : '',
                      ].filter(Boolean).join(' ') || undefined}
                    >
                      {c.label}<SortIcon col={c.key} />
                    </th>
                  ))}
                  <th className="th-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="trades-table-empty"><td colSpan={11}>Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr className="trades-table-empty">
                    <td colSpan={11}>{positions.length === 0 ? `No positions for ${year}` : 'No matches'}</td>
                  </tr>
                )}
                {!loading && filtered.map((p, i) => (
                  <tr key={`${p.symbol}-${p.openDate}-${i}`} onClick={() => setSelected(p)}>
                    <td className="td-muted td-nowrap">{fmtDate(p.openDate)}</td>
                    <td className="td-muted td-nowrap">{p.isClosed ? fmtDate(p.closeDate) : '—'}</td>
                    <td className="td-bold">
                      {p.symbol}
                      {p.currency && p.currency !== 'USD' &&
                        <span className="td-currency-tag">{p.currency}</span>}
                    </td>
                    <td className="td-muted">{p.description || '—'}</td>
                    <td className="td-right">{fmt(p.quantity)}</td>
                    <td className="td-right">{p.avgEntryPrice > 0 ? fmt(p.avgEntryPrice) : '—'}</td>
                    <td className="td-right td-muted">{p.avgExitPrice != null ? fmt(p.avgExitPrice) : '—'}</td>
                    <td className="td-commission">{p.totalCommission > 0 ? `-$${fmt(p.totalCommission)}` : '—'}</td>
                    <td className="td-right td-bold" style={{ color: pnlColor(p.pnL) }}>{fmtPnl(p.pnL)}</td>
                    <td className="td-right td-bold" style={{ color: pnlColor(gainPct(p)) }}>{fmtPct(gainPct(p))}</td>
                    <td className="td-center">
                      <span className={`badge badge--${p.isClosed ? 'closed' : 'open'}`}>
                        {p.isClosed ? 'Closed' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length > 0 && (
                  <tr className="totals-row">
                    <td colSpan={7} className="totals-label">
                      Totals ({closed.length} closed{positions.length - closed.length > 0 ? `, ${positions.length - closed.length} open` : ''})
                    </td>
                    <td className="totals-commission">{totalComm > 0 ? `-$${fmt(totalComm)}` : '—'}</td>
                    <td className="totals-pnl" style={{ color: pnlColor(totalPnL) }}>{fmtPnl(totalPnL)}</td>
                    <td /><td />
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
