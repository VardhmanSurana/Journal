import { useCurrency } from '../hooks/useCurrency'

export const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="flex items-center gap-3 bg-zinc-800/50 p-1.5 rounded-full border border-zinc-700">
      <button
        onClick={() => setCurrency('USD')}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          currency === 'USD'
            ? 'bg-zinc-100 text-zinc-950 shadow-lg'
            : 'text-zinc-500 hover:text-zinc-200'
        }`}
      >
        USD
      </button>
      <button
        onClick={() => setCurrency('INR')}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          currency === 'INR'
            ? 'bg-zinc-100 text-zinc-950 shadow-lg'
            : 'text-zinc-500 hover:text-zinc-200'
        }`}
      >
        INR
      </button>
    </div>
  )
}
