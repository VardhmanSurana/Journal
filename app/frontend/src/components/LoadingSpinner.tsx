interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'md' 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className={`${sizeClasses[size]} border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin`} />
      <span className="text-zinc-500 italic">{message}</span>
    </div>
  )
}

export const LoadingOverlay = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center z-50 rounded-xl">
    <LoadingSpinner message={message} />
  </div>
)