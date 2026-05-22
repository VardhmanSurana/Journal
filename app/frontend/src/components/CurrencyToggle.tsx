import { useCurrency } from '../hooks/useCurrency'
import { useTheme } from '../hooks/useTheme'

export const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency()
  const { theme } = useTheme()

  return (
    <div className={`flex items-center gap-3 p-1 rounded-full border transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-zinc-800/50 border-zinc-700' 
        : 'bg-zinc-200/60 border-zinc-300'
    }`}>
      <button
        onClick={() => setCurrency('USD')}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          currency === 'USD'
            ? theme === 'dark'
              ? 'bg-zinc-100 text-zinc-950 shadow-lg'
              : 'bg-white text-zinc-900 shadow-md'
            : theme === 'dark'
              ? 'text-zinc-500 hover:text-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950'
        }`}
      >
        USD
      </button>
      <button
        onClick={() => setCurrency('INR')}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          currency === 'INR'
            ? theme === 'dark'
              ? 'bg-zinc-100 text-zinc-950 shadow-lg'
              : 'bg-white text-zinc-900 shadow-md'
            : theme === 'dark'
              ? 'text-zinc-500 hover:text-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950'
        }`}
      >
        INR
      </button>
    </div>
  )
}
