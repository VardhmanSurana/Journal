import { X, Save, Target, Brain, Clock, BookOpen, Calculator, Image as ImageIcon, Trash2, Plus, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCurrency } from '../hooks/useCurrency'
import axios from 'axios'
import { API_BASE } from '../config/api'

interface TradeReviewModalProps {
  trade: any
  theme?: 'light' | 'dark'
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

export const TradeReviewModal = ({ trade, theme = 'dark', onClose, onSave }: TradeReviewModalProps) => {
  const { format } = useCurrency()
  const [strategy, setStrategy] = useState(trade.strategy || '')
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(
    trade.emotion ? trade.emotion.split(',').map(e => e.trim()) : []
  )
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

  const [capital, setCapital] = useState<number>(() => {
    const saved = localStorage.getItem('trade_journal_capital')
    return saved ? parseFloat(saved) : 10000
  })

  const [activeTab, setActiveTab] = useState<'setup' | 'mindset' | 'lessons'>('setup')
  const [screenshots, setScreenshots] = useState<any[]>(trade.screenshots || [])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('chart_type', 'chart')
    
    setUploading(true)
    try {
      const res = await axios.post(`${API_BASE}/trades/${trade.id}/screenshots`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setScreenshots(prev => [...prev, res.data.screenshot])
    } catch (err) {
      console.error('Error uploading screenshot:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleScreenshotDelete = async (screenshotId: number) => {
    try {
      await axios.delete(`${API_BASE}/trades/${trade.id}/screenshots/${screenshotId}`)
      setScreenshots(prev => prev.filter(s => s.id !== screenshotId))
    } catch (err) {
      console.error('Error deleting screenshot:', err)
    }
  }

  useEffect(() => {
    localStorage.setItem('trade_journal_capital', capital.toString())
  }, [capital])

  // Calculate stop loss from risk %
  const calculateStopLoss = (rPct: number, cap: number) => {
    if (!trade.avg_entry || !trade.size) return
    const riskAmt = (rPct / 100) * cap
    const priceDist = riskAmt / trade.size
    const newStop = trade.direction === 'long' 
      ? trade.avg_entry - priceDist
      : trade.avg_entry + priceDist
    setStopLoss(Math.max(0, parseFloat(newStop.toFixed(4))))
  }

  // Calculate risk % from stop loss
  const calculateRiskPct = (slPrice: number, cap: number) => {
    if (!trade.avg_entry || !trade.size || cap <= 0) return
    const priceDist = Math.abs(trade.avg_entry - slPrice)
    const riskAmt = priceDist * trade.size
    const newRiskPct = (riskAmt / cap) * 100
    setRiskPct(parseFloat(newRiskPct.toFixed(2)))
  }

  // Auto calculate on load if SL is set but riskPct is default
  useEffect(() => {
    if (trade.stop_loss > 0 && !trade.risk_pct) {
      calculateRiskPct(trade.stop_loss, capital)
    }
  }, [trade.stop_loss, trade.risk_pct])

  const handleStopLossChange = (val: number) => {
    setStopLoss(val)
    calculateRiskPct(val, capital)
  }

  const handleRiskPctChange = (val: number) => {
    setRiskPct(val)
    calculateStopLoss(val, capital)
  }

  const handleCapitalChange = (val: number) => {
    setCapital(val)
    calculateRiskPct(stopLoss, val)
  }

  const handleSave = () => {
    const updates = {
      strategy: strategy || null,
      emotion: selectedEmotions.length > 0 ? selectedEmotions.join(', ') : null,
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

  const toggleEmotion = (emo: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emo)
        ? prev.filter(e => e !== emo)
        : [...prev, emo]
    )
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
      
      <div className={`relative border rounded-2xl w-full max-w-3xl shadow-2xl transition-all ${
        theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'
            }`}>
              <Brain className={theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'} size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-zinc-900'
              }`}>Advanced Trade Journaling</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{trade.symbol} - {trade.direction.toUpperCase()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b px-6 ${
          theme === 'dark' ? 'border-zinc-800 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/50'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'setup'
                ? (theme === 'dark' ? 'border-purple-500 text-purple-400 font-bold' : 'border-purple-600 text-purple-700 font-bold')
                : (theme === 'dark' ? 'border-transparent text-zinc-500 hover:text-zinc-300' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            }`}
          >
            <Target size={14} /> 1. Sizing & Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mindset')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'mindset'
                ? (theme === 'dark' ? 'border-purple-500 text-purple-400 font-bold' : 'border-purple-600 text-purple-700 font-bold')
                : (theme === 'dark' ? 'border-transparent text-zinc-500 hover:text-zinc-300' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            }`}
          >
            <Brain size={14} /> 2. Psychology
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lessons')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'lessons'
                ? (theme === 'dark' ? 'border-purple-500 text-purple-400 font-bold' : 'border-purple-600 text-purple-700 font-bold')
                : (theme === 'dark' ? 'border-transparent text-zinc-500 hover:text-zinc-300' : 'border-transparent text-zinc-500 hover:text-zinc-800')
            }`}
          >
            <BookOpen size={14} /> 3. Review & Notes
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 flex-1 max-h-[60vh] overflow-y-auto">
          {activeTab === 'setup' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                <Target size={14} /> Planning & Risk Management
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4 justify-between">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Pre-Trade Plan</label>
                    <textarea
                      value={prePlan}
                      onChange={(e) => setPrePlan(e.target.value)}
                      placeholder="What was the reason for entry? What are the exit rules?"
                      rows={3}
                      className={`w-full rounded-lg px-3 py-2 resize-none transition-all ${
                        theme === 'dark' 
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:border-zinc-700' 
                          : 'bg-zinc-50 border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Take Profit Price</label>
                    <input
                      type="number"
                      step="any"
                      value={takeProfit || ''}
                      onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                      placeholder="Take Profit Target"
                      className={`w-full rounded-lg px-3 py-2 font-mono transition-all ${
                        theme === 'dark' 
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                          : 'bg-zinc-50 border border-zinc-200 text-zinc-800 focus:border-zinc-400'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  {/* Auto Risk Calculator Component */}
                  <div className={`p-4 rounded-xl border h-full flex flex-col justify-between ${
                    theme === 'dark' 
                      ? 'bg-zinc-900/40 border-zinc-800' 
                      : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          theme === 'dark' ? 'text-zinc-400' : 'text-zinc-700'
                        }`}>
                          <Calculator size={14} className="text-purple-500" /> Auto Risk Calculator
                        </h4>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded tracking-wider ${
                          theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200/60 text-zinc-650'
                        }`}>
                          {trade.direction.toUpperCase()} | Entry: {trade.avg_entry.toFixed(2)} | Size: {trade.size}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                            theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
                          }`}>Total Capital Available</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={capital || ''}
                              onChange={(e) => handleCapitalChange(parseFloat(e.target.value) || 0)}
                              placeholder="Account Balance"
                              className={`w-full rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs transition-all ${
                                theme === 'dark' 
                                  ? 'bg-zinc-950 border border-zinc-850 text-zinc-200 focus:border-zinc-700' 
                                  : 'bg-white border border-zinc-250 text-zinc-800 focus:border-zinc-400'
                              }`}
                            />
                            <span className={`absolute left-3 top-2 text-xs font-bold ${
                              theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'
                            }`}>$</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                              theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
                            }`}>Stop Loss Price</label>
                            <input
                              type="number"
                              step="any"
                              value={stopLoss || ''}
                              onChange={(e) => handleStopLossChange(parseFloat(e.target.value) || 0)}
                              placeholder="Exit Price"
                              className={`w-full rounded-lg px-3 py-1.5 font-mono text-xs transition-all ${
                                theme === 'dark' 
                                  ? 'bg-zinc-950 border border-zinc-850 text-zinc-200 focus:border-zinc-700' 
                                  : 'bg-white border border-zinc-250 text-zinc-800 focus:border-zinc-400'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                              theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
                            }`}>Risk Target %</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={riskPct || ''}
                                onChange={(e) => handleRiskPctChange(parseFloat(e.target.value) || 0)}
                                placeholder="Risk %"
                                className={`w-full rounded-lg pl-3 pr-8 py-1.5 font-mono text-xs transition-all ${
                                  theme === 'dark' 
                                    ? 'bg-zinc-950 border border-zinc-850 text-zinc-200 focus:border-zinc-700' 
                                    : 'bg-white border border-zinc-250 text-zinc-800 focus:border-zinc-400'
                                }`}
                              />
                              <span className={`absolute right-3 top-2 text-xs font-bold ${
                                theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'
                              }`}>%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculations Result Banner */}
                    {stopLoss > 0 && capital > 0 && (
                      <div className={`mt-3 p-2.5 rounded-lg border text-[11px] space-y-1 ${
                        theme === 'dark' 
                          ? 'bg-purple-500/5 border-purple-500/10' 
                          : 'bg-purple-50 border-purple-200'
                      }`}>
                        <div className="flex justify-between">
                          <span className={`${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Amount at Risk:</span>
                          <span className={`font-mono font-bold ${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-700'
                          }`}>
                            {format(Math.abs(trade.avg_entry - stopLoss) * trade.size)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Distance to Stop:</span>
                          <span className="font-mono text-zinc-500">
                            {((Math.abs(trade.avg_entry - stopLoss) / trade.avg_entry) * 100).toFixed(2)}% ({format(Math.abs(trade.avg_entry - stopLoss))})
                          </span>
                        </div>
                        <div className="h-[1px] my-1 bg-zinc-800/10 dark:bg-zinc-200/10" />
                        <div className="flex justify-between font-bold">
                          <span className={theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}>Risk vs Capital:</span>
                          <span className={riskPct > 5 ? 'text-red-500' : 'text-emerald-500'}>
                            {riskPct.toFixed(2)}% risked
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mindset' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-650'}`}>
                    <Target size={14} /> Strategy
                  </label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className={`w-full rounded-lg px-3 py-1.5 text-xs transition-all ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-800 focus:border-zinc-400'
                    }`}
                  >
                    <option value="">Select strategy...</option>
                    {STRATEGIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-655'}`}>
                    <Clock size={14} /> Trading Session
                  </label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className={`w-full rounded-lg px-3 py-1.5 text-xs transition-all ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-800 focus:border-zinc-400'
                    }`}
                  >
                    <option value="">Select session...</option>
                    {SESSIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-650'}`}>
                  <Brain size={14} /> Emotion During Trade
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTIONS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => toggleEmotion(e)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all border cursor-pointer ${
                        selectedEmotions.includes(e)
                          ? (theme === 'dark' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200')
                          : (theme === 'dark' ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border-transparent hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-transparent hover:bg-zinc-200')
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-650'}`}>
                  <BookOpen size={14} /> Mistakes / Deviations
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MISTAKES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMistake(m)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all border cursor-pointer ${
                        selectedMistakes.includes(m)
                          ? (theme === 'dark' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200')
                          : (theme === 'dark' ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border-transparent hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-transparent hover:bg-zinc-200')
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-650'}`}>
                    Discipline: {disciplineScore}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={disciplineScore}
                    onChange={(e) => setDisciplineScore(parseInt(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${
                      theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                    }`}
                  />
                  <div className={`flex justify-between text-[9px] mt-1 font-black tracking-wider uppercase ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    <span>Poor</span>
                    <span>Perfect</span>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-650'}`}>
                    Confidence: {confidenceScore}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={confidenceScore}
                    onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-purple-500 ${
                      theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                    }`}
                  />
                  <div className={`flex justify-between text-[9px] mt-1 font-black tracking-wider uppercase ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    <span>Doubtful</span>
                    <span>Unshakable</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lessons' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Post-Trade Review & Lessons</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => insertPrompt('Rule Adherence')} className={`text-[9px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border-zinc-800' 
                        : 'bg-zinc-100 text-zinc-500 hover:text-zinc-800 border-zinc-200'
                    }`}>Rule Check</button>
                    <button type="button" onClick={() => insertPrompt('Execution Quality')} className={`text-[9px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border-zinc-800' 
                        : 'bg-zinc-100 text-zinc-500 hover:text-zinc-800 border-zinc-200'
                    }`}>Execution</button>
                    <button type="button" onClick={() => insertPrompt('Next Time')} className={`text-[9px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border-zinc-800' 
                        : 'bg-zinc-100 text-zinc-500 hover:text-zinc-800 border-zinc-200'
                    }`}>Next Steps</button>
                  </div>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What was the result? What would you do differently?"
                  rows={6}
                  className={`w-full rounded-lg px-3 py-2 resize-none text-xs transition-all ${
                    theme === 'dark' 
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:border-zinc-700' 
                      : 'bg-zinc-50 border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>

              {/* Trade Screenshot Upload Section */}
              <div className={`border-t pt-4 ${theme === 'dark' ? 'border-zinc-900' : 'border-zinc-205'}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    Trade Screenshots
                  </label>
                  <span className={`text-[10px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Upload charts or entry diagrams
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Upload Trigger Button */}
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group ${
                      theme === 'dark'
                        ? 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                        : 'border-zinc-300 bg-zinc-50/50 hover:border-zinc-450 hover:bg-zinc-100/50 text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin text-purple-500" size={20} />
                    ) : (
                      <Plus className="group-hover:scale-110 transition-transform text-zinc-400 dark:text-zinc-500" size={20} />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {uploading ? 'Uploading...' : 'Add Screenshot'}
                    </span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleScreenshotUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Screenshots Thumbnail List */}
                  {screenshots.map((s) => {
                    const BACKEND_URL = API_BASE.replace('/api', '')
                    const imageUrl = s.image_path.startsWith('http') ? s.image_path : `${BACKEND_URL}${s.image_path}`
                    return (
                      <div
                        key={s.id}
                        className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800/80 dark:border-zinc-850 group"
                      >
                        <img
                          src={imageUrl}
                          alt="Screenshot"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[10px] font-bold"
                          >
                            View Full
                          </a>
                          <button
                            type="button"
                            onClick={() => handleScreenshotDelete(s.id)}
                            className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900/90 text-red-400 hover:text-red-250 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Footer Buttons */}
        <div className={`flex justify-between items-center p-6 border-t sticky bottom-0 z-10 ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 transition-colors text-sm cursor-pointer ${
              theme === 'dark' ? 'text-zinc-400 hover:text-zinc-100' : 'text-zinc-600 hover:text-zinc-900 font-medium'
            }`}
          >
            Cancel
          </button>
          
          <div className="flex gap-2">
            {activeTab !== 'setup' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'lessons') setActiveTab('mindset')
                  else if (activeTab === 'mindset') setActiveTab('setup')
                }}
                className={`px-4 py-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' 
                    : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Back
              </button>
            )}

            {activeTab !== 'lessons' ? (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'setup') setActiveTab('mindset')
                  else if (activeTab === 'mindset') setActiveTab('lessons')
                }}
                className={`px-6 py-2 rounded-lg text-xs transition-colors font-bold shadow cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                Next Section
              </button>
            ) : (
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs transition-colors font-bold shadow cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                <Save size={18} />
                <span>Save Review</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
