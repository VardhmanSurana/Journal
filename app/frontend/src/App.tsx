import { useState, useEffect } from 'react'
import axios from 'axios'
import { History, TrendingUp, TrendingDown } from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { CurrencyProvider, useCurrency } from './hooks/useCurrency'
import { CurrencyToggle } from './components/CurrencyToggle'
import { Sidebar } from './components/Sidebar'

interface Trade {
  id: number
  symbol: string
  direction: string
  avg_entry: number
  avg_exit: number
  net_profit: number
  exit_time: string
  is_winner: boolean
}

const API_BASE = 'http://localhost:8000/api'

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [trades, setTrades] = useState<Trade[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { format } = useCurrency()

  const fetchData = async () => {
    try {
      const [tradesRes, summaryRes] = await Promise.all([
        axios.get(`${API_BASE}/trades`),
        axios.get(`${API_BASE}/summary`)
      ])
      setTrades(tradesRes.data)
      setSummary(summaryRes.data)
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
  }, [])

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      {/* 1. SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSync={handleSync}
        isSyncing={loading}
      />

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 h-screen overflow-y-auto">
        {/* Header (Floating on scroll) */}
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              {activeTab === 'dashboard' ? 'Overview' : 'History'}
            </h2>
            <h1 className="text-2xl font-bold text-white">
              {activeTab === 'dashboard' ? 'Trading Dashboard' : 'Journal Log'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <CurrencyToggle />
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-xs font-bold text-slate-400">DELTA LIVE</span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <Dashboard summary={summary} allTrades={trades} />
          )}

          {/* Trade History Tab */}
          {activeTab === 'trades' && (
            <div className="space-y-6">
               <div className="card p-6 overflow-hidden">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
                  <History size={24} className="text-blue-500" /> Complete Trade History
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="pb-4 font-medium text-slate-400">Exit Date</th>
                        <th className="pb-4 font-medium text-slate-400">Symbol</th>
                        <th className="pb-4 font-medium text-slate-400">Type</th>
                        <th className="pb-4 font-medium text-slate-400">Avg Entry</th>
                        <th className="pb-4 font-medium text-slate-400">Avg Exit</th>
                        <th className="pb-4 font-medium text-slate-400 text-right">Net P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="py-4 font-mono text-sm text-slate-500">{new Date(trade.exit_time).toLocaleDateString()}</td>
                          <td className="py-4 font-bold text-white">{trade.symbol}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                              trade.direction === 'long' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            }`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-sm">{format(trade.avg_entry)}</td>
                          <td className="py-4 font-mono text-sm">{format(trade.avg_exit)}</td>
                          <td className={`py-4 text-right font-bold ${trade.is_winner ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {trade.is_winner ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {format(trade.net_profit)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <CurrencyProvider>
      <AppContent />
    </CurrencyProvider>
  )
}

export default App
