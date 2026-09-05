export interface Position {
  symbol: string
  description: string | null
  industry: string | null
  openDate: string
  closeDate: string | null
  isClosed: boolean
  avgEntryPrice: number
  avgExitPrice: number | null
  totalCommission: number
  pnL: number | null
  netBasePnL: number | null
  currency: string | null
  quantity: number
}

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface ImportResult {
  message: string
  importedCount: number
}

export interface RiskRewardInputs {
  startCapital: number
  riskPercent: number
  numberOfTrades: number
  compounding: boolean
}

export interface HeatMapCell {
  winRate: number
  riskRewardRatio: number
  finalCapital: number
  returnPercent: number
}

export interface GrowthSeries {
  riskRewardRatio: number
  winRate: number
  capitalByTrade: number[]
}

export interface RiskRewardResult {
  winRates: number[]
  riskRewardRatios: number[]
  heatMap: HeatMapCell[]
  growthSeries: GrowthSeries[]
}
