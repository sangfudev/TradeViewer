import { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import type { Position } from '../types'
import styles from './css/IndustryPieChart.module.css'

interface IndustryCount {
  name: string
  value: number
}

interface IndustryPieChartProps {
  positions: Position[]
  title: string
  color: string
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#a78bfa', '#38bdf8', '#fb923c', '#ec4899', '#14b8a6']

const aggregateIndustries = (positions: Position[]): IndustryCount[] => {
  const industries: Record<string, number> = {}
  positions.forEach(p => {
    const ind = p.industry ?? 'Unknown'
    industries[ind] = (industries[ind] ?? 0) + 1
  })
  return Object.entries(industries)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function IndustryPieChart({ positions, title, color }: IndustryPieChartProps) {
  const data = useMemo(() => aggregateIndustries(positions), [positions])
  if (!data.length) return null

  return (
    <div className={styles['pie-chart-container']}>
      <p className={styles['pie-chart-title']} style={{ color }}>{title}</p>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }: { name: string; value: number }) => `${name} (${value})`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
