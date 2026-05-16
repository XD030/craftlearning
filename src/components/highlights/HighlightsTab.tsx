import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Edit2, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Note } from '../../types'
import { getNotesByCourse } from '../../db/notes'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

interface Props {
  courseId: string
}

export function HighlightsTab({ courseId }: Props) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    getNotesByCourse(courseId).then(all => setNotes(all.filter(n => n.isHighlight)))
  }, [courseId])

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="尚無重點筆記"
        description="在筆記編輯器中啟用「重點」標記，即可在此集中檢視所有重點內容"
      />
    )
  }

  const byWeek = notes.reduce<Record<string, Note[]>>((acc, n) => {
    const key = n.week != null ? `第 ${n.week} 週` : '未分週'
    ;(acc[key] ??= []).push(n)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{notes.length} 則重點筆記</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/courses/${courseId}/review`)}>
          <BookOpen size={14} /> 考前複習模式
        </Button>
      </div>

      <div className="space-y-8">
        {Object.entries(byWeek).map(([week, weekNotes]) => (
          <div key={week}>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              {week}
            </h3>
            <div className="space-y-4">
              {weekNotes.map(note => (
                <div
                  key={note.id}
                  className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-3 border-b border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Star size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                        {note.title}
                      </span>
                      {note.tags.length > 0 && (
                        <div className="flex gap-1 flex-shrink-0">
                          {note.tags.map(t => (
                            <span
                              key={t}
                              className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/notes/${note.id}`)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 ml-3"
                    >
                      <Edit2 size={12} /> 編輯
                    </button>
                  </div>
                  <div className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none">
                    {note.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                    ) : (
                      <p className="text-slate-400 italic text-sm not-italic">（尚無內容）</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
