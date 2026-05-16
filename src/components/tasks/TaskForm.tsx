import { useState } from 'react'
import type { Task } from '../../types'
import { Button } from '../ui/Button'

const TYPE_OPTIONS: { value: Task['type']; label: string }[] = [
  { value: 'assignment', label: '作業' },
  { value: 'exam', label: '考試' },
  { value: 'report', label: '報告' },
  { value: 'project', label: '專題' },
]

const STATUS_OPTIONS: { value: Task['status']; label: string }[] = [
  { value: 'todo', label: '待辦' },
  { value: 'in_progress', label: '進行中' },
  { value: 'done', label: '完成' },
]

interface TaskFormProps {
  initial?: Partial<Task>
  courseId: string
  onSubmit: (data: Omit<Task, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
}

export function TaskForm({ initial, courseId, onSubmit, onCancel }: TaskFormProps) {
  const [form, setForm] = useState({
    type: (initial?.type ?? 'assignment') as Task['type'],
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 16) : '',
    status: (initial?.status ?? 'todo') as Task['status'],
    scope: initial?.scope ?? '',
    weight: initial?.weight?.toString() ?? '',
    grade: initial?.grade ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.dueDate) return
    setSaving(true)
    await onSubmit({
      courseId,
      type: form.type,
      title: form.title.trim(),
      description: form.description || undefined,
      dueDate: new Date(form.dueDate).toISOString(),
      status: form.status,
      scope: form.scope || undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      grade: form.grade || undefined,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">類型</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">狀態</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">標題 *</label>
        <input className="input" placeholder="期末考" value={form.title} onChange={e => set('title', e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">截止日期 *</label>
        <input className="input" type="datetime-local" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">說明</label>
        <textarea className="input min-h-[72px] resize-y" placeholder="額外說明" value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      {(form.type === 'exam') && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">考試範圍</label>
          <input className="input" placeholder="第 3-5 章" value={form.scope} onChange={e => set('scope', e.target.value)} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">佔學期成績 %</label>
          <input className="input" type="number" min="0" max="100" placeholder="20" value={form.weight} onChange={e => set('weight', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">得分（事後填）</label>
          <input className="input" placeholder="92" value={form.grade} onChange={e => set('grade', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={saving}>{saving ? '儲存中…' : '儲存'}</Button>
      </div>
    </form>
  )
}
