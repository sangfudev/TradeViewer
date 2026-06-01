import { useState } from 'react'
import { calculateRiskReward } from '../api/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ── Colour helpers ───────────────────────────────────────────────────────────

/**
 * Map a return% to a colour.
 *  < -30%  →  deep red
 *    0%    →  neutral dark
 *  > +100% →  deep green
 */
function returnToColor(returnPct) {
  const pct = Math.max(-100, Math.min(200, returnPct))
  if (pct < 0) {
    // red gradient: dark red → neutral
    const t = Math.abs(pct) / 100
    const r = Math.round(30 + t * 180)
    const g = Math.round(20 + t * 10)
    const b = Math.round(20 + t * 10)
    return `rgb(${r},${g},${b})`
  } else {
    // green gradient: neutral → deep green
    const t = Math.min(pct / 150, 1)
    const r = Math.round(20 * (1 - t))
    const g = Math.round(60 + t * 130)
    const b = Math.round(20 * (1 - t))
    return `rgb(${r},${g},${b})`
  }
}

function textColorFor(returnPct) {
  return Math.abs(returnPct) > 20 ? '#fff' : '#e2e8f0'
}

// ── Input field ──────────────────────────────────────────────────────────────
function Field({ label, hint, value, onChange, min, max, step, prefix, suffix }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontWeight: 600, fontSize: '13px', color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {hint && <p style={{ fontSize: '11px', color: '#5a6379', marginTop: '-4px' }}>{hint}</p>}
      <div style={{ display: 'flex', alignItems: 'center', background: '#22263a', border: '1px solid #2e3248', borderRadius: '8px', overflow: 'hidden' }}>
        {prefix && <span style={{ padding: '10px 12px', color: '#6366f1', fontWeight: 700, background: '#1a1d27', borderRight: '1px solid #2e3248' }}>{prefix}</span>}
        <input
          type="number" value={value} onChange={e => onChange(e.target.value)}
          min={min} max={max} step={step}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '10px 14px', color: '#e2e8f0', fontSize: '16px', fontFamily: 'inherit' }}
        />
        {suffix && <span style={{ padding: '10px 12px', color: '#8892a4' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ── Chart colours ─────────────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#f97316']

const fmt = (n) => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000
  ? `$${(n / 1_000).toFixed(1)}k`
  : `$${Number(n).toFixed(0)}`

const fmtPct = (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`

// ── Main component ───────────────────────────────────────────────────────────
export default function RiskRewardPage() {
  const [inputs, setInputs] = useState({ startCapital: 10000, riskPercent: 1, numberOfTrades: 100 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('heatmap') // 'heatmap' | 'growth'

  const set = (key) => (val) => setInputs(prev => ({ ...prev, [key]: Number(val) }))

  const calculate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await calculateRiskReward(inputs)
      setResult(data)
      setActiveTab('heatmap')
    } catch (err) {
      setError(err.response?.data?.message || 'Calculation failed.')
    } finally {
      setLoading(false)
    }
  }

  // Build chart data: one data point per trade index
  const buildChartData = () => {
    if (!result) return []
    const maxLen = Math.max(...result.growthSeries.map(s => s.capitalByTrade.length))
    return Array.from({ length: maxLen }, (_, i) => {
      const pt = { trade: i }
      result.growthSeries.forEach(s => {
        const key = `RR${s.riskRewardRatio}_WR${Math.round(s.winRate * 100)}`
        pt[key] = s.capitalByTrade[i] ?? null
      })
      return pt
    })
  }

  const chartData = buildChartData()

  // Deduplicate series keys for the legend
  const seriesKeys = result?.growthSeries.map(s => ({
    key: `RR${s.riskRewardRatio}_WR${Math.round(s.winRate * 100)}`,
    label: `R:R ${s.riskRewardRatio} / WR ${Math.round(s.winRate * 100)}%`,
  })) ?? []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Risk / Reward Matrix</h1>
      <p style={{ color: '#8892a4', marginBottom: '28px' }}>
        Model how different win rates and R:R ratios affect your capital over time.
      </p>

      {/* ── Inputs ── */}
      <div style={{
        background: '#1a1d27', border: '1px solid #2e3248', borderRadius: '12px',
        padding: '24px', marginBottom: '28px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end'
      }}>
        <Field label="Start Capital" prefix="$" value={inputs.startCapital} onChange={set('startCapital')} min={100} step={1000} />
        <Field label="Risk Per Trade" suffix="%" hint="% of total capital risked per trade" value={inputs.riskPercent} onChange={set('riskPercent')} min={0.1} max={25} step={0.1} />
        <Field label="No. of Trades" value={inputs.numberOfTrades} onChange={set('numberOfTrades')} min={1} max={1000} step={10} />
        <button
          onClick={calculate}
          disabled={loading}
          style={{
            padding: '12px 28px', borderRadius: '8px', border: 'none',
            background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.15s', height: 'fit-content', alignSelf: 'end',
          }}>
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {/* ── Tab bar ── */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#22263a', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
            {[['heatmap', 'Heat Map'], ['growth', 'Capital Growth']].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                padding: '8px 20px', borderRadius: '7px', border: 'none',
                background: activeTab === id ? '#6366f1' : 'transparent',
                color: activeTab === id ? '#fff' : '#8892a4',
                fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>

          {/* ── Heat Map ── */}
          {activeTab === 'heatmap' && (
            <div style={{ background: '#1a1d27', border: '1px solid #2e3248', borderRadius: '12px', padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Final Capital Heat Map</h2>
                <p style={{ color: '#8892a4', fontSize: '13px' }}>
                  Starting with <strong style={{ color: '#e2e8f0' }}>${inputs.startCapital.toLocaleString()}</strong>,
                  risking <strong style={{ color: '#e2e8f0' }}>{inputs.riskPercent}%</strong> per trade
                  over <strong style={{ color: '#e2e8f0' }}>{inputs.numberOfTrades}</strong> trades.
                  Rows = R:R ratio · Columns = Win rate
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: '3px', minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: '#5a6379', fontSize: '12px', fontWeight: 600 }}>R:R ↓ / WR →</th>
                      {result.winRates.map(wr => (
                        <th key={wr} style={{ padding: '8px 10px', textAlign: 'center', color: '#8892a4', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {Math.round(wr * 100)}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.riskRewardRatios.map(rr => (
                      <tr key={rr}>
                        <td style={{ padding: '6px 14px', fontWeight: 700, color: '#a5b4fc', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          1 : {rr}
                        </td>
                        {result.winRates.map(wr => {
                          const cell = result.heatMap.find(c =>
                            Math.abs(c.winRate - wr) < 0.001 && Math.abs(c.riskRewardRatio - rr) < 0.001
                          )
                          if (!cell) return <td key={wr} />
                          const bg = returnToColor(cell.returnPercent)
                          const tc = textColorFor(cell.returnPercent)
                          return (
                            <td key={wr} style={{
                              background: bg, borderRadius: '6px', padding: '8px 10px',
                              textAlign: 'center', cursor: 'default',
                              transition: 'transform 0.1s',
                              minWidth: '90px',
                            }}
                              title={`Win: ${Math.round(wr * 100)}%  R:R 1:${rr}\nFinal: $${cell.finalCapital.toLocaleString()}\nReturn: ${fmtPct(cell.returnPercent)}`}
                            >
                              <div style={{ fontWeight: 700, fontSize: '13px', color: tc }}>{fmt(cell.finalCapital)}</div>
                              <div style={{ fontSize: '11px', color: tc, opacity: 0.85 }}>{fmtPct(cell.returnPercent)}</div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: '#8892a4', fontSize: '12px' }}>Return scale:</span>
                <div style={{
                  height: '14px', width: '200px', borderRadius: '4px',
                  background: 'linear-gradient(to right, rgb(210,30,30), rgb(30,30,30), rgb(20,190,20))',
                }} />
                <span style={{ color: '#8892a4', fontSize: '12px' }}>Loss → Breakeven → Profit</span>
              </div>
            </div>
          )}

          {/* ── Capital Growth Chart ── */}
          {activeTab === 'growth' && (
            <div style={{ background: '#1a1d27', border: '1px solid #2e3248', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Capital Growth Simulation</h2>
              <p style={{ color: '#8892a4', fontSize: '13px', marginBottom: '20px' }}>
                Simulated trade-by-trade capital at a fixed 50% win rate across R:R ratios 1–10, plus 40/50/60% win rates at R:R 1:2.
                Uses a fixed random seed for reproducibility.
              </p>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3248" />
                  <XAxis
                    dataKey="trade"
                    stroke="#5a6379"
                    tick={{ fill: '#8892a4', fontSize: 12 }}
                    label={{ value: 'Trade #', position: 'insideBottomRight', offset: -5, fill: '#8892a4', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#5a6379"
                    tick={{ fill: '#8892a4', fontSize: 12 }}
                    tickFormatter={v => fmt(v)}
                  />
                  <Tooltip
                    contentStyle={{ background: '#22263a', border: '1px solid #2e3248', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={(val, name) => [fmt(val), seriesKeys.find(s => s.key === name)?.label || name]}
                    labelFormatter={(l) => `After trade ${l}`}
                  />
                  <Legend
                    formatter={(value) => seriesKeys.find(s => s.key === value)?.label || value}
                    wrapperStyle={{ color: '#8892a4', fontSize: '12px' }}
                  />
                  {seriesKeys.map((s, i) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      dot={false}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div style={{
          background: '#1a1d27', border: '1px dashed #2e3248', borderRadius: '12px',
          padding: '60px', textAlign: 'center', color: '#8892a4'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
          <p style={{ fontWeight: 600, marginBottom: '6px', fontSize: '16px', color: '#e2e8f0' }}>Enter your parameters and hit Calculate</p>
          <p style={{ fontSize: '13px' }}>The matrix will show projected capital across all win rate and R:R combinations.</p>
        </div>
      )}
    </div>
  )
}
