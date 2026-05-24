import { 
  LayoutDashboard, 
  History, 
  BarChart3, 
  Brain, 
  BookOpen, 
  Settings, 
  RefreshCw,
  LogOut,
  ChevronRight,
  ChevronLeft,
  FileText,
  Landmark,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  Upload
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

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

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onSync: () => void
  isSyncing: boolean
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  theme?: 'dark' | 'light'
  health?: ConnectionHealth | null
}

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  onSync, 
  isSyncing, 
  collapsed, 
  setCollapsed,
  theme = 'dark',
  health = null
}: SidebarProps) => {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'trades', label: 'Trade History', icon: History, path: '/trades' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'fees-funding', label: 'Fees & Funding', icon: Landmark, path: '/fees-funding' },
    { id: 'journal', label: 'Journal', icon: BookOpen, path: '/journal' },
    { id: 'maintenance', label: 'Maintenance', icon: Settings, path: '/maintenance' },
    { id: 'import', label: 'Import Data', icon: Upload, path: '/import' },
  ]

  return (
    <motion.aside 
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
      className={cn(
        "h-screen flex flex-col sticky top-0 z-40 transition-colors duration-200",
        theme === 'dark' 
          ? "bg-zinc-950 border-r border-zinc-900" 
          : "bg-[#F3F4F9] border-r border-zinc-200"
      )}
    >
      {/* Brand */}
      <div className={cn(
        "h-20 flex items-center relative px-6 w-full justify-between border-b transition-colors duration-200",
        theme === 'dark' ? "border-zinc-900" : "border-zinc-200"
      )}>
        <div className="flex items-center overflow-hidden">
          <motion.div 
            animate={{ opacity: collapsed ? 0 : 1, scale: collapsed ? 0.8 : 1 }}
            transition={{ duration: 0.15 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
          >
            <img src="/logo.png" alt="Delta Journal Logo" className="w-full h-full object-cover" />
          </motion.div>
          <motion.span 
            initial={false}
            animate={{ 
              opacity: collapsed ? 0 : 1,
              x: collapsed ? -12 : 0
            }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut",
              delay: collapsed ? 0 : 0.15
            }}
            className={cn(
              "font-bold text-xl tracking-tight whitespace-nowrap ml-3 transition-colors duration-200",
              theme === 'dark' ? "text-zinc-100" : "text-zinc-900",
              collapsed ? "hidden" : "block"
            )}
          >
            Delta Journal
          </motion.span>
        </div>
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-2 rounded-lg transition-colors flex-shrink-0",
            theme === 'dark' 
              ? "hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300" 
              : "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700",
            collapsed ? "absolute inset-0 m-auto w-9 h-9 flex items-center justify-center" : ""
          )}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 mt-4 overflow-x-hidden">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            title={collapsed ? item.label : undefined}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center rounded-xl transition-all group relative overflow-hidden h-12 justify-start pl-[14px]",
              activeTab === item.id 
                ? theme === 'dark'
                  ? "text-zinc-950 font-bold" 
                  : "text-emerald-800 font-extrabold"
                : theme === 'dark'
                  ? "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900"
            )}
          >
            {activeTab === item.id && (
              <motion.div
                layoutId="active-sidebar-pill"
                className={cn(
                  "absolute inset-0 rounded-xl -z-10",
                  theme === 'dark' ? "bg-[#F7F4F3]" : "bg-white border-r-2 border-emerald-600 shadow-sm"
                )}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <div className="flex items-center z-10 overflow-hidden">
              <item.icon size={20} className="flex-shrink-0" />
              <motion.span 
                initial={false}
                animate={{ 
                  opacity: collapsed ? 0 : 1,
                  x: collapsed ? -12 : 0
                }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeOut",
                  delay: collapsed ? 0 : 0.15
                }}
                className={cn(
                  "font-medium whitespace-nowrap text-sm ml-3",
                  collapsed ? "hidden" : "block"
                )}
              >
                {item.label}
              </motion.span>
            </div>
            {!collapsed && activeTab === item.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "z-10 flex-shrink-0 ml-auto pr-4",
                  theme === 'dark' ? "text-zinc-900" : "text-emerald-600"
                )}
              >
                <ChevronRight size={16} />
              </motion.div>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className={cn(
        "px-3 py-4 space-y-3 overflow-hidden border-t transition-colors duration-200",
        theme === 'dark' ? "border-zinc-900" : "border-zinc-200"
      )}>
        {/* Dynamic Premium Status Panel */}
        {!collapsed && health && (
          <div className={cn(
            "p-3 rounded-xl border text-xs flex flex-col gap-3 transition-colors duration-200",
            theme === 'dark' ? "border-zinc-900 bg-zinc-900/30 text-zinc-300" : "border-zinc-200 bg-white text-zinc-650 shadow-sm"
          )}>
            {/* Connection & Sync Status Row */}
            <div className={cn(
              "flex flex-col gap-1.5 pb-2.5 border-b transition-colors duration-200",
              theme === 'dark' ? "border-zinc-800/50" : "border-zinc-200/50"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {health.api_status === 'ok' && health.sync_status !== 'failed' ? (
                    <Wifi size={14} className="text-emerald-500" />
                  ) : (
                    <WifiOff size={14} className="text-red-500" />
                  )}
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-500">
                    {health.region} Mainnet
                  </span>
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1",
                  health.sync_status === 'failed' 
                    ? 'bg-red-500/10 text-red-400' 
                    : health.sync_status === 'running'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                )}>
                  <Activity size={10} className={health.sync_status === 'running' ? 'animate-pulse' : ''} />
                  {health.sync_status.toUpperCase()}
                </span>
              </div>
              {health.last_success_at && (
                <div className="text-[10px] text-zinc-500 flex items-center gap-1 tabular-nums mt-0.5">
                  <span>Last Success:</span>
                  <span className={cn(
                    "font-bold",
                    theme === 'dark' ? "text-zinc-300" : "text-zinc-700"
                  )}>
                    {new Date(health.last_success_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* API Limit Row */}
            {health.rate_limit && (
              <div className="flex items-center justify-between gap-2 tabular-nums">
                <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 uppercase">
                  API LIMIT:
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold font-mono ${health.rate_limit.current_quota < 1000 ? 'text-red-450' : 'text-emerald-500'}`}>
                    {health.rate_limit.current_quota}
                  </span>
                  <div className={cn(
                    "w-10 h-1 rounded-full overflow-hidden",
                    theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200"
                  )}>
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        health.rate_limit.current_quota < 1000 ? "bg-red-500" : "bg-emerald-500"
                      )} 
                      style={{ width: `${Math.min(100, (health.rate_limit.current_quota / 10000) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    ({Math.max(0, Math.round(health.rate_limit.remaining_time_in_milliseconds / 1000))}s)
                  </span>
                </div>
              </div>
            )}

            {/* Warning Message block inside Sidebar if stale */}
            {(health.is_stale || health.last_error) && (
              <div className={cn(
                "pt-2 border-t flex items-start gap-1.5 text-[10px] transition-colors duration-200",
                theme === 'dark' ? "border-zinc-800/50" : "border-zinc-200/50",
                health.is_stale && (health.stale_seconds === null || health.stale_seconds === undefined)
                  ? 'text-zinc-500'
                  : theme === 'dark' ? 'text-red-400/80' : 'text-red-600'
              )}>
                {health.is_stale && (health.stale_seconds === null || health.stale_seconds === undefined) ? (
                  <Activity size={12} className="mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                )}
                <div className="leading-relaxed">
                  {health.is_stale && (
                    health.stale_seconds !== null && health.stale_seconds !== undefined
                      ? `Stale by ${health.stale_seconds}s.`
                      : 'Sync pending. Please sync Delta.'
                  )}
                  {health.last_error && ` ${health.last_error}`}
                </div>
              </div>
            )}
          </div>
        )}

        <motion.button
          onClick={onSync}
          disabled={isSyncing}
          title={collapsed ? (isSyncing ? 'Syncing...' : 'Sync Delta') : undefined}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center rounded-xl transition-colors disabled:opacity-50 overflow-hidden w-full h-12 justify-start pl-[14px]",
            theme === 'dark'
              ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
              : "bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm"
          )}
        >
          <div className="flex items-center">
            <RefreshCw size={20} className={cn(isSyncing && "animate-spin", "flex-shrink-0")} />
            <motion.span 
              initial={false}
              animate={{ 
                opacity: collapsed ? 0 : 1,
                x: collapsed ? -12 : 0
              }}
              transition={{ 
                duration: 0.2,
                ease: "easeOut",
                delay: collapsed ? 0 : 0.15
              }}
              className={cn(
                "font-medium whitespace-nowrap text-sm text-left ml-3",
                collapsed ? "hidden" : "block"
              )}
            >
              {isSyncing ? 'Syncing...' : 'Sync Delta'}
            </motion.span>
          </div>
        </motion.button>
        
        <div className="flex items-center w-full overflow-hidden min-h-[40px] justify-between px-2">
          <div className="flex items-center overflow-hidden">
             <div className={cn(
               "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 transition-colors duration-200",
               theme === 'dark'
                 ? "bg-zinc-900 text-zinc-300 border-zinc-800"
                 : "bg-zinc-200 text-zinc-800 border-zinc-300"
             )}>JD</div>
             <motion.div 
               initial={false}
               animate={{ 
                 opacity: collapsed ? 0 : 1,
                 x: collapsed ? -12 : 0
               }}
               transition={{ 
                 duration: 0.2,
                 ease: "easeOut",
                 delay: collapsed ? 0 : 0.15
               }}
               className={cn(
                 "text-left whitespace-nowrap ml-3",
                 collapsed ? "hidden" : "block"
               )}
             >
                <div className={cn("text-xs font-bold transition-colors duration-200", theme === 'dark' ? "text-zinc-200" : "text-zinc-800")}>Trader</div>
                <div className={cn("text-[10px] italic transition-colors duration-200", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Delta India</div>
             </motion.div>
          </div>
          
          <motion.button 
            initial={false}
            animate={{ 
              opacity: collapsed ? 0 : 1,
              scale: collapsed ? 0.8 : 1,
              pointerEvents: collapsed ? "none" : "auto"
            }}
            transition={{ duration: 0.15 }}
            className={cn(
              "transition-colors flex-shrink-0",
              theme === 'dark' ? "text-zinc-600 hover:text-red-500" : "text-zinc-400 hover:text-red-500"
            )}
          >
            <LogOut size={18} />
          </motion.button>
        </div>
      </div>
    </motion.aside>
  )
}
