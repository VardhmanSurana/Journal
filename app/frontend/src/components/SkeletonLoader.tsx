import React from 'react'

interface SkeletonLoaderProps {
  variant?: 'dashboard' | 'analytics' | 'economics' | 'reviews' | 'list' | 'default'
  theme?: 'dark' | 'light'
}

export const SkeletonLoader = ({ 
  variant = 'default', 
  theme = 'dark' 
}: SkeletonLoaderProps) => {
  const cardBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-900/60' : 'bg-white border-zinc-200'
  const pulseBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100'
  const pulseText = theme === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-50'

  if (variant === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`card border ${cardBg} p-5 flex items-center gap-4 h-[92px] rounded-2xl`}>
              <div className={`w-10 h-10 rounded-xl ${pulseBg} animate-pulse flex-shrink-0`} />
              <div className="space-y-2 w-full">
                <div className={`h-3 w-16 rounded ${pulseText} animate-pulse`} />
                <div className={`h-5 w-24 rounded ${pulseBg} animate-pulse`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Trades Skeleton */}
          <div className={`lg:col-span-2 card p-6 border ${cardBg} rounded-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <div className={`h-5 w-36 rounded ${pulseBg} animate-pulse`} />
              <div className={`h-3 w-16 rounded ${pulseText} animate-pulse`} />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${theme === 'dark' ? 'border-zinc-900/50 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded ${pulseBg} animate-pulse`} />
                    <div className="space-y-1.5">
                      <div className={`h-3 w-28 rounded ${pulseBg} animate-pulse`} />
                      <div className={`h-2.5 w-16 rounded ${pulseText} animate-pulse`} />
                    </div>
                  </div>
                  <div className={`h-4 w-12 rounded ${pulseBg} animate-pulse`} />
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Skeleton */}
          <div className={`lg:col-span-1 card p-6 border ${cardBg} rounded-2xl flex flex-col justify-between min-h-[340px]`}>
            <div className="flex justify-between items-center mb-6">
              <div className={`h-5 w-24 rounded ${pulseBg} animate-pulse`} />
              <div className="flex gap-1">
                <div className={`h-4 w-6 rounded ${pulseText} animate-pulse`} />
                <div className={`h-4 w-6 rounded ${pulseText} animate-pulse`} />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 my-auto">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-lg ${pulseText} animate-pulse`} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Equity Curve Skeleton */}
          <div className={`lg:col-span-2 card p-6 border ${cardBg} rounded-2xl`}>
            <div className={`h-5 w-32 rounded ${pulseBg} animate-pulse mb-6`} />
            <div className={`h-[300px] w-full rounded-xl ${pulseText} animate-pulse flex items-center justify-center relative overflow-hidden`}>
              {/* Pulsing grid paths */}
              <div className="absolute inset-0 flex flex-col justify-between py-6 px-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full border-t border-zinc-900/20" />
                ))}
              </div>
            </div>
          </div>

          {/* Long vs Short Skeleton */}
          <div className={`card p-6 border ${cardBg} rounded-2xl`}>
            <div className={`h-5 w-32 rounded ${pulseBg} animate-pulse mb-6`} />
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className={`h-3.5 w-24 rounded ${pulseBg} animate-pulse`} />
                    <div className={`h-3.5 w-12 rounded ${pulseBg} animate-pulse`} />
                  </div>
                  <div className={`h-2 w-full rounded-full ${pulseText} animate-pulse`} />
                  <div className="flex justify-between">
                    <div className={`h-2.5 w-16 rounded ${pulseText} animate-pulse`} />
                    <div className={`h-2.5 w-12 rounded ${pulseText} animate-pulse`} />
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-8 pt-6 border-t ${theme === 'dark' ? 'border-zinc-900' : 'border-zinc-200'} space-y-3`}>
              <div className={`h-3 w-20 rounded ${pulseText} animate-pulse mb-2`} />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className={`h-3 w-16 rounded ${pulseBg} animate-pulse`} />
                  <div className={`h-3.5 w-12 rounded ${pulseBg} animate-pulse`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'analytics') {
    return (
      <div className="space-y-6">
        {/* Two stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`card border ${cardBg} p-5 rounded-2xl space-y-3`}>
              <div className={`h-3.5 w-24 rounded ${pulseText} animate-pulse`} />
              <div className={`h-8 w-32 rounded ${pulseBg} animate-pulse`} />
            </div>
          ))}
        </div>

        {/* Large Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`card p-6 border ${cardBg} rounded-2xl space-y-4`}>
              <div className="flex justify-between">
                <div className={`h-5 w-40 rounded ${pulseBg} animate-pulse`} />
                <div className={`h-4 w-12 rounded ${pulseText} animate-pulse`} />
              </div>
              <div className={`h-[250px] w-full rounded-xl ${pulseText} animate-pulse`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'economics') {
    return (
      <div className="space-y-6">
        {/* Quick summary strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`card border ${cardBg} p-5 rounded-2xl space-y-2`}>
              <div className={`h-3 w-20 rounded ${pulseText} animate-pulse`} />
              <div className={`h-6 w-24 rounded ${pulseBg} animate-pulse`} />
            </div>
          ))}
        </div>

        {/* Table rows skeleton */}
        <div className={`card border ${cardBg} rounded-2xl overflow-hidden`}>
          <div className="p-6 border-b border-zinc-900/60">
            <div className={`h-5 w-48 rounded ${pulseBg} animate-pulse`} />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 5, 6].map((i) => (
              <div key={i} className="flex justify-between items-center border-b border-zinc-900/20 pb-4 last:border-b-0 last:pb-0">
                <div className="space-y-2">
                  <div className={`h-3.5 w-32 rounded ${pulseBg} animate-pulse`} />
                  <div className={`h-2.5 w-16 rounded ${pulseText} animate-pulse`} />
                </div>
                <div className="flex gap-8">
                  <div className={`h-4 w-16 rounded ${pulseText} animate-pulse`} />
                  <div className={`h-4 w-20 rounded ${pulseBg} animate-pulse`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'reviews') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className={`h-5 w-44 rounded ${pulseBg} animate-pulse`} />
          <div className={`h-8 w-28 rounded ${pulseBg} animate-pulse`} />
        </div>
        
        {/* Staggered vertical cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`card p-6 border ${cardBg} rounded-2xl space-y-4`}>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className={`h-4.5 w-28 rounded ${pulseBg} animate-pulse`} />
                  <div className={`h-3 w-16 rounded ${pulseText} animate-pulse`} />
                </div>
                <div className={`w-8 h-8 rounded-full ${pulseText} animate-pulse`} />
              </div>
              <div className="space-y-2">
                <div className={`h-3 w-full rounded ${pulseText} animate-pulse`} />
                <div className={`h-3 w-5/6 rounded ${pulseText} animate-pulse`} />
              </div>
              <div className="flex gap-2 pt-2">
                <div className={`h-6 w-16 rounded-full ${pulseBg} animate-pulse`} />
                <div className={`h-6 w-20 rounded-full ${pulseBg} animate-pulse`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex items-center gap-3 p-3 border border-dashed border-zinc-900/50 rounded-xl`}>
            <div className={`w-8 h-8 rounded-full ${pulseBg} animate-pulse flex-shrink-0`} />
            <div className="space-y-1.5 w-full">
              <div className={`h-3.5 w-1/3 rounded ${pulseBg} animate-pulse`} />
              <div className={`h-2.5 w-1/4 rounded ${pulseText} animate-pulse`} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default block skeleton
  return (
    <div className={`card p-6 border ${cardBg} rounded-2xl space-y-4`}>
      <div className={`h-5 w-1/4 rounded ${pulseBg} animate-pulse`} />
      <div className="space-y-2">
        <div className={`h-3 w-full rounded ${pulseText} animate-pulse`} />
        <div className={`h-3 w-5/6 rounded ${pulseText} animate-pulse`} />
        <div className={`h-3 w-2/3 rounded ${pulseText} animate-pulse`} />
      </div>
    </div>
  )
}
