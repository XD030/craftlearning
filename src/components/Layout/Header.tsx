import { Sun, Moon, Search } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

interface HeaderProps {
  onSearchClick: () => void
}

export function Header({ onSearchClick }: HeaderProps) {
  const { state, dispatch } = useApp()

  const now = new Date()
  const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} 週${DAY_NAMES[now.getDay()]}`

  function toggleTheme() {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' })
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6">
      <span className="text-sm text-slate-500 dark:text-slate-400">{dateStr}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Search size={14} />
          <span>搜尋</span>
          <kbd className="text-xs text-slate-400 dark:text-slate-500 font-mono">⌘K</kbd>
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {state.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  )
}
