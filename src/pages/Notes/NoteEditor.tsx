import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ArrowLeft, Bold, List, Code, Quote, Star, Check, Tag, X, Pencil, Eye, Columns2, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { Note } from '../../types'
import { getNoteById, getNotesByCourse, updateNote } from '../../db/notes'
import { clsx } from '../../utils/clsx'

type ViewMode = 'edit' | 'read' | 'split'

// ── Helpers for heading anchors ────────────��──────────────────────────────────
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
  const [courseNotes, setCourseNotes] = useState<Note[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    localStorage.getItem('noteSidebar') !== 'closed'
  )
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
          if (n.content && !localStorage.getItem('noteViewMode')) setViewMode('read')
          // Load sibling notes for the sidebar
          getNotesByCourse(n.courseId).then(setCourseNotes)
        }
      })
    }
  }, [id])

  // Refresh sidebar title when title changes (debounced)
  useEffect(() => {
    if (!id || !debouncedTitle) return
    setCourseNotes(ns => ns.map(n => n.id === id ? { ...n, title: debouncedTitle } : n))
  }, [debouncedTitle, id])

  function switchMode(m: ViewMode) {
    setViewMode(m)
    localStorage.setItem('noteViewMode', m)
  }

  function toggleSidebar() {
    setSidebarOpen(v => {
      const next = !v
      localStorage.setItem('noteSidebar', next ? 'open' : 'closed')
      return next
    })
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

  const isReadMode = viewMode === 'read'

  const modeButtons: { mode: ViewMode; icon: typeof Pencil; label: string }[] = [
    { mode: 'edit',  icon: Pencil,   label: '編輯' },
    { mode: 'read',  icon: Eye,      label: '閱讀' },
    { mode: 'split', icon: Columns2, label: '分割' },
  ]

  // Custom renderers
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
    h1({ children }: { children?: React.ReactNode }) { return <h1 id={slugify(extractText(children))}>{children}</h1> },
    h2({ children }: { children?: React.ReactNode }) { return <h2 id={slugify(extractText(children))}>{children}</h2> },
    h3({ children }: { children?: React.ReactNode }) { return <h3 id={slugify(extractText(children))}>{children}</h3> },
    h4({ children }: { children?: React.ReactNode }) { return <h4 id={slugify(extractText(children))}>{children}</h4> },
    h5({ children }: { children?: React.ReactNode }) { return <h5 id={slugify(extractText(children))}>{children}</h5> },
    h6({ children }: { children?: React.ReactNode }) { return <h6 id={slugify(extractText(children))}>{children}</h6> },
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

  // Sidebar: list of notes in the same course
  const noteSidebar = (
    <div className={clsx(
      'flex-shrink-0 flex flex-col border-r overflow-hidden transition-all duration-200',
      isReadMode
        ? 'border-[#2a2a2a] bg-[#161616]'
        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60',
      sidebarOpen ? 'w-52' : 'w-0'
    )}>
      {sidebarOpen && (
        <>
          <div className={clsx(
            'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest flex-shrink-0',
            isReadMode ? 'text-[#444]' : 'text-slate-400 dark:text-slate-500'
          )}>
            課程筆記
          </div>
          <div className="flex-1 overflow-y-auto">
            {courseNotes.map(n => (
              <button
                key={n.id}
                onClick={() => navigate(`/notes/${n.id}`)}
                className={clsx(
                  'w-full text-left px-3 py-2 text-xs truncate transition-colors flex items-center gap-2',
                  n.id === id
                    ? isReadMode
                      ? 'bg-[#2a2535] text-[#c4b5fd]'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : isReadMode
                      ? 'text-[#666] hover:text-[#aaa] hover:bg-[#1e1e1e]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                )}
              >
                <FileText size={11} className="flex-shrink-0 opacity-60" />
                <span className="truncate">{n.title || '（無標題）'}</span>
                {n.isHighlight && <span className="text-amber-400 flex-shrink-0">★</span>}
              </button>
            ))}
          </div>
        </>
      )}
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

  const markdownView = (
    <div className={clsx(
      'overflow-y-auto h-full w-full',
      isReadMode ? 'bg-[#1e1e1e]' : ''
    )}>
      <div className={clsx(
        'mx-auto w-full',
        isReadMode ? 'max-w-5xl px-12 py-12' : 'px-8 py-8'
      )}>
        {isReadMode && (
          <h1 className="text-[1.85rem] font-bold text-white mb-8 pb-5 border-b border-[#333333] leading-tight tracking-[-0.02em]">{title}</h1>
        )}
        {content ? (
          <div className={isReadMode
            ? 'obsidian-prose'
            : 'prose prose-sm dark:prose-invert max-w-none dark:text-white prose-headings:font-semibold prose-code:before:content-none prose-code:after:content-none'
          }>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} components={mdComponents}>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className={clsx('text-sm italic', isReadMode ? 'text-[#555]' : 'text-slate-400 dark:text-slate-600')}>空白筆記</p>
        )}
      </div>
    </div>
  )

  return (
    <div className={clsx('h-screen flex flex-col', isReadMode ? 'bg-[#1e1e1e]' : 'bg-white dark:bg-slate-900')}>
      {/* Top bar */}
      <div className={clsx('flex items-center gap-2 px-4 py-3 border-b flex-shrink-0', isReadMode ? 'border-[#2a2a2a]' : 'border-slate-200 dark:border-slate-700')}>
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? '收起筆記列表' : '展開���記列表'}
          className={clsx('p-1.5 rounded transition-colors flex-shrink-0',
            isReadMode ? 'text-[#555] hover:text-[#999]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          )}
        >
          {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>

        <button
          onClick={() => navigate(`/courses/${note.courseId}`)}
          className={clsx('transition-colors flex-shrink-0', isReadMode ? 'text-[#888] hover:text-[#bbb]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200')}
          title="回到課程"
        >
          <ArrowLeft size={16} />
        </button>

        {isReadMode ? (
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
          <div className={clsx('flex rounded-lg p-0.5 mr-1', isReadMode ? 'bg-[#2a2a2a]' : 'bg-slate-100 dark:bg-slate-800')}>
            {modeButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => switchMode(mode)}
                title={label}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  isReadMode
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

          {!isReadMode && (saving ? (
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

      {/* Meta bar — hidden in read mode */}
      {!isReadMode && (
        <div className="flex items-center gap-4 px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 flex-wrap">
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
        </div>
      )}

      {/* Markdown toolbar — only in edit / split */}
      {!isReadMode && (
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

      {/* Main area: sidebar + content */}
      <div className="flex-1 overflow-hidden flex">
        {noteSidebar}

        {/* Content pane */}
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
    </div>
  )
}
