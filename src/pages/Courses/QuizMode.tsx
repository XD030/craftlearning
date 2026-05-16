import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react'
import type { QuizQuestion } from '../../types'
import type { Course } from '../../types'
import { getQuizzesByCourse, recordAnswer } from '../../db/quizzes'
import { getCourseById } from '../../db/courses'
import { Button } from '../../components/ui/Button'
import { clsx } from '../../utils/clsx'

type Phase = 'quiz' | 'results'

interface AnswerRecord {
  q: QuizQuestion
  chosen: number
}

export function QuizMode() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [phase, setPhase] = useState<Phase>('quiz')

  function loadQuestions(courseId: string) {
    getQuizzesByCourse(courseId).then(qs => {
      setQuestions([...qs].sort(() => Math.random() - 0.5))
    })
  }

  useEffect(() => {
    if (!id) return
    getCourseById(id).then(c => { if (c) setCourse(c) })
    loadQuestions(id)
  }, [id])

  async function handleAnswer(idx: number) {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    const q = questions[current]
    await recordAnswer(q.id, idx === q.correctIndex)
    setAnswers(prev => [...prev, { q, chosen: idx }])
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setPhase('results')
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  function restart() {
    setCurrent(0)
    setSelected(null)
    setAnswered(false)
    setAnswers([])
    setPhase('quiz')
    if (id) loadQuestions(id)
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">載入中…</p>
      </div>
    )
  }

  if (phase === 'results') {
    const correct = answers.filter(r => r.chosen === r.q.correctIndex).length
    const total = answers.length
    const wrong = answers.filter(r => r.chosen !== r.q.correctIndex)
    const pct = Math.round(correct / total * 100)

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <button
            onClick={() => navigate(`/courses/${id}`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} /> {course?.name ?? '返回課程'}
          </button>
        </div>

        <div className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-10">
            <div className="text-7xl font-bold text-slate-900 dark:text-white mb-1">
              {correct}
              <span className="text-3xl text-slate-400 dark:text-slate-500">/{total}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              正確率 <span className={clsx('font-semibold', pct >= 80 ? 'text-green-600 dark:text-green-400' : pct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500')}>
                {pct}%
              </span>
            </p>
          </div>

          {wrong.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">答錯的題目</h2>
              <div className="space-y-4">
                {wrong.map(({ q, chosen }) => (
                  <div key={q.id} className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">{q.question}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, i) => (
                        <div key={i} className={clsx('flex items-center gap-2 text-sm px-2 py-1 rounded', i === q.correctIndex && 'bg-green-100 dark:bg-green-900/20')}>
                          {i === q.correctIndex
                            ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                            : i === chosen
                              ? <XCircle size={14} className="text-red-500 flex-shrink-0" />
                              : <span className="w-3.5 flex-shrink-0" />
                          }
                          <span className={clsx(
                            i === q.correctIndex && 'text-green-700 dark:text-green-300 font-medium',
                            i === chosen && i !== q.correctIndex && 'text-red-600 dark:text-red-400',
                            i !== q.correctIndex && i !== chosen && 'text-slate-500 dark:text-slate-400',
                          )}>
                            {opt}
                          </span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-red-200 dark:border-red-800 pt-2">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate(`/courses/${id}`)}>回到課程</Button>
            <Button onClick={restart}><RotateCcw size={14} /> 再測一次</Button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]

  function optionStyle(i: number): string {
    if (!answered) return 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
    if (i === q.correctIndex) return 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    if (i === selected) return 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    return 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(`/courses/${id}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} /> {course?.name ?? '返回'}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{current + 1} / {questions.length}</span>
          <div className="w-32 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(current + 1) / questions.length * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <p className="text-lg font-medium text-slate-900 dark:text-white mb-8 leading-relaxed">{q.question}</p>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                className={clsx(
                  'w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm',
                  !answered && 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer',
                  answered && 'cursor-default',
                  optionStyle(i),
                )}
              >
                <span className="font-mono text-xs mr-3 opacity-60">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          {answered && (
            <div className="mt-6">
              {selected === q.correctIndex ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3 font-semibold">
                  <CheckCircle2 size={18} /> 正確！
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500 dark:text-red-400 mb-3 font-semibold">
                  <XCircle size={18} /> 答錯了
                </div>
              )}
              {q.explanation && (
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3 mb-4">
                  {q.explanation}
                </p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleNext}>
                  {current + 1 >= questions.length ? '查看結果' : '下一題'} <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
