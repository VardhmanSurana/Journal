import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Activity, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface ConnectionHealth {
  api_status: string;
  sync_status: 'idle' | 'running' | 'success' | 'failed';
  last_success_at?: string;
  is_stale: boolean;
  stale_seconds?: number;
  region: string;
  last_error?: string;
  rate_limit?: {
    current_quota: number;
    remaining_time_in_milliseconds: number;
  };
}

interface ConnectionPanelProps {
  health: ConnectionHealth | null;
  theme: 'light' | 'dark';
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ health, theme }) => {
  if (!health) return null;

  const isSyncPending = health.is_stale && (health.stale_seconds === null || health.stale_seconds === undefined);
  const isHealthy = !health.is_stale && health.api_status === 'ok' && health.sync_status !== 'failed';

  return (
    <div className={`mx-8 mt-4 p-4 rounded-2xl border transition-all duration-300 ${
      health.sync_status === 'failed' || (health.is_stale && !isSyncPending)
        ? 'border-red-500/30 bg-red-500/5 text-red-200'
        : isSyncPending
          ? 'border-zinc-800 bg-zinc-900/20 text-zinc-400'
          : theme === 'dark'
            ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300'
            : 'border-zinc-200 bg-white text-zinc-600'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <Wifi size={16} className="text-emerald-500" />
            ) : isSyncPending ? (
              <Wifi size={16} className="text-zinc-500" />
            ) : (
              <WifiOff size={16} className="text-red-500" />
            )}
            <span className="font-bold text-xs uppercase tracking-wider">
              {health.region} Mainnet
            </span>
          </div>

          <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-zinc-700/50' : 'bg-zinc-300'}`} />

          <div className="flex items-center gap-2 text-xs">
            <Activity size={14} className={health.sync_status === 'running' ? 'animate-pulse text-blue-400' : 'text-zinc-500'} />
            <span className="font-medium">
              Sync: <span className={
                health.sync_status === 'failed' 
                  ? 'text-red-500' 
                  : isSyncPending 
                    ? 'text-zinc-400' 
                    : theme === 'dark' 
                      ? 'text-zinc-100' 
                      : 'text-zinc-800'
              }>
                {health.sync_status.toUpperCase()}
              </span>
            </span>
          </div>

          {health.last_success_at && (
            <div className="text-[10px] text-zinc-500 tabular-nums">
              Last Success: {new Date(health.last_success_at).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {health.rate_limit && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium tabular-nums ${
              theme === 'dark'
                ? 'bg-zinc-900/30 border-zinc-800 text-zinc-400'
                : 'bg-zinc-50 border-zinc-200 text-zinc-650'
            }`}>
              <span className="text-[10px] font-black text-zinc-550 uppercase">API Limit:</span>
              <span className={`font-bold font-mono ${health.rate_limit.current_quota < 1000 ? 'text-red-400' : 'text-emerald-400'}`}>
                {health.rate_limit.current_quota}
              </span>
              <div className={`w-12 h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    health.rate_limit.current_quota < 1000 ? 'bg-red-500' : 'bg-emerald-500'
                  }`} 
                  style={{ width: `${Math.min(100, (health.rate_limit.current_quota / 10000) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">
                ({Math.max(0, Math.round(health.rate_limit.remaining_time_in_milliseconds / 1000))}s reset)
              </span>
            </div>
          )}

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
            theme === 'dark'
              ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'
              : 'bg-zinc-100 border-zinc-200 text-zinc-600'
          }`}>
            <Shield size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Journal Mode</span>
          </div>
        </div>
      </div>


      {(health.is_stale || health.last_error) && (
        <div className={`mt-3 pt-3 border-t flex items-start gap-2 text-xs transition-colors ${
          theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-200'
        } ${
          isSyncPending 
            ? 'text-zinc-500' 
            : theme === 'dark' 
              ? 'text-red-300' 
              : 'text-red-700'
        }`}>
          {isSyncPending ? <Activity size={14} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
          <div>
            {health.is_stale && (
              health.stale_seconds !== null && health.stale_seconds !== undefined
                ? `Warning: Data is stale by ${health.stale_seconds} seconds. UI may reflect outdated positions.`
                : 'First sync pending. Please click "Sync Delta" in the sidebar to fetch your trades.'
            )}
            {health.last_error && ` Error: ${health.last_error}`}
          </div>
        </div>
      )}
    </div>
  );
};
