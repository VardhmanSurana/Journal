import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { History, TrendingUp, TrendingDown, Sun, Moon, Bell, AlertTriangle, Activity, FileText, Landmark, Calendar, BookOpen } from 'lucide-react'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Analytics } from './pages/analytics/Analytics'
import { FeesFunding } from './pages/feesFunding/FeesFunding'
import { Journal } from './pages/journal/Journal'
import { Maintenance } from './pages/maintenance/Maintenance'
import { ImportData } from './pages/imports/ImportData'
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
import { formatDate, formatTime } from './utils/dates'

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
      const date = formatDate(t.exit_time, 'long')
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
        theme={theme}
        health={health}
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
               activeTab === 'fees-funding' ? 'Fees & Funding' :
               activeTab === 'journal' ? 'Journal' :
               activeTab === 'maintenance' ? 'Maintenance' :
               activeTab === 'import' ? 'Import Data' : 'Page'}
            </h2>
            <h1 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-zinc-900'
            }`}>
              {activeTab === 'dashboard' ? 'Trading Dashboard' : 
               activeTab === 'trades' ? 'Journal Log' :
               activeTab === 'analytics' ? 'Analytics Center' :
               activeTab === 'fees-funding' ? 'Fees & Funding' :
               activeTab === 'journal' ? 'Journal' :
               activeTab === 'maintenance' ? 'Maintenance' :
               activeTab === 'import' ? 'Import Data' : 'Page'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
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

        <div className="flex-1 overflow-y-auto p-8 pt-4">
          <Routes>
            <Route path="/" element={<Dashboard summary={summary} allTrades={trades} positions={positions} news={news} theme={theme} />} />
            <Route path="/trades" element={
              <div className="space-y-8 animate-fadeIn">
                {/* 1. Summary Cards Grid */}
                {summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Total Trades */}
                    <div className={`p-6 rounded-2xl border transition-all ${
                      theme === 'dark' 
                        ? 'bg-zinc-900/40 border-zinc-800' 
                        : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Trades</div>
                      <div className={`text-4xl font-black mt-2 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                        {summary.total_trades}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-4 flex items-center gap-1">
                        <Calendar size={12} />
                        <span>All-Time Log</span>
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className={`p-6 rounded-2xl border transition-all relative overflow-hidden ${
                      theme === 'dark' 
                        ? 'bg-zinc-900/40 border-zinc-800' 
                        : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Win Rate</div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <div className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                          {summary.win_rate}%
                        </div>
                        <TrendingUp size={16} className="text-emerald-500" />
                      </div>
                      <div className="mt-4 h-6 flex items-end gap-[3px]">
                        <div className="w-2 bg-emerald-500/20 h-[30%] rounded-t-sm" />
                        <div className="w-2 bg-emerald-500/20 h-[50%] rounded-t-sm" />
                        <div className="w-2 bg-emerald-500/20 h-[40%] rounded-t-sm" />
                        <div className="w-2 bg-emerald-500/20 h-[70%] rounded-t-sm" />
                        <div className="w-2 bg-emerald-500/20 h-[60%] rounded-t-sm" />
                        <div className="w-2 bg-emerald-500 h-[90%] rounded-t-sm" />
                      </div>
                    </div>

                    {/* Net Profit */}
                    <div className={`p-6 rounded-2xl border transition-all ${
                      theme === 'dark' 
                        ? 'bg-zinc-900/40 border-zinc-800 border-l-emerald-500/30' 
                        : 'bg-white border-zinc-200 border-l-emerald-500 shadow-sm'
                    }`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Net Profit</div>
                      <div className={`text-4xl font-black mt-2 text-emerald-500 ${
                        theme === 'dark' ? 'text-shadow-glow' : ''
                      }`}>
                        {format(summary.total_net_pnl)}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-4 flex items-center gap-1">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span>After commission</span>
                      </div>
                    </div>

                    {/* Total Fees */}
                    <div className={`p-6 rounded-2xl border transition-all ${
                      theme === 'dark' 
                        ? 'bg-zinc-900/40 border-zinc-800' 
                        : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Fees</div>
                      <div className={`text-4xl font-black mt-2 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'}`}>
                        {format(summary.total_commission)}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-4">
                        Including GST
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Filters Component */}
                <TradeFilters 
                  onFilteredTrades={(filtered) => setFilteredTrades(filtered as Trade[])} 
                  trades={trades} 
                  theme={theme}
                />

                {/* 3. Advanced Reflections Log list */}
                <div className="space-y-6">
                  {Object.entries(groupedTrades).map(([date, dateTrades]) => (
                    <div key={date} className="space-y-3">
                      {/* Date Header */}
                      <div className={`text-[10px] font-black uppercase tracking-wider pl-2 ${
                        theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                        {date}
                      </div>

                      {/* Trade Cards List */}
                      <div className="space-y-3">
                        {dateTrades.map((trade) => {
                          const entryDate = new Date(trade.entry_time)
                          const exitDate = new Date(trade.exit_time)
                          const holdDurationMs = exitDate.getTime() - entryDate.getTime()
                          const holdHours = Math.floor(holdDurationMs / (1000 * 60 * 60))
                          const holdMinutes = Math.floor((holdDurationMs % (1000 * 60 * 60)) / (1000 * 60))
                          const holdStr = holdHours > 0 ? `${holdHours}h ${holdMinutes}m` : `${holdMinutes}m`
                          const roi = trade.entry_notional > 0 
                            ? ((trade.net_profit / trade.entry_notional) * 100).toFixed(1)
                            : null

                          return (
                            <div 
                              key={trade.id} 
                              onClick={() => setSelectedTrade(trade)}
                              className={`p-6 rounded-2xl grid grid-cols-12 gap-4 items-center transition-all cursor-pointer group hover:-translate-y-[2px] ${
                                theme === 'dark' 
                                  ? 'bg-zinc-900/40 hover:bg-zinc-900/60' 
                                  : 'bg-white shadow-sm hover:shadow-md'
                              }`}
                            >
                              {/* Asset / Symbol */}
                              <div className="col-span-3 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                  theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                                }`}>
                                  {trade.symbol.slice(0, 3)}
                                </div>
                                <div>
                                  <div className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                                    {trade.symbol}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-0.5">
                                    {formatTime(trade.entry_time)} — {formatTime(trade.exit_time)}
                                  </div>
                                </div>
                              </div>

                              {/* Direction Pill */}
                              <div className="col-span-1 flex justify-center">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider ${
                                  trade.direction === 'long'
                                    ? theme === 'dark'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : theme === 'dark'
                                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                      : 'bg-orange-50 text-orange-700 border-orange-100'
                                }`}>
                                  {trade.direction}
                                </span>
                              </div>

                              {/* Sizing / Holding Duration */}
                              <div className="col-span-2 text-center">
                                <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                  {trade.size} units
                                </div>
                                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider mt-0.5">
                                  {holdStr}
                                </div>
                              </div>

                              {/* Price Entry -> Exit */}
                              <div className="col-span-2 text-center md:text-left pl-4">
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <span>In:</span>
                                  <span className="font-mono font-medium text-zinc-400 dark:text-zinc-300">{format(trade.avg_entry)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                                  <span>Out:</span>
                                  <span className="font-mono font-medium text-zinc-400 dark:text-zinc-300">{format(trade.avg_exit)}</span>
                                </div>
                              </div>

                              {/* execution visual sparkline */}
                              <div className="col-span-2 flex justify-center px-4">
                                <div className="w-full h-8 flex items-center justify-center">
                                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                                    {trade.net_profit >= 0 ? (
                                      <path 
                                        d="M0,25 Q20,20 40,15 T70,10 T100,2" 
                                        fill="none" 
                                        stroke="#10b981" 
                                        strokeWidth="2" 
                                        className="drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
                                      />
                                    ) : (
                                      <path 
                                        d="M0,5 Q20,10 40,18 T70,15 T100,28" 
                                        fill="none" 
                                        stroke="#f43f5e" 
                                        strokeWidth="2" 
                                        className="drop-shadow-[0_2px_4px_rgba(244,63,94,0.3)]"
                                      />
                                    )}
                                  </svg>
                                </div>
                              </div>

                              {/* P&L Performance */}
                              <div className="col-span-2 text-right pr-4">
                                <div className={`text-base font-black ${
                                  trade.net_profit >= 0 ? 'winner text-emerald-500' : 'loser text-rose-500'
                                }`}>
                                  {trade.net_profit >= 0 ? '+' : '-'}{format(Math.abs(trade.net_profit))}
                                </div>
                                {roi && (
                                  <div className={`text-[10px] font-bold ${
                                    trade.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-500'
                                  }`}>
                                    {trade.net_profit >= 0 ? '+' : '-'}{roi}% ROI
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {displayedTrades.length === 0 && (
                    <div className={`text-center py-16 rounded-2xl border border-dashed ${
                      theme === 'dark' ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-200 bg-zinc-50/50'
                    }`}>
                      <BookOpen size={48} className="mx-auto mb-4 text-zinc-500" />
                      <p className="text-zinc-500 text-sm">No trades found matching your filters.</p>
                    </div>
                  )}
                </div>
              </div>
            } />
            <Route path="/analytics" element={<Analytics trades={trades} summary={summary} theme={theme} />} />
            <Route path="/fees-funding" element={<FeesFunding theme={theme} />} />
            <Route path="/journal" element={<Journal theme={theme} onReview={(trade) => setReviewingTrade(trade)} />} />
            <Route path="/maintenance" element={<Maintenance theme={theme} />} />
            <Route path="/import" element={<ImportData theme={theme} />} />
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
