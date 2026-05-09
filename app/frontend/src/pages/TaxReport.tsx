import { useState, useEffect } from 'react'
import axios from 'axios'
import { FileText, Download, Calendar, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface TaxReportProps {
  theme: 'dark' | 'light'
}

const API_BASE = 'http://localhost:8000/api'

interface TaxYear {
  year: number
  trades: number
  turnover: number
  gross_pnl: number
  total_fees: number
  estimated_tax: number
  profit_after_tax: number
  audit_required: boolean
  losses_carried_forward: number
}

export const TaxReport = ({ theme }: TaxReportProps) => {
  const [taxYears, setTaxYears] = useState<TaxYear[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/tax/summary`)
        setTaxYears(res.data)
      } catch (err) {
        console.error('Error fetching tax data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await axios.get(`${API_BASE}/tax/export`)
      const csvContent = res.data.csv
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.data.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting:', err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">Loading tax data...</div>
  }

  const bgClass = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
  const textClass = theme === 'dark' ? 'text-white' : 'text-zinc-900'
  const cardBgClass = theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50'
  const subTextClass = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'

  const totalTurnover = taxYears.reduce((sum, y) => sum + y.turnover, 0)
  const totalTax = taxYears.reduce((sum, y) => sum + y.estimated_tax, 0)
  const totalProfit = taxYears.reduce((sum, y) => sum + y.profit_after_tax, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${textClass}`}>Tax Compliance Report</h2>
          <p className={`text-sm ${subTextClass}`}>Annual turnover and tax summary for audit compliance</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download size={18} />
          <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <FileText className="text-blue-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Total Turnover</span>
          </div>
          <div className={`text-2xl font-bold ${textClass}`}>
            ${totalTurnover.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {totalTurnover >= 10000000 ? '⚠️ Audit Required (≥₹10Cr)' : 'Below audit threshold'}
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <TrendingDown className="text-rose-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Total Tax Estimate</span>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            ${totalTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Based on slab rate
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Profit After Tax</span>
          </div>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Net after estimated tax
          </div>
        </div>
      </div>

      {/* Annual Breakdown */}
      <div className={`${bgClass} p-6 rounded-xl border`}>
        <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${textClass}`}>
          <Calendar size={20} className="text-purple-400" /> Annual Breakdown
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <th className="pb-4 font-medium text-zinc-400">Year</th>
                <th className="pb-4 font-medium text-zinc-400">Trades</th>
                <th className="pb-4 font-medium text-zinc-400">Turnover</th>
                <th className="pb-4 font-medium text-zinc-400">Gross P&L</th>
                <th className="pb-4 font-medium text-zinc-400">Fees</th>
                <th className="pb-4 font-medium text-zinc-400">Est. Tax</th>
                <th className="pb-4 font-medium text-zinc-400">After Tax</th>
                <th className="pb-4 font-medium text-zinc-400">CF Loss</th>
                <th className="pb-4 font-medium text-zinc-400">Audit</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
              {taxYears.map((year) => (
                <tr key={year.year}>
                  <td className="py-4 font-bold text-white">{year.year}</td>
                  <td className="py-4 text-zinc-300">{year.trades}</td>
                  <td className="py-4 text-zinc-300 font-mono">
                    ${year.turnover.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className={`py-4 font-mono ${year.gross_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {year.gross_pnl >= 0 ? '+' : ''}${year.gross_pnl.toFixed(2)}
                  </td>
                  <td className="py-4 text-zinc-400 font-mono">
                    ${year.total_fees.toFixed(2)}
                  </td>
                  <td className="py-4 text-rose-400 font-mono">
                    ${year.estimated_tax.toFixed(2)}
                  </td>
                  <td className={`py-4 font-mono font-bold ${year.profit_after_tax >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${year.profit_after_tax.toFixed(2)}
                  </td>
                  <td className="py-4 text-zinc-400 font-mono">
                    ${year.losses_carried_forward.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4">

                    {year.audit_required ? (
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full font-medium">
                        Required
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-500 text-xs rounded-full">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {taxYears.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No trade data available for tax reporting.
            </div>
          )}
        </div>
      </div>

      {/* Audit Info */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-500/20 rounded-full">
            <AlertTriangle className="text-amber-400" size={24} />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-amber-400 mb-2">Audit Threshold Information</h4>
            <p className="text-zinc-300 text-sm mb-3">
              Under Indian tax law, if your annual turnover from crypto trading exceeds ₹10 Crore (₹10,000,000),
              you are required to get your accounts audited by a CA.
            </p>
            <div className="text-xs text-zinc-400">
              <p>• Turnover = Sum of absolute gross P&L (not net)</p>
              <p>• This applies to speculative business income from futures/derivatives</p>
              <p>• Losses can be carried forward for 4 years against similar income</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}