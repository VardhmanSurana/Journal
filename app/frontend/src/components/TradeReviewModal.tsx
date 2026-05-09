import { X, Save, Target, Brain, Clock, BookOpen } from 'lucide-react'
import { useState } from 'react'

interface TradeReviewModalProps {
  trade: any
  onClose: () => void
  onSave: (updates: any) => void
}

const SESSIONS = ['Asia', 'London', 'NY', 'Pre-London', 'Post-London']

const STRATEGIES = [
  'Breakout',
  'Reversal',
  'Trend Follow',
  'Scalp',
  'Range Trade',
  'News Play',
  'Gap Fill',
  'Support/Resistance',
  'Moving Average',
  'Other'
]

const EMOTIONS = [
  'Confident',
  'Calm',
  'Focused',
  'FOMO',
  'Revenge',
  'Fearful',
  'Anxious',
  'Overconfident',
  'Frustrated',
  'Bored'
]

const MISTAKES = [
  'Overtrading',
  'Revenge trading',
  'Ignored stop loss',
  'No trade plan',
  'Size too large',
  'Early exit',
  'Late entry',
  'Chasing price',
  'FOMO entry',
  'Holding too long',
  'Cutting winners early',
  'Not following rules',
  'Emotional trading',
  'Trading on tilt',
  'Poor risk management'
]

export const TradeReviewModal = ({ trade, onClose, onSave }: TradeReviewModalProps) => {
  const [strategy, setStrategy] = useState(trade.strategy || '')
  const [emotion, setEmotion] = useState(trade.emotion || '')
  const [session, setSession] = useState(trade.session || '')
  const [notes, setNotes] = useState(trade.notes || '')
  const [prePlan, setPrePlan] = useState(trade.pre_plan || '')
  const [riskPct, setRiskPct] = useState(trade.risk_pct || 1)
  const [stopLoss, setStopLoss] = useState(trade.stop_loss || 0)
  const [takeProfit, setTakeProfit] = useState(trade.take_profit || 0)
  const [disciplineScore, setDisciplineScore] = useState(trade.discipline_score || 5)
  const [confidenceScore, setConfidenceScore] = useState(trade.confidence_score || 5)
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>(
    trade.mistakes ? trade.mistakes.split(',').map(m => m.trim()) : []
  )

  const handleSave = () => {
    const updates = {
      strategy: strategy || null,
      emotion: emotion || null,
      session: session || null,
      notes: notes || null,
      pre_plan: prePlan || null,
      risk_pct: riskPct,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      mistakes: selectedMistakes.length > 0 ? selectedMistakes.join(', ') : null,
      discipline_score: disciplineScore,
      confidence_score: confidenceScore
    }
    onSave(updates)
    onClose()
  }

  const insertPrompt = (prompt: string) => {
    setNotes(prev => prev ? `${prev}\n\n${prompt}: ` : `${prompt}: `)
  }

  const toggleMistake = (mistake: string) => {
    setSelectedMistakes(prev => 
      prev.includes(mistake) 
        ? prev.filter(m => m !== mistake)
        : [...prev, mistake]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Brain className="text-zinc-100" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Advanced Trade Journaling</h2>
              <p className="text-sm text-zinc-400">{trade.symbol} - {trade.direction.toUpperCase()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Section 1: Pre-Trade Plan & Risk */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Target size={14} /> Planning & Risk Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Pre-Trade Plan</label>
                <textarea
                  value={prePlan}
                  onChange={(e) => setPrePlan(e.target.value)}
                  placeholder="What was the reason for entry? What are the exit rules?"
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Risk %</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={riskPct}
                      onChange={(e) => setRiskPct(parseFloat(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-zinc-200"
                    />
                    <span className="absolute right-3 top-2 text-zinc-600 font-bold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Stop Loss</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Take Profit</label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                <Target size={14} /> Strategy
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200"
              >
                <option value="">Select strategy...</option>
                {STRATEGIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                <Clock size={14} /> Trading Session
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200"
              >
                <option value="">Select session...</option>
                {SESSIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
              <Brain size={14} /> Emotion During Trade
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmotion(emotion === e ? '' : e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    emotion === e
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
              <BookOpen size={14} /> Mistakes / Deviations
            </label>
            <div className="flex flex-wrap gap-2">
              {MISTAKES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMistake(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedMistakes.includes(m)
                      ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-transparent'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Discipline Score: {disciplineScore}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={disciplineScore}
                onChange={(e) => setDisciplineScore(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-2 font-bold uppercase">
                <span>Poor</span>
                <span>Perfect</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Confidence Score: {confidenceScore}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={confidenceScore}
                onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-2 font-bold uppercase">
                <span>Doubtful</span>
                <span>Unshakable</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-medium text-zinc-400">Post-Trade Review & Lessons</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => insertPrompt('Rule Adherence')} className="text-[9px] px-2 py-0.5 bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded border border-zinc-800">Rule Check</button>
                <button type="button" onClick={() => insertPrompt('Execution Quality')} className="text-[9px] px-2 py-0.5 bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded border border-zinc-800">Execution</button>
                <button type="button" onClick={() => insertPrompt('Next Time')} className="text-[9px] px-2 py-0.5 bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded border border-zinc-800">Next Steps</button>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was the result? What would you do differently?"
              rows={5}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-zinc-800 sticky bottom-0 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg transition-colors font-bold"
          >
            <Save size={18} />
            <span>Save Review</span>
          </button>
        </div>
      </div>
    </div>
  )
}