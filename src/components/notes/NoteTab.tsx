import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Tag, Star, Check, Trash2, Upload, X, MoveRight } from 'lucide-react'
import type { Note, Course } from '../../types'
import { getNotesByCourse, createNote, deleteNote, updateNote } from '../../db/notes'
import { getAllCourses } from '../../db/courses'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Modal } from '../ui/Modal'
import { clsx } from '../../utils/clsx'

interface NoteTabProps {
  courseId: string
}

type ViewMode = 'week' | 'highlight' | 'tag'

export function NoteTab({ courseId }: NoteTabProps) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [showNewNote, setShowNewNote] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const importFolderRef = useRef<HTMLInputElement>(null)

  // ── Multi-select ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [targetCourseId, setTargetCourseId] = useState('')

  const isSelectMode = selectedIds.size > 0

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setLastClickedId(id)
  }

  // Row main click (not checkbox / not long-press)
  function handleNoteClick(note: Note, e: React.MouseEvent) {
    if (e.shiftKey && lastClickedId) {
      // Range select
      e.preventDefault()
      const ids = notes.map(n => n.id)
      const a = ids.indexOf(lastClickedId)
      const b = ids.indexOf(note.id)
      if (a !== -1 && b !== -1) {
        const [from, to] = a < b ? [a, b] : [b, a]
        setSelectedIds(prev => {
          const next = new Set(prev)
          for (let i = from; i <= to; i++) next.add(ids[i])
          return next
        })
        setLastClickedId(note.id)
      }
    } else if (e.ctrlKey || e.metaKey || isSelectMode) {
      // Toggle selection
      toggleSelect(note.id)
    } else {
      // Normal — navigate
      navigate(`/notes/${note.id}`)
      setLastClickedId(note.id)
    }
  }

  async function handleBulkDelete() {
    for (const id of selectedIds) await deleteNote(id)
    setNotes(ns => ns.filter(n => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
    setShowBulkDelete(false)
  }

  async function openMoveModal() {
    const courses = await getAllCourses()
    setAllCourses(courses.filter(c => c.id !== courseId))
    setTargetCourseId('')
    setShowMoveModal(true)
  }

  async function handleBulkMove() {
    if (!targetCourseId) return
    await Promise.all(Array.from(selectedIds).map(id => updateNote(id, { courseId: targetCourseId })))
    setNotes(ns => ns.filter(n => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
    setShowMoveModal(false)
  }

  // Esc clears selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedIds(new Set())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Import ───────────────────────────────────────────────────────────────────
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const mdFiles = files.filter(f => f.name.toLowerCase().endsWith('.md'))
    const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i
    const imageFiles = files.filter(f => f.type.startsWith('image/') || IMAGE_EXT.test(f.name))

    const imageMap: Record<string, string> = {}
    await Promise.all(imageFiles.map(file => new Promise<void>(resolve => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        if (file.webkitRelativePath) imageMap[file.webkitRelativePath] = dataUrl
        imageMap[file.name] = dataUrl
      }
      reader.onloadend = () => resolve()
      reader.readAsDataURL(file)
    })))

    function resolveImage(mdRelPath: string, src: string): string | undefined {
      const mdDir = mdRelPath.substring(0, mdRelPath.lastIndexOf('/') + 1)
      const combined = (mdDir + src.replace(/^\.\//, '')).split('/')
      const parts: string[] = []
      for (const p of combined) {
        if (p === '..') parts.pop()
        else if (p && p !== '.') parts.push(p)
      }
      return imageMap[parts.join('/')]
        ?? imageMap[src.replace(/^\.\//, '')]
        ?? imageMap[src.split('/').pop() ?? '']
    }

    let firstNote: Note | null = null
    for (const mdFile of mdFiles) {
      let content = await mdFile.text()

      // Step 1: Obsidian wikilink images  ![[image.png]]  or  ![[image.png|300]]
      content = content.replace(/!\[\[([^\]]+)\]\]/g, (_m, raw) => {
        const src = raw.trim().split('|')[0].trim()
        const dataUrl = resolveImage(mdFile.webkitRelativePath, src)
        const label = src.split('/').pop() ?? src
        return dataUrl ? `![${label}](${dataUrl})` : `![${label}](${src})`
      })

      // Step 2: Standard markdown images  ![alt](src)
      content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        if (/^(https?:|data:)/.test(src)) return match
        const dataUrl = resolveImage(mdFile.webkitRelativePath, src)
        return dataUrl ? `![${alt}](${dataUrl})` : match
      })

      const title = mdFile.name.replace(/\.md$/i, '')
      const note = await createNote({ courseId, title, content, tags: [], isHighlight: false, isReviewed: false })
      setNotes(ns => [note, ...ns])
      if (!firstNote) firstNote = note
    }

    e.target.value = ''
    if (firstNote) navigate(`/notes/${firstNote.id}`)
  }, [courseId, navigate])

  useEffect(() => {
    getNotesByCourse(courseId).then(setNotes)
  }, [courseId])

  async function handleCreate() {
    if (!newTitle.trim()) return
    const note = await createNote({
      courseId,
      title: newTitle.trim(),
      content: '',
      tags: [],
      isHighlight: false,
      isReviewed: false,
    })
    setNewTitle('')
    setShowNewNote(false)
    navigate(`/notes/${note.id}`)
  }

  async function handleDelete(id: string) {
    await deleteNote(id)
    setNotes(ns => ns.filter(n => n.id !== id))
    setDeletingId(null)
  }

  const groupedByWeek = notes.reduce<Record<string, Note[]>>((acc, n) => {
    const key = n.week != null ? `第 ${n.week} 週` : '未分類'
    acc[key] = [...(acc[key] ?? []), n]
    return acc
  }, {})

  const allTags = [...new Set(notes.flatMap(n => n.tags))]
  const groupedByTag = allTags.reduce<Record<string, Note[]>>((acc, tag) => {
    acc[tag] = notes.filter(n => n.tags.includes(tag))
    return acc
  }, {})

  const highlights = notes.filter(n => n.isHighlight)

  function renderNotes(list: Note[]) {
    return list.map(note => (
      <NoteRow
        key={note.id}
        note={note}
        selected={selectedIds.has(note.id)}
        isSelectMode={isSelectMode}
        onMainClick={e => handleNoteClick(note, e)}
        onToggleSelect={() => toggleSelect(note.id)}
        onDelete={() => setDeletingId(note.id)}
      />
    ))
  }

  return (
    <div>
      {/* Top toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
          {(['week', 'highlight', 'tag'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === mode
                  ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {mode === 'week' ? '依週次' : mode === 'highlight' ? '重點' : '標籤'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input ref={importInputRef} type="file" accept=".md,image/*" multiple className="hidden" onChange={handleImport} />
          {/* webkitdirectory preserves relative paths so images resolve correctly */}
          <input
            ref={importFolderRef}
            type="file"
            // @ts-expect-error webkitdirectory is non-standard but widely supported
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={handleImport}
          />
          <Button size="sm" onClick={() => setShowNewNote(true)}>
            <Plus size={14} /> 新增筆記
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {isSelectMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4 flex-wrap">
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium flex-1 min-w-0">
            已選取 {selectedIds.size} 則
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="取消選取（Esc）"
          >
            <X size={12} /> 取消
          </button>
          <Button size="sm" variant="secondary" onClick={openMoveModal}>
            <MoveRight size={13} /> 移動到…
          </Button>
          <Button size="sm" variant="danger" onClick={() => setShowBulkDelete(true)}>
            <Trash2 size={13} /> 刪除（{selectedIds.size}）
          </Button>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="還沒有筆記"
          description="新增第一則筆記，開始整理課程內容"
          actionLabel="新增筆記"
          onAction={() => setShowNewNote(true)}
        />
      ) : viewMode === 'week' ? (
        <div className="space-y-6">
          {Object.entries(groupedByWeek).sort(([a], [b]) => {
            const na = parseInt(a) || 999
            const nb = parseInt(b) || 999
            return na - nb
          }).map(([week, weekNotes]) => (
            <section key={week}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{week}</h3>
              <div className="space-y-1.5">{renderNotes(weekNotes)}</div>
            </section>
          ))}
        </div>
      ) : viewMode === 'highlight' ? (
        <div>
          {highlights.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">沒有標記為重點的筆記</p>
          ) : (
            <div className="space-y-1.5">{renderNotes(highlights)}</div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByTag).map(([tag, tagNotes]) => (
            <section key={tag}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                <Tag size={11} /> {tag}
              </h3>
              <div className="space-y-1.5">{renderNotes(tagNotes)}</div>
            </section>
          ))}
          {notes.filter(n => n.tags.length === 0).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">未標籤</h3>
              <div className="space-y-1.5">{renderNotes(notes.filter(n => n.tags.length === 0))}</div>
            </section>
          )}
        </div>
      )}

      {/* New note modal */}
      <Modal open={showNewNote} onClose={() => setShowNewNote(false)} title="新增筆記" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">標題</label>
            <input
              className="input"
              placeholder="筆記標題"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNewNote(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>建立並開始編輯</Button>
          </div>
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            <span className="px-3 text-xs text-slate-400 dark:text-slate-500">或</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="space-y-2">
            <Button variant="secondary" className="w-full justify-center" onClick={() => { setShowNewNote(false); importFolderRef.current?.click() }}>
              <Upload size={14} /> 選取含圖片的資料夾
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">推薦：選整個資料夾，圖片會自動內嵌</p>
            <Button variant="secondary" className="w-full justify-center" onClick={() => { setShowNewNote(false); importInputRef.current?.click() }}>
              <Upload size={14} /> 選取個別 .md 檔案
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">純文字筆記，不含圖片</p>
          </div>
        </div>
      </Modal>

      {/* Single delete */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        title="刪除筆記"
        message="確定要刪除這則筆記嗎？"
        confirmLabel="確認刪除"
        danger
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`刪除 ${selectedIds.size} 則筆記`}
        message={`確定要刪除選取的 ${selectedIds.size} 則筆記嗎？此操作無法復原。`}
        confirmLabel="全部刪除"
        danger
      />

      {/* Move to course modal */}
      <Modal open={showMoveModal} onClose={() => setShowMoveModal(false)} title={`移動 ${selectedIds.size} 則筆記到…`} size="sm">
        <div className="space-y-4">
          {allCourses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">目前沒有其他課程</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {allCourses.map(c => (
                <label
                  key={c.id}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                    targetCourseId === c.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                  )}
                >
                  <input
                    type="radio"
                    name="targetCourse"
                    value={c.id}
                    checked={targetCourseId === c.id}
                    onChange={() => setTargetCourseId(c.id)}
                    className="accent-blue-500"
                  />
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-sm text-slate-800 dark:text-slate-100 truncate">{c.name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowMoveModal(false)}>取消</Button>
            <Button onClick={handleBulkMove} disabled={!targetCourseId}>
              <MoveRight size={14} /> 移動
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── NoteRow ───────────────────────────────────────────────────────────────────
function NoteRow({
  note,
  selected,
  isSelectMode,
  onMainClick,
  onToggleSelect,
  onDelete,
}: {
  note: Note
  selected: boolean
  isSelectMode: boolean
  onMainClick: (e: React.MouseEvent) => void
  onToggleSelect: () => void
  onDelete: () => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  function startLongPress(e: React.PointerEvent) {
    startPos.current = { x: e.clientX, y: e.clientY }
    didLongPress.current = false
    timerRef.current = setTimeout(() => {
      didLongPress.current = true
      onToggleSelect()
      // Haptic feedback on devices that support it
      navigator.vibrate?.(40)
    }, 500)
  }

  function cancelLongPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    // Cancel if moved more than 8px (distinguishes scroll from long-press)
    if (dx * dx + dy * dy > 64) cancelLongPress()
  }

  function handleClick(e: React.MouseEvent) {
    // Swallow the click that follows a long-press
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }
    onMainClick(e)
  }

  return (
    <div
      className={clsx(
        'group flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors select-none',
        selected
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
          : isSelectMode
            ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
      )}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {/* Circular checkbox — Google Drive style */}
      {/* Always visible when selected or in select mode; appears on hover otherwise */}
      <div
        onClick={e => { e.stopPropagation(); onToggleSelect() }}
        className={clsx(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer',
          selected
            ? 'border-blue-500 bg-blue-500 opacity-100'
            : isSelectMode
              ? 'border-slate-300 dark:border-slate-500 opacity-100 hover:border-blue-400'
              : 'border-slate-300 dark:border-slate-500 opacity-0 group-hover:opacity-100'
        )}
      >
        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>

      <FileText size={14} className="text-slate-400 flex-shrink-0" />
      <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{note.title}</span>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {note.isHighlight && <Star size={12} className="text-amber-500 fill-amber-500" />}
        {note.isReviewed && <Check size={12} className="text-green-500" />}
        {note.tags.map(t => (
          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{t}</span>
        ))}
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className={clsx(
          'p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0',
          isSelectMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
