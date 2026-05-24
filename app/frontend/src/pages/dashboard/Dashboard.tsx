import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Activity, History, ArrowUpRight, ArrowDownRight, Clock, Zap } from 'lucide-react'
import { useCurrency } from '../../hooks/useCurrency'
import { useChartTheme } from '../../utils/theme'
import { PerformanceCalendar } from './components/Calendar'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { EmptyStateCard } from './components/EmptyState'
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

  const growthPercentage = useMemo(() => {
    if (!summary?.cumulative_pnl || summary.cumulative_pnl.length < 2) return '+0.0%'
    const first = summary.cumulative_pnl[0].value
    const last = summary.cumulative_pnl[summary.cumulative_pnl.length - 1].value
    if (first === 0) return last >= 0 ? `+${last.toFixed(2)}%` : `${last.toFixed(2)}%`
    const pct = ((last - first) / Math.abs(first)) * 100
    return pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`
  }, [summary?.cumulative_pnl])

  if (!summary) return (
    <SkeletonLoader variant="dashboard" theme={theme} />
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Win Rate */}
        <motion.div 
          variants={itemVariants} 
          className={`p-6 rounded-2xl transition-all duration-300 hover:-translate-y-[2px] relative overflow-hidden ${
            theme === 'dark' 
              ? 'bg-zinc-900/40' 
              : 'bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm'
          }`}
        >
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
        </motion.div>
        
        {/* Total P&L */}
        <motion.div 
          variants={itemVariants} 
          className={`p-6 rounded-2xl transition-all duration-300 hover:-translate-y-[2px] relative overflow-hidden ${
            theme === 'dark' 
              ? 'bg-zinc-900/40' 
              : 'bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total P&L</div>
          <div className={`text-4xl font-black mt-2 ${
            summary.total_net_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {summary.total_net_pnl >= 0 ? '+' : '-'}{format(Math.abs(summary.total_net_pnl))}
          </div>
          <div className="mt-4 text-[10px] text-zinc-500 flex items-center gap-1">
            <TrendingUp size={11} className={summary.total_net_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'} />
            <span>After commission</span>
          </div>
        </motion.div>

        {/* Realized N&L */}
        <motion.div 
          variants={itemVariants} 
          className={`p-6 rounded-2xl transition-all duration-300 hover:-translate-y-[2px] relative overflow-hidden ${
            theme === 'dark' 
              ? 'bg-zinc-900/40' 
              : 'bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Realized N&L</div>
          <div className={`text-4xl font-black mt-2 ${
            summary.total_profit_after_tax >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {summary.total_profit_after_tax >= 0 ? '+' : '-'}{format(Math.abs(summary.total_profit_after_tax))}
          </div>
          <div className="mt-4 text-[10px] text-zinc-500 flex items-center gap-1">
            <Activity size={11} className="text-zinc-500" />
            <span>Post-tax profit</span>
          </div>
        </motion.div>

        {/* Profit Factor */}
        <motion.div 
          variants={itemVariants} 
          className={`p-6 rounded-2xl transition-all duration-300 hover:-translate-y-[2px] relative overflow-hidden ${
            theme === 'dark' 
              ? 'bg-zinc-900/40' 
              : 'bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Profit Factor</div>
          <div className={`text-4xl font-black mt-2 ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {summary.profit_factor}
          </div>
          <div className="mt-4 text-[10px] text-zinc-500 flex items-center gap-1">
            <Zap size={11} className="text-zinc-500" />
            <span>Gross / gross loss</span>
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
        <div className={`lg:col-span-2 rounded-2xl p-6 relative overflow-hidden ${
          theme === 'dark' 
            ? 'bg-zinc-900/40' 
            : 'bg-white shadow-sm'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
              <History size={18} className="text-zinc-400" /> {selectedDate ? `Trades on ${selectedDate}` : 'Recent Trades'}
            </h3>
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(null)} 
                className={`text-[10px] font-black text-zinc-500 uppercase tracking-widest transition-colors ${
                  theme === 'dark' ? 'hover:text-white' : 'hover:text-zinc-900'
                }`}
              >
                View Latest
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {filteredTrades.map((t: any) => {
              const isLong = (t.direction || 'long').toLowerCase() === 'long' || (t.direction || 'long').toLowerCase() === 'buy';
              return (
                <div 
                  key={t.id} 
                  className={`flex justify-between items-center p-4 rounded-xl transition-all duration-200 ${
                    theme === 'dark' 
                      ? 'bg-zinc-900/20 hover:bg-zinc-900/60' 
                      : 'bg-zinc-50 border border-zinc-100 hover:bg-white hover:border-zinc-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Asset initials badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      theme === 'dark' ? 'bg-zinc-800/85 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                    }`}>
                      {t.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className={`text-sm font-black ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-855'}`}>
                          {t.symbol}
                        </span>
                        <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase ml-2 ${
                          isLong
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                            : 'bg-red-500/10 text-red-500 border border-red-500/10'
                        }`}>
                          {t.direction.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-1">
                        <Clock size={10} className="text-zinc-400" />
                        <span>{new Date(t.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-zinc-700">·</span>
                        <span>{t.size} units</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black ${
                      t.net_profit >= 0 
                        ? 'text-emerald-500 text-shadow-glow' 
                        : 'text-red-500'
                    }`}>
                      {t.net_profit >= 0 ? '+' : '-'}{format(Math.abs(t.net_profit))}
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">
                      Net P&L
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTrades.length === 0 && (
              <div className="text-center py-12 text-zinc-500 italic text-sm">
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
        <div className={`lg:col-span-2 border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-zinc-900/40 border-zinc-800' 
            : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
                <Activity size={18} className="text-zinc-400" /> Equity Growth
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} mt-1`}>
                Cumulative performance over {convertedCumulativePnl.length} sessions
              </p>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
              !growthPercentage.startsWith('-')
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {!growthPercentage.startsWith('-') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {growthPercentage}
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={convertedCumulativePnl}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={summary.total_net_pnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={summary.total_net_pnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} opacity={theme === 'dark' ? 0.15 : 0.4} />
                <XAxis dataKey="date" stroke={chartTheme.axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chartTheme.axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                    border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`, 
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b', fontWeight: 'bold' }}
                  labelStyle={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={summary.total_net_pnl >= 0 ? '#10b981' : '#ef4444'} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#equityGradient)" 
                  dot={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Long vs Short */}
        <div className={`border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-zinc-900/40 border-zinc-800' 
            : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} mb-6`}>Long vs Short</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <span>Long Positions</span>
                <span className="text-emerald-500 font-black">{format(Math.abs(longVsShort.long.pnl))}</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800/80' : 'bg-zinc-100'}`}>
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(longVsShort.long.count / (allTrades.length || 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1.5 text-zinc-500 font-medium">
                <span>{longVsShort.long.count} Trades</span>
                <span>{((longVsShort.long.wins / (longVsShort.long.count || 1)) * 100).toFixed(1)}% Win Rate</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                <span>Short Positions</span>
                <span className="text-red-500 font-black">{format(Math.abs(longVsShort.short.pnl))}</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800/80' : 'bg-zinc-100'}`}>
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(longVsShort.short.count / (allTrades.length || 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1.5 text-zinc-500 font-medium">
                <span>{longVsShort.short.count} Trades</span>
                <span>{((longVsShort.short.wins / (longVsShort.short.count || 1)) * 100).toFixed(1)}% Win Rate</span>
              </div>
            </div>
          </div>

          <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Top Symbols</h4>
             <div className="space-y-1">
                {topSymbols.map((s: any) => (
                  <div key={s.symbol} className="flex justify-between items-center py-2 border-b border-zinc-800/20 last:border-0">
                    <span className={`font-bold text-xs ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{s.symbol}</span>
                    <span className={`font-black text-xs ${s.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {s.value >= 0 ? '+' : '-'}{format(Math.abs(s.value))}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Section: Open Positions */}
      <div className="grid grid-cols-1 gap-6">
        <div className={`border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-zinc-900/40 border-zinc-800' 
            : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
              <Zap size={18} className="text-amber-400" /> Open Positions
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                Live from Delta
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {positions && positions.length > 0 ? positions.map((pos) => (
              <div 
                key={pos.symbol} 
                className={`flex justify-between items-center p-4 rounded-xl transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-zinc-900/20 hover:bg-zinc-900/60' 
                    : 'bg-zinc-50 border border-zinc-100 hover:bg-white hover:border-zinc-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    pos.side === 'buy' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {pos.side === 'buy' ? 'L' : 'S'}
                  </div>
                  <div>
                    <div className={`text-sm font-black ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {pos.symbol}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                      <span>{pos.size} contracts</span>
                      <span className="text-zinc-700">·</span>
                      <span>@ {format(pos.entry_price)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black ${
                    pos.unrealized_pnl >= 0 
                      ? 'text-emerald-500 text-shadow-glow' 
                      : 'text-red-500'
                  }`}>
                    {pos.unrealized_pnl >= 0 ? '+' : '-'}{format(Math.abs(pos.unrealized_pnl))}
                  </div>
                  <div className="text-[9px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">Unrealized P&L</div>
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
