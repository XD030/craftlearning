import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ArrowLeft, Bold, List, Code, Quote, Star, Check, Tag, X, Pencil, Eye, Columns2 } from 'lucide-react'
import type { Note } from '../../types'
import { getNoteById, updateNote } from '../../db/notes'
import { clsx } from '../../utils/clsx'

type ViewMode = 'edit' | 'read' | 'split'

// ── Helpers for TOC & heading anchors ────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-龥-]/g, '')
    .replace(/-+/g, '-')
}

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number' || typeof node === 'boolean') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node)
    return extractText((node as React.ReactElement).props.children)
  return ''
}

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
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('noteViewMode') as ViewMode) ?? 'edit'
  )
  const [activeId, setActiveId] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Extract headings from raw markdown for the TOC
  const headings = useMemo(() => {
    const result: { level: number; text: string; id: string }[] = []
    content.split('\n').forEach(line => {
      const m = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/)
      if (m) {
        const raw = m[2].replace(/[*_`[\]()]/g, '').trim()
        result.push({ level: m[1].length, text: raw, id: slugify(raw) })
      }
    })
    return result
  }, [content])

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
          // Auto-open in read mode for imported notes with content
          if (n.content && !localStorage.getItem('noteViewMode')) setViewMode('read')
        }
      })
    }
  }, [id])

  function switchMode(m: ViewMode) {
    setViewMode(m)
    localStorage.setItem('noteViewMode', m)
  }

  const save = useCallback(async (patch: Partial<Note>) => {
    if (!id) return
    setSaving(true)
    await updateNote(id, patch)
    setLastSaved(new Date())
    setSaving(false)
  }, [id])

  useEffect(() => {
    if (!note) return
    save({ content: debouncedContent, title: debouncedTitle })
  }, [debouncedContent, debouncedTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleHighlight() {
    const next = !isHighlight; setIsHighlight(next); await save({ isHighlight: next })
  }
  async function toggleReviewed() {
    const next = !isReviewed; setIsReviewed(next); await save({ isReviewed: next })
  }
  async function handleWeekBlur() {
    await save({ week: week ? parseInt(week) : undefined })
  }
  function addTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) { setTagInput(''); return }
    const next = [...tags, t]; setTags(next); setTagInput(''); save({ tags: next })
  }
  async function removeTag(t: string) {
    const next = tags.filter(x => x !== t); setTags(next); await save({ tags: next })
  }

  function insertMarkdown(prefix: string, suffix = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const selected = content.slice(start, end)
    setContent(content.slice(0, start) + prefix + selected + suffix + content.slice(end))
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 0)
  }

  // Drag image — convert to base64 so it persists after page reload
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setContent(c => c + `\n![${file.name}](${reader.result as string})\n`)
    }
    reader.readAsDataURL(file)
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">載入中…</p>
      </div>
    )
  }

  const modeButtons: { mode: ViewMode; icon: typeof Pencil; label: string }[] = [
    { mode: 'edit',  icon: Pencil,   label: '編輯' },
    { mode: 'read',  icon: Eye,      label: '閱讀' },
    { mode: 'split', icon: Columns2, label: '分割' },
  ]

  // Custom renderers — images, links, KaTeX math, heading anchors for TOC
  const mdComponents = {
    img({ src, alt }: { src?: string; alt?: string }) {
      return (
        <span className="block my-6">
          <img
            src={src ?? ''}
            alt={alt ?? ''}
            style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 6px 28px rgba(0,0,0,0.45)', display: 'block', margin: '0 auto' }}
            onError={e => {
              const el = e.currentTarget
              el.style.display = 'none'
              const ph = el.nextElementSibling as HTMLElement | null
              if (ph) ph.style.display = 'flex'
            }}
          />
          <span
            style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#2a2a2a', border: '1px solid #383838', borderRadius: 8,
              padding: '1.25em 1.5em', color: '#666', fontSize: '0.875em' }}
          >
            🖼&nbsp;{alt || '圖片'}&nbsp;<span style={{ color: '#444' }}>(路徑未找到，請重新匯入含圖片的資料夾)</span>
          </span>
        </span>
      )
    },
    // Always use window.open for external links; scroll for in-page anchors
    a({ href, children }: { href?: string; children?: React.ReactNode }) {
      const url = href ?? ''
      return (
        <a
          href={url || '#'}
          style={{ cursor: 'pointer' }}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault()
            if (/^https?:\/\//.test(url)) {
              window.open(url, '_blank', 'noopener,noreferrer')
            } else if (url.startsWith('#')) {
              document.getElementById(url.slice(1))?.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        >
          {children}
        </a>
      )
    },
    // Heading renderers — attach ID so TOC anchor links work
    h1({ children }: { children?: React.ReactNode }) { return <h1 id={slugify(extractText(children))}>{children}</h1> },
    h2({ children }: { children?: React.ReactNode }) { return <h2 id={slugify(extractText(children))}>{children}</h2> },
    h3({ children }: { children?: React.ReactNode }) { return <h3 id={slugify(extractText(children))}>{children}</h3> },
    h4({ children }: { children?: React.ReactNode }) { return <h4 id={slugify(extractText(children))}>{children}</h4> },
    h5({ children }: { children?: React.ReactNode }) { return <h5 id={slugify(extractText(children))}>{children}</h5> },
    h6({ children }: { children?: React.ReactNode }) { return <h6 id={slugify(extractText(children))}>{children}</h6> },
    // remark-math → <code class="language-math math-inline|math-display"> → render with KaTeX directly
    code({ className, children }: { className?: string; children?: React.ReactNode }) {
      const cls = className ?? ''
      if (cls.includes('language-math')) {
        const math = String(children).trim()
        const isDisplay = cls.includes('math-display')
        try {
          const html = katex.renderToString(math, { displayMode: isDisplay, throwOnError: false, strict: false })
          return isDisplay
            ? <div className="katex-block" dangerouslySetInnerHTML={{ __html: html }} />
            : <span dangerouslySetInnerHTML={{ __html: html }} />
        } catch {
          return <code className={className}>{children}</code>
        }
      }
      return <code className={className}>{children}</code>
    },
  }

  // Shared markdown content node (used in both read and split)
  const mdInner = content ? (
    <div className={viewMode === 'read'
      ? 'obsidian-prose'
      : 'prose prose-sm dark:prose-invert max-w-none dark:text-white prose-headings:font-semibold prose-code:before:content-none prose-code:after:content-none'
    }>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} components={mdComponents}>{content}</ReactMarkdown>
    </div>
  ) : (
    <p className={clsx('text-sm italic', viewMode === 'read' ? 'text-[#555]' : 'text-slate-400 dark:text-slate-600')}>空白筆記</p>
  )

  const markdownView = viewMode === 'read' ? (
    // ── Read mode: dark Obsidian canvas with optional TOC sidebar ──────────────
    <div className="overflow-y-auto h-full w-full bg-[#1e1e1e]">
      <div
        className="mx-auto px-8 py-12 flex gap-8 items-start"
        style={{ maxWidth: headings.length > 0 ? '1100px' : '860px' }}
      >
        {/* TOC sidebar — only when headings exist */}
        {headings.length > 0 && (
          <nav className="w-48 shrink-0 sticky top-0 max-h-screen overflow-y-auto pb-16 pt-1">
            <p className="text-[10px] font-semibold text-[#444] uppercase tracking-widest mb-3">目錄</p>
            {headings.map((h, i) => (
              <button
                key={i}
                style={{ paddingLeft: `${(h.level - 1) * 10}px` }}
                onClick={() => {
                  setActiveId(h.id)
                  document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={clsx(
                  'block w-full text-left text-xs py-[3px] px-2 rounded truncate transition-colors',
                  activeId === h.id
                    ? 'text-[#a78bfa] bg-[#2a2535]'
                    : 'text-[#555] hover:text-[#999] hover:bg-[#242424]'
                )}
              >
                {h.text}
              </button>
            ))}
          </nav>
        )}

        {/* Main content */}
        <div className={clsx('flex-1 min-w-0', headings.length === 0 && 'max-w-[760px] mx-auto')}>
          <h1 className="text-[1.85rem] font-bold text-white mb-8 pb-5 border-b border-[#333333] leading-tight tracking-[-0.02em]">{title}</h1>
          {mdInner}
        </div>
      </div>
    </div>
  ) : (
    // ── Split mode: simple scroll pane ────────────────────────────────────────
    <div className="overflow-y-auto h-full w-full">
      <div className="w-full px-10 py-8">{mdInner}</div>
    </div>
  )

  const editView = (
    <div className="flex-1 overflow-y-auto h-full">
      <textarea
        ref={textareaRef}
        className="w-full h-full resize-none px-10 py-8 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono leading-relaxed"
        placeholder="開始寫 Markdown 筆記…"
        value={content}
        onChange={e => setContent(e.target.value)}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      />
    </div>
  )

  return (
    <div className={clsx('h-full flex flex-col', viewMode === 'read' ? 'bg-[#1e1e1e]' : 'bg-white dark:bg-slate-900')}>
      {/* Top bar */}
      <div className={clsx('flex items-center gap-3 px-6 py-3 border-b flex-shrink-0', viewMode === 'read' ? 'border-[#383838]' : 'border-slate-200 dark:border-slate-700')}>
        <button
          onClick={() => navigate(-1)}
          className={clsx('transition-colors flex-shrink-0', viewMode === 'read' ? 'text-[#888] hover:text-[#bbb]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200')}
        >
          <ArrowLeft size={16} />
        </button>

        {viewMode === 'read' ? (
          <span className="flex-1 text-sm text-[#666] truncate">{title}</span>
        ) : (
          <input
            className="flex-1 text-lg font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder-slate-300 dark:placeholder-slate-600"
            placeholder="筆記標題"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Mode switcher */}
          <div className={clsx('flex rounded-lg p-0.5 mr-1', viewMode === 'read' ? 'bg-[#2a2a2a]' : 'bg-slate-100 dark:bg-slate-800')}>
            {modeButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => switchMode(mode)}
                title={label}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'read'
                    ? mode === 'read'
                      ? 'bg-[#3a3a3a] text-white shadow-sm'
                      : 'text-[#666] hover:text-[#aaa]'
                    : viewMode === mode
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          {viewMode !== 'read' && (saving ? (
            <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">儲存中…</span>
          ) : lastSaved ? (
            <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">已自動儲存</span>
          ) : null)}

          <button
            onClick={toggleHighlight}
            className={clsx('p-1.5 rounded-lg transition-colors',
              isHighlight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            )}
            title="標記重點"
          >
            <Star size={15} fill={isHighlight ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={toggleReviewed}
            className={clsx('p-1.5 rounded-lg transition-colors',
              isReviewed ? 'text-green-500 bg-green-50 dark:bg-green-900/30' : 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
            )}
            title="標記已整理"
          >
            <Check size={15} />
          </button>
        </div>
      </div>

      {/* Meta bar — hidden in read mode to keep the reading surface clean */}
      {viewMode !== 'read' && <div className={clsx('flex items-center gap-4 px-6 py-2 border-b flex-wrap flex-shrink-0', 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50')}>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">週次</label>
          <input
            type="number" min="1" max="20" placeholder="—"
            value={week} onChange={e => setWeek(e.target.value)} onBlur={handleWeekBlur}
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
            placeholder="+ 標籤" value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
            onBlur={addTag}
          />
        </div>
      </div>}

      {/* Markdown toolbar — only in edit / split mode */}
      {viewMode !== 'read' && (
        <div className="flex items-center gap-1 px-6 py-1.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          {[
            { icon: Bold,  action: () => insertMarkdown('**', '**'), title: '粗體' },
            { icon: List,  action: () => insertMarkdown('\n- '),      title: '列表' },
            { icon: Code,  action: () => insertMarkdown('`', '`'),   title: '行內程式碼' },
            { icon: Quote, action: () => insertMarkdown('\n> '),      title: '引用' },
          ].map(({ icon: Icon, action, title: t }) => (
            <button key={t} onClick={action} title={t}
              className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex">
        {viewMode === 'edit' && editView}
        {viewMode === 'read' && markdownView}
        {viewMode === 'split' && (
          <>
            <div className="flex-1 border-r border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
              {editView}
            </div>
            <div className="flex-1 overflow-hidden">
              {markdownView}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
