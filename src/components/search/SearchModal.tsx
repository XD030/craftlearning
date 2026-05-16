import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, CheckSquare, Paperclip, ArrowRight } from 'lucide-react'
import { searchAll, type SearchResult } from '../../db/search'
import { getCoursesBySemester } from '../../db/courses'
import { getAllSemesters } from '../../db/semesters'
import { clsx } from '../../utils/clsx'

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

const TYPE_ICONS = {
  note: FileText,
  task: CheckSquare,
  material: Paperclip,
}
const TYPE_LABELS = { note: '筆記', task: '作業/考試', material: '講義' }
const TYPE_ORDER = ['note', 'task', 'material'] as const

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [courseNames, setCourseNames] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 200)

  // Load course names for display
  useEffect(() => {
    getAllSemesters().then(async semesters => {
      const allCourses = (await Promise.all(semesters.map(s => getCoursesBySemester(s.id)))).flat()
      setCourseNames(Object.fromEntries(allCourses.map(c => [c.id, c.name])))
    })
  }, [])

  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchAll(debouncedQuery).then(r => { setResults(r); setSelected(0) })
    } else {
      setResults([])
      setSelected(0)
    }
  }, [debouncedQuery])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const navigateToResult = useCallback((r: SearchResult) => {
    if (r.type === 'note') {
      navigate(`/notes/${r.id}`)
    } else {
      navigate(`/courses/${r.courseId}`)
    }
    onClose()
  }, [navigate, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) { navigateToResult(results[selected]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, selected, navigateToResult, onClose])

  if (!open) return null

  // Group results by type
  const grouped = TYPE_ORDER.reduce<Record<string, SearchResult[]>>((acc, t) => {
    const items = results.filter(r => r.type === t)
    if (items.length) acc[t] = items
    return acc
  }, {})

  let itemIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-700">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-sm"
            placeholder="搜尋筆記、作業、講義…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="max-h-96 overflow-y-auto py-2">
            {results.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">找不到結果</p>
            ) : (
              Object.entries(grouped).map(([type, items]) => {
                const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS]
                return (
                  <div key={type} className="mb-2">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-4 py-1.5">
                      {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                    </p>
                    {items.map(r => {
                      const idx = itemIndex++
                      const isSelected = selected === idx
                      return (
                        <button
                          key={r.id}
                          className={clsx(
                            'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                          )}
                          onClick={() => navigateToResult(r)}
                          onMouseEnter={() => setSelected(idx)}
                        >
                          <Icon size={14} className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.title}</span>
                              {r.meta && (
                                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{r.meta}</span>
                              )}
                            </div>
                            {r.snippet && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.snippet}</p>
                            )}
                            {courseNames[r.courseId] && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{courseNames[r.courseId]}</p>
                            )}
                          </div>
                          {isSelected && <ArrowRight size={14} className="flex-shrink-0 text-blue-500 mt-0.5" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          <span><kbd className="font-mono">↑↓</kbd> 選擇</span>
          <span><kbd className="font-mono">Enter</kbd> 開啟</span>
          <span><kbd className="font-mono">Esc</kbd> 關閉</span>
        </div>
      </div>
    </div>
  )
}
