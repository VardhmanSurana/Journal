import { 
  LayoutDashboard, 
  History, 
  BarChart3, 
  Brain, 
  BookOpen, 
  Settings, 
  RefreshCw,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onSync: () => void
  isSyncing: boolean
}

export const Sidebar = ({ activeTab, setActiveTab, onSync, isSyncing }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trades', label: 'Trade History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: 'V2' },
    { id: 'psychology', label: 'Psychology', icon: Brain, badge: 'V2' },
    { id: 'reviews', label: 'Daily Reviews', icon: BookOpen, badge: 'V2' },
  ]

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Delta Journal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            disabled={item.badge === 'V2'}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
              activeTab === item.id 
                ? "bg-blue-600/10 text-blue-400" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
              item.badge === 'V2' && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.badge ? (
              <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md font-bold group-hover:bg-slate-700 transition-colors">
                {item.badge}
              </span>
            ) : (
              activeTab === item.id && <ChevronRight size={16} />
            )}
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={cn(isSyncing && "animate-spin")} />
          <span className="font-medium">{isSyncing ? 'Syncing...' : 'Sync Delta'}</span>
        </button>
        
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">JD</div>
             <div className="text-left">
                <div className="text-xs font-bold text-slate-200">Trader</div>
                <div className="text-[10px] text-slate-500 italic">Delta India</div>
             </div>
          </div>
          <button className="text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
