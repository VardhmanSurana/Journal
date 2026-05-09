import { useState } from 'react'
import { BookOpen, Plus, Save, X, Calendar, Smile, Frown, Meh, Edit2, Trash2 } from 'lucide-react'

interface DailyReview {
  id: number
  date_str: string
  mood: string
  discipline_score: number
  mistakes: string
  lessons: string
}

interface DailyReviewsProps {
  theme: 'dark' | 'light'
}

const MOODS = [
  { value: 'great', label: 'Great', icon: Smile, color: 'text-emerald-400' },
  { value: 'good', label: 'Good', icon: Meh, color: 'text-blue-400' },
  { value: 'neutral', label: 'Neutral', icon: Meh, color: 'text-zinc-400' },
  { value: 'bad', label: 'Bad', icon: Frown, color: 'text-orange-400' },
  { value: 'terrible', label: 'Terrible', icon: Frown, color: 'text-rose-400' },
]

export const DailyReviews = ({ theme }: DailyReviewsProps) => {
  const [reviews, setReviews] = useState<DailyReview[]>([
    { id: 1, date_str: '2024-01-15', mood: 'good', discipline_score: 8, mistakes: 'Overtrading, revenge trading', lessons: 'Sticked to my plan for first 3 trades' },
    { id: 2, date_str: '2024-01-14', mood: 'neutral', discipline_score: 6, mistakes: 'Ignored stop loss', lessons: 'Need better risk management' },
    { id: 3, date_str: '2024-01-13', mood: 'great', discipline_score: 9, mistakes: '', lessons: 'Perfect execution on breakout strategy' },
  ])

  const [isEditing, setIsEditing] = useState(false)
  const [editingReview, setEditingReview] = useState<Partial<DailyReview> | null>(null)

  const bgClass = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
  const textClass = theme === 'dark' ? 'text-white' : 'text-zinc-900'
  const cardBgClass = theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50'
  const subTextClass = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'

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

  const handleSave = () => {
    if (!editingReview) return

    if (editingReview.id) {
      setReviews(reviews.map(r => r.id === editingReview.id ? { ...r, ...editingReview } as DailyReview : r))
    } else {
      const newReview: DailyReview = {
        id: Date.now(),
        date_str: editingReview.date_str || '',
        mood: editingReview.mood || 'neutral',
        discipline_score: editingReview.discipline_score || 5,
        mistakes: editingReview.mistakes || '',
        lessons: editingReview.lessons || ''
      }
      setReviews([newReview, ...reviews])
    }
    setIsEditing(false)
    setEditingReview(null)
  }

  const handleDelete = (id: number) => {
    setReviews(reviews.filter(r => r.id !== id))
  }

  const getMoodData = (moodValue: string) => {
    return MOODS.find(m => m.value === moodValue) || MOODS[2]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${textClass}`}>Daily Trading Journal</h2>
          <p className={`text-sm ${subTextClass}`}>Track your mental state and daily performance</p>
        </div>
        <button
          onClick={handleNewReview}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>New Entry</span>
        </button>
      </div>

      {isEditing && editingReview && (
        <div className={`${bgClass} rounded-xl border p-6 animate-in fade-in slide-in-from-top-4`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${textClass}`}>
              {editingReview.id ? 'Edit Entry' : 'New Entry'}
            </h3>
            <button onClick={() => { setIsEditing(false); setEditingReview(null) }} className="p-2 hover:bg-zinc-800 rounded-lg">
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
                    ? 'bg-zinc-800 border-zinc-700 text-white' 
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
                    <button
                      key={mood.value}
                      onClick={() => setEditingReview({ ...editingReview, mood: mood.value })}
                      className={`flex-1 p-3 rounded-lg border transition-all ${
                        editingReview.mood === mood.value
                          ? 'border-zinc-400 bg-zinc-800'
                          : theme === 'dark' 
                            ? 'border-zinc-700 bg-zinc-800' 
                            : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <Icon className={`mx-auto mb-1 ${mood.color}`} size={20} />
                      <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{mood.label}</span>
                    </button>
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
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
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
                      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' 
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
                      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' 
                      : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setIsEditing(false); setEditingReview(null) }}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg transition-colors"
            >
              <Save size={18} />
              <span>Save Entry</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className={`${bgClass} rounded-xl border p-12 text-center`}>
            <BookOpen size={48} className={`mx-auto mb-4 ${subTextClass}`} />
            <p className={`${subTextClass}`}>No daily reviews yet. Start journaling to track your progress!</p>
          </div>
        ) : (
          reviews.map(review => {
            const moodData = getMoodData(review.mood)
            const MoodIcon = moodData.icon
            return (
              <div key={review.id} className={`${bgClass} rounded-xl border p-6`}>
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
                        review.discipline_score >= 8 ? 'text-emerald-400' :
                        review.discipline_score >= 5 ? 'text-blue-400' : 'text-rose-400'
                      }`}>
                        {review.discipline_score}/10
                      </div>
                    </div>
                    <button 
                      onClick={() => { setEditingReview(review); setIsEditing(true) }}
                      className={`p-2 rounded-lg ${cardBgClass} hover:bg-zinc-700`}
                    >
                      <Edit2 size={16} className="text-zinc-400" />
                    </button>
                    <button 
                      onClick={() => handleDelete(review.id)}
                      className={`p-2 rounded-lg ${cardBgClass} hover:bg-rose-500/20`}
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
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}