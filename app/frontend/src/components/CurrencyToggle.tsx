import { useCurrency } from '../hooks/useCurrency'

export const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-full border border-slate-700">
      <button
        onClick={() => setCurrency('USD')}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          currency === 'USD'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        USD
      </button>
      <button
        onClick={() => setCurrency('INR')}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          currency === 'INR'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        INR
      </button>
    </div>
  )
}
