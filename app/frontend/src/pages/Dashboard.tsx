import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Target, Activity, History, ArrowUpRight, ArrowDownRight, Clock, Zap, Newspaper } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'
import { useThemeClasses, useChartTheme } from '../utils/theme'
import { PerformanceCalendar } from '../components/Calendar'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyStateCard } from '../components/EmptyState'
import { motion } from 'framer-motion'

interface DashboardProps {
  summary: any
  allTrades: any[]
  positions: any[]
  news: any[]
  theme?: 'dark' | 'light'
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 260, 
      damping: 22 
    } 
  }
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

  const convertedDailyPnl = useMemo(() => {
    if (!summary?.daily_pnl) return []
    return summary.daily_pnl.map((d: any) => ({
      ...d,
      value: convert(d.value)
    }))
  }, [summary?.daily_pnl, convert])

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
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants} className="card stat-card">
          <div className={`stat-icon ${theme === 'dark' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-700'}`}>
            <Target size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Win Rate</span>
            <span className={`stat-value ${textClass}`}>{summary.win_rate}%</span>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card stat-card">
          <div className="stat-icon bg-emerald-500/10 text-emerald-500">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total P&L</span>
            <span className={`stat-value ${summary.total_net_pnl >= 0 ? 'winner' : 'loser'}`}>
              {format(Math.abs(summary.total_net_pnl))}
            </span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-500">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Realized N&L</span>
            <span className={`stat-value ${summary.total_profit_after_tax >= 0 ? 'winner' : 'loser'}`}>
              {format(Math.abs(summary.total_profit_after_tax))}
            </span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card stat-card">
          <div className={`stat-icon ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Profit Factor</span>
            <span className={`stat-value ${textClass}`}>{summary.profit_factor}</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, type: "spring", stiffness: 150, damping: 20 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Recent Trades */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
              <History size={20} className="text-zinc-400" /> {selectedDate ? `Trades on ${selectedDate}` : 'Recent Trades'}
            </h3>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} className={`text-[10px] font-black text-zinc-500 uppercase tracking-widest ${theme === 'dark' ? 'hover:text-white' : 'hover:text-zinc-900'}`}>
                View Latest
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {filteredTrades.map((t: any) => (
              <div key={t.id} className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-800/40' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded ${t.is_winner ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {t.is_winner ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${textClass}`}>{t.symbol} <span className={`${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>· {t.direction.toUpperCase()}</span></div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                      <Clock size={10} /> {new Date(t.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span>·</span>
                      {t.size} units
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${t.net_profit >= 0 ? 'winner' : 'loser'}`}>
                  {format(Math.abs(t.net_profit))}
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
            dailyPnL={convertedDailyPnl} 
            onDayClick={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5, type: "spring", stiffness: 150, damping: 20 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Equity Curve */}
        <div className="lg:col-span-2 card p-6">
          <h3 className={`text-lg font-bold ${textClass} mb-6 flex items-center gap-2`}>
            <Activity size={20} className="text-zinc-400" /> Equity Curve
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convertedCumulativePnl}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                <XAxis dataKey="date" stroke={chartTheme.axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chartTheme.axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: chartTheme.tooltipBg, 
                    border: `1px solid ${chartTheme.tooltipBorder}`, 
                    borderRadius: '8px' 
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                  labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a' }}
                />
                <Line type="monotone" dataKey="value" stroke={theme === 'dark' ? '#fafafa' : '#27272a'} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Long vs Short */}
        <div className="card p-6">
          <h3 className={`text-lg font-bold ${textClass} mb-6`}>Long vs Short</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <span>Long Positions</span>
                <span className="winner">{format(Math.abs(longVsShort.long.pnl))}</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
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
                <span className="loser">{format(Math.abs(longVsShort.short.pnl))}</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(longVsShort.short.count / (allTrades.length || 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1 text-zinc-500">
                <span>{longVsShort.short.count} Trades</span>
                <span>{((longVsShort.short.wins / (longVsShort.short.count || 1)) * 100).toFixed(1)}% WR</span>
              </div>
            </div>
          </div>

          <div className={`mt-8 pt-6 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Top Symbols</h4>
             <div className="space-y-3">
                {topSymbols.map((s: any) => (
                  <div key={s.symbol} className="flex justify-between items-center text-sm">
                    <span className={`${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} font-medium`}>{s.symbol}</span>
                    <span className={`font-bold ${s.value >= 0 ? 'winner' : 'loser'}`}>
                      {format(Math.abs(s.value))}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Section: Open Positions */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
              <Zap size={20} className="text-amber-400" /> Open Positions
            </h3>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
              Live from Delta
            </span>
          </div>
          
          <div className="space-y-3">
            {positions && positions.length > 0 ? positions.map((pos) => (
              <div key={pos.symbol} className={`flex justify-between items-center p-4 rounded-xl border transition-colors ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-100 hover:border-zinc-300'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${pos.side === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {pos.side === 'buy' ? 'L' : 'S'}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${textClass}`}>{pos.symbol}</div>
                    <div className="text-[10px] text-zinc-500">{pos.size} contracts @ {format(pos.entry_price)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black ${pos.unrealized_pnl >= 0 ? 'winner' : 'loser'}`}>
                    {pos.unrealized_pnl >= 0 ? '' : ''}{format(Math.abs(pos.unrealized_pnl))}
                  </div>
                  <div className="text-[10px] text-zinc-500">Unrealized P&L</div>
                </div>
              </div>
            )) : (
              <EmptyStateCard message="No active positions currently." />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
