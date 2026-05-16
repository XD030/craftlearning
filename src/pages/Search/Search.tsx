import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, FileText, CheckSquare, Paperclip } from 'lucide-react'
import { searchAll, type SearchResult } from '../../db/search'
import { getCoursesBySemester } from '../../db/courses'
import { getAllSemesters } from '../../db/semesters'

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

const TYPE_ICONS = { note: FileText, task: CheckSquare, material: Paperclip }
const TYPE_LABELS = { note: '筆記', task: '作業/考試', material: '講義' }
const TYPE_ORDER = ['note', 'task', 'material'] as const

export function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [courseNames, setCourseNames] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 200)

  useEffect(() => {
    getAllSemesters().then(async semesters => {
      const all = (await Promise.all(semesters.map(s => getCoursesBySemester(s.id)))).flat()
      setCourseNames(Object.fromEntries(all.map(c => [c.id, c.name])))
    })
  }, [])

  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchAll(debouncedQuery).then(setResults)
    } else {
      setResults([])
    }
  }, [debouncedQuery])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function navigateToResult(r: SearchResult) {
    if (r.type === 'note') navigate(`/notes/${r.id}`)
    else navigate(`/courses/${r.courseId}`)
  }

  const grouped = TYPE_ORDER.reduce<Record<string, SearchResult[]>>((acc, t) => {
    const items = results.filter(r => r.type === t)
    if (items.length) acc[t] = items
    return acc
  }, {})

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">搜尋</h1>

      <div className="flex items-center gap-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 mb-8 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-shadow">
        <SearchIcon size={18} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-sm"
          placeholder="搜尋筆記、作業、講義…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">清除</button>
        )}
      </div>

      {!query.trim() ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">輸入關鍵字開始搜尋</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">找不到「{query}」的相關結果</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS]
            return (
              <section key={type}>
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Icon size={12} /> {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                  <span className="text-slate-300 dark:text-slate-600 font-normal ml-1">{items.length}</span>
                </h2>
                <div className="space-y-1.5">
                  {items.map(r => (
                    <button
                      key={r.id}
                      onClick={() => navigateToResult(r)}
                      className="w-full text-left flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group"
                    >
                      <Icon size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {r.title}
                          </span>
                          {r.meta && <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{r.meta}</span>}
                        </div>
                        {r.snippet && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.snippet}</p>}
                        {courseNames[r.courseId] && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{courseNames[r.courseId]}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
