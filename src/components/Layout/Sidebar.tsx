import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FolderKanban, Settings, GraduationCap } from 'lucide-react'
import { clsx } from '../../utils/clsx'

const links = [
  { to: '/', icon: LayoutDashboard, label: '儀表板' },
  { to: '/courses', icon: BookOpen, label: '課程' },
  { to: '/projects', icon: FolderKanban, label: '小組專案' },
  { to: '/settings', icon: Settings, label: '設定' },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-200 dark:border-slate-700">
        <GraduationCap size={22} className="text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">課程工作台</span>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 text-center">
        v0.1.0
      </div>
    </aside>
  )
}
