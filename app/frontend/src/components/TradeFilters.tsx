import { Filter, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import type { Theme } from '../utils/theme'

interface TradeFiltersProps {
  trades: any[]
  onFilteredTrades: (trades: any[]) => void
  theme?: Theme
}

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  theme: Theme;
}

const CustomDatePicker = ({ value, onChange, label, theme }: CustomDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) return new Date(value)
    return new Date()
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sun, 1 = Mon ...

  const days = []
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }

  const monthsList = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(year, month, day)
    const formattedDate = selectedDate.toLocaleDateString("en-CA") // YYYY-MM-DD
    onChange(formattedDate)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
  }

  const displayValue = value 
    ? new Date(value).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) 
    : 'Select Date'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-550 transition-colors ${
          theme === 'dark' 
            ? 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-700' 
            : 'bg-white border-zinc-200 text-zinc-850 hover:border-zinc-350 shadow-sm'
        }`}
      >
        <span className={value ? "font-bold text-xs" : "text-zinc-500 text-xs font-semibold"}>{displayValue}</span>
        <CalendarIcon size={14} className="text-zinc-500 shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Transparent click overlay to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className={`absolute right-0 md:left-0 mt-2 p-4 rounded-xl border z-50 w-64 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-white'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-zinc-850 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-650'}`}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black uppercase tracking-wider">
                {monthsList[month]} {year}
              </span>
              <button onClick={nextMonth} className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-zinc-850 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-650'}`}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-1.5 text-center text-[10px] font-black text-zinc-550 uppercase tracking-widest leading-none">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx}>{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (day === null) return <div key={idx} />
                
                const dayDateStr = new Date(year, month, day).toLocaleDateString("en-CA")
                const isSelected = value === dayDateStr
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectDay(day)}
                    className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? theme === 'dark'
                          ? 'bg-zinc-100 text-zinc-950 font-black'
                          : 'bg-zinc-900 text-white font-black'
                        : theme === 'dark'
                          ? 'hover:bg-zinc-800 text-zinc-300'
                          : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Clear Button */}
            {value && (
              <button
                onClick={handleClear}
                className={`w-full mt-3 pt-2 border-t text-center text-[10px] font-black uppercase tracking-widest transition-colors ${
                  theme === 'dark' 
                    ? 'border-zinc-800/80 text-zinc-400 hover:text-red-400' 
                    : 'border-zinc-100 text-zinc-500 hover:text-red-600'
                }`}
              >
                Clear Date
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
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

  // Automatically trigger filters on any state update
  useEffect(() => {
    let filtered = [...trades]

    if (selectedSymbol) {
      filtered = filtered.filter(t => t.symbol === selectedSymbol)
    }

    if (selectedDirection) {
      filtered = filtered.filter(t => t.direction === selectedDirection)
    }

    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00")
      filtered = filtered.filter(t => new Date(t.exit_time) >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59")
      filtered = filtered.filter(t => new Date(t.exit_time) <= to)
    }

    onFilteredTrades(filtered)
  }, [selectedSymbol, selectedDirection, dateFrom, dateTo, trades])

  const clearFilters = () => {
    setSelectedSymbol('')
    setSelectedDirection('')
    setDateFrom('')
    setDateTo('')
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
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-550 transition-colors ${
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
                onChange={(e) => setSelectedDirection(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-550 transition-colors ${
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
              <CustomDatePicker
                value={dateFrom}
                onChange={setDateFrom}
                label="From Date"
                theme={theme}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                To Date
              </label>
              <CustomDatePicker
                value={dateTo}
                onChange={setDateTo}
                label="To Date"
                theme={theme}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}