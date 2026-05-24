import { BookOpen, Plus, Save, X, Calendar, Smile, Frown, Meh, Edit2, Trash2, Brain, Target, TrendingUp, TrendingDown } from 'lucide-react'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { API_BASE } from '../../config/api'
import { useThemeClasses } from '../../utils/theme'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { motion, AnimatePresence } from 'framer-motion'

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
  trades: any[]
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

export const Journal = ({ theme, trades, onReview }: JournalProps) => {
  const [reviews, setReviews] = useState<TradeReview[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingReview, setEditingReview] = useState<Partial<TradeReview> | null>(null)
  const { bgClass, textClass, cardBgClass, subTextClass } = useThemeClasses(theme)

  const journaledTrades = trades.filter(t => t.notes)
  const sortedJournaledTrades = [...journaledTrades].sort(
    (a, b) => new Date(b.exit_time).getTime() - new Date(a.exit_time).getTime()
  )

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reviews`)
      setReviews(res.data)
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    const interval = setInterval(fetchReviews, 10000)
    return () => clearInterval(interval)
  }, [trades])

  const handleNewReview = () => {
    setEditingReview({
      date_str: new Date().toISOString().split('T')[0],
      mood: 'neutral',
      discipline_score: 5,
      mistakes: '',
      lessons: ''
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingReview) return

    try {
      const res = await axios.post(`${API_BASE}/reviews`, {
        date_str: editingReview.date_str,
        mood: editingReview.mood,
        discipline_score: editingReview.discipline_score,
        mistakes: editingReview.mistakes,
        lessons: editingReview.lessons
      })
      
      console.log('Save response:', res.data)
      await fetchReviews()
      setIsEditing(false)
      setEditingReview(null)
      alert('Journal entry saved successfully!')
    } catch (err: any) {
      console.error('Error saving review:', err)
      alert(`Failed to save journal: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    try {
      await axios.delete(`${API_BASE}/reviews/${id}`)
      await fetchReviews()
    } catch (err) {
      console.error('Error deleting review:', err)
    }
  }

  const getMoodData = (moodValue: string) => {
    return MOODS.find(m => m.value === moodValue) || MOODS[2]
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
          {trades.filter(t => !t.notes).slice(0, 6).map(trade => (
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
                    {trade.direction} · {new Date(trade.exit_time).toLocaleDateString()}
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

      {/* Journaled Trade Reflections Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-black uppercase tracking-widest ${subTextClass}`}>
            Journaled Trade Reflections
          </h3>
          <span className="text-[10px] text-zinc-500">{sortedJournaledTrades.length} entries saved</span>
        </div>
        
        {sortedJournaledTrades.length === 0 ? (
          <div className={`${bgClass} rounded-xl border p-12 text-center ${
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
          }`}>
            <BookOpen size={40} className={`mx-auto mb-4 ${subTextClass}`} />
            <p className={`${subTextClass}`}>No trades journaled yet. Select a pending trade above to write your first reflection entry!</p>
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
                        Closed · {new Date(trade.exit_time).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
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
                          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Emotion</div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            theme === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {trade.emotion}
                          </span>
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
        {isEditing && editingReview && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -15 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className={`${bgClass} rounded-xl border p-6 overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${textClass}`}>
                {editingReview.id ? 'Edit Entry' : 'New Entry'}
              </h3>
              <button onClick={() => { setIsEditing(false); setEditingReview(null) }} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Date</label>
                <input
                  type="date"
                  value={editingReview.date_str || ''}
                  onChange={(e) => setEditingReview({ ...editingReview, date_str: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-zinc-850 border-zinc-700 text-white' 
                      : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Mood</label>
                <div className="flex gap-2">
                  {MOODS.map(mood => {
                    const Icon = mood.icon
                    return (
                      <motion.button
                        key={mood.value}
                        onClick={() => setEditingReview({ ...editingReview, mood: mood.value })}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`flex-1 p-3 rounded-lg border transition-all ${
                          editingReview.mood === mood.value
                            ? theme === 'dark'
                              ? 'border-zinc-400 bg-zinc-800 font-bold'
                              : 'border-zinc-600 bg-zinc-100 font-bold'
                            : theme === 'dark' 
                              ? 'border-zinc-700 bg-zinc-850 hover:bg-zinc-800' 
                              : 'border-zinc-200 bg-white hover:bg-zinc-50'
                        }`}
                      >
                        <Icon className={`mx-auto mb-1 ${mood.color}`} size={20} />
                        <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{mood.label}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Discipline Score: {editingReview.discipline_score}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editingReview.discipline_score || 5}
                  onChange={(e) => setEditingReview({ ...editingReview, discipline_score: parseInt(e.target.value) })}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`}
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>Poor</span>
                  <span>Perfect</span>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Mistakes</label>
                  <textarea
                    value={editingReview.mistakes || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, mistakes: e.target.value })}
                    placeholder="What mistakes did you make today?"
                    rows={4}
                    className={`w-full p-3 rounded-lg border resize-none ${
                      theme === 'dark' 
                        ? 'bg-zinc-850 border-zinc-700 text-white placeholder-zinc-500' 
                        : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Lessons</label>
                  <textarea
                    value={editingReview.lessons || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, lessons: e.target.value })}
                    placeholder="What did you learn today?"
                    rows={4}
                    className={`w-full p-3 rounded-lg border resize-none ${
                      theme === 'dark' 
                        ? 'bg-zinc-850 border-zinc-700 text-white placeholder-zinc-500' 
                        : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setIsEditing(false); setEditingReview(null) }}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-500 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSave}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950' 
                    : 'bg-zinc-900 hover:bg-zinc-850 text-white shadow-sm'
                }`}
              >
                <Save size={18} />
                <span>Save Entry</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {reviews.length === 0 ? (
          null
        ) : (
          reviews.map(review => {
            const moodData = getMoodData(review.mood)
            const MoodIcon = moodData.icon
            return (
              <motion.div key={review.id} variants={itemVariants} className={`${bgClass} rounded-xl border p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${cardBgClass}`}>
                      <Calendar size={20} className={moodData.color} />
                    </div>
                    <div>
                      <div className={`text-lg font-semibold ${textClass}`}>
                        {new Date(review.date_str).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <MoodIcon className={moodData.color} size={14} />
                        <span className={`text-sm ${subTextClass}`}>{moodData.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="text-xs text-zinc-500">Discipline Score</div>
                      <div className={`text-xl font-bold ${
                        review.discipline_score >= 8 
                          ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                          : review.discipline_score >= 5 
                            ? theme === 'dark' ? 'text-blue-400' : 'text-blue-700' 
                            : theme === 'dark' ? 'text-rose-400' : 'text-rose-700'
                      }`}>
                        {review.discipline_score}/10
                      </div>
                    </div>
                    <button 
                      onClick={() => { setEditingReview(review); setIsEditing(true) }}
                      className={`p-2 rounded-lg ${cardBgClass} transition-colors ${theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
                    >
                      <Edit2 size={16} className="text-zinc-400" />
                    </button>
                    <button 
                      onClick={() => handleDelete(review.id)}
                      className={`p-2 rounded-lg ${cardBgClass} transition-colors ${theme === 'dark' ? 'hover:bg-rose-500/20' : 'hover:bg-rose-100'}`}
                    >
                      <Trash2 size={16} className="text-rose-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {review.mistakes && (
                    <div>
                      <div className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                        <X size={12} className="text-rose-400" /> Mistakes
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {review.mistakes}
                      </p>
                    </div>
                  )}
                  {review.lessons && (
                    <div>
                      <div className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                        <BookOpen size={12} className="text-emerald-400" /> Lessons
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {review.lessons}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>
    </div>
  )
}
