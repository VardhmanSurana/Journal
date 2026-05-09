import { useMemo } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Target, Activity, Clock, Calendar,
  BarChart3, PieChart, ArrowUpDown
} from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

interface AnalyticsProps {
  trades: any[]
  summary: any
  theme: 'dark' | 'light'
}

export const Analytics = ({ trades, summary, theme }: AnalyticsProps) => {
  const { format, currency, rate } = useCurrency()

  const convertValue = (value: number) => {
    return currency === 'INR' ? value * rate : value
  }

  const analyticsData = useMemo(() => {
    if (!trades.length) return null

    const byDirection = {
      long: { wins: 0, losses: 0, pnl: 0 },
      short: { wins: 0, losses: 0, pnl: 0 }
    }

    const byHour = Array(24).fill(0).map(() => ({ hour: 0, count: 0, pnl: 0 }))
    const byDay = Array(7).fill(0).map(() => ({ day: '', count: 0, pnl: 0 }))
    const byDuration = { scalp: 0, intraday: 0, swing: 0 }
    const pnlDistribution: { range: string; count: number }[] = []

    trades.forEach(t => {
      const dir: 'long' | 'short' = (t.direction as 'long' | 'short') || 'long'
      if (t.is_winner) {
        byDirection[dir].wins++
        byDirection[dir].pnl += t.net_profit
      } else {
        byDirection[dir].losses++
        byDirection[dir].pnl += t.net_profit
      }

      const exitDate = new Date(t.exit_time)
      const hour = exitDate.getHours()
      byHour[hour].hour = hour
      byHour[hour].count++
      byHour[hour].pnl += t.net_profit

      const day = exitDate.getDay()
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      byDay[day].day = days[day]
      byDay[day].count++
      byDay[day].pnl += t.net_profit

      const duration = (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime()) / (1000 * 60 * 60)
      if (duration < 1) byDuration.scalp++
      else if (duration < 24) byDuration.intraday++
      else byDuration.swing++

      if (t.net_profit > 0) {
        const range = Math.floor(t.net_profit / 100) * 100
        const existing = pnlDistribution.find(p => p.range === `$${range}-${range + 100}`)
        if (existing) existing.count++
        else pnlDistribution.push({ range: `$${range}-${range + 100}`, count: 1 })
      } else {
        const range = Math.floor(Math.abs(t.net_profit) / 100) * 100
        const existing = pnlDistribution.find(p => p.range === `-$${range}-${range + 100}`)
        if (existing) existing.count++
        else pnlDistribution.push({ range: `-$${range}-${range + 100}`, count: 1 })
      }
    })

    const longWinRate = byDirection.long.wins / (byDirection.long.wins + byDirection.long.losses) * 100 || 0
    const shortWinRate = byDirection.short.wins / (byDirection.short.wins + byDirection.short.losses) * 100 || 0

    const validHours = byHour.filter(h => h.count > 0)
    const peakHour = validHours.length > 0 ? validHours.reduce((max, h) => h.pnl > max.pnl ? h : max, validHours[0]) : { hour: 0, count: 0, pnl: 0 }
    const validDays = byDay.filter(d => d.count > 0)
    const bestDay = validDays.length > 0 ? validDays.reduce((max, d) => d.pnl > max.pnl ? d : max, validDays[0]) : { day: '', count: 0, pnl: 0 }

    return {
      byDirection,
      byHour: byHour.filter(h => h.count > 0),
      byDay,
      byDuration,
      pnlDistribution,
      longWinRate,
      shortWinRate,
      peakHour,
      bestDay,
      avgHoldingTime: trades.reduce((acc, t) => {
        const duration = (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime()) / (1000 * 60)
        return acc + duration
      }, 0) / trades.length
    }
  }, [trades])

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 italic">
        No trade data available for analytics.
      </div>
    )
  }

  const bgClass = theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
  const textClass = theme === 'dark' ? 'text-white' : 'text-zinc-900'
  const subTextClass = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
  const cardBgClass = theme === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-50'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <ArrowUpDown className="text-zinc-100" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Long vs Short</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Long Win Rate</span>
              <span className="font-bold text-zinc-100">{analyticsData.longWinRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Short Win Rate</span>
              <span className="font-bold text-orange-400">{analyticsData.shortWinRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="text-purple-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Avg Hold Time</span>
          </div>
          <div className={`text-2xl font-bold ${textClass}`}>
            {Math.floor(analyticsData.avgHoldingTime)}m
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            ~{Math.floor(analyticsData.avgHoldingTime / 60)}h {Math.floor(analyticsData.avgHoldingTime % 60)}m
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Activity className="text-emerald-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Best Hour</span>
          </div>
          <div className={`text-2xl font-bold ${textClass}`}>
            {analyticsData.peakHour.hour}:00
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {analyticsData.peakHour.count} trades, {format(analyticsData.peakHour.pnl)}
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Calendar className="text-yellow-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Best Day</span>
          </div>
          <div className={`text-2xl font-bold ${textClass}`}>
            {analyticsData.bestDay.day}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {analyticsData.bestDay.count} trades, {format(analyticsData.bestDay.pnl)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${textClass}`}>
            <BarChart3 size={20} className="text-zinc-100" /> P&L by Hour of Day
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e4e4e7'} vertical={false} />
                <XAxis dataKey="hour" stroke={theme === 'dark' ? '#71717a' : '#52525b'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme === 'dark' ? '#71717a' : '#52525b'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                    border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {analyticsData.byHour.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${textClass}`}>
            <PieChart size={20} className="text-zinc-100" /> P&L by Day of Week
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e4e4e7'} vertical={false} />
                <XAxis dataKey="day" stroke={theme === 'dark' ? '#71717a' : '#52525b'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme === 'dark' ? '#71717a' : '#52525b'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                    border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {analyticsData.byDay.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Trade Duration Distribution</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Scalp (&lt;1h)</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-zinc-100 rounded-full" 
                    style={{ width: `${(analyticsData.byDuration.scalp / trades.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-zinc-300">{analyticsData.byDuration.scalp}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Intraday (1-24h)</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ width: `${(analyticsData.byDuration.intraday / trades.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-zinc-300">{analyticsData.byDuration.intraday}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Swing (&gt;24h)</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full" 
                    style={{ width: `${(analyticsData.byDuration.swing / trades.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-zinc-300">{analyticsData.byDuration.swing}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border lg:col-span-2`}>
          <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Long vs Short Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className={`${cardBgClass} p-4 rounded-lg`}>
              <div className="text-xs text-zinc-500 mb-2">Long Winners</div>
              <div className="text-xl font-bold text-zinc-100">{analyticsData.byDirection.long.wins}</div>
            </div>
            <div className={`${cardBgClass} p-4 rounded-lg`}>
              <div className="text-xs text-zinc-500 mb-2">Long P&L</div>
              <div className={`text-xl font-bold ${analyticsData.byDirection.long.pnl >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                {format(analyticsData.byDirection.long.pnl)}
              </div>
            </div>
            <div className={`${cardBgClass} p-4 rounded-lg`}>
              <div className="text-xs text-zinc-500 mb-2">Long Win Rate</div>
              <div className="text-xl font-bold text-zinc-100">{analyticsData.longWinRate.toFixed(1)}%</div>
            </div>
            <div className={`${cardBgClass} p-4 rounded-lg`}>
              <div className="text-xs text-zinc-500 mb-2">Short Winners</div>
              <div className="text-xl font-bold text-orange-400">{analyticsData.byDirection.short.wins}</div>
            </div>
            <div className={`${cardBgClass} p-4 rounded-lg`}>
              <div className="text-xs text-zinc-500 mb-2">Short P&L</div>
              <div className={`text-xl font-bold ${analyticsData.byDirection.short.pnl >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                {format(analyticsData.byDirection.short.pnl)}
              </div>
            </div>
            <div className={`${cardBgClass} p-4 rounded-lg`}>
              <div className="text-xs text-zinc-500 mb-2">Short Win Rate</div>
              <div className="text-xl font-bold text-orange-400">{analyticsData.shortWinRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}