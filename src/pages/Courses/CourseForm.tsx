import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Course, ScheduleSlot } from '../../types'
import { Button } from '../../components/ui/Button'

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#84cc16',
]

const DAY_OPTIONS = [
  { value: 1, label: '週一' },
  { value: 2, label: '週二' },
  { value: 3, label: '週三' },
  { value: 4, label: '週四' },
  { value: 5, label: '週五' },
  { value: 6, label: '週六' },
  { value: 0, label: '週日' },
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
    classroom: initial?.classroom ?? '',
    color: initial?.color ?? PRESET_COLORS[0],
    gradingPolicy: initial?.gradingPolicy ?? '',
  })
  const [slots, setSlots] = useState<ScheduleSlot[]>(initial?.scheduleSlots ?? [])
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addSlot() {
    setSlots(s => [...s, { day: 1, startTime: '08:00', endTime: '10:00', location: '' }])
  }

  function removeSlot(i: number) {
    setSlots(s => s.filter((_, idx) => idx !== i))
  }

  function updateSlot(i: number, patch: Partial<ScheduleSlot>) {
    setSlots(s => s.map((slot, idx) => idx === i ? { ...slot, ...patch } : slot))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const cleanedSlots = slots.map(s => ({
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      ...(s.location?.trim() ? { location: s.location.trim() } : {}),
    }))
    await onSubmit({
      semesterId,
      name: form.name.trim(),
      code: form.code || undefined,
      instructor: form.instructor || undefined,
      credits: form.credits ? Number(form.credits) : undefined,
      classroom: form.classroom || undefined,
      scheduleSlots: cleanedSlots.length > 0 ? cleanedSlots : undefined,
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">授課教師</label>
          <input className="input" placeholder="王小明 教授" value={form.instructor} onChange={e => set('instructor', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">預設教室</label>
          <input className="input" placeholder="資工系館 101" value={form.classroom} onChange={e => set('classroom', e.target.value)} />
        </div>
      </div>

      {/* Schedule slots */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">上課時段</label>
          <button
            type="button"
            onClick={addSlot}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus size={13} />新增時段
          </button>
        </div>
        {slots.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-1">尚未設定，點「新增時段」加入上課時間</p>
        )}
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
              <select
                className="input py-1 w-20 text-sm"
                value={slot.day}
                onChange={e => updateSlot(i, { day: Number(e.target.value) })}
              >
                {DAY_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <input
                type="time"
                className="input py-1 w-28 text-sm"
                value={slot.startTime}
                onChange={e => updateSlot(i, { startTime: e.target.value })}
              />
              <span className="text-slate-400 text-xs">–</span>
              <input
                type="time"
                className="input py-1 w-28 text-sm"
                value={slot.endTime}
                onChange={e => updateSlot(i, { endTime: e.target.value })}
              />
              <input
                className="input py-1 flex-1 text-sm min-w-0"
                placeholder="教室（選填）"
                value={slot.location ?? ''}
                onChange={e => updateSlot(i, { location: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
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
