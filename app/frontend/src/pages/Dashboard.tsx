import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Target, Activity, History, ArrowUpRight, ArrowDownRight, Clock, Zap, Newspaper } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'
import { useThemeClasses, useChartTheme } from '../utils/theme'
import { PerformanceCalendar } from '../components/Calendar'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyStateCard } from '../components/EmptyState'

interface DashboardProps {
  summary: any
  allTrades: any[]
  positions: any[]
  news: any[]
  theme?: 'dark' | 'light'
}

export const Dashboard = ({ summary, allTrades, positions, news, theme = 'dark' }: DashboardProps) => {
  const { format, currency, rate, convert } = useCurrency()
  const { bgClass, textClass, cardBgClass, subTextClass } = useThemeClasses(theme)
  const chartTheme = useChartTheme(theme)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // Hooks
  const filteredTrades = useMemo(() => {
    if (!selectedDate) return allTrades.slice(0, 5) // Default to 5 most recent if no date
    return allTrades.filter(t => t.exit_time.startsWith(selectedDate))
  }, [selectedDate, allTrades])

  const longVsShort = useMemo(() => {
    const data = {
      long: { count: 0, pnl: 0, wins: 0 },
      short: { count: 0, pnl: 0, wins: 0 }
    }
    allTrades.forEach(t => {
      const dir = (t.direction || 'long').toLowerCase() as 'long' | 'short'
      if (data[dir]) {
        data[dir].count++
        data[dir].pnl += t.net_profit
        if (t.is_winner) data[dir].wins++
      }
    })
    return data
  }, [allTrades])

  const topSymbols = useMemo(() => {
    if (!summary?.pnl_by_symbol) return []
    return [...summary.pnl_by_symbol]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [summary?.pnl_by_symbol])

  const drawdownData = useMemo(() => {
    if (!summary?.cumulative_pnl || summary.cumulative_pnl.length === 0) return []
    let peak = -Infinity
    const data: { date: string; drawdown: number }[] = []
    for (const point of summary.cumulative_pnl) {
      const value = currency === 'INR' ? point.value * rate : point.value
      if (value > peak) peak = value
      const drawdown = peak - value
      data.push({ date: point.date, drawdown: Math.max(0, drawdown) })
    }
    return data
  }, [summary?.cumulative_pnl, currency, rate])

  if (!summary) return (
    <LoadingSpinner message="Syncing initial data..." />
  )

  const convertedCumulativePnl = summary.cumulative_pnl.map((d: any) => ({
    ...d,
    value: convert(d.value)
  }))

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card stat-card">
          <div className="stat-icon bg-zinc-800 text-zinc-100">
            <Target size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Win Rate</span>
            <span className="stat-value text-zinc-100">{summary.win_rate}%</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon bg-emerald-500/10 text-emerald-500">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Avg Win</span>
            <span className="stat-value text-emerald-400">+{format(summary.avg_win)}</span>
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
          <div className="stat-icon bg-zinc-800 text-zinc-400">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Profit Factor</span>
            <span className="stat-value text-zinc-100">{summary.profit_factor}</span>
          </div>
        </div>
      </div>

      {/* Top Section: Open Positions & Market Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap size={20} className="text-amber-400" /> Open Positions
            </h3>
            <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-widest">
              Live from Delta
            </span>
          </div>
          
          <div className="space-y-3">
            {positions && positions.length > 0 ? positions.map((pos) => (
              <div key={pos.symbol} className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${pos.side === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {pos.side === 'buy' ? 'L' : 'S'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{pos.symbol}</div>
                    <div className="text-[10px] text-zinc-500">{pos.size} contracts @ {format(pos.entry_price)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pos.unrealized_pnl >= 0 ? '+' : ''}{format(pos.unrealized_pnl)}
                  </div>
                  <div className="text-[10px] text-zinc-500">Unrealized P&L</div>
                </div>
              </div>
            )) : (
              <EmptyStateCard message="No active positions currently." />
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Newspaper size={20} className="text-zinc-400" /> Market Pulse
            </h3>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {news && news.length > 0 ? news.map((item) => (
              <a 
                key={item.id} 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="text-[10px] font-black text-zinc-500 uppercase flex justify-between items-center mb-1">
                  <span className="group-hover:text-zinc-300 transition-colors">{item.source}</span>
                  <span className="font-mono">{new Date(item.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-xs font-bold text-zinc-200 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                  {item.title}
                </div>
              </a>
            )) : (
              <div className="text-center py-10 text-zinc-500 italic">
                Fetching latest headlines...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity size={20} className="text-zinc-400" /> Equity Curve
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convertedCumulativePnl}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: chartTheme.tooltipBg, 
                    border: `1px solid ${chartTheme.tooltipBorder}`, 
                    borderRadius: '8px' 
                  }}
                  itemStyle={{ color: '#fafafa' }}
                />
                <Line type="monotone" dataKey="value" stroke="#fafafa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Long vs Short */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-white mb-6">Long vs Short</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <span>Long Positions</span>
                <span className="text-emerald-400">{format(longVsShort.long.pnl)}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(longVsShort.long.count / (allTrades.length || 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1 text-zinc-500">
                <span>{longVsShort.long.count} Trades</span>
                <span>{((longVsShort.long.wins / (longVsShort.long.count || 1)) * 100).toFixed(1)}% WR</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <span>Short Positions</span>
                <span className="text-red-400">{format(longVsShort.short.pnl)}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(longVsShort.short.count / (allTrades.length || 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1 text-zinc-500">
                <span>{longVsShort.short.count} Trades</span>
                <span>{((longVsShort.short.wins / (longVsShort.short.count || 1)) * 100).toFixed(1)}% WR</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Top Symbols</h4>
             <div className="space-y-3">
                {topSymbols.map((s: any) => (
                  <div key={s.symbol} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-300 font-medium">{s.symbol}</span>
                    <span className={`font-bold ${s.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.value >= 0 ? '+' : ''}{format(s.value)}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-zinc-400" /> {selectedDate ? `Trades on ${selectedDate}` : 'Recent Trades'}
            </h3>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest">
                View Latest
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {filteredTrades.map((t: any) => (
              <div key={t.id} className="flex justify-between items-center p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/50 hover:bg-zinc-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded ${t.is_winner ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {t.is_winner ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t.symbol} <span className="text-zinc-600 ml-1">· {t.direction.toUpperCase()}</span></div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                      <Clock size={10} /> {new Date(t.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span>·</span>
                      {t.size} units
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${t.is_winner ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.is_winner ? '+' : ''}{format(t.net_profit)}
                </div>
              </div>
            ))}
            {filteredTrades.length === 0 && (
              <div className="text-center py-10 text-zinc-500 italic">
                No trades found for this period.
              </div>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="lg:col-span-1">
          <PerformanceCalendar 
            dailyPnL={summary.daily_pnl || []} 
            onDayClick={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>
      </div>
    </div>
  )
}
