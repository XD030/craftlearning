import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Bold, List, Code, Quote, Star, Check, Tag, X } from 'lucide-react'
import type { Note } from '../../types'
import { getNoteById, updateNote } from '../../db/notes'
import { clsx } from '../../utils/clsx'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function NoteEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [week, setWeek] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isHighlight, setIsHighlight] = useState(false)
  const [isReviewed, setIsReviewed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const debouncedContent = useDebounce(content, 1000)
  const debouncedTitle = useDebounce(title, 1000)

  useEffect(() => {
    if (id) {
      getNoteById(id).then(n => {
        if (n) {
          setNote(n)
          setTitle(n.title)
          setContent(n.content)
          setWeek(n.week?.toString() ?? '')
          setTags(n.tags)
          setIsHighlight(n.isHighlight)
          setIsReviewed(n.isReviewed)
        }
      })
    }
  }, [id])

  const save = useCallback(async (patch: Partial<Note>) => {
    if (!id) return
    setSaving(true)
    await updateNote(id, patch)
    setLastSaved(new Date())
    setSaving(false)
  }, [id])

  // Auto-save on content/title change
  useEffect(() => {
    if (!note) return
    save({ content: debouncedContent, title: debouncedTitle })
  }, [debouncedContent, debouncedTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleHighlight() {
    const next = !isHighlight
    setIsHighlight(next)
    await save({ isHighlight: next })
  }

  async function toggleReviewed() {
    const next = !isReviewed
    setIsReviewed(next)
    await save({ isReviewed: next })
  }

  async function handleWeekBlur() {
    await save({ week: week ? parseInt(week) : undefined })
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) { setTagInput(''); return }
    const next = [...tags, t]
    setTags(next)
    setTagInput('')
    save({ tags: next })
  }

  async function removeTag(t: string) {
    const next = tags.filter(x => x !== t)
    setTags(next)
    await save({ tags: next })
  }

  function insertMarkdown(prefix: string, suffix = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end)
    const newText = content.slice(0, start) + prefix + selected + suffix + content.slice(end)
    setContent(newText)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 0)
  }

  // Drag image into editor
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (!file) return
    const url = URL.createObjectURL(file)
    const mdImg = `\n![${file.name}](${url})\n`
    setContent(c => c + mdImg)
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">載入中…</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} />
        </button>

        <input
          className="flex-1 text-lg font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder-slate-300 dark:placeholder-slate-600"
          placeholder="筆記標題"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-xs text-slate-400 dark:text-slate-500">儲存中…</span>
          ) : lastSaved ? (
            <span className="text-xs text-slate-400 dark:text-slate-500">已自動儲存</span>
          ) : null}

          <button
            onClick={toggleHighlight}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              isHighlight
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30'
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            )}
            title="標記重點"
          >
            <Star size={16} fill={isHighlight ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={toggleReviewed}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              isReviewed
                ? 'text-green-500 bg-green-50 dark:bg-green-900/30'
                : 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
            )}
            title="標記已整理"
          >
            <Check size={16} />
          </button>
        </div>
      </div>

      {/* Meta bar */}
      <div className="flex items-center gap-4 px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">週次</label>
          <input
            type="number"
            min="1"
            max="20"
            placeholder="—"
            value={week}
            onChange={e => setWeek(e.target.value)}
            onBlur={handleWeekBlur}
            className="w-14 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={12} className="text-slate-400" />
          {tags.map(t => (
            <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {t}
              <button onClick={() => removeTag(t)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
            </span>
          ))}
          <input
            className="text-xs bg-transparent border-none outline-none text-slate-600 dark:text-slate-300 placeholder-slate-400 w-20"
            placeholder="+ 標籤"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
            onBlur={addTag}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-100 dark:border-slate-800">
        {[
          { icon: Bold, action: () => insertMarkdown('**', '**'), title: '粗體' },
          { icon: List, action: () => insertMarkdown('\n- '), title: '列表' },
          { icon: Code, action: () => insertMarkdown('`', '`'), title: '程式碼' },
          { icon: Quote, action: () => insertMarkdown('\n> '), title: '引用' },
        ].map(({ icon: Icon, action, title: t }) => (
          <button
            key={t}
            onClick={action}
            title={t}
            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <textarea
            ref={textareaRef}
            className="w-full h-full resize-none p-6 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono leading-relaxed"
            placeholder="開始寫 Markdown 筆記…"
            value={content}
            onChange={e => setContent(e.target.value)}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          />
        </div>

        <div className="w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex-1 overflow-y-auto p-6">
          {content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-600 italic">預覽區</p>
          )}
        </div>
      </div>
    </div>
  )
}
