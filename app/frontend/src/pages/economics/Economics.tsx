import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { 
  Coins, TrendingUp, TrendingDown, Clock, 
  ArrowUpRight, ArrowDownRight, Wallet, PieChart, Info, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { useCurrency } from '../../hooks/useCurrency'
import { useThemeClasses, useChartTheme } from '../../utils/theme'
import { API_BASE } from '../../config/api'
import { SkeletonLoader } from '../../components/SkeletonLoader'

interface EconomicsData {
  total_fees: number
  total_funding: number
  total_rewards: number
  daily_history: {
    date: string
    fees: number
    funding: number
    rewards: number
  }[]
}

export const Economics = ({ theme }: { theme: 'light' | 'dark' }) => {
  const { format, convert } = useCurrency()
  const { bgClass, textClass, cardBgClass } = useThemeClasses(theme)
  const chartTheme = useChartTheme(theme)
  
  const [data, setData] = useState<EconomicsData | null>(null)
  const [optimization, setOptimization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [econRes, optRes] = await Promise.all([
          axios.get(`${API_BASE}/economics`),
          axios.get(`${API_BASE}/economics/optimization`)
        ])
        setData(econRes.data)
        setOptimization(optRes.data)
      } catch (err) {
        console.error('Error fetching economics data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredHistory = useMemo(() => {
    if (!data) return []
    const history = [...data.daily_history]
    if (timeRange === '7d') return history.slice(-7)
    if (timeRange === '30d') return history.slice(-30)
    return history
  }, [data, timeRange])

  const convertedHistory = useMemo(() => {
    return filteredHistory.map(d => ({
      ...d,
      fees: convert(d.fees),
      funding: convert(d.funding),
      rewards: convert(d.rewards)
    }))
  }, [filteredHistory, convert])

  if (loading) return <SkeletonLoader variant="economics" theme={theme} />
  if (!data) return <div className="p-8 text-center text-zinc-500 italic animate-pulse">No economic data found. Ensure your API key has "Read" permissions.</div>

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end gap-2">
        {(['7d', '30d', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              timeRange === range 
                ? theme === 'dark'
                  ? 'bg-zinc-100 text-zinc-950 border-white' 
                  : 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                : theme === 'dark'
                  ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                  : 'bg-zinc-200/60 text-zinc-600 border-zinc-300/80 hover:text-zinc-800 hover:bg-zinc-200'
            }`}
          >
            {range === 'all' ? 'All Time' : `Last ${range.toUpperCase()}`}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="text-red-400" size={20} />
            </div>
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Total Fees Paid</span>
          </div>
          <div className="text-2xl font-black loser">
            {format(Math.abs(data.total_fees))}
          </div>
          <p className={`text-[10px] mt-1 uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Trading Commissions & GST</p>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="text-blue-400" size={20} />
            </div>
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Net Funding</span>
          </div>
          <div className={`text-2xl font-black ${data.total_funding >= 0 ? 'winner' : 'loser'}`}>
            {format(Math.abs(data.total_funding))}
          </div>
          <p className={`text-[10px] mt-1 uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {data.total_funding >= 0 ? 'Earned from positions' : 'Paid to maintain positions'}
          </p>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Coins className="text-emerald-400" size={20} />
            </div>
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Total Rewards</span>
          </div>
          <div className="text-2xl font-black winner">
            {format(Math.abs(data.total_rewards))}
          </div>
          <p className={`text-[10px] mt-1 uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Vouchers & Cash Rebates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fees Chart */}
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${textClass}`}>
              <TrendingDown size={20} className="text-red-400" /> Fees Paid
            </h3>
            <div className="text-right">
                <div className={`text-[10px] uppercase font-black ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Period Total</div>
                <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{format(convertedHistory.reduce((sum, d) => sum + d.fees, 0))}</div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={convertedHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke={chartTheme.axisColor} 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(str) => str.split('-').slice(1).join('/')} 
                />
                <YAxis stroke={chartTheme.axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: chartTheme.tooltipBg, 
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#005' }}
                  labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a' }}
                  cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="fees" fill={theme === 'dark' ? '#ef4444' : '#b91c1c'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funding Chart */}
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${textClass}`}>
              <Clock size={20} className="text-blue-400" /> Funding History
            </h3>
            <div className="text-right">
                <div className={`text-[10px] uppercase font-black ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Net Period</div>
                <div className={`text-sm font-bold ${convertedHistory.reduce((sum, d) => sum + d.funding, 0) >= 0 ? 'winner' : 'loser'}`}>
                    {format(Math.abs(convertedHistory.reduce((sum, d) => sum + d.funding, 0)))}
                </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={convertedHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke={chartTheme.axisColor} 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(str) => str.split('-').slice(1).join('/')}
                />
                <YAxis stroke={chartTheme.axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: chartTheme.tooltipBg, 
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#005' }}
                  labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a' }}
                  cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                />
                <ReferenceLine y={0} stroke={theme === 'dark' ? '#3f3f46' : '#d4d4d8'} />
                <Bar dataKey="funding">
                  {convertedHistory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.funding >= 0 ? (theme === 'dark' ? '#10b981' : '#047857') : (theme === 'dark' ? '#ef4444' : '#b91c1c')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Funding & Fee Optimization Section (Feature 3) */}
      {optimization && (
        <div className={`${bgClass} p-6 rounded-xl border space-y-6`}>
          <div className="flex items-center gap-2 mb-2">
            <Coins size={20} className="text-amber-400" />
            <h3 className={`text-lg font-bold ${textClass}`}>Funding & Fee Optimization Diagnostics</h3>
          </div>

          {optimization.alerts && optimization.alerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {optimization.alerts.map((alert: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-xl border flex gap-3 items-start ${
                  alert.type === 'leakage'
                    ? theme === 'dark' ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
                    : alert.type === 'efficiency'
                      ? theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                      : theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  {alert.type === 'leakage' ? (
                    <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  ) : alert.type === 'efficiency' ? (
                    <Info size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${
                      alert.type === 'leakage' ? 'text-red-400' : alert.type === 'efficiency' ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {alert.type.toUpperCase()}: {alert.asset}
                    </h4>
                    <p className={`text-xs leading-relaxed mt-1 ${theme === 'dark' ? 'text-zinc-350' : 'text-zinc-650'}`}>
                      {alert.message}
                    </p>
                    <div className="text-[10px] mt-2 font-bold uppercase tracking-widest text-zinc-500">
                      💡 Suggested Action: <span className={theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}>{alert.suggested_action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-4 rounded-xl border text-center text-xs text-zinc-500 italic ${
              theme === 'dark' ? 'bg-zinc-900/20 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
            }`}>
              🎉 Capital Efficiency Perfect: No active funding leakage or excessive commissions detected. Your position management is highly optimized.
            </div>
          )}

          {/* Asset-by-Asset breakdown Matrix */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800/40">
            <table className="w-full text-left text-xs">
              <thead className={`${theme === 'dark' ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-600'} font-bold uppercase text-[10px] tracking-wider border-b border-zinc-800/20`}>
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3 text-right">Commissions Paid</th>
                  <th className="p-3 text-right">Net Funding Performance</th>
                  <th className="p-3 text-right">Rewards & Rebates</th>
                  <th className="p-3 text-right">Net Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/10 font-mono">
                {Object.entries(optimization.asset_stats).map(([asset, stats]: any) => {
                  const netCash = stats.rewards + stats.funding - stats.fees;
                  return (
                    <tr key={asset} className={`${theme === 'dark' ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50/50'} transition-colors`}>
                      <td className="p-3 font-bold">{asset}</td>
                      <td className="p-3 text-right text-red-400">-{format(stats.fees)}</td>
                      <td className={`p-3 text-right ${stats.funding >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stats.funding >= 0 ? '+' : ''}{format(stats.funding)}
                      </td>
                      <td className="p-3 text-right text-emerald-400">+{format(stats.rewards)}</td>
                      <td className={`p-3 text-right font-black ${netCash >= 0 ? 'winner' : 'loser'}`}>
                        {netCash >= 0 ? '+' : ''}{format(netCash)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className={`p-4 rounded-xl border flex gap-3 items-start ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100/80 border-zinc-200'}`}>
        <Info size={16} className={`${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} mt-0.5`} />
        <div className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Economic data is fetched from your Delta Exchange transaction logs. Funding payments are exchanged every 8 hours between long and short positions. Fees include trading commissions and applicable GST. Rewards include bonus credits and referral rebates.
        </div>
      </div>
    </div>
  )
}
