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
  Shield,
  FileText
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
    { id: 'risk', label: 'Risk & Positions', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reviews', label: 'Daily Reviews', icon: BookOpen },
    { id: 'tax', label: 'Tax Report', icon: FileText },
  ]

  return (
    <aside className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={20} className="text-zinc-950" />
          </div>
          <span className="font-bold text-xl tracking-tight text-zinc-100">Delta Journal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
              activeTab === item.id 
                ? "bg-zinc-800 text-zinc-100 shadow-sm" 
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronRight size={16} />}
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-zinc-800 space-y-4">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={cn(isSyncing && "animate-spin")} />
          <span className="font-medium">{isSyncing ? 'Syncing...' : 'Sync Delta'}</span>
        </button>
        
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 border border-zinc-700">JD</div>
             <div className="text-left">
                <div className="text-xs font-bold text-zinc-200">Trader</div>
                <div className="text-[10px] text-zinc-500 italic">Delta India</div>
             </div>
          </div>
          <button className="text-zinc-600 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
