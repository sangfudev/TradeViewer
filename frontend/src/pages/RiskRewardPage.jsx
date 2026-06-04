import { useState } from 'react'
import { calculateRiskReward } from '../api/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import './css/RiskRewardPage.css'

// ── Colour helpers ────────────────────────────────────────────────────────────

function returnToColor(returnPct) {
  const pct = Math.max(-100, Math.min(200, returnPct))
  if (pct < 0) {
    const t = Math.abs(pct) / 100
    return `rgb(${Math.round(30 + t * 180)},${Math.round(20 + t * 10)},${Math.round(20 + t * 10)})`
  }
  const t = Math.min(pct / 150, 1)
  return `rgb(${Math.round(20 * (1 - t))},${Math.round(60 + t * 130)},${Math.round(20 * (1 - t))})`
}

function textColorFor(returnPct) {
  return Math.abs(returnPct) > 20 ? '#fff' : 'var(--text)'
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({ label, hint, value, onChange, min, max, step, prefix, suffix }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {hint && <p className="field-hint">{hint}</p>}
      <div className="field-input-wrap">
        {prefix && <span className="field-prefix">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min} max={max} step={step}
          className="field-input"
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
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

// ── Main component ────────────────────────────────────────────────────────────

export default function RiskRewardPage() {
  const [inputs, setInputs] = useState({ startCapital: 10000, riskPercent: 1, numberOfTrades: 100, compounding: true })
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

  const seriesKeys = result?.growthSeries.map(s => ({
    key: `RR${s.riskRewardRatio}_WR${Math.round(s.winRate * 100)}`,
    label: `R:R ${s.riskRewardRatio} / WR ${Math.round(s.winRate * 100)}%`,
  })) ?? []

  return (
    <div className="rr-page">
      <h1>Risk / Reward Matrix</h1>
      <p className="rr-subtitle">
        Model how different win rates and R:R ratios affect your capital over time.
      </p>

      <div className="card rr-inputs">
        <Field label="Start Capital" prefix="$" value={inputs.startCapital} onChange={set('startCapital')} min={100} step={1000} />
        <Field label="Risk Per Trade" suffix="%" hint="% of total capital risked per trade" value={inputs.riskPercent} onChange={set('riskPercent')} min={0.1} max={25} step={0.1} />
        <Field label="No. of Trades" value={inputs.numberOfTrades} onChange={set('numberOfTrades')} min={1} max={1000} step={10} />
        <label className="toggle-label">
          <input
            type="checkbox"
            className="toggle-input"
            checked={inputs.compounding}
            onChange={e => setInputs(prev => ({ ...prev, compounding: e.target.checked }))}
          />
          <span className="toggle-track" />
          <span className="toggle-text">Compounding</span>
        </label>
        <button
          className="btn btn-primary rr-calculate-btn"
          onClick={calculate}
          disabled={loading}
        >
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
      </div>

      {error && <div className="rr-error">{error}</div>}

      {result && (
        <>
          <div className="rr-tabs">
            {[['heatmap', 'Heat Map'], ['growth', 'Capital Growth']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`btn tab-btn${activeTab === id ? ' tab-btn--active' : ''}`}
              >{label}</button>
            ))}
          </div>

          {activeTab === 'heatmap' && (
            <div className="card rr-panel">
              <div className="heatmap-header">
                <h2>Final Capital Heat Map</h2>
                <p className="rr-panel-desc">
                  Starting with <strong>${inputs.startCapital.toLocaleString()}</strong>,
                  risking <strong>{inputs.riskPercent}%</strong> per trade
                  over <strong>{inputs.numberOfTrades}</strong> trades.
                  Rows = R:R ratio · Columns = Win rate
                </p>
              </div>

              <div className="heatmap-wrap">
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th>R:R ↓ / WR →</th>
                      {result.winRates.map(wr => (
                        <th key={wr} className="heatmap-wr-header">{Math.round(wr * 100)}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.riskRewardRatios.map(rr => (
                      <tr key={rr}>
                        <td className="heatmap-rr-label">1 : {rr}</td>
                        {result.winRates.map(wr => {
                          const cell = result.heatMap.find(c =>
                            Math.abs(c.winRate - wr) < 0.001 && Math.abs(c.riskRewardRatio - rr) < 0.001
                          )
                          if (!cell) return <td key={wr} />
                          const bg = returnToColor(cell.returnPercent)
                          const tc = textColorFor(cell.returnPercent)
                          return (
                            <td
                              key={wr}
                              className="heatmap-cell"
                              style={{ background: bg }}
                              title={`Win: ${Math.round(wr * 100)}%  R:R 1:${rr}\nFinal: $${cell.finalCapital.toLocaleString()}\nReturn: ${fmtPct(cell.returnPercent)}`}
                            >
                              <div className="heatmap-cell-value" style={{ color: tc }}>{fmt(cell.finalCapital)}</div>
                              <div className="heatmap-cell-pct" style={{ color: tc }}>{fmtPct(cell.returnPercent)}</div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="heatmap-legend">
                <span className="heatmap-legend-label">Return scale:</span>
                <div className="heatmap-legend-scale" />
                <span className="heatmap-legend-label">Loss → Breakeven → Profit</span>
              </div>
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="card rr-panel">
              <h2>Capital Growth Simulation</h2>
              <p className="rr-panel-subtitle">
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
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                    formatter={(val, name) => [fmt(val), seriesKeys.find(s => s.key === name)?.label || name]}
                    labelFormatter={(l) => `After trade ${l}`}
                  />
                  <Legend
                    formatter={(value) => seriesKeys.find(s => s.key === value)?.label || value}
                    wrapperStyle={{ color: 'var(--text-muted)', fontSize: '12px' }}
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
        <div className="rr-empty">
          <div className="rr-empty-icon">📊</div>
          <p className="rr-empty-title">Enter your parameters and hit Calculate</p>
          <p>The matrix will show projected capital across all win rate and R:R combinations.</p>
        </div>
      )}
    </div>
  )
}
