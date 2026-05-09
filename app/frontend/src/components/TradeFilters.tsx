import { Filter, Calendar, X } from 'lucide-react'
import { useState, useMemo } from 'react'

interface TradeFiltersProps {
  trades: any[]
  onFilteredTrades: (trades: any[]) => void
}

export const TradeFilters = ({ trades, onFilteredTrades }: TradeFiltersProps) => {
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters || hasFilters
                ? 'bg-zinc-100 text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Filter size={16} />
            <span className="text-sm font-medium">Filters</span>
            {hasFilters && (
              <span className={`${showFilters || hasFilters ? 'bg-zinc-950/10' : 'bg-white/20'} px-1.5 py-0.5 rounded text-xs`}>
                {[selectedSymbol, selectedDirection, dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
          </button>
          
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-red-500 transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        <div className="text-sm text-zinc-500">
          {hasFilters ? (
            <span>Showing filtered results</span>
          ) : (
            <span>{trades.length} trades total</span>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Symbol
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => {
                  setSelectedSymbol(e.target.value)
                  applyFilters()
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              >
                <option value="">All Symbols</option>
                {symbols.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Direction
              </label>
              <select
                value={selectedDirection}
                onChange={(e) => {
                  setSelectedDirection(e.target.value)
                  applyFilters()
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              >
                <option value="">All</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  applyFilters()
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  applyFilters()
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}