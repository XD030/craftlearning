import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { QuizQuestion } from '../../types'
import { Button } from '../ui/Button'

export type QuizFormData = {
  courseId: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
  tags: string[]
}

interface Props {
  courseId: string
  initial?: QuizQuestion
  onSubmit: (data: QuizFormData) => void
  onCancel: () => void
}

export function QuizForm({ courseId, initial, onSubmit, onCancel }: Props) {
  const [question, setQuestion] = useState(initial?.question ?? '')
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', ''])
  const [correctIndex, setCorrectIndex] = useState(initial?.correctIndex ?? 0)
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])

  function setOption(i: number, val: string) {
    const next = [...options]
    next[i] = val
    setOptions(next)
  }

  function addOption() {
    if (options.length < 4) setOptions([...options, ''])
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    const next = options.filter((_, idx) => idx !== i)
    setOptions(next)
    if (correctIndex >= next.length) setCorrectIndex(next.length - 1)
  }

  function addTag(val: string) {
    const t = val.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  function handleSubmit() {
    if (!question.trim() || options.some(o => !o.trim())) return
    onSubmit({
      courseId,
      question: question.trim(),
      options: options.map(o => o.trim()),
      correctIndex,
      explanation: explanation.trim() || undefined,
      tags,
    })
  }

  const valid = question.trim() && options.every(o => o.trim())

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">題目</label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder="輸入題目內容…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">選項</label>
          {options.length < 4 && (
            <button
              onClick={addOption}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Plus size={12} /> 新增選項
            </button>
          )}
        </div>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="accent-blue-600 flex-shrink-0"
              />
              <input
                className="input flex-1"
                placeholder={`選項 ${String.fromCharCode(65 + i)}`}
                value={opt}
                onChange={e => setOption(i, e.target.value)}
              />
              <button
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                className="text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">點選左側圓點標記正確答案</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">解說（可選）</label>
        <textarea
          className="input resize-y"
          placeholder="答題後顯示的說明…"
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">標籤</label>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map(t => (
              <span
                key={t}
                className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full px-2 py-0.5"
              >
                {t}
                <button onClick={() => setTags(tags.filter(x => x !== t))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          className="input"
          placeholder="輸入後按 Enter 新增標籤"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
          }}
          onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
        />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={!valid}>{initial ? '儲存' : '新增題目'}</Button>
      </div>
    </div>
  )
}
