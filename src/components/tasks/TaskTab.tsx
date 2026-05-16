import { useState, useEffect } from 'react'
import { Plus, CheckSquare, Edit2, Trash2 } from 'lucide-react'
import type { Task } from '../../types'
import { getTasksByCourse, createTask, updateTask, deleteTask } from '../../db/tasks'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { TaskForm } from './TaskForm'
import { clsx } from '../../utils/clsx'

const TYPE_LABELS: Record<Task['type'], string> = {
  assignment: '作業', exam: '考試', report: '報告', project: '專題',
}
const STATUS_LABELS: Record<Task['status'], string> = {
  todo: '待辦', in_progress: '進行中', done: '完成',
}
const STATUS_COLORS: Record<Task['status'], string> = {
  todo: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}
const TYPE_COLORS: Record<Task['type'], string> = {
  assignment: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  exam: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  report: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  project: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
}

function formatDue(dueDate: string): { label: string; urgent: boolean; overdue: boolean } {
  const diff = new Date(dueDate).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `逾期 ${Math.abs(days)} 天`, urgent: false, overdue: true }
  if (days === 0) return { label: '今天到期', urgent: true, overdue: false }
  if (days === 1) return { label: '明天到期', urgent: true, overdue: false }
  return { label: `${days} 天後到期`, urgent: days <= 3, overdue: false }
}

interface TaskTabProps {
  courseId: string
}

export function TaskTab({ courseId }: TaskTabProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    getTasksByCourse(courseId).then(setTasks)
  }, [courseId])

  async function handleCreate(data: Omit<Task, 'id' | 'createdAt'>) {
    const task = await createTask(data)
    setTasks(ts => [...ts, task].sort((a, b) => a.dueDate.localeCompare(b.dueDate)))
    setShowAdd(false)
  }

  async function handleUpdate(data: Omit<Task, 'id' | 'createdAt'>) {
    if (!editing) return
    await updateTask(editing.id, data)
    setTasks(ts => ts.map(t => t.id === editing.id ? { ...t, ...data } : t).sort((a, b) => a.dueDate.localeCompare(b.dueDate)))
    setEditing(null)
  }

  async function handleDelete(id: string) {
    await deleteTask(id)
    setTasks(ts => ts.filter(t => t.id !== id))
    setDeletingId(null)
  }

  async function toggleStatus(task: Task) {
    const next: Task['status'] = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done'
    await updateTask(task.id, { status: next })
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: next } : t))
  }

  const pending = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done')

  return (
    <div>
      <div className="flex justify-end mb-5">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> 新增作業/考試
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="還沒有任何作業或考試"
          description="新增第一筆，開始追蹤進度"
          actionLabel="新增"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">進行中 / 待辦</h3>
              <div className="space-y-2">
                {pending.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggleStatus(task)} onEdit={() => setEditing(task)} onDelete={() => setDeletingId(task.id)} />
                ))}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">已完成</h3>
              <div className="space-y-2 opacity-60">
                {done.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggleStatus(task)} onEdit={() => setEditing(task)} onDelete={() => setDeletingId(task.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新增作業/考試" size="md">
        <TaskForm courseId={courseId} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="編輯" size="md">
        {editing && <TaskForm initial={editing} courseId={courseId} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        title="刪除"
        message="確定要刪除這筆記錄嗎？"
        confirmLabel="確認刪除"
        danger
      />
    </div>
  )
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { label, urgent, overdue } = formatDue(task.dueDate)
  const dueStr = new Date(task.dueDate).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <button onClick={onToggle} className="flex-shrink-0">
        <div className={clsx(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          task.status === 'done' ? 'bg-green-500 border-green-500' : task.status === 'in_progress' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600'
        )}>
          {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          {task.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', TYPE_COLORS[task.type])}>{TYPE_LABELS[task.type]}</span>
          <span className={clsx('text-xs px-1.5 py-0.5 rounded', STATUS_COLORS[task.status])}>{STATUS_LABELS[task.status]}</span>
          {task.grade && <span className="text-xs text-slate-500 dark:text-slate-400">得分: {task.grade}</span>}
        </div>
        <p className={clsx('text-sm font-medium truncate', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100')}>{task.title}</p>
        {task.scope && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">範圍: {task.scope}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className={clsx('text-xs font-medium', overdue ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-slate-400')}>{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{dueStr}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 size={13} /></button>
        <button onClick={onDelete} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
