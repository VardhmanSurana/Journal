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
  FileText,
  Landmark
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Link } from 'react-router-dom'

import { motion } from 'framer-motion'

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
}

export const Sidebar = ({ activeTab, setActiveTab, onSync, isSyncing, collapsed, setCollapsed }: SidebarProps) => {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'trades', label: 'Trade History', icon: History, path: '/trades' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'economics', label: 'Economics', icon: Landmark, path: '/economics' },
    { id: 'reviews', label: 'Daily Reviews', icon: BookOpen, path: '/reviews' },
    { id: 'safety', label: 'Maintenance', icon: Settings, path: '/safety' },
  ]

  return (
    <motion.aside 
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
      className="h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col sticky top-0"
    >
      {/* Brand */}
      <div className="h-20 border-b border-zinc-800 flex items-center relative px-6 w-full justify-between">
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
              "font-bold text-xl tracking-tight text-zinc-100 whitespace-nowrap ml-3",
              collapsed ? "hidden" : "block"
            )}
          >
            Delta Journal
          </motion.span>
        </div>
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0",
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
                ? "text-zinc-950 font-bold" 
                : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
            )}
          >
            {activeTab === item.id && (
              <motion.div
                layoutId="active-sidebar-pill"
                className="absolute inset-0 bg-[#F7F4F3] rounded-xl -z-10"
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
                className="z-10 flex-shrink-0 ml-auto pr-4"
              >
                <ChevronRight size={16} />
              </motion.div>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-zinc-800 px-3 py-4 space-y-4 overflow-hidden">
        <motion.button
          onClick={onSync}
          disabled={isSyncing}
          title={collapsed ? (isSyncing ? 'Syncing...' : 'Sync Delta') : undefined}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors disabled:opacity-50 overflow-hidden w-full h-12 justify-start pl-[14px]"
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
             <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 border border-zinc-700 flex-shrink-0">JD</div>
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
                <div className="text-xs font-bold text-zinc-200">Trader</div>
                <div className="text-[10px] text-zinc-500 italic">Delta India</div>
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
            className="text-zinc-600 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <LogOut size={18} />
          </motion.button>
        </div>
      </div>
    </motion.aside>
  )
}
