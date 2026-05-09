import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

interface DailyPnL {
  date: string
  value: number
}

interface CalendarProps {
  dailyPnL: DailyPnL[]
  onDayClick?: (date: string) => void
  selectedDate?: string | null
}

export const PerformanceCalendar = ({ dailyPnL, onDayClick, selectedDate }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const { format: formatCurrency } = useCurrency()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startDate,
      end: endDate
    })
  }, [startDate, endDate])

  const pnlMap = useMemo(() => {
    const map: Record<string, number> = {}
    dailyPnL.forEach(item => {
      map[item.date] = item.value
    })
    return map
  }, [dailyPnL])

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  // Monthly stats
  const monthlyPnL = useMemo(() => {
    return dailyPnL
      .filter(item => isSameMonth(new Date(item.date), currentDate))
      .reduce((sum, item) => sum + item.value, 0)
  }, [dailyPnL, currentDate])

  return (
    <div className="card p-5 flex flex-col h-fit">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <CalendarIcon size={16} className="text-zinc-400" /> Monthly P&L
          </h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            Total: <span className={monthlyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {formatCurrency(monthlyPnL)}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-800/40 p-1 rounded-lg border border-zinc-700/50">
           <button onClick={prevMonth} className="p-1 hover:text-white transition-colors">
             <ChevronLeft size={16} />
           </button>
           <span className="text-xs font-bold text-zinc-200 min-w-[80px] text-center">
             {format(currentDate, 'MMM yyyy')}
           </span>
           <button onClick={nextMonth} className="p-1 hover:text-white transition-colors">
             <ChevronRight size={16} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 bg-transparent">
        {/* Days Header */}
        {daysOfWeek.map((day, i) => (
          <div key={i} className="py-1 text-center text-[10px] font-black text-zinc-600">
            {day}
          </div>
        ))}

        {/* Calendar Grid */}
        {calendarDays.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const pnl = pnlMap[dateStr]
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isToday = isSameDay(day, new Date())
          const isSelected = selectedDate === dateStr

          return (
            <div 
              key={i} 
              onClick={() => isCurrentMonth && onDayClick?.(dateStr)}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all duration-200 border cursor-pointer
                ${isCurrentMonth ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-transparent border-transparent opacity-10'}
                ${isToday ? 'border-zinc-500/50 bg-zinc-500/5' : ''}
                ${isSelected ? 'ring-2 ring-zinc-500 border-zinc-500 bg-zinc-500/10' : ''}
                hover:bg-zinc-800/60
              `}
            >
              <span className={`absolute top-1 left-1.5 text-[9px] font-bold ${isToday ? 'text-zinc-100' : 'text-zinc-600'}`}>
                {format(day, 'd')}
              </span>
              
              {pnl !== undefined && isCurrentMonth && (
                <div className={`
                  text-[10px] font-black tracking-tighter leading-none
                  ${pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-zinc-500'}
                `}>
                  {pnl > 0 ? '▲' : pnl < 0 ? '▼' : ''}
                  {Math.abs(pnl) >= 1000 ? (Math.abs(pnl)/1000).toFixed(1) + 'k' : Math.abs(pnl).toFixed(0)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold text-zinc-500 uppercase">Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[9px] font-bold text-zinc-500 uppercase">Loss</span>
        </div>
      </div>
    </div>
  )
}
