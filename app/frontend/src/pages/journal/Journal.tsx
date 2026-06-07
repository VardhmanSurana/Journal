import { BookOpen, Plus, Save, X, Calendar, Smile, Frown, Meh, Edit2, Trash2, Brain, Target, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { API_BASE } from '../../config/api'
import { useThemeClasses } from '../../utils/theme'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from '../../utils/dates'

interface TradeReview {
  id: number
  date_str: string
  mood: string
  discipline_score: number
  mistakes: string
  lessons: string
}

interface JournalProps {
  theme: 'dark' | 'light'
  onReview: (trade: any) => void
}

const MOODS = [
  { value: 'great', label: 'Great', icon: Smile, color: 'text-emerald-400' },
  { value: 'good', label: 'Good', icon: Meh, color: 'text-blue-400' },
  { value: 'neutral', label: 'Neutral', icon: Meh, color: 'text-zinc-400' },
  { value: 'bad', label: 'Bad', icon: Frown, color: 'text-orange-400' },
  { value: 'terrible', label: 'Terrible', icon: Frown, color: 'text-rose-400' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 260, 
      damping: 22 
    } 
  }
}

export const Journal = ({ theme, onReview }: JournalProps) => {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean
    id: number | null
    title: string
    message: string
  }>({
    show: false,
    id: null,
    title: '',
    message: ''
  })
  const { bgClass, textClass, cardBgClass, subTextClass } = useThemeClasses(theme)

  const hasJournalData = (t: any) =>
    t.notes || t.pre_plan || t.strategy || t.emotion || t.session || t.mistakes

  const journaledTrades = trades.filter(hasJournalData)
  const sortedJournaledTrades = [...journaledTrades].sort(
    (a, b) => new Date(b.exit_time).getTime() - new Date(a.exit_time).getTime()
  )

  const fetchTrades = async () => {
    try {
      const res = await axios.get(`${API_BASE}/trades`)
      setTrades(res.data)
    } catch (err) {
      console.error('Error fetching trades:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleDeleteTrade = (tradeId: number) => {
    setDeleteConfirm({
      show: true,
      id: tradeId,
      title: 'Delete Trade Review',
      message: 'Are you sure you want to delete this trade entirely? This will remove all review notes, emotions, mistakes, screenshots, and the trade record.'
    })
  }

  const executeDelete = async () => {
    const { id } = deleteConfirm
    if (id === null) return
    try {
      await axios.delete(`${API_BASE}/trades/${id}`)
      await fetchTrades()
    } catch (err) {
      console.error('Error deleting trade:', err)
    } finally {
      setDeleteConfirm({ show: false, id: null, title: '', message: '' })
    }
  }

  if (loading) {
    return <SkeletonLoader variant="journal" theme={theme} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${textClass}`}>Trade Reviews</h2>
          <p className={`text-sm ${subTextClass}`}>Review and track each completed trade</p>
        </div>
      </div>

      {/* Trades to Review Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-black uppercase tracking-widest ${subTextClass}`}>
            Trades to Review
          </h3>
          <span className="text-[10px] text-zinc-500">{trades.length} trades found</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trades.filter(t => !hasJournalData(t)).slice(0, 6).map(trade => (
            <motion.button
              key={trade.id}
              onClick={() => onReview(trade)}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`${bgClass} border rounded-xl p-4 text-left transition-all group ${
                theme === 'dark' 
                  ? 'border-zinc-800 hover:border-zinc-600' 
                  : 'border-zinc-200 hover:border-zinc-300 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className={`text-sm font-bold ${textClass}`}>{trade.symbol}</div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">
                    {trade.direction} · {formatDate(trade.exit_time)}
                  </div>
                </div>
                <div className={`text-xs font-bold ${trade.net_profit >= 0 ? 'winner' : 'loser'}`}>
                  ${trade.net_profit.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-[10px] text-zinc-500 italic">
                  {trade.notes ? 'Already journaled' : 'Pending review...'}
                </div>
                <div className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-950' 
                    : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200 group-hover:text-zinc-900'
                }`}>
                  <Edit2 size={14} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Trade Reviews Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-black uppercase tracking-widest ${subTextClass}`}>
            Trade Reviews
          </h3>
          <span className="text-[10px] text-zinc-500">{sortedJournaledTrades.length} reviews saved</span>
        </div>
        
        {sortedJournaledTrades.length === 0 ? (
          <div className={`${bgClass} rounded-xl border p-12 text-center ${
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
          }`}>
            <BookOpen size={40} className={`mx-auto mb-4 ${subTextClass}`} />
            <p className={`${subTextClass}`}>No trade reviews yet. Select a pending trade above to write your first review!</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {sortedJournaledTrades.map(trade => (
              <motion.div 
                key={trade.id} 
                variants={itemVariants} 
                className={`${bgClass} rounded-xl border p-6 space-y-4 ${
                  theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${cardBgClass}`}>
                      <Brain size={20} className={theme === 'dark' ? 'text-purple-400' : 'text-purple-700'} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-lg font-bold ${textClass}`}>{trade.symbol}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          trade.direction === 'long' 
                            ? (theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700')
                            : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {trade.direction}
                        </span>
                        {trade.strategy && (
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            theme === 'dark' ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-zinc-100 text-zinc-650 shadow-sm'
                          }`}>
                            {trade.strategy}
                          </span>
                        )}
                        {trade.session && (
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            theme === 'dark' ? 'bg-zinc-900 text-zinc-500 border border-zinc-850' : 'bg-zinc-50 text-zinc-500 border border-zinc-200 shadow-sm'
                          }`}>
                            {trade.session} SESSION
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${subTextClass} mt-1`}>
                        Closed · {formatDate(trade.exit_time, 'full')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Net Return</div>
                      <div className={`text-xl font-bold flex items-center gap-1 ${trade.net_profit >= 0 ? 'winner' : 'loser'}`}>
                        {trade.net_profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        ${Math.abs(trade.net_profit).toFixed(2)}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => onReview(trade)}
                      className={`p-2 rounded-lg ${cardBgClass} transition-colors ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600 shadow-sm'}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTrade(trade.id)}
                      className={`p-2 rounded-lg ${cardBgClass} transition-colors ${theme === 'dark' ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-500'}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Plans & Notes */}
                  <div className="md:col-span-2 space-y-4">
                    {trade.pre_plan && (
                      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-zinc-900/40' : 'bg-zinc-50'}`}>
                        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                          <Target size={12} className="text-purple-500" /> Pre-Trade Plan
                        </div>
                        <p className={`text-xs italic leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          "{trade.pre_plan}"
                        </p>
                      </div>
                    )}
                    
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-zinc-900/20' : 'bg-zinc-100/50'}`}>
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1">
                        <BookOpen size={12} className="text-emerald-500" /> Post-Trade Notes
                      </div>
                      <p className={`text-xs whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {trade.notes}
                      </p>
                    </div>
                  </div>

                  {/* Mindset, Emotions & Score gauges */}
                  <div className={`p-4 rounded-lg space-y-4 ${theme === 'dark' ? 'bg-zinc-900/30' : 'bg-zinc-50/50'}`}>
                    <div className="grid grid-cols-2 gap-4">
                      {trade.emotion && (
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Emotion</div>
                          <div className="flex flex-wrap gap-1">
                            {trade.emotion.split(',').map((e: string) => (
                              <span key={e} className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                theme === 'dark' 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-100'
                              }`}>
                                {e.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {trade.discipline_score !== null && (
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Discipline</div>
                          <span className={`text-xs font-bold ${
                            trade.discipline_score >= 8 
                              ? 'text-emerald-500 font-bold' 
                              : trade.discipline_score >= 5 
                                ? 'text-blue-500 font-bold' 
                                : 'text-rose-500 font-bold'
                          }`}>
                            {trade.discipline_score}/10
                          </span>
                        </div>
                      )}
                    </div>

                    {trade.mistakes && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1.5">Mistakes</div>
                        <div className="flex flex-wrap gap-1.5">
                          {trade.mistakes.split(',').map((m: string) => (
                            <span key={m} className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              theme === 'dark' 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' 
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {m.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Screenshot Thumbnails if present */}
                {trade.screenshots && trade.screenshots.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {trade.screenshots.map((s: any) => {
                      const imageUrl = s.image_path.startsWith('http') ? s.image_path : `${API_BASE.replace('/api', '')}${s.image_path}`
                      return (
                        <a 
                          key={s.id} 
                          href={imageUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-24 aspect-video rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-550 transition-all flex-shrink-0"
                        >
                          <img src={imageUrl} alt="chart" className="w-full h-full object-cover" />
                        </a>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {deleteConfirm.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`w-full max-w-md p-6 rounded-2xl border ${
                theme === 'dark' 
                  ? 'bg-zinc-900 border-zinc-800 text-white shadow-2xl' 
                  : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
              }`}
            >
              <div className="flex items-center gap-3 mb-4 text-rose-500">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-black uppercase tracking-wider">{deleteConfirm.title}</h3>
              </div>
              
              <p className={`text-sm leading-relaxed mb-6 ${
                theme === 'dark' ? 'text-zinc-300' : 'text-zinc-650'
              }`}>
                {deleteConfirm.message}
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, id: null, title: '', message: '' })}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                    theme === 'dark' 
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg hover:shadow-rose-600/20 transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
