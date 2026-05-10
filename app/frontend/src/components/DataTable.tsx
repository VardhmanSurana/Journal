import type { Theme } from '../utils/theme'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  theme: Theme
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  theme,
  onRowClick,
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  const borderClass = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'
  const divideClass = theme === 'dark' ? 'divide-zinc-800' : 'divide-zinc-100'
  const thClass = 'pb-4 font-medium text-zinc-400'

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className={`border-b ${borderClass}`}>
            {columns.map(col => (
              <th key={col.key} className={`${thClass} ${alignClasses[col.align || 'left']}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y ${divideClass}`}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-zinc-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr 
                key={keyExtractor(row)} 
                className={onRowClick ? 'cursor-pointer hover:bg-zinc-800/50' : 'group'}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td 
                    key={col.key} 
                    className={`py-4 ${alignClasses[col.align || 'left']} ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}
                  >
                    {col.render 
                      ? col.render(row) 
                      : String((row as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}