import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { History, TrendingUp, TrendingDown, Sun, Moon, Bell, AlertTriangle, Activity, Shield, FileText, Landmark } from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { Economics } from './pages/Economics'
import { DailyReviews } from './pages/DailyReviews'
import { SafetyCenter } from './pages/Safety'
import { CurrencyProvider, useCurrency } from './hooks/useCurrency'
import { CurrencyToggle } from './components/CurrencyToggle'
import { Sidebar } from './components/Sidebar'
import { TradeDetailModal } from './components/TradeDetailModal'
import { TradeFilters } from './components/TradeFilters'
import { TradeReviewModal } from './components/TradeReviewModal'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { API_BASE } from './config/api'
import { ConnectionPanel } from './components/ConnectionPanel'
import { normalizeError } from './utils/errorNormalization'

interface TradeEvent {
  id: number
  event_type: 'ENTRY' | 'SCALE_IN' | 'PARTIAL_EXIT' | 'FULL_EXIT'
  timestamp: string
  price: number
  size: number
  notional: number
}

interface Trade {
  id: number
  symbol: string
  direction: string
  avg_entry: number
  avg_exit: number
  entry_notional: number
  exit_notional: number
  net_profit: number
  gross_profit: number
  fees: number
  gst: number
  after_tax_profit: number
  exit_time: string
  entry_time: string
  size: number
  is_winner: boolean
  result: string
  strategy: string | null
  emotion: string | null
  session: string | null
  notes: string | null
  pre_plan: string | null
  risk_pct: number | null
  stop_loss: number | null
  take_profit: number | null
  mistakes: string | null
  discipline_score: number | null
  confidence_score: number | null
  events: TradeEvent[]
  screenshots?: { id: number; image_path: string; chart_type: string }[]
}

interface ConnectionHealth {
  api_status: string
  sync_status: 'idle' | 'running' | 'success' | 'failed'
  last_success_at?: string
  is_stale: boolean
  stale_seconds?: number
  region: string
  last_error?: string
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { format } = useCurrency()
  
  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [news, setNews] = useState<any[]>([])
  const [health, setHealth] = useState<ConnectionHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [reviewingTrade, setReviewingTrade] = useState<Trade | null>(null)

