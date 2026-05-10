import { useMemo } from 'react'

export type Theme = 'dark' | 'light'

export interface ThemeClasses {
  bgClass: string
  textClass: string
  cardBgClass: string
  subTextClass: string
  borderClass: string
}

export function useThemeClasses(theme: Theme): ThemeClasses {
  return useMemo(() => ({
    bgClass: theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200',
    textClass: theme === 'dark' ? 'text-white' : 'text-zinc-900',
    cardBgClass: theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50',
    subTextClass: theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500',
    borderClass: theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200',
  }), [theme])
}

export function useChartTheme(theme: Theme) {
  return useMemo(() => ({
    gridColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
    axisColor: theme === 'dark' ? '#71717a' : '#52525b',
    tooltipBg: theme === 'dark' ? '#18181b' : '#fff',
    tooltipBorder: theme === 'dark' ? '#27272a' : '#e4e4e7',
  }), [theme])
}