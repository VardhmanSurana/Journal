import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'
import { 
  Shield, TrendingUp, TrendingDown, AlertTriangle, Activity,
  Calculator, DollarSign, Percent, BarChart2
} from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

interface RiskDashboardProps {
  theme: 'dark' | 'light'
}

const API_BASE = 'http://localhost:8000/api'

interface RiskData {
  sharpe_ratio: number
  sortino_ratio: number
  calmar_ratio: number
  max_drawdown: number
  annual_return_pct: number
  win_loss_streak: number
  max_consecutive_wins: number
  max_consecutive_losses: number
  win_loss_distribution: { range: string; count: number }[]
  portfolio_exposure: { symbol: string; notional: number }[]
  margin_utilization: number
  total_equity: number
}

interface Position {
  symbol: string
  size: number
  entry_price: number
  mark_price: number
  unrealized_pnl: number
  margin_used: number
  leverage: number
  side: string
  liq_price: number
}

export const RiskDashboard = ({ theme }: RiskDashboardProps) => {
  const { format, currency, rate } = useCurrency()
  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [calcAccountSize, setCalcAccountSize] = useState(10000)
  const [calcRiskPercent, setCalcRiskPercent] = useState(2)
  const [calcEntryPrice, setCalcEntryPrice] = useState(0)
  const [calcStopLoss, setCalcStopLoss] = useState(0)
  const [calcContractSize, setCalcContractSize] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [riskRes, posRes] = await Promise.all([
          axios.get(`${API_BASE}/risk`),
          axios.get(`${API_BASE}/positions`)
        ])
        setRiskData(riskRes.data)
        setPositions(posRes.data)
      } catch (err) {
        console.error('Error fetching risk data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const convertValue = (value: number) => currency === 'INR' ? value * rate : value

  const positionSizing = useMemo(() => {
    if (!calcEntryPrice || !calcStopLoss || calcEntryPrice === calcStopLoss) {
      return { position_size: 0, risk_amount: 0, stop_distance_pct: 0 }
    }
    
    const risk_amount = calcAccountSize * (calcRiskPercent / 100)
    const stop_distance = Math.abs(calcEntryPrice - calcStopLoss)
    const stop_distance_pct = (stop_distance / calcEntryPrice) * 100
    const position_size = (risk_amount / stop_distance) * calcContractSize
    
    return {
      position_size: Math.round(position_size * 100) / 100,
      risk_amount: Math.round(risk_amount * 100) / 100,
      stop_distance_pct: Math.round(stop_distance_pct * 100) / 100
    }
  }, [calcAccountSize, calcRiskPercent, calcEntryPrice, calcStopLoss, calcContractSize])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">Loading risk data...</div>
  }

  const bgClass = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
  const textClass = theme === 'dark' ? 'text-white' : 'text-zinc-900'
  const cardBgClass = theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50'
  const subTextClass = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <div className="space-y-6">
      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <TrendingUp className="text-blue-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Sharpe Ratio</span>
          </div>
          <div className={`text-2xl font-bold ${riskData?.sharpe_ratio && riskData.sharpe_ratio > 1 ? 'text-emerald-400' : textClass}`}>
            {riskData?.sharpe_ratio?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {riskData?.sharpe_ratio && riskData.sharpe_ratio > 1 ? 'Good' : 'Needs improvement'}
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Activity className="text-purple-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Sortino Ratio</span>
          </div>
          <div className={`text-2xl font-bold ${riskData?.sortino_ratio && riskData.sortino_ratio > 2 ? 'text-emerald-400' : textClass}`}>
            {riskData?.sortino_ratio?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {riskData?.sortino_ratio && riskData.sortino_ratio > 2 ? 'Excellent' : 'Fair'}
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Shield className="text-emerald-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Calmar Ratio</span>
          </div>
          <div className={`text-2xl font-bold ${riskData?.calmar_ratio && riskData.calmar_ratio > 1 ? 'text-emerald-400' : textClass}`}>
            {riskData?.calmar_ratio?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Risk-adjusted return
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <TrendingDown className="text-rose-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Max Drawdown</span>
          </div>
          <div className={`text-2xl font-bold text-rose-400`}>
            {format(riskData?.max_drawdown || 0)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Annual return: {riskData?.annual_return_pct?.toFixed(1) || 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Distribution */}
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${textClass}`}>
            <BarChart2 size={20} className="text-blue-400" /> P&L Distribution
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData?.win_loss_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e4e4e7'} vertical={false} />
                <XAxis dataKey="range" stroke={theme === 'dark' ? '#71717a' : '#52525b'} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={theme === 'dark' ? '#71717a' : '#52525b'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                    border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskData?.win_loss_distribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#ef4444' : index === 3 ? '#71717a' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Exposure */}
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${textClass}`}>
            <Percent size={20} className="text-purple-400" /> Portfolio Exposure
          </h3>
          <div className="space-y-3">
            {riskData?.portfolio_exposure?.map((exp) => {
              const total = riskData.portfolio_exposure.reduce((sum, e) => sum + e.notional, 0)
              const pct = total > 0 ? (exp.notional / total) * 100 : 0
              return (
                <div key={exp.symbol} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-zinc-300 w-20">{exp.symbol}</span>
                  <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-400 w-16 text-right">{pct.toFixed(1)}%</span>
                </div>
              )
            })}
            {(!riskData?.portfolio_exposure || riskData.portfolio_exposure.length === 0) && (
              <p className="text-zinc-500 text-center py-8">No open positions</p>
            )}
          </div>
        </div>
      </div>

      {/* Current Positions */}
      {positions.length > 0 && (
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Open Positions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'}`}>
                  <th className="pb-3 font-medium text-zinc-400">Symbol</th>
                  <th className="pb-3 font-medium text-zinc-400">Size</th>
                  <th className="pb-3 font-medium text-zinc-400">Entry</th>
                  <th className="pb-3 font-medium text-zinc-400">Mark Price</th>
                  <th className="pb-3 font-medium text-zinc-400">Unrealized P&L</th>
                  <th className="pb-3 font-medium text-zinc-400">Margin</th>
                  <th className="pb-3 font-medium text-zinc-400">Leverage</th>
                  <th className="pb-3 font-medium text-zinc-400">Liq. Price</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
                {positions.map((pos) => (
                  <tr key={pos.symbol} className="group">
                    <td className="py-3 font-bold text-white">{pos.symbol}</td>
                    <td className="py-3 text-zinc-300">{pos.size.toFixed(4)}</td>
                    <td className="py-3 text-zinc-400 font-mono">{pos.entry_price.toFixed(2)}</td>
                    <td className="py-3 text-zinc-400 font-mono">{pos.mark_price?.toFixed(2) || '-'}</td>
                    <td className={`py-3 font-mono ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.unrealized_pnl >= 0 ? '+' : ''}{format(pos.unrealized_pnl)}
                    </td>
                    <td className="py-3 text-zinc-400">{format(pos.margin_used)}</td>
                    <td className="py-3 text-zinc-400">{pos.leverage}x</td>
                    <td className={`py-3 font-mono ${pos.liq_price ? 'text-amber-400' : 'text-zinc-500'}`}>
                      {pos.liq_price?.toFixed(2) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Margin Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <Percent className="text-amber-400" size={20} />
            <span className="text-sm font-medium text-zinc-400">Margin Utilization</span>
          </div>
          <div className="mb-2">
            <div className="h-4 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  (riskData?.margin_utilization || 0) > 80 ? 'bg-rose-500' :
                  (riskData?.margin_utilization || 0) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(riskData?.margin_utilization || 0, 100)}%` }}
              />
            </div>
          </div>
          <div className={`text-xl font-bold ${textClass}`}>
            {riskData?.margin_utilization?.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Total Equity: {format(riskData?.total_equity || 0)}
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-emerald-400" size={20} />
            <span className="text-sm font-medium text-zinc-400">Consecutive Wins</span>
          </div>
          <div className={`text-2xl font-bold text-emerald-400`}>
            {riskData?.max_consecutive_wins || 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Best streak</div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="text-rose-400" size={20} />
            <span className="text-sm font-medium text-zinc-400">Consecutive Losses</span>
          </div>
          <div className={`text-2xl font-bold text-rose-400`}>
            {riskData?.max_consecutive_losses || 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Worst streak</div>
        </div>
      </div>

      {/* Position Sizing Calculator */}
      <div className={`${bgClass} p-6 rounded-xl border`}>
        <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${textClass}`}>
          <Calculator size={20} className="text-blue-400" /> Position Sizing Calculator
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Account Size ($)</label>
            <input
              type="number"
              value={calcAccountSize}
              onChange={(e) => setCalcAccountSize(Number(e.target.value))}
              className={`w-full p-3 rounded-lg border ${
                theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Risk %</label>
            <input
              type="number"
              value={calcRiskPercent}
              onChange={(e) => setCalcRiskPercent(Number(e.target.value))}
              className={`w-full p-3 rounded-lg border ${
                theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Entry Price ($)</label>
            <input
              type="number"
              value={calcEntryPrice || ''}
              onChange={(e) => setCalcEntryPrice(Number(e.target.value))}
              className={`w-full p-3 rounded-lg border ${
                theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Stop Loss ($)</label>
            <input
              type="number"
              value={calcStopLoss || ''}
              onChange={(e) => setCalcStopLoss(Number(e.target.value))}
              className={`w-full p-3 rounded-lg border ${
                theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Contract Size</label>
            <input
              type="number"
              value={calcContractSize}
              onChange={(e) => setCalcContractSize(Number(e.target.value))}
              className={`w-full p-3 rounded-lg border ${
                theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-zinc-800/30 rounded-xl">
          <div className="text-center">
            <div className="text-sm text-zinc-400 mb-2">Position Size</div>
            <div className={`text-2xl font-bold ${textClass}`}>
              {positionSizing.position_size.toFixed(2)} units
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-zinc-400 mb-2">Risk Amount</div>
            <div className="text-2xl font-bold text-rose-400">
              {format(positionSizing.risk_amount)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-zinc-400 mb-2">Stop Distance</div>
            <div className="text-2xl font-bold text-amber-400">
              {positionSizing.stop_distance_pct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}