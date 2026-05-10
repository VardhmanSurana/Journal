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
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  syncDisabled?: boolean
  syncDisabledReason?: string
}

export const Sidebar = ({
  activeTab,
  setActiveTab,
  onSync,
  isSyncing,
  collapsed,
  setCollapsed,
  syncDisabled = false,
  syncDisabledReason = 'Sync unavailable',
}: SidebarProps) => {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trades', label: 'Trade History', icon: History },
    { id: 'risk', label: 'Risk & Positions', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reviews', label: 'Daily Reviews', icon: BookOpen },
    { id: 'tax', label: 'Tax Report', icon: FileText },
  ]

  return (
    <aside className={cn(
      "h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col sticky top-0 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Brand */}
      <div className={cn("p-6 border-b border-zinc-800 flex items-center justify-between", collapsed ? "p-4 justify-center" : "")}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
              <LayoutDashboard size={20} className="text-zinc-950" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-100">Delta Journal</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 p-4 space-y-2 mt-4", collapsed ? "p-2" : "")}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={collapsed ? item.label : undefined}
            className={cn(
              "w-full flex items-center rounded-xl transition-all group",
              activeTab === item.id 
                ? "bg-[#F7F4F3] text-zinc-700 shadow-sm" 
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
              collapsed ? "justify-center p-3" : "justify-between px-4 py-3"
            )}
          >
            <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
              <item.icon size={20} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </div>
            {!collapsed && activeTab === item.id && <ChevronRight size={16} />}
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className={cn("border-t border-zinc-800 space-y-4", collapsed ? "p-2" : "p-4")}>
        <button
          onClick={onSync}
          disabled={isSyncing || syncDisabled}
          title={collapsed ? (isSyncing ? 'Syncing...' : (syncDisabled ? syncDisabledReason : 'Sync Delta')) : undefined}
          className={cn(
            "flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            collapsed ? "justify-center p-3 w-full" : "px-4 py-3 w-full"
          )}
        >
          <RefreshCw size={20} className={cn(isSyncing && "animate-spin")} />
          {!collapsed && <span className="font-medium">{isSyncing ? 'Syncing...' : (syncDisabled ? 'Sync Locked' : 'Sync Delta')}</span>}
        </button>
        
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-4 py-2")}>
          <div className={cn("flex items-center gap-3", collapsed ? "" : "")}>
             <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 border border-zinc-700">JD</div>
             {!collapsed && (
               <div className="text-left">
                  <div className="text-xs font-bold text-zinc-200">Trader</div>
                  <div className="text-[10px] text-zinc-500 italic">Delta India</div>
               </div>
             )}
          </div>
          {!collapsed && (
            <button className="text-zinc-600 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
