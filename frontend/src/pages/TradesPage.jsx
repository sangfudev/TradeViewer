import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Customized,
} from 'recharts'
import { getYears, getPositionsByYear, getChart } from '../api/client'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => n != null
  ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : '—'

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  : '—'

const isoDate = (d) => d ? new Date(d).toISOString().split('T')[0] : null

const pnlColor = (v) => v == null ? '#8892a4' : v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#8892a4'
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
  const aw    = Math.max(8, bw * 0.8)   // arrow width
  const ah    = 9                         // arrow head height
  const gap   = 4                         // pixels between arrow tip and candle high

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
        // tip of downward arrow sits `gap` px above the wick top
        const arrowTipY  = highY - gap
        const arrowBaseY = arrowTipY - ah

        return (
          <g key={i}>
            <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={stroke} strokeWidth={1.5} />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
              fill={fill} stroke={stroke} strokeWidth={1} />

            {isEntry && !isExit && (
              <g>
                <polygon
                  points={`${cx - aw / 2},${arrowBaseY} ${cx + aw / 2},${arrowBaseY} ${cx},${arrowTipY}`}
                  fill="#22c55e"
                />
                <text x={cx} y={arrowBaseY - 3} textAnchor="middle"
                  fill="#22c55e" fontSize={9} fontWeight="700">B</text>
              </g>
            )}
            {isEntry && isExit && (
              // Same-day trade: buy arrow below the low, sell arrow above the high
              <g>
                {/* Sell — above */}
                <polygon
                  points={`${cx - aw / 2},${arrowBaseY} ${cx + aw / 2},${arrowBaseY} ${cx},${arrowTipY}`}
                  fill="#ef4444"
                />
                <text x={cx} y={arrowBaseY - 3} textAnchor="middle"
                  fill="#ef4444" fontSize={9} fontWeight="700">S</text>
                {/* Buy — below (upward-pointing arrow) */}
                <polygon
                  points={`${cx - aw / 2},${lowY + gap} ${cx + aw / 2},${lowY + gap} ${cx},${lowY + gap + ah}`}
                  fill="#22c55e"
                />
                <text x={cx} y={lowY + gap + ah + 10} textAnchor="middle"
                  fill="#22c55e" fontSize={9} fontWeight="700">B</text>
              </g>
            )}
            {isExit && !isEntry && (
              <g>
                <polygon
                  points={`${cx - aw / 2},${arrowBaseY} ${cx + aw / 2},${arrowBaseY} ${cx},${arrowTipY}`}
                  fill="#ef4444"
                />
                <text x={cx} y={arrowBaseY - 3} textAnchor="middle"
                  fill="#ef4444" fontSize={9} fontWeight="700">S</text>
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
    <div style={{
      background: '#22263a', border: '1px solid #2e3248', borderRadius: '8px',
      padding: '10px 14px', fontSize: '12px', minWidth: '150px',
    }}>
      <p style={{ color: '#e2e8f0', fontWeight: 600, margin: '0 0 6px' }}>
        {new Date(label + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px' }}>
        <span style={{ color: '#8892a4' }}>O</span><span style={{ color: '#e2e8f0' }}>${fmt(d.open)}</span>
        <span style={{ color: '#8892a4' }}>H</span><span style={{ color: '#22c55e' }}>${fmt(d.high)}</span>
        <span style={{ color: '#8892a4' }}>L</span><span style={{ color: '#ef4444' }}>${fmt(d.low)}</span>
        <span style={{ color: '#8892a4' }}>C</span>
        <span style={{ color: bull ? '#22c55e' : '#ef4444', fontWeight: 700 }}>${fmt(d.close)}</span>
        {MA_SERIES.map(m => d[m.key] != null && (
          <>
            <span key={m.key + 'l'} style={{ color: '#8892a4' }}>{m.label}</span>
            <span key={m.key + 'v'} style={{ color: m.color }}>${fmt(d[m.key])}</span>
          </>
        ))}
      </div>
    </div>
  )
}

// ── chart modal ───────────────────────────────────────────────────────────────

function Stat({ label, value, color = '#e2e8f0' }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <p style={{ color: '#8892a4', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ color, fontWeight: 700, fontSize: '15px', margin: '2px 0 0' }}>{value}</p>
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
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1d27', border: '1px solid #2e3248', borderRadius: '16px',
        width: '100%', maxWidth: '960px', padding: '24px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{position.symbol}</h2>
              {position.currency && position.currency !== 'USD' &&
                <span style={{ fontSize: '12px', color: '#8892a4' }}>{position.currency}</span>}
              <span style={{
                padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                background: position.isClosed ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                color:      position.isClosed ? '#a5b4fc' : '#f59e0b',
              }}>{position.isClosed ? 'Closed' : 'Open'}</span>
            </div>
            <p style={{ color: '#8892a4', fontSize: '13px', margin: '4px 0 0' }}>
              {position.description ? position.description + ' · ' : ''}
              {fmtDate(position.openDate)}{position.isClosed ? ` → ${fmtDate(position.closeDate)}` : ' → present'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <Stat label="Entry" value={position.avgEntryPrice ? `$${fmt(position.avgEntryPrice)}` : '—'} />
            {position.isClosed && <Stat label="Exit" value={position.avgExitPrice != null ? `$${fmt(position.avgExitPrice)}` : '—'} />}
            {position.isClosed && <Stat label="P&L" value={fmtPnl(position.pnL)} color={pnlColor(position.pnL)} />}
            {/* Period toggle */}
            <div style={{ display: 'flex', border: '1px solid #2e3248', borderRadius: '8px', overflow: 'hidden', alignSelf: 'center' }}>
              {[['trade', 'Trade'], ['year', `${new Date(position.openDate).getFullYear()}`]].map(([v, label]) => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '5px 12px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600,
                  background: view === v ? '#6366f1' : 'transparent',
                  color:      view === v ? '#fff'    : '#8892a4',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid #2e3248', borderRadius: '8px',
              color: '#8892a4', fontSize: '18px', cursor: 'pointer',
              width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>
        </div>

        {/* MA legend */}
        {hasChart && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {MA_SERIES.map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 20, height: 2, background: m.color, borderRadius: 1 }} />
                <span style={{ fontSize: '11px', color: m.color }}>{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div style={{ height: '390px' }}>
          {chartLoading && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8892a4' }}>
              Loading price data…
            </div>
          )}
          {chartError && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              {chartError}
            </div>
          )}
          {!chartLoading && !chartError && chartData.length === 0 && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8892a4' }}>
              No price data available for this symbol.
            </div>
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

                {/* Invisible line — keeps recharts tooltip active over the chart area */}
                <Line dataKey="close" stroke="transparent" strokeWidth={0}
                  dot={false} activeDot={false} isAnimationActive={false} legendType="none" />

                {/* Candlestick bodies + wicks, with B/S arrows at entry/exit candles */}
                <Customized component={CandlestickRenderer}
                  chartData={chartData} entryDate={entryDate} exitDate={exitDate} />

                {/* Moving averages */}
                {MA_SERIES.map(m => (
                  <Line key={m.key} dataKey={m.key} type="monotone"
                    stroke={m.color} strokeWidth={1.5}
                    dot={false} activeDot={false}
                    isAnimationActive={false} legendType="none"
                  />
                ))}

                {/* Entry price — green dashed */}
                {position.avgEntryPrice > 0 && (
                  <ReferenceLine y={Number(position.avgEntryPrice)}
                    stroke="#22c55e" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: `Entry $${fmt(position.avgEntryPrice)}`, position: 'insideTopRight', fill: '#22c55e', fontSize: 11 }} />
                )}

                {/* Exit price — red dashed */}
                {position.isClosed && position.avgExitPrice != null && (
                  <ReferenceLine y={Number(position.avgExitPrice)}
                    stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: `Exit $${fmt(position.avgExitPrice)}`, position: 'insideBottomRight', fill: '#ef4444', fontSize: 11 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <p style={{ color: '#4a5268', fontSize: '11px', marginTop: '10px', textAlign: 'right' }}>
          Price data via Yahoo Finance · click outside or Esc to close
        </p>
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
      {selected && <ChartModal position={selected} onClose={closeModal} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Trade History</h1>
          <p style={{ color: '#8892a4' }}>One row per completed position — click any row to view the price chart</p>
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

      {closed.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Closed Trades',   value: closed.length,            color: '#e2e8f0' },
            { label: 'Winners',         value: winCount,                 color: '#22c55e' },
            { label: 'Losers',          value: lossCount,                color: '#ef4444' },
            { label: 'Win Rate',        value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? '#22c55e' : '#f59e0b' },
            { label: 'Total P&L',       value: fmtPnl(totalPnL),        color: pnlColor(totalPnL) },
            { label: 'Avg Hold (Win)',  value: avgDays(winners) != null ? `${avgDays(winners)}d` : '—', color: '#22c55e' },
            { label: 'Avg Hold (Loss)', value: avgDays(losers)  != null ? `${avgDays(losers)}d`  : '—', color: '#ef4444' },
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
          <div style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
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
              {filterBtn('all', 'All')}
              {filterBtn('closed', 'Closed')}
              {filterBtn('open', 'Open')}
            </div>
            <span style={{ marginLeft: 'auto', color: '#8892a4', fontSize: '13px' }}>
              {filtered.length} position{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

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
                  <tr key={`${p.symbol}-${p.openDate}-${i}`}
                    onClick={() => setSelected(p)}
                    style={{ background: i % 2 === 0 ? '#1a1d27' : '#1c2030', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#252942'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#1a1d27' : '#1c2030'}
                  >
                    <td style={{ padding: '12px 16px', color: '#8892a4', whiteSpace: 'nowrap' }}>{fmtDate(p.openDate)}</td>
                    <td style={{ padding: '12px 16px', color: '#8892a4', whiteSpace: 'nowrap' }}>{p.isClosed ? fmtDate(p.closeDate) : '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {p.symbol}
                      {p.currency && p.currency !== 'USD' &&
                        <span style={{ marginLeft: 6, fontSize: '11px', color: '#8892a4', fontWeight: 400 }}>{p.currency}</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8892a4' }}>{p.description || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{fmt(p.quantity)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.avgEntryPrice > 0 ? fmt(p.avgEntryPrice) : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#8892a4' }}>{p.avgExitPrice != null ? fmt(p.avgExitPrice) : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444' }}>{p.totalCommission > 0 ? `-$${fmt(p.totalCommission)}` : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: pnlColor(p.pnL) }}>{fmtPnl(p.pnL)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: pnlColor(gainPct(p)) }}>{fmtPct(gainPct(p))}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 600,
                        background: p.isClosed ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                        color:      p.isClosed ? '#a5b4fc' : '#f59e0b',
                      }}>{p.isClosed ? 'Closed' : 'Open'}</span>
                    </td>
                  </tr>
                ))}
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
