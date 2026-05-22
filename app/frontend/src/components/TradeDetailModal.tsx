import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, TrendingUp, TrendingDown, Calendar, Clock, DollarSign, ArrowRight, Target, BookOpen, Image as ImageIcon } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'
import { API_BASE } from '../config/api'

interface TradeDetailModalProps {
  trade: any
  theme?: 'light' | 'dark'
  onClose: () => void
  onReview: () => void
}

export const TradeDetailModal = ({ trade, theme = 'dark', onClose, onReview }: TradeDetailModalProps) => {
  const { format } = useCurrency()
  const [orderbook, setOrderbook] = useState<{ buy: any[]; sell: any[] } | null>(null)
  const [obLoading, setObLoading] = useState(true)

  useEffect(() => {
    const fetchOrderbook = async () => {
      try {
        const res = await axios.get(`${API_BASE}/products/orderbook?symbol=${trade.symbol}`)
        setOrderbook(res.data)
      } catch (err) {
        console.error('Error fetching orderbook:', err)
      } finally {
        setObLoading(false)
      }
    }
    fetchOrderbook()
  }, [trade.symbol])

  if (!trade) return null

  const entryDate = new Date(trade.entry_time)
  const exitDate = new Date(trade.exit_time)
  const holdDurationMs = exitDate.getTime() - entryDate.getTime()
  const holdHours = Math.floor(holdDurationMs / (1000 * 60 * 60))
  const holdMinutes = Math.floor((holdDurationMs % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative border rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'
            }`}>
              {trade.direction === 'long' ? (
                <TrendingUp className={theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'} size={24} />
              ) : (
                <TrendingDown className="text-orange-500" size={24} />
              )}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-zinc-900'
              }`}>{trade.symbol}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  trade.direction === 'long' 
                    ? (theme === 'dark' ? 'bg-zinc-850 text-zinc-300' : 'bg-zinc-100 text-zinc-700')
                    : 'bg-orange-500/10 text-orange-500'
                }`}>
                  {trade.direction}
                </span>
                {trade.session && (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    theme === 'dark' 
                      ? 'bg-zinc-900 text-zinc-500 border-zinc-800' 
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                  }`}>
                    {trade.session} SESSION
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Trade Metrics */}
          <div className="space-y-6">
            <div className={`text-center py-6 rounded-xl ${
              trade.is_winner 
                ? (theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50 border border-emerald-200/50') 
                : (theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50 border border-red-200/50')
            }`}>
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {trade.is_winner ? 'Profit' : 'Loss'}
              </div>
              <div className={`text-4xl font-black ${
                trade.net_profit >= 0 ? 'winner' : 'loser'
              }`}>
                {format(Math.abs(trade.net_profit))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 border rounded-xl ${
                theme === 'dark' ? 'bg-zinc-900/50 border-transparent' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className={`text-xs mb-1 flex items-center gap-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <ArrowRight size={12} className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'} /> Entry Price
                </div>
                <div className={`text-lg font-bold font-mono ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                  {format(trade.avg_entry)}
                </div>
                <div className="text-xs text-zinc-500 mt-1 flex justify-between">
                  <span>Size: {trade.size}</span>
                  {trade.risk_pct > 0 && <span className="text-amber-600 font-bold">Risk: {trade.risk_pct}%</span>}
                </div>
              </div>

              <div className={`p-4 border rounded-xl flex flex-col justify-between ${
                theme === 'dark' ? 'bg-zinc-900/50 border-transparent' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div>
                  <div className={`text-xs mb-1 flex items-center gap-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <ArrowRight size={12} className="text-emerald-500 transform rotate-180" /> Exit Price
                  </div>
                  <div className={`font-bold font-mono ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                    {trade.events && trade.events.filter((e: any) => e.event_type.includes('EXIT')).length > 1 ? (
                      <div className="space-y-1 my-1">
                        {trade.events.filter((e: any) => e.event_type.includes('EXIT')).map((e: any, i: number) => {
                          const avgEntryNotionalPerUnit = trade.entry_notional / trade.size
                          const exitPnl = trade.direction === 'long' 
                            ? (e.notional - (avgEntryNotionalPerUnit * e.size))
                            : ((avgEntryNotionalPerUnit * e.size) - e.notional)
                          
                          return (
                            <div key={i} className={`text-[11px] flex justify-between gap-3 border-b pb-1 last:border-0 ${
                              theme === 'dark' ? 'border-zinc-800/30' : 'border-zinc-200/50'
                            }`}>
                              <div className="flex flex-col">
                                <span className="text-zinc-500 font-medium">{e.size} units @</span>
                                <span className={theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}>{format(e.price)}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] text-zinc-500 uppercase font-black">P&L</span>
                                <div className={`font-bold ${exitPnl >= 0 ? 'winner' : 'loser'}`}>
                                  {format(Math.abs(exitPnl))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div className={`pt-1 text-[9px] flex justify-between uppercase font-black tracking-tighter ${
                          theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                          <span>Effective Avg</span>
                          <span>{format(trade.avg_exit)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-lg">{format(trade.avg_exit)}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {trade.result}
                </div>
              </div>
            </div>

            {(trade.stop_loss > 0 || trade.take_profit > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {trade.stop_loss > 0 && (
                  <div className={`px-4 py-2 border rounded-lg ${
                    theme === 'dark' ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50/30 border-red-200'
                  }`}>
                    <div className="text-[10px] text-zinc-500 uppercase font-black">Stop Loss</div>
                    <div className="text-sm font-mono text-red-500">{format(trade.stop_loss)}</div>
                  </div>
                )}
                {trade.take_profit > 0 && (
                  <div className={`px-4 py-2 border rounded-lg ${
                    theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/30 border-emerald-200'
                  }`}>
                    <div className="text-[10px] text-zinc-500 uppercase font-black">Take Profit</div>
                    <div className="text-sm font-mono text-emerald-600">{format(trade.take_profit)}</div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className={`flex items-center gap-3 p-3 border rounded-lg ${
                theme === 'dark' ? 'bg-zinc-900/30 border-transparent' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <Calendar size={16} className="text-zinc-500" />
                <div>
                  <div className="text-xs text-zinc-500">Entry Date</div>
                  <div className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'}`}>
                    {entryDate.toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 border rounded-lg ${
                theme === 'dark' ? 'bg-zinc-900/30 border-transparent' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <Calendar size={16} className="text-zinc-500" />
                <div>
                  <div className="text-xs text-zinc-500">Exit Date</div>
                  <div className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'}`}>
                    {exitDate.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 border rounded-lg ${
              theme === 'dark' ? 'bg-zinc-900/30 border-transparent' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <Clock size={16} className="text-zinc-500" />
              <div>
                <div className="text-xs text-zinc-500">Holding Duration</div>
                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'}`}>
                  {holdHours > 0 ? `${holdHours}h ` : ''}{holdMinutes}m
                </div>
              </div>
            </div>

            <div className={`border-t pt-4 space-y-3 ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="flex justify-between text-sm">
                <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>Gross P&L</span>
                <span className={`font-mono ${trade.gross_profit >= 0 ? 'winner' : 'loser'}`}>
                  {format(Math.abs(trade.gross_profit))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>Total Fees (incl GST)</span>
                <span className={`font-mono ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-770'}`}>-{format(Math.abs(trade.fees))}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className={`font-bold ${theme === 'dark' ? 'text-zinc-450' : 'text-zinc-800'}`}>Net P&L</span>
                <span className={`font-mono font-bold ${trade.net_profit >= 0 ? 'winner' : 'loser'}`}>
                  {format(Math.abs(trade.net_profit))}
                </span>
              </div>
              {trade.strategy && (
                <div className="flex justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>Strategy</span>
                  <span className={`font-mono ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-850'}`}>{trade.strategy}</span>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column: Live Orderbook Depth & Execution Overlay */}
          <div className={`p-6 border rounded-2xl flex flex-col h-full ${
            theme === 'dark' ? 'bg-zinc-900/30 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              <BookOpen size={14} /> Live Orderbook Depth
            </h3>
            
            {obLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-550" />
                <span className="text-[10px] text-zinc-500 mt-2 font-bold uppercase">Streaming live depth...</span>
              </div>
            ) : orderbook ? (
              <div className="flex-1 flex flex-col justify-between font-mono text-[11px] space-y-4">
                {/* Sells (Asks) - Render in reverse order to place highest ask on top */}
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-black tracking-widest text-zinc-500 mb-1">Asks (Sells)</div>
                  {[...(orderbook.sell || [])].slice(0, 5).reverse().map((ask: any, idx: number) => {
                    const price = parseFloat(ask.price);
                    const isEntryClose = Math.abs(price - trade.avg_entry) / trade.avg_entry < 0.005;
                    const isExitClose = trade.avg_exit && Math.abs(price - trade.avg_exit) / trade.avg_exit < 0.005;
                    
                    return (
                      <div key={idx} className="relative flex justify-between py-1.5 px-2 rounded hover:bg-zinc-800/20 group">
                        <div 
                          className="absolute inset-y-0 right-0 bg-red-500/5 transition-all" 
                          style={{ width: `${Math.min(100, (ask.size / 5) * 100)}%` }} 
                        />
                        <span className="text-red-400 z-10">{format(price)}</span>
                        <span className="text-zinc-400 z-10">{ask.size}</span>
                        {(isEntryClose || isExitClose) && (
                          <span className={`absolute left-2 text-[8px] font-black uppercase px-1 py-0.5 rounded z-20 ${
                            isEntryClose ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {isEntryClose ? 'Entry' : 'Exit'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Current Spread Display */}
                <div className="py-2 border-y border-zinc-800/30 text-center flex flex-col items-center">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Spread</span>
                  <span className="text-xs font-bold text-zinc-200">
                    {orderbook.sell && orderbook.buy ? format(Math.abs(parseFloat(orderbook.sell[0]?.price) - parseFloat(orderbook.buy[0]?.price))) : 'N/A'}
                  </span>
                </div>

                {/* Buys (Bids) */}
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-black tracking-widest text-zinc-500 mb-1">Bids (Buys)</div>
                  {(orderbook.buy || []).slice(0, 5).map((bid: any, idx: number) => {
                    const price = parseFloat(bid.price);
                    const isEntryClose = Math.abs(price - trade.avg_entry) / trade.avg_entry < 0.005;
                    const isExitClose = trade.avg_exit && Math.abs(price - trade.avg_exit) / trade.avg_exit < 0.005;

                    return (
                      <div key={idx} className="relative flex justify-between py-1.5 px-2 rounded hover:bg-zinc-800/20 group">
                        <div 
                          className="absolute inset-y-0 right-0 bg-emerald-500/5 transition-all" 
                          style={{ width: `${Math.min(100, (bid.size / 5) * 100)}%` }} 
                        />
                        <span className="text-emerald-400 z-10">{format(price)}</span>
                        <span className="text-zinc-400 z-10">{bid.size}</span>
                        {(isEntryClose || isExitClose) && (
                          <span className={`absolute left-2 text-[8px] font-black uppercase px-1 py-0.5 rounded z-20 ${
                            isEntryClose ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {isEntryClose ? 'Entry' : 'Exit'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Execution Overlay Info */}
                <div className="pt-2 text-[9px] leading-relaxed text-zinc-500 border-t border-zinc-800/30">
                  <div className="flex justify-between">
                    <span>Avg Entry:</span>
                    <span className="font-bold text-zinc-350">{format(trade.avg_entry)}</span>
                  </div>
                  {trade.avg_exit > 0 && (
                    <div className="flex justify-between mt-1">
                      <span>Avg Exit:</span>
                      <span className="font-bold text-zinc-355">{format(trade.avg_exit)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-zinc-550 italic text-xs text-center py-12">Failed to retrieve book depth.</div>
            )}
          </div>

          {/* Right Column: Journal & Notes */}

          <div className="space-y-6 flex flex-col h-full">
            <div className="space-y-6">
              <div className={`p-6 border rounded-2xl ${
                theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                }`}>
                  <Target size={14} /> Pre-Trade Plan
                </h3>
                {trade.pre_plan ? (
                  <p className={`italic leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-750'}`}>
                    "{trade.pre_plan}"
                  </p>
                ) : (
                  <p className="text-zinc-500 italic">No pre-trade plan recorded.</p>
                )}
              </div>

              <div className={`p-6 border rounded-2xl ${
                theme === 'dark' ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                }`}>
                  <BookOpen size={14} /> Trade Journal & Notes
                </h3>
                {trade.notes ? (
                  <div className={`whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-750'}`}>
                    {trade.notes}
                  </div>
                ) : (
                  <p className="text-zinc-500 italic">No notes recorded for this trade.</p>
                )}
                {trade.mistakes && (
                  <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                    <h4 className="text-[10px] font-black uppercase text-rose-500 mb-2">Mistakes / Deviations</h4>
                    <div className="flex flex-wrap gap-2">
                      {trade.mistakes.split(',').map((m: string) => (
                        <span key={m} className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {m.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Screenshots Card */}
              {trade.screenshots && trade.screenshots.length > 0 && (
                <div className={`p-6 border rounded-2xl ${
                  theme === 'dark' ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                  }`}>
                    <ImageIcon size={14} /> Trade Screenshots
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {trade.screenshots.map((s: any) => {
                      const BACKEND_URL = API_BASE.replace('/api', '')
                      const imageUrl = s.image_path.startsWith('http') ? s.image_path : `${BACKEND_URL}${s.image_path}`
                      return (
                        <a 
                          key={s.id} 
                          href={imageUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800/80 dark:border-zinc-805 hover:border-zinc-500 transition-all group"
                        >
                          <img 
                            src={imageUrl} 
                            alt="Screenshot" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4">
              <button
                onClick={onReview}
                className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl transition-all font-black uppercase tracking-widest group border ${
                  theme === 'dark' 
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-transparent shadow' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white border-transparent shadow-lg hover:shadow-xl'
                }`}
              >
                <BookOpen size={18} className="group-hover:scale-110 transition-transform" />
                <span>{trade.notes ? 'Edit Journal Entry' : 'Add Journal Entry'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}