import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  message: string
  action?: React.ReactNode
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  message, 
  action 
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <Icon size={48} className="text-zinc-500 mb-4" />
      )}
      {title && (
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">{title}</h3>
      )}
      <p className="text-zinc-500 mb-4">{message}</p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  )
}

export const EmptyStateCard = ({ 
  icon: Icon, 
  title, 
  message 
}: EmptyStateProps) => {
  return (
    <div className="bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800 p-12 text-center">
      <EmptyState icon={Icon} title={title} message={message} />
    </div>
  )
}