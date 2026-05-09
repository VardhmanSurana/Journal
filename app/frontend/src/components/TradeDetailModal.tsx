import { X, TrendingUp, TrendingDown, Calendar, Clock, DollarSign, ArrowRight, Target } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

interface TradeDetailModalProps {
  trade: any
  onClose: () => void
  onReview?: () => void
}

export const TradeDetailModal = ({ trade, onClose }: TradeDetailModalProps) => {
  const { format } = useCurrency()

  if (!trade) return null

  const entryDate = new Date(trade.entry_time)
  const exitDate = new Date(trade.exit_time)
  const holdDurationMs = exitDate.getTime() - entryDate.getTime()
  const holdHours = Math.floor(holdDurationMs / (1000 * 60 * 60))
  const holdMinutes = Math.floor((holdDurationMs % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              trade.direction === 'long' ? 'bg-zinc-800' : 'bg-orange-500/10'
            }`}>
              {trade.direction === 'long' ? (
                <TrendingUp className="text-zinc-100" size={24} />
              ) : (
                <TrendingDown className="text-orange-400" size={24} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{trade.symbol}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  trade.direction === 'long' 
                    ? 'bg-zinc-800 text-zinc-100' 
                    : 'bg-orange-500/10 text-orange-400'
                }`}>
                  {trade.direction}
                </span>
                {trade.session && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                    {trade.session} SESSION
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className={`text-center py-4 rounded-xl ${
            trade.is_winner ? 'bg-emerald-500/10' : 'bg-red-500/10'
          }`}>
            <div className="text-sm text-zinc-400 mb-1">
              {trade.is_winner ? 'Profit' : 'Loss'}
            </div>
            <div className={`text-3xl font-bold ${
              trade.is_winner ? 'text-emerald-400' : 'text-red-500'
            }`}>
              {trade.is_winner ? '+' : ''}{format(trade.net_profit)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              After fees: {format(trade.after_tax_profit)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900/50 rounded-xl">
              <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                <ArrowRight size={12} className="text-zinc-400" /> Entry Price
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {format(trade.avg_entry)}
              </div>
              <div className="text-xs text-zinc-500 mt-1 flex justify-between">
                <span>Size: {trade.size}</span>
                {trade.risk_pct > 0 && <span className="text-amber-500 font-bold">Risk: {trade.risk_pct}%</span>}
              </div>
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-xl">
              <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                <ArrowRight size={12} className="text-emerald-400 transform rotate-180" /> Exit Price
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {format(trade.avg_exit)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {trade.result}
              </div>
            </div>
          </div>

          {(trade.stop_loss > 0 || trade.take_profit > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {trade.stop_loss > 0 && (
                <div className="px-4 py-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                  <div className="text-[10px] text-zinc-500 uppercase font-black">Stop Loss</div>
                  <div className="text-sm font-mono text-red-400">{format(trade.stop_loss)}</div>
                </div>
              )}
              {trade.take_profit > 0 && (
                <div className="px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                  <div className="text-[10px] text-zinc-500 uppercase font-black">Take Profit</div>
                  <div className="text-sm font-mono text-emerald-400">{format(trade.take_profit)}</div>
                </div>
              )}
            </div>
          )}

          {trade.pre_plan && (
            <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
              <div className="text-xs font-black uppercase text-zinc-500 mb-2 flex items-center gap-2">
                <Target size={12} /> Pre-Trade Plan
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed italic">
                "{trade.pre_plan}"
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-lg">
              <Calendar size={16} className="text-zinc-500" />
              <div>
                <div className="text-xs text-zinc-500">Entry Date</div>
                <div className="text-sm font-medium text-zinc-300">
                  {entryDate.toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-lg">
              <Calendar size={16} className="text-zinc-500" />
              <div>
                <div className="text-xs text-zinc-500">Exit Date</div>
                <div className="text-sm font-medium text-zinc-300">
                  {exitDate.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-lg">
            <Clock size={16} className="text-zinc-500" />
            <div>
              <div className="text-xs text-zinc-500">Holding Duration</div>
              <div className="text-sm font-medium text-zinc-300">
                {holdHours > 0 ? `${holdHours}h ` : ''}{holdMinutes}m
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Gross P&L</span>
              <span className={`font-mono ${trade.gross_profit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                {format(trade.gross_profit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total Fees</span>
              <span className="font-mono text-zinc-300">-{format(trade.fees)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">GST (18%)</span>
              <span className="font-mono text-zinc-300">-{format(trade.gst || 0)}</span>
            </div>
            {trade.strategy && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Strategy</span>
                <span className="font-mono text-zinc-100">{trade.strategy}</span>
              </div>
            )}
            {trade.notes && (
              <div className="pt-2 border-t border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Notes</div>
                <div className="text-sm text-zinc-300 italic">{trade.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}