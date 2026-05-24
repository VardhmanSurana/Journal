import { useState, useRef } from 'react'
import axios from 'axios'
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, ArrowRight } from 'lucide-react'
import { API_BASE } from '../../config/api'

interface ImportResult {
  imported: number
  errors: string[]
  total_errors: number
}

export const ImportData = ({ theme = 'dark' }: { theme?: 'light' | 'dark' }) => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) return
    setFile(f)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post(`${API_BASE}/import/csv`, form)
      setResult(res.data)
    } catch {
      setResult({ imported: 0, errors: ['Upload failed. Check backend connection.'], total_errors: 1 })
    } finally {
      setLoading(false)
    }
  }

  const sampleCsv = `timestamp,symbol,side,price,size,fee
2024-01-15T10:30:00Z,BTCUSDT,buy,42000,0.5,15.5
2024-01-15T14:00:00Z,BTCUSDT,sell,43500,0.5,16.2
2024-01-16T09:00:00Z,ETHUSDT,buy,2200,2,3.8
2024-01-16T12:30:00Z,ETHUSDT,sell,2350,2,4.1`

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className={`p-6 rounded-2xl border ${
        theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
          <Upload size={20} className="text-zinc-400" /> Import & Export
        </h2>
        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Import trades from CSV (Delta, Binance, Bybit) or export your journal data.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-500/5'
            : file
              ? theme === 'dark' ? 'border-emerald-500/50 bg-zinc-900/40' : 'border-emerald-500/50 bg-emerald-50/30'
              : theme === 'dark' ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-300 hover:border-zinc-400'
        }`}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileText size={40} className="text-emerald-500" />
            <div>
              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{file.name}</p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-500 transition-colors"
            >
              <X size={14} /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={40} className="text-zinc-500" />
            <div>
              <p className={`font-bold ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Drop your CSV file here
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                or click to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && !result && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Importing...
            </>
          ) : (
            <>
              <ArrowRight size={18} /> Import {file.name}
            </>
          )}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className={`p-6 rounded-2xl border ${
          result.imported > 0
            ? theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
            : theme === 'dark' ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {result.imported > 0 ? (
              <CheckCircle size={24} className="text-emerald-500" />
            ) : (
              <AlertCircle size={24} className="text-red-500" />
            )}
            <div>
              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                {result.imported > 0
                  ? `Successfully imported ${result.imported} trade${result.imported > 1 ? 's' : ''}!`
                  : 'Import failed'}
              </p>
              {result.total_errors > 0 && (
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {result.total_errors} error{result.total_errors > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className={`mt-4 p-3 rounded-xl text-xs space-y-1 ${
              theme === 'dark' ? 'bg-zinc-900/50 text-zinc-400' : 'bg-white text-zinc-600'
            }`}>
              {result.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
          <button
            onClick={() => { setFile(null); setResult(null) }}
            className={`mt-4 text-xs font-black uppercase tracking-widest underline ${
              theme === 'dark' ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Import another file
          </button>
        </div>
      )}

      {/* Sample Format */}
      <details className={`p-6 rounded-2xl border ${
        theme === 'dark' ? 'bg-zinc-900/20 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <summary className={`text-xs font-black uppercase tracking-widest cursor-pointer ${
          theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          <Download size={14} className="inline mr-2" /> Sample CSV Format
        </summary>
        <pre className={`mt-4 p-4 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto ${
          theme === 'dark' ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-50 text-zinc-600'
        }`}>
          {sampleCsv}
        </pre>
        <p className={`mt-3 text-[10px] leading-relaxed ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Column names are auto-detected. Supported: timestamp, symbol, side, price, size, fee, trade_id, order_id.
          Side values: buy/sell or long/short.
        </p>
      </details>

      {/* Export Section */}
      <div className={`p-6 rounded-2xl border ${
        theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${
          theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          <Download size={14} /> Export Reports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`${API_BASE}/export/trades`}
            download
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-500'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div>
              <div className={`font-bold text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>All Trades</div>
              <div className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Full trade log with prices, fees, P&L</div>
            </div>
            <Download size={18} className="text-zinc-500 flex-shrink-0" />
          </a>
          <a
            href={`${API_BASE}/export/monthly`}
            download
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-500'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div>
              <div className={`font-bold text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>Monthly Summary</div>
              <div className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Monthly P&L, win rate, fees breakdown</div>
            </div>
            <Download size={18} className="text-zinc-500 flex-shrink-0" />
          </a>
        </div>
      </div>
    </div>
  )
}
