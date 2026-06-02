import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getYears = () => api.get('/trades/years').then(r => r.data)
export const getTradesByYear = (year) => api.get('/trades', { params: { year } }).then(r => r.data)
export const getPositionsByYear = (year) => api.get('/trades/positions', { params: { year } }).then(r => r.data)
export const importFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/trades/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}
export const calculateRiskReward = (body) => api.post('/riskreward/calculate', body).then(r => r.data)

export const getChart = (symbol, from, to) =>
  api.get('/chart', { params: { symbol, from, to } }).then(r => r.data)
