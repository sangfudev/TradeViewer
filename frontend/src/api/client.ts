import axios from 'axios'
import type { Candle, ImportResult, Position, RiskRewardInputs, RiskRewardResult } from '../types'

const api = axios.create({ baseURL: '/api' })

export const getYears = (): Promise<number[]> =>
  api.get('/trades/years').then(r => r.data)

export const getTradesByYear = (year: number): Promise<unknown> =>
  api.get('/trades', { params: { year } }).then(r => r.data)

export const getPositionsByYear = (year: number): Promise<Position[]> =>
  api.get('/trades/positions', { params: { year } }).then(r => r.data)

export const importFile = (file: File): Promise<ImportResult> => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/trades/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

export const backfillIndustries = (): Promise<{ updated: number }> =>
  api.post('/trades/backfill-industries').then(r => r.data)

export const calculateRiskReward = (body: RiskRewardInputs): Promise<RiskRewardResult> =>
  api.post('/riskreward/calculate', body).then(r => r.data)

export const getChart = (symbol: string, from: string, to: string): Promise<Candle[]> =>
  api.get('/chart', { params: { symbol, from, to } }).then(r => r.data)