  // Sync state from URL
  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard'
    setActiveTab(path)
  }, [location])

  const fetchData = async () => {
    try {
      const [tradesRes, summaryRes, positionsRes, newsRes, healthRes] = await Promise.all([
        axios.get(`${API_BASE}/trades`),
        axios.get(`${API_BASE}/summary`),
        axios.get(`${API_BASE}/positions`),
        axios.get(`${API_BASE}/news`),
        axios.get(`${API_BASE}/health/connection`)
      ])
      setTrades(tradesRes.data)
      setFilteredTrades(tradesRes.data)
      setSummary(summaryRes.data)
      setPositions(positionsRes.data)
      setNews(newsRes.data)
      setHealth(healthRes.data)
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      await axios.post(`${API_BASE}/sync`)
      await fetchData()
    } catch (err) {
      const normalized = normalizeError(err)
      console.error('Error syncing:', normalized)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTradeReview = async (updates: any) => {
    if (!reviewingTrade) return
    try {
      await axios.put(`${API_BASE}/trades/${reviewingTrade.id}`, updates)
      await fetchData()
    } catch (err) {
      console.error('Error saving trade review:', err)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData()
    }, 10000) // Increased interval to 10s for efficiency
    return () => clearInterval(interval)
  }, [])

  const displayedTrades = activeTab === 'trades' ? filteredTrades : trades

  const groupedTrades = useMemo(() => {
    const groups: Record<string, Trade[]> = {}
    displayedTrades.forEach(t => {
      const date = new Date(t.exit_time).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(t)
    })
    return groups
  }, [displayedTrades])

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab)
          navigate(tab === 'dashboard' ? '/' : `/${tab}`)
        }}
        onSync={handleSync}
        isSyncing={loading}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-20 flex items-center justify-between px-8 sticky top-0 z-30 ${
          theme === 'dark' 
            ? 'bg-zinc-950/80 backdrop-blur-md border-zinc-900' 
            : 'bg-white/80 backdrop-blur-md border-zinc-200'
        } border-b`}>
          <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
              {activeTab === 'dashboard' ? 'Overview' : 
               activeTab === 'trades' ? 'History' :
               activeTab === 'analytics' ? 'Analysis' :
               activeTab === 'economics' ? 'Economics' :
               activeTab === 'reviews' ? 'Reflection' :
               activeTab === 'safety' ? 'Maintenance' : 'Page'}
            </h2>
            <h1 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-zinc-900'
            }`}>
              {activeTab === 'dashboard' ? 'Trading Dashboard' : 
               activeTab === 'trades' ? 'Journal Log' :
               activeTab === 'analytics' ? 'Analytics Center' :
               activeTab === 'economics' ? 'Fee & Funding Analysis' :
               activeTab === 'reviews' ? 'Daily Reviews' :
               activeTab === 'safety' ? 'System Maintenance' : 'Page'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            {health && (
              <div className="flex items-center gap-3">
                <div className={`px-3 py-2 rounded-lg border text-xs ${
                  health.sync_status === 'failed' || (health.is_stale && health.stale_seconds !== null)
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : health.is_stale && health.stale_seconds === null
                      ? 'border-zinc-700 bg-zinc-900/40 text-zinc-400'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                }`}>
                  <div className="font-semibold flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${health.sync_status === 'running' ? 'bg-amber-400 animate-pulse' : 'bg-current'}`} />
                    {health.is_stale && health.stale_seconds !== null ? 'Stale Data' : 
                     health.is_stale && health.stale_seconds === null ? 'Sync Pending' : 'Live Data'}
                  </div>
                  <div>
                    Sync: {health.sync_status}
                    {health.last_success_at ? ` · Last success ${new Date(health.last_success_at).toLocaleTimeString()}` : ''}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'text-zinc-400 hover:text-yellow-400 hover:bg-zinc-900' 
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <CurrencyToggle />
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-xs font-bold text-zinc-500">DELTA LIVE</span>
            </div>
          </div>
        </header>

        <ConnectionPanel health={health} theme={theme} />

        <div className="flex-1 overflow-y-auto p-8 pt-4">
          <Routes>
            <Route path="/" element={<Dashboard summary={summary} allTrades={trades} positions={positions} news={news} theme={theme} />} />
            <Route path="/trades" element={
              <div className="space-y-6">
                <TradeFilters 
                  onFilteredTrades={(filtered) => setFilteredTrades(filtered as Trade[])} 
                  trades={trades} 
                  theme={theme}
                />
                
                <div className={`card overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <History size={20} className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'} /> Complete Trade History
                      <span className={`text-xs font-normal ml-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>({displayedTrades.length} trades)</span>
                    </h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className={`text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                          <th className="py-4 pl-6">Symbol</th>
                          <th className="py-4">Type</th>
                          <th className="py-4">Avg Entry</th>
                          <th className="py-4">Avg Exit</th>
                          <th className="py-4 pr-6 text-right">Net P&L</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800/30' : 'divide-zinc-200'}`}>
                        {Object.entries(groupedTrades).map(([date, dateTrades]) => (
                          <React.Fragment key={date}>
                            <tr className={theme === 'dark' ? 'bg-zinc-900/40' : 'bg-zinc-100'}>
                              <td colSpan={5} className={`py-2 px-6 text-[10px] font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                {date}
                              </td>
                            </tr>
                            {dateTrades.map((trade) => (
                              <tr 
                                key={trade.id} 
                                className={`group transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-50'}`}
                                onClick={() => setSelectedTrade(trade)}
                              >
                                <td className="py-4 pl-6">
                                  <div className={`text-sm font-bold group-hover:text-emerald-500 transition-colors ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{trade.symbol}</div>
                                </td>
                                <td className="py-4">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                    trade.direction === 'long' 
                                      ? theme === 'dark' 
                                        ? 'bg-zinc-800 text-zinc-300' 
                                        : 'bg-zinc-200 text-zinc-700' 
                                      : theme === 'dark'
                                        ? 'bg-orange-500/10 text-orange-400'
                                        : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {trade.direction}
                                  </span>
                                </td>
                                <td className={`py-4 text-sm font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                  {format(trade.avg_entry)}
                                </td>
                                <td className={`py-4 text-sm font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                  {format(trade.avg_exit)}
                                </td>
                                <td className={`py-4 pr-4 text-right font-bold ${
                                  trade.net_profit >= 0 ? 'winner' : 'loser'
                                }`}>
                                  <div className="flex items-center justify-end gap-1">
                                    {trade.net_profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {format(Math.abs(trade.net_profit))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                    
                    {displayedTrades.length === 0 && (
                      <div className="text-center py-12 text-zinc-500">
                        No trades found matching your filters.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            } />
            <Route path="/analytics" element={<Analytics trades={trades} summary={summary} theme={theme} />} />
            <Route path="/economics" element={<Economics theme={theme} />} />
            <Route path="/reviews" element={<DailyReviews theme={theme} trades={trades} onReview={(trade) => setReviewingTrade(trade)} />} />
            <Route path="/safety" element={<SafetyCenter theme={theme} />} />
          </Routes>
        </div>
      </main>

      {selectedTrade && (
        <TradeDetailModal 
          trade={selectedTrade} 
          theme={theme}
          onClose={() => setSelectedTrade(null)} 
          onReview={() => {
            setReviewingTrade(selectedTrade)
            setSelectedTrade(null)
          }}
        />
      )}

      {reviewingTrade && (
        <TradeReviewModal
          trade={reviewingTrade}
          theme={theme}
          onClose={() => setReviewingTrade(null)}
          onSave={handleSaveTradeReview}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CurrencyProvider>
          <AppContent />
        </CurrencyProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
