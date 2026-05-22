import { Filter, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { Theme } from '../utils/theme'

interface TradeFiltersProps {
  trades: any[]
  onFilteredTrades: (trades: any[]) => void
  theme?: Theme
}

export const TradeFilters = ({ trades, onFilteredTrades, theme = 'dark' }: TradeFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [selectedDirection, setSelectedDirection] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const symbols = useMemo(() => {
    const unique = [...new Set(trades.map(t => t.symbol))]
    return unique.sort()
  }, [trades])

  const applyFilters = () => {
    let filtered = [...trades]

    if (selectedSymbol) {
      filtered = filtered.filter(t => t.symbol === selectedSymbol)
    }

    if (selectedDirection) {
      filtered = filtered.filter(t => t.direction === selectedDirection)
    }

    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.exit_time) >= new Date(dateFrom))
    }

    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.exit_time) <= new Date(dateTo))
    }

    onFilteredTrades(filtered)
  }

  const clearFilters = () => {
    setSelectedSymbol('')
    setSelectedDirection('')
    setDateFrom('')
    setDateTo('')
    onFilteredTrades(trades)
  }

  const hasFilters = selectedSymbol || selectedDirection || dateFrom || dateTo

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              showFilters || hasFilters
                ? theme === 'dark'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-900 text-white font-bold shadow-sm'
                : theme === 'dark'
                  ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'bg-zinc-200/60 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200'
            }`}
          >
            <Filter size={16} />
            <span className="text-sm font-medium">Filters</span>
            {hasFilters && (
              <span className={`px-1.5 py-0.5 rounded text-xs ml-1 ${
                showFilters || hasFilters
                  ? theme === 'dark' ? 'bg-zinc-950/10 text-zinc-950' : 'bg-white/20 text-white'
                  : theme === 'dark' ? 'bg-white/10 text-zinc-300' : 'bg-zinc-900/10 text-zinc-700'
              }`}>
                {[selectedSymbol, selectedDirection, dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
          </button>
          
          {hasFilters && (
            <button
              onClick={clearFilters}
              className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                theme === 'dark' ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-500 hover:text-red-600'
              }`}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        <div className={`text-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {hasFilters ? (
            <span>Showing filtered results</span>
          ) : (
            <span>{trades.length} trades total</span>
          )}
        </div>
      </div>

      {showFilters && (
        <div className={`mt-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
          theme === 'dark' 
            ? 'bg-zinc-900/50 border-zinc-800' 
            : 'bg-zinc-100/50 border-zinc-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                Symbol
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => {
                  setSelectedSymbol(e.target.value)
                  applyFilters()
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200' 
                    : 'bg-white border-zinc-200 text-zinc-800'
                }`}
              >
                <option value="">All Symbols</option>
                {symbols.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                Direction
              </label>
              <select
                value={selectedDirection}
                onChange={(e) => {
                  setSelectedDirection(e.target.value)
                  applyFilters()
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200' 
                    : 'bg-white border-zinc-200 text-zinc-800'
                }`}
              >
                <option value="">All</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  applyFilters()
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200' 
                    : 'bg-white border-zinc-200 text-zinc-800'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  applyFilters()
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200' 
                    : 'bg-white border-zinc-200 text-zinc-800'
                }`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}