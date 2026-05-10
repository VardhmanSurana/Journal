import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  label: string
  value: string | number
  subValue?: string
  valueColor?: string
  className?: string
}

export const StatCard = ({
  icon: Icon,
  iconColor = 'text-zinc-100',
  iconBg = 'bg-zinc-800',
  label,
  value,
  subValue,
  valueColor = 'text-white',
  className = ''
}: StatCardProps) => {
  return (
    <div className={`p-6 rounded-xl border bg-zinc-900 border-zinc-800 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={iconColor} size={20} />
        </div>
        <span className="text-sm font-medium text-zinc-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-zinc-500 mt-1">
          {subValue}
        </div>
      )}
    </div>
  )
}

interface SimpleStatProps {
  label: string
  value: string | number
  valueColor?: string
  subValue?: string
}

export const SimpleStat = ({
  label,
  value,
  valueColor = 'text-white',
  subValue
}: SimpleStatProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-lg border border-zinc-800/50">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm font-bold ${valueColor}`}>{value}</span>
    </div>
  )
}