import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, CheckSquare, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Course, Note, Material, QuizQuestion } from '../../types'
import { getCourseById } from '../../db/courses'
import { getNotesByCourse } from '../../db/notes'
import { getMaterialsByCourse } from '../../db/materials'
import { getQuizzesByCourse } from '../../db/quizzes'
import { Button } from '../../components/ui/Button'
import { clsx } from '../../utils/clsx'

type Step = 'config' | 'review'

export function ReviewMode() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([])
  const [step, setStep] = useState<Step>('config')

  const allWeeks = [...new Set([
    ...allNotes.map(n => n.week).filter((w): w is number => w != null),
    ...allMaterials.map(m => m.week).filter((w): w is number => w != null),
  ])].sort((a, b) => a - b)
  const allTags = [...new Set(allNotes.flatMap(n => n.tags))]

  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [includeAll, setIncludeAll] = useState(true)
  const [includeQuiz, setIncludeQuiz] = useState(true)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    getCourseById(id).then(c => { if (c) setCourse(c) })
    getNotesByCourse(id).then(setAllNotes)
    getMaterialsByCourse(id).then(setAllMaterials)
    getQuizzesByCourse(id).then(setAllQuestions)
  }, [id])

  const filteredNotes = allNotes.filter(n => {
    if (includeAll) return true
    const weekMatch = selectedWeeks.length === 0 || (n.week != null && selectedWeeks.includes(n.week))
    const tagMatch = selectedTags.length === 0 || n.tags.some(t => selectedTags.includes(t))
    return weekMatch && tagMatch
  })

  const filteredMaterials = allMaterials.filter(m => {
    if (includeAll) return true
    return selectedWeeks.length === 0 || (m.week != null && selectedWeeks.includes(m.week))
  })

  const filteredQuestions = includeQuiz
    ? allQuestions.filter(q => {
        if (includeAll) return true
        return selectedTags.length === 0 || q.tags.some(t => selectedTags.includes(t))
      })
    : []

  const totalItems = filteredNotes.length + filteredQuestions.length
  const checkedCount = [...checked].filter(k => {
    const [type] = k.split(':')
    return type === 'note' || type === 'q'
  }).length

  function toggleWeek(w: number) {
    setSelectedWeeks(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])
  }
  function toggleTag(t: string) {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleCheck(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function exportMarkdown() {
    if (!course) return
    const lines: string[] = [`# ${course.name} 考前複習\n`]
    if (filteredNotes.length > 0) {
      lines.push('## 筆記\n')
      for (const n of filteredNotes) {
        lines.push(`### ${n.title}${n.week ? ` (第 ${n.week} 週)` : ''}\n`)
        if (n.content) lines.push(n.content + '\n')
      }
    }
    if (filteredMaterials.length > 0) {
      lines.push('## 講義\n')
      for (const m of filteredMaterials) {
        lines.push(`- **${m.title}**${m.week ? ` (第 ${m.week} 週)` : ''}${m.url ? ` — ${m.url}` : ''}\n`)
      }
    }
    if (filteredQuestions.length > 0) {
      lines.push('## 自測題目\n')
      filteredQuestions.forEach((q, i) => {
        lines.push(`**Q${i + 1}**: ${q.question}\n`)
        q.options.forEach((opt, j) => {
          lines.push(`${j === q.correctIndex ? '✓' : ' '} ${String.fromCharCode(65 + j)}. ${opt}`)
        })
        if (q.explanation) lines.push(`\n> ${q.explanation}`)
        lines.push('')
      })
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${course.name}-複習.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => step === 'review' ? setStep('config') : navigate(`/courses/${id}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} />
          {step === 'review' ? '修改範圍' : (course?.name ?? '返回課程')}
        </button>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">考前複習模式</span>
        {step === 'review' ? (
          <Button variant="ghost" size="sm" onClick={exportMarkdown}>
            <Download size={14} /> 匯出 Markdown
          </Button>
        ) : (
          <div className="w-24" />
        )}
      </div>

      {step === 'config' ? (
        <div className="max-w-lg mx-auto p-8 w-full">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">設定複習範圍</h2>

          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAll}
                  onChange={e => setIncludeAll(e.target.checked)}
                  className="accent-blue-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">包含全部內容</span>
              </label>
              {!includeAll && (
                <div className="pl-5 space-y-4">
                  {allWeeks.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">篩選週次</p>
                      <div className="flex flex-wrap gap-2">
                        {allWeeks.map(w => (
                          <button
                            key={w}
                            onClick={() => toggleWeek(w)}
                            className={clsx(
                              'text-xs px-3 py-1 rounded-full border transition-colors',
                              selectedWeeks.includes(w)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400',
                            )}
                          >
                            第 {w} 週
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {allTags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">篩選標籤</p>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map(t => (
                          <button
                            key={t}
                            onClick={() => toggleTag(t)}
                            className={clsx(
                              'text-xs px-3 py-1 rounded-full border transition-colors',
                              selectedTags.includes(t)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400',
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeQuiz}
                onChange={e => setIncludeQuiz(e.target.checked)}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">包含自測題目</span>
            </label>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p>筆記：<strong className="text-slate-800 dark:text-slate-200">{filteredNotes.length}</strong> 則</p>
            <p>講義：<strong className="text-slate-800 dark:text-slate-200">{filteredMaterials.length}</strong> 份</p>
            {includeQuiz && <p>題目：<strong className="text-slate-800 dark:text-slate-200">{filteredQuestions.length}</strong> 道</p>}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep('review')} disabled={filteredNotes.length + filteredMaterials.length === 0}>
              開始複習
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto p-8 w-full">
          {/* Progress */}
          <div className="mb-8 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">複習進度</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{checkedCount} / {totalItems}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: totalItems > 0 ? `${checkedCount / totalItems * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Notes */}
          {filteredNotes.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">筆記</h2>
              <div className="space-y-4">
                {filteredNotes.map(note => {
                  const key = `note:${note.id}`
                  const done = checked.has(key)
                  return (
                    <div key={note.id} className={clsx('rounded-xl border overflow-hidden transition-opacity', done ? 'opacity-60 border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800')}>
                      <div
                        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                        onClick={() => toggleCheck(key)}
                      >
                        {done
                          ? <CheckSquare size={16} className="text-green-500 flex-shrink-0" />
                          : <Square size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        }
                        <span className={clsx('font-medium text-sm flex-1', done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100')}>
                          {note.title}
                        </span>
                        {note.week && <span className="text-xs text-slate-400">第 {note.week} 週</span>}
                      </div>
                      {!done && note.content && (
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Materials */}
          {filteredMaterials.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">講義</h2>
              <div className="space-y-2">
                {filteredMaterials.map(m => (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm">
                    <span className="text-slate-800 dark:text-slate-100 flex-1">{m.title}</span>
                    {m.week && <span className="text-xs text-slate-400">第 {m.week} 週</span>}
                    {m.type === 'link' && m.url && (
                      <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">開啟連結</a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quiz */}
          {filteredQuestions.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">自測題目</h2>
              <div className="space-y-3">
                {filteredQuestions.map((q, idx) => {
                  const key = `q:${q.id}`
                  const done = checked.has(key)
                  return (
                    <div
                      key={q.id}
                      className={clsx('rounded-lg border p-4 transition-opacity cursor-pointer', done ? 'opacity-60 border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800')}
                      onClick={() => toggleCheck(key)}
                    >
                      <div className="flex items-start gap-3">
                        {done
                          ? <CheckSquare size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                          : <Square size={15} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                        }
                        <div className="flex-1">
                          <p className={clsx('text-sm mb-2', done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100')}>
                            <span className="font-mono text-xs text-slate-400 mr-1">Q{idx + 1}</span> {q.question}
                          </p>
                          {!done && (
                            <div className="space-y-1">
                              {q.options.map((opt, i) => (
                                <p key={i} className={clsx('text-xs', i === q.correctIndex ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-400')}>
                                  {i === q.correctIndex ? '✓' : '○'} {opt}
                                </p>
                              ))}
                              {q.explanation && (
                                <p className="text-xs text-slate-400 mt-1 italic">{q.explanation}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
