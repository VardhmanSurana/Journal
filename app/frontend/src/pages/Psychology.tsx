import { useMemo, useState } from 'react'
import { Brain, Heart, Target, AlertTriangle, Award, TrendingUp, TrendingDown } from 'lucide-react'

interface PsychologyProps {
  trades: any[]
  theme: 'dark' | 'light'
}

export const Psychology = ({ trades, theme }: PsychologyProps) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all')

  const psychologyData = useMemo(() => {
    if (!trades.length) return null

    const strategies: Record<string, { wins: number; losses: number; pnl: number; trades: any[] }> = {}
    const emotions: Record<string, number> = {}
    const mistakes: Record<string, number> = {}
    let totalMistakes = 0

    trades.forEach(t => {
      const strat = t.strategy || 'Unlabeled'
      if (!strategies[strat]) {
        strategies[strat] = { wins: 0, losses: 0, pnl: 0, trades: [] }
      }
      if (t.is_winner) {
        strategies[strat].wins++
        strategies[strat].pnl += t.net_profit
      } else {
        strategies[strat].losses++
        strategies[strat].pnl += t.net_profit
      }
      strategies[strat].trades.push(t)

      if (t.emotion) {
        emotions[t.emotion] = (emotions[t.emotion] || 0) + 1
      }

      if (t.mistakes) {
        const mistakeList = t.mistakes.split(',').map((m: string | undefined) => m?.trim() || '')
        mistakeList.forEach(m => {
          if (m) {
            mistakes[m] = (mistakes[m] || 0) + 1
            totalMistakes++
          }
        })
      }
    })

    const strategyList = Object.entries(strategies).map(([name, data]) => ({
      name,
      ...data,
      winRate: (data.wins / (data.wins + data.losses)) * 100 || 0
    })).sort((a, b) => b.pnl - a.pnl)

    const emotionList = Object.entries(emotions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const mistakeList = Object.entries(mistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const winningStreak = calculateStreak(trades, true)
    const losingStreak = calculateStreak(trades, false)

    function calculateStreak(tradeList: any[], winning: boolean): number {
      let maxStreak = 0
      let currentStreak = 0
      tradeList.forEach(t => {
        const isWinner = t.is_winner === winning
        if (isWinner) {
          currentStreak++
          maxStreak = Math.max(maxStreak, currentStreak)
        } else {
          currentStreak = 0
        }
      })
      return maxStreak
    }

    return {
      strategyList,
      emotionList,
      mistakeList,
      totalMistakes,
      winningStreak,
      losingStreak,
      totalTrades: trades.length
    }
  }, [trades])

  const filteredStrategies = useMemo(() => {
    if (!psychologyData) return []
    if (selectedStrategy === 'all') return psychologyData.strategyList
    return psychologyData.strategyList.filter(s => s.name === selectedStrategy)
  }, [psychologyData, selectedStrategy])

  if (!psychologyData) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 italic">
        No trade data available for psychology analysis.
      </div>
    )
  }

  const bgClass = theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
  const textClass = theme === 'dark' ? 'text-white' : 'text-zinc-900'
  const cardBgClass = theme === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-50'
  const subTextClass = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>{psychologyData.winningStreak}</div>
          <div className="text-xs text-zinc-500 mt-1">Winning Streak</div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="text-red-500" size={20} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>{psychologyData.losingStreak}</div>
          <div className="text-xs text-zinc-500 mt-1">Losing Streak</div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="text-yellow-400" size={20} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>{psychologyData.totalMistakes}</div>
          <div className="text-xs text-zinc-500 mt-1">Total Mistakes</div>
        </div>

        <div className={`${bgClass} p-6 rounded-xl border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Brain className="text-purple-400" size={20} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${textClass}`}>{psychologyData.strategyList.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Strategies Used</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${bgClass} p-6 rounded-xl border`}>
          <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${textClass}`}>
            <Brain size={20} className="text-purple-400" /> Strategy Performance
          </h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedStrategy('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedStrategy === 'all'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              All ({psychologyData.strategyList.length})
            </button>
            {psychologyData.strategyList.slice(0, 5).map(s => (
              <button
                key={s.name}
                onClick={() => setSelectedStrategy(s.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedStrategy === s.name
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {s.name} ({s.wins + s.losses})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredStrategies.slice(0, 8).map(s => (
              <div key={s.name} className={`p-4 ${cardBgClass} rounded-lg`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-medium ${textClass}`}>{s.name}</span>
                  <span className={`text-sm font-bold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                    {s.pnl >= 0 ? '+' : ''}{s.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Win Rate: <span className="text-zinc-100">{s.winRate.toFixed(1)}%</span></span>
                  <span>Wins: <span className="text-emerald-400">{s.wins}</span></span>
                  <span>Losses: <span className="text-red-500">{s.losses}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${bgClass} p-6 rounded-xl border`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
              <AlertTriangle size={20} className="text-yellow-400" /> Common Mistakes
            </h3>
            {psychologyData.mistakeList.length > 0 ? (
              <div className="space-y-2">
                {psychologyData.mistakeList.map(([mistake, count]) => (
                  <div key={mistake} className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                    <span className="text-sm text-zinc-300">{mistake}</span>
                    <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">No mistakes recorded yet.</p>
            )}
          </div>

          <div className={`${bgClass} p-6 rounded-xl border`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
              <Heart size={20} className="text-pink-400" /> Emotional Patterns
            </h3>
            {psychologyData.emotionList.length > 0 ? (
              <div className="space-y-2">
                {psychologyData.emotionList.map(([emotion, count]) => (
                  <div key={emotion} className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                    <span className="text-sm text-zinc-300">{emotion}</span>
                    <span className="text-xs font-bold text-zinc-100 bg-zinc-800 px-2 py-1 rounded">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">No emotions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {psychologyData.winningStreak >= 3 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-full">
              <Award className="text-emerald-400" size={32} />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-emerald-400">Great Streak!</h4>
              <p className="text-zinc-300">
                You've hit {psychologyData.winningStreak} consecutive wins! 
                This is a great time to review what you're doing right and maintain your discipline.
              </p>
            </div>
          </div>
        </div>
      )}

      {psychologyData.losingStreak >= 3 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-full">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-red-500">Stay Strong!</h4>
              <p className="text-zinc-300">
                You've hit {psychologyData.losingStreak} consecutive losses. 
                Take a step back, review your trades, and consider taking a break to reset.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
