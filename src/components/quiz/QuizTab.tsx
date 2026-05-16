import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Zap } from 'lucide-react'
import type { QuizQuestion } from '../../types'
import { getQuizzesByCourse, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion } from '../../db/quizzes'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { QuizForm, type QuizFormData } from './QuizForm'

interface Props {
  courseId: string
}

export function QuizTab({ courseId }: Props) {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<QuizQuestion | null>(null)
  const [deleting, setDeleting] = useState<QuizQuestion | null>(null)

  useEffect(() => {
    getQuizzesByCourse(courseId).then(setQuestions)
  }, [courseId])

  async function handleCreate(data: QuizFormData) {
    const q = await createQuizQuestion(data)
    setQuestions(prev => [...prev, q])
    setShowForm(false)
  }

  async function handleUpdate(data: QuizFormData) {
    if (!editing) return
    await updateQuizQuestion(editing.id, data)
    setQuestions(prev => prev.map(q => q.id === editing.id ? { ...q, ...data } : q))
    setEditing(null)
  }

  async function handleDelete() {
    if (!deleting) return
    await deleteQuizQuestion(deleting.id)
    setQuestions(prev => prev.filter(q => q.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{questions.length} 道題目</p>
        <div className="flex gap-2">
          {questions.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/courses/${courseId}/quiz`)}>
              <Zap size={14} /> 開始自測
            </Button>
          )}
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> 新增題目
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="尚無自測題目"
          description="新增選擇題，即可在考前快速自我測驗，並追蹤作答統計"
          actionLabel="新增第一道題目"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0">
                      Q{idx + 1}
                    </span>
                    <p className="text-sm text-slate-800 dark:text-slate-100">{q.question}</p>
                  </div>
                  <div className="mt-2 space-y-1 pl-6">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`text-xs flex-shrink-0 ${i === q.correctIndex ? 'text-green-600 dark:text-green-400' : 'text-slate-300 dark:text-slate-600'}`}>
                          {i === q.correctIndex ? '✓' : '○'}
                        </span>
                        <span className={`text-sm ${i === q.correctIndex ? 'text-green-700 dark:text-green-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                          {opt}
                        </span>
                      </div>
                    ))}
                  </div>
                  {q.timesAnswered > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 pl-6">
                      已答 {q.timesAnswered} 次・正確率 {Math.round(q.timesCorrect / q.timesAnswered * 100)}%
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => setEditing(q)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setDeleting(q)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="新增自測題目" size="lg">
        <QuizForm courseId={courseId} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="編輯題目" size="lg">
        {editing && (
          <QuizForm
            courseId={courseId}
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="刪除題目"
        message="確定要刪除這道題目嗎？作答統計也將一併清除。"
        confirmLabel="確認刪除"
        danger
      />
    </div>
  )
}
