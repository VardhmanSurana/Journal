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
  const [safeMode, setSafeMode] = useState(true);
  const [deadmanTimeout, setDeadmanTimeout] = useState(60);
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const fetchSafetyInfo = async () => {
    try {
      const healthRes = await axios.get(`${API_BASE}/health/connection`);
      setSafeMode(healthRes.data.safety.safe_mode_active);
    } catch (err) {
      console.error('Error fetching safety info:', err);
    }
  };

  const toggleSafeMode = async () => {
    const confirmed = window.confirm(
      safeMode 
        ? "Disable Safe Mode? This will enable trading and risk-sensitive actions." 
        : "Enable Safe Mode? This will block all order-placement and risk actions."
    );
    
    if (!confirmed) return;

    try {
      await axios.post(`${API_BASE}/safety/safe-mode?enabled=${!safeMode}`);
      setSafeMode(!safeMode);
    } catch (err) {
      alert("Failed to toggle Safe Mode.");
    }
  };

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

  const updateDeadman = async () => {
    if (safeMode) {
      alert("Disable Safe Mode to configure Deadman Switch.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/safety/deadman-switch?timeout_seconds=${deadmanTimeout}`);
      alert("Deadman Switch updated successfully.");
    } catch (err) {
      alert("Failed to update Deadman Switch.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafetyInfo();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className={`card p-6 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${safeMode ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <Shield size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Safety Posture</h2>
              <p className="text-sm text-zinc-500">Manage platform-wide protections and risk boundaries.</p>
            </div>
          </div>
          
          <button
            onClick={toggleSafeMode}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              safeMode 
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/20'
            }`}
          >
            {safeMode ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            {safeMode ? 'SAFE MODE ACTIVE' : 'DISABLE SAFE MODE'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-100 bg-zinc-50'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-amber-500" />
              <h3 className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>Deadman Switch</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Automatically cancels all open orders if a heartbeat is not received within the specified timeout.
            </p>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                value={deadmanTimeout}
                onChange={(e) => setDeadmanTimeout(parseInt(e.target.value))}
                className={`w-full px-4 py-2 rounded-lg text-sm bg-zinc-900 border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${safeMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={safeMode}
                placeholder="Seconds (e.g. 60)"
              />
              <button 
                onClick={updateDeadman}
                disabled={safeMode || loading}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-50"
              >
                {loading ? 'SAVING...' : 'SET HEARTBEAT'}
              </button>
            </div>
          </div>

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
        </div>

        {stats && (
          <div className="mt-6 p-6 rounded-2xl bg-zinc-950 border border-zinc-800 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-zinc-400">Reconciliation Report</h4>
              <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${stats.quality_score === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {stats.status.replace('_', ' ')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-zinc-500 mb-1">Local Fills</div>
                <div className="text-lg font-mono font-bold text-white">{stats.local_count}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500 mb-1">API Fills</div>
                <div className="text-lg font-mono font-bold text-white">{stats.api_count}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500 mb-1">Confidence</div>
                <div className={`text-lg font-mono font-bold ${stats.quality_score === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
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
            { title: 'Least Privilege', desc: 'Use separate READ-ONLY keys for journaling to minimize risk if a key is stolen.' },
            { title: 'Heartbeat Protection', desc: 'Always keep Deadman Switch active when running automated strategies.' },
            { title: 'Rate Limiting', desc: 'Avoid aggressive polling; let the background sync handle data aggregation.' }
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50">
              <h4 className="text-xs font-bold text-zinc-300 mb-1">{item.title}</h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
