import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-slate-100 dark:bg-slate-700 p-4 mb-4">
        <Icon size={32} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}
