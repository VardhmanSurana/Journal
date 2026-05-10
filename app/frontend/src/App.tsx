import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { History, TrendingUp, TrendingDown, Sun, Moon, Bell } from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { DailyReviews } from './pages/DailyReviews'
import { RiskDashboard } from './pages/Risk'
import { TaxReport } from './pages/TaxReport'
import { CurrencyProvider, useCurrency } from './hooks/useCurrency'
import { CurrencyToggle } from './components/CurrencyToggle'
import { Sidebar } from './components/Sidebar'
import { TradeDetailModal } from './components/TradeDetailModal'
import { TradeFilters } from './components/TradeFilters'
import { TradeReviewModal } from './components/TradeReviewModal'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { API_BASE } from './config/api'

interface Trade {
  id: number
  symbol: string
  direction: string
  avg_entry: number
  avg_exit: number
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
  strategy: string
  notes: string
}

interface ConnectionHealth {
  api_status: string
  sync_status: 'idle' | 'running' | 'success' | 'failed'
  last_success_at?: string
  is_stale: boolean
  stale_seconds?: number
  last_error?: string
  safety: {
    api_key_configured: boolean
    api_secret_configured: boolean
    webhook_configured: boolean
    deadman_switch_configured: boolean
  }
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [trades, setTrades] = useState<Trade[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [reviewingTrade, setReviewingTrade] = useState<Trade | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [health, setHealth] = useState<ConnectionHealth | null>(null)
  const { format } = useCurrency()
  const { theme, toggleTheme } = useTheme()

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
    }
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      await axios.post(`${API_BASE}/sync`)
      await fetchData()
    } catch (err) {
      console.error('Error syncing:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh live data every 10 seconds
    const interval = setInterval(() => {
      fetchData()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const displayedTrades = activeTab === 'trades' ? filteredTrades : trades

  const groupedTrades = useMemo(() => {
    const groups: Record<string, Trade[]> = {}
    displayedTrades.forEach(t => {
      const date = new Date(t.exit_time).toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric' 
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(t)
    })
    return Object.entries(groups).sort((a, b) => {
      return new Date(b[1][0].exit_time).getTime() - new Date(a[1][0].exit_time).getTime()
    })
  }, [displayedTrades])

  return (
    <div className={`flex min-h-screen text-zinc-200 ${
      theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'
    }`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSync={handleSync}
        isSyncing={loading}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main className="flex-1 h-screen overflow-y-auto">
        <header className={`sticky top-0 z-20 px-8 py-4 flex justify-between items-center ${
          theme === 'dark' 
            ? 'bg-zinc-950/80 backdrop-blur-md border-zinc-900' 
            : 'bg-white/80 backdrop-blur-md border-zinc-200'
        } border-b`}>
          <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
              {activeTab === 'dashboard' ? 'Overview' : 
               activeTab === 'trades' ? 'History' :
               activeTab === 'analytics' ? 'Analysis' :
               activeTab === 'reviews' ? 'Reflection' : 'Page'}
            </h2>
            <h1 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-zinc-900'
            }`}>
              {activeTab === 'dashboard' ? 'Trading Dashboard' : 
               activeTab === 'trades' ? 'Journal Log' :
               activeTab === 'analytics' ? 'Analytics Center' :
               activeTab === 'reviews' ? 'Daily Reviews' : 'Page'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            {health && (
              <div className={`px-3 py-2 rounded-lg border text-xs ${
                health.is_stale || health.sync_status === 'failed'
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}>
                <div className="font-semibold">
                  {health.is_stale ? 'Stale Data' : 'Live Data'}
                </div>
                <div>
                  Sync: {health.sync_status}
                  {health.last_success_at ? ` · Last success ${new Date(health.last_success_at).toLocaleTimeString()}` : ''}
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
        {health && (
          <div className={`mx-8 mt-4 p-3 rounded-xl border text-sm ${
            health.is_stale || health.sync_status === 'failed'
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-zinc-700 bg-zinc-900/40 text-zinc-300'
          }`}>
            <span className="font-semibold">Connection Health:</span> API {health.api_status.toUpperCase()} · Sync {health.sync_status.toUpperCase()} ·
            Webhook {health.safety.webhook_configured ? 'configured' : 'missing'} ·
            Deadman switch {health.safety.deadman_switch_configured ? 'configured' : 'missing'}.
            {health.last_error ? ` Last error: ${health.last_error}` : ''}
          </div>
        )}

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              summary={summary} 
              allTrades={trades} 
              positions={positions}
              news={news}
              theme={theme} 
            />
          )}

          {activeTab === 'trades' && (
            <div className="space-y-6">
              <TradeFilters 
                trades={trades} 
                onFilteredTrades={setFilteredTrades} 
              />
              
              <div className={`card p-6 overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <h2 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-zinc-900'
                }`}>
                  <History size={24} className="text-zinc-400" /> Complete Trade History
                  <span className="text-sm font-normal text-zinc-500 ml-2">
                    ({displayedTrades.length} trades)
                  </span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <th className="pb-4 pl-4 font-medium text-zinc-500">Symbol</th>
                        <th className="pb-4 font-medium text-zinc-500">Type</th>
                        <th className="pb-4 font-medium text-zinc-500">Avg Entry</th>
                        <th className="pb-4 font-medium text-zinc-500">Avg Exit</th>
                        <th className="pb-4 pr-4 font-medium text-zinc-500 text-right">Net P&L</th>
                      </tr>
                    </thead>
                    <tbody className={theme === 'dark' ? 'divide-zinc-800' : 'divide-zinc-100'}>
                      {groupedTrades.map(([date, dateTrades]) => (
                        <React.Fragment key={date}>
                          <tr className="bg-zinc-800/20">
                            <td colSpan={5} className="py-2 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-y border-zinc-800/50">
                              {date}
                            </td>
                          </tr>
                          {dateTrades.map((trade) => (
                            <tr 
                              key={trade.id} 
                              onClick={() => setSelectedTrade(trade)}
                              className={`cursor-pointer transition-colors border-b ${
                                theme === 'dark' ? 'hover:bg-zinc-800/40 border-zinc-800/50' : 'hover:bg-zinc-100 border-zinc-100'
                              }`}
                            >
                              <td className={`py-4 pl-4 font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                {trade.symbol}
                              </td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                  trade.direction === 'long' 
                                    ? 'bg-zinc-800 text-zinc-300' 
                                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                }`}>
                                  {trade.direction}
                                </span>
                              </td>
                              <td className="py-4 font-mono text-sm text-zinc-400">
                                {format(trade.avg_entry)}
                              </td>
                              <td className="py-4 font-mono text-sm text-zinc-400">
                                {format(trade.avg_exit)}
                              </td>
                              <td className={`py-4 pr-4 text-right font-bold ${
                                trade.is_winner ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                <div className="flex items-center justify-end gap-1">
                                  {trade.is_winner ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                  {format(trade.net_profit)}
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
          )}

          {activeTab === 'analytics' && (
            <Analytics trades={trades} summary={summary} theme={theme} />
          )}

          {activeTab === 'reviews' && (
            <DailyReviews theme={theme} />
          )}

          {activeTab === 'risk' && (
            <RiskDashboard theme={theme} />
          )}

          {activeTab === 'tax' && (
            <TaxReport theme={theme} />
          )}
        </div>
      </main>

      {selectedTrade && (
        <TradeDetailModal 
          trade={selectedTrade} 
          onClose={() => setSelectedTrade(null)} 
        />
      )}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </ThemeProvider>
  )
}

export default App
