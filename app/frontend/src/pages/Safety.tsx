import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, ShieldCheck, Activity, Database, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { API_BASE } from '../config/api';

interface SafetyStats {
  api_count: number;
  local_count: number;
  difference: number;
  quality_score: number;
  status: string;
}

export const SafetyCenter: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const reconcileData = async () => {
    setReconciling(true);
    try {
      const res = await axios.get(`${API_BASE}/data/reconcile`);
      setStats(res.data);
    } catch (err) {
      alert("Reconciliation failed.");
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className={`card p-6 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl bg-emerald-500/20 text-emerald-400`}>
              <Database size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Journal Maintenance</h2>
              <p className="text-sm text-zinc-500">Monitor data integrity and system health.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-100 bg-zinc-50'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-emerald-500" />
              <h3 className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>Data Quality Reconciler</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Verify local trade history matches Delta Exchange records for sync confidence.
            </p>
            <button 
              onClick={reconcileData}
              disabled={reconciling}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-colors"
            >
              {reconciling ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
              {reconciling ? 'RECONCILING...' : 'RUN RECONCILIATION'}
            </button>
          </div>

          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-100 bg-zinc-50'}`}>
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={18} className="text-blue-500" />
              <h3 className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>Auto-Sync Health</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Background workers automatically fetch new fills every hour to keep your journal up to date.
            </p>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>System Active</span>
            </div>
          </div>
        </div>

        {stats && (
          <div className={`mt-6 p-6 rounded-2xl border animate-in fade-in slide-in-from-bottom-2 ${
            theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Reconciliation Report</h4>
              <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${stats.quality_score === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {stats.status?.replace('_', ' ') || 'HEALTHY'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-zinc-500 mb-1">Local Fills</div>
                <div className={`text-lg font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{stats.local_count}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500 mb-1">API Fills</div>
                <div className={`text-lg font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{stats.api_count}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500 mb-1">Confidence</div>
                <div className={`text-lg font-mono font-bold ${
                  stats.quality_score === 100 
                    ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700' 
                    : theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  {stats.quality_score}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`card p-6 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle size={20} className="text-zinc-500" />
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Security Best Practices</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Read-Only Isolation', desc: 'Always use separate READ-ONLY keys for journaling to ensure your account remains protected from accidental mutations.' },
            { title: 'Local Persistence', desc: 'Your trade history is stored in a local SQLite database, ensuring your journaling data remains private and accessible offline.' },
            { title: 'Rate Limiting', desc: 'Avoid aggressive polling; the background sync handles data aggregation every hour to respect API limits.' }
          ].map((item, i) => (
            <div key={i} className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-zinc-850 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-sm'
            }`}>
              <h4 className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{item.title}</h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
