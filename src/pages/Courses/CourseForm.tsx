import { useState } from 'react'
import type { Course } from '../../types'
import { Button } from '../../components/ui/Button'

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#84cc16',
]

interface CourseFormProps {
  initial?: Partial<Course>
  semesterId: string
  onSubmit: (data: Omit<Course, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
}

export function CourseForm({ initial, semesterId, onSubmit, onCancel }: CourseFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    instructor: initial?.instructor ?? '',
    credits: initial?.credits?.toString() ?? '',
    schedule: initial?.schedule ?? '',
    classroom: initial?.classroom ?? '',
    color: initial?.color ?? PRESET_COLORS[0],
    gradingPolicy: initial?.gradingPolicy ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await onSubmit({
      semesterId,
      name: form.name.trim(),
      code: form.code || undefined,
      instructor: form.instructor || undefined,
      credits: form.credits ? Number(form.credits) : undefined,
      schedule: form.schedule || undefined,
      classroom: form.classroom || undefined,
      color: form.color,
      gradingPolicy: form.gradingPolicy || undefined,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">課程名稱 *</label>
        <input
          className="input"
          placeholder="計算機概論"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">課號</label>
          <input className="input" placeholder="CS101" value={form.code} onChange={e => set('code', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">學分</label>
          <input className="input" type="number" min="0" max="10" placeholder="3" value={form.credits} onChange={e => set('credits', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">授課教師</label>
        <input className="input" placeholder="王小明 教授" value={form.instructor} onChange={e => set('instructor', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">上課時間</label>
          <input className="input" placeholder="週一 10:10-12:00" value={form.schedule} onChange={e => set('schedule', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">教室</label>
          <input className="input" placeholder="資工系館 101" value={form.classroom} onChange={e => set('classroom', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">主題色</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : undefined }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">評分方式</label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder="期中 30%、期末 40%、作業 30%"
          value={form.gradingPolicy}
          onChange={e => set('gradingPolicy', e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={saving}>{saving ? '儲存中…' : '儲存'}</Button>
      </div>
    </form>
  )
}
