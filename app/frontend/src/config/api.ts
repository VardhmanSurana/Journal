const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const API_BASE = API_URL

export const API_ENDPOINTS = {
  trades: `${API_BASE}/trades`,
  summary: `${API_BASE}/summary`,
  positions: `${API_BASE}/positions`,
  risk: `${API_BASE}/risk`,
  sync: `${API_BASE}/sync`,
  taxSummary: `${API_BASE}/tax/summary`,
  taxExport: `${API_BASE}/tax/export`,
  reviews: `${API_BASE}/reviews`,
  alerts: `${API_BASE}/alerts`,
  news: `${API_BASE}/news`,
} as const