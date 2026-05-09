import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts'
import { TrendingUp, TrendingDown, Target, Activity, ShieldAlert, Wallet as WalletIcon, History } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'
import { PerformanceCalendar } from '../components/Calendar'

interface DashboardProps {
  summary: any
  allTrades: any[]
}

export const Dashboard = ({ summary, allTrades }: DashboardProps) => {
  const { format, currency, rate } = useCurrency()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // 1. Hook declarations (Must be unconditional)
  const filteredTrades = useMemo(() => {
    if (!selectedDate) return []
    return allTrades.filter(t => t.exit_time.startsWith(selectedDate))
  }, [selectedDate, allTrades])

  // 2. Early return for loading state
  if (!summary) return (
    <div className="flex items-center justify-center h-64 text-slate-500 italic">
       Syncing initial data...
    </div>
  )

  // 3. Data processing (Depends on summary existing)
  const pieData = [
    { name: 'Winners', value: summary.winners, color: '#4ade80' },
    { name: 'Losers', value: summary.losers, color: '#f87171' }
  ]

  const convertedCumulativePnl = summary.cumulative_pnl.map((d: any) => ({
    ...d,
    value: currency === 'INR' ? d.value * rate : d.value
  }))

  const convertedPnlBySymbol = summary.pnl_by_symbol.map((d: any) => ({
    ...d,
    value: currency === 'INR' ? d.value * rate : d.value
  }))

  return (
    <div className="dashboard-root">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-500">
            <Target size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Win Rate</span>
            <span className="stat-value">{summary.win_rate}%</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon bg-green-500/10 text-green-500">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Avg Win</span>
            <span className="stat-value text-green-400">+{format(summary.avg_win)}</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon bg-red-500/10 text-red-500">
            <TrendingDown size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Avg Loss</span>
            <span className="stat-value text-red-400">{format(summary.avg_loss)}</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon bg-purple-500/10 text-purple-500">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Profit Factor</span>
            <span className="stat-value">{summary.profit_factor}</span>
          </div>
        </div>
      </div>

      {/* Wallet Balance Section */}
      <div className="card p-6 mb-8">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <WalletIcon size={20} className="text-emerald-400" /> Wallet Balances ({currency})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.wallet && summary.wallet.map((w: any) => {
            const isUsdAsset = ['USDT', 'USDC', 'USD', 'DETO'].includes(w.asset);
            return (
              <div key={w.asset} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{w.asset}</div>
                <div className="text-lg font-mono font-bold text-white">
                  {isUsdAsset ? format(w.balance) : w.balance.toFixed(4)}
                </div>
                <div className="text-xs text-slate-400 flex justify-between mt-2 pt-2 border-t border-slate-700/30">
                  <span>Available:</span>
                  <span className="font-mono text-emerald-400">
                    {isUsdAsset ? format(w.available) : w.available.toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Equity Curve Line Chart */}
        <div className="card lg:col-span-2 p-6 flex flex-col justify-between">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-blue-400" /> Cumulative Equity Curve ({currency})
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convertedCumulativePnl}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => currency === 'INR' ? `₹${value}` : `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#38bdf8' }}
                  formatter={(value: any) => [format(currency === 'INR' ? value / rate : value), 'Net P&L']}
                />
                <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#38bdf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly P&L Calendar & Day Trades */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <PerformanceCalendar 
            dailyPnL={summary.daily_pnl || []} 
            onDayClick={setSelectedDate}
            selectedDate={selectedDate}
          />
          
          {selectedDate && (
            <div className="card p-5 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <History size={16} className="text-blue-400" /> Trades on {selectedDate}
                </h4>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {filteredTrades.length > 0 ? filteredTrades.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{t.symbol}</span>
                        <span className={`text-[8px] font-black uppercase px-1 rounded ${t.direction === 'long' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {t.direction}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {t.size} units @ {format(t.avg_entry)}
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${t.is_winner ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.is_winner ? '+' : ''}{format(t.net_profit)}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-xs text-slate-500 italic bg-slate-900/20 rounded-lg">
                    No round-trip trades closed on this day.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Win/Loss Pie Chart */}
        <div className="card p-6 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-6 w-full text-left">Win / Loss Ratio</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-sm text-slate-400">Winners ({summary.winners})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-sm text-slate-400">Losers ({summary.losers})</span>
            </div>
          </div>
        </div>

        {/* P&L by Symbol Bar Chart */}
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <WalletIcon size={20} className="text-purple-400" /> P&L by Symbol ({currency})
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={convertedPnlBySymbol}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="symbol" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value: any) => [format(currency === 'INR' ? value / rate : value), 'Net P&L']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {convertedPnlBySymbol.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#4ade80' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk & Tax Card */}
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-400" /> Risk & Tax Overview
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
              <div>
                <div className="text-sm text-slate-400">Max Drawdown</div>
                <div className="text-xl font-bold text-red-400">{format(summary.max_drawdown)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Expectancy</div>
                <div className="text-xl font-bold text-blue-400">{format(summary.expectancy)}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Trading Turnover</span>
                <span className="font-medium font-mono">{format(summary.total_turnover)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Estimated Income Tax</span>
                <span className="font-medium text-red-400 font-mono">-{format(summary.income_tax || 0)}</span>
              </div>
              <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                <span className="font-semibold">Profit After Tax</span>
                <span className={`text-2xl font-bold ${summary.total_profit_after_tax >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {format(summary.total_profit_after_tax)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
