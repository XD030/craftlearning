import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Tag, Star, Check, Trash2, Upload } from 'lucide-react'
import type { Note } from '../../types'
import { getNotesByCourse, createNote, deleteNote } from '../../db/notes'
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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const mdFiles = files.filter(f => f.name.toLowerCase().endsWith('.md'))
    const imageFiles = files.filter(f => f.type.startsWith('image/'))

    // Build image lookup by relative path (folder import) and bare filename
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
  }

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

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
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
          <input
            ref={importInputRef}
            type="file"
            accept=".md,image/*"
            multiple
            className="hidden"
            onChange={handleImport}
          />
          {/* Folder import — webkitdirectory preserves relative paths so images resolve correctly */}
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
              <div className="space-y-1.5">
                {weekNotes.map(note => (
                  <NoteRow key={note.id} note={note} onOpen={() => navigate(`/notes/${note.id}`)} onDelete={() => setDeletingId(note.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : viewMode === 'highlight' ? (
        <div>
          {highlights.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">沒有標記為重點的筆記</p>
          ) : (
            <div className="space-y-1.5">
              {highlights.map(note => (
                <NoteRow key={note.id} note={note} onOpen={() => navigate(`/notes/${note.id}`)} onDelete={() => setDeletingId(note.id)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByTag).map(([tag, tagNotes]) => (
            <section key={tag}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                <Tag size={11} /> {tag}
              </h3>
              <div className="space-y-1.5">
                {tagNotes.map(note => (
                  <NoteRow key={note.id} note={note} onOpen={() => navigate(`/notes/${note.id}`)} onDelete={() => setDeletingId(note.id)} />
                ))}
              </div>
            </section>
          ))}
          {notes.filter(n => n.tags.length === 0).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">未標籤</h3>
              <div className="space-y-1.5">
                {notes.filter(n => n.tags.length === 0).map(note => (
                  <NoteRow key={note.id} note={note} onOpen={() => navigate(`/notes/${note.id}`)} onDelete={() => setDeletingId(note.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

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
            <Button variant="secondary" className="w-full justify-center" onClick={() => importFolderRef.current?.click()}>
              <Upload size={14} /> 選取含圖片的資料夾
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">推薦：選整個資料夾，圖片會自動內嵌</p>
            <Button variant="secondary" className="w-full justify-center" onClick={() => importInputRef.current?.click()}>
              <Upload size={14} /> 選取個別 .md 檔案
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">純文字筆記，不含圖片</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        title="刪除筆記"
        message="確定要刪除這則筆記嗎？"
        confirmLabel="確認刪除"
        danger
      />
    </div>
  )
}

function NoteRow({ note, onOpen, onDelete }: { note: Note; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <button className="flex-1 text-left flex items-center gap-3 min-w-0" onClick={onOpen}>
        <FileText size={14} className="text-slate-400 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{note.title}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {note.isHighlight && <Star size={12} className="text-amber-500 fill-amber-500" />}
          {note.isReviewed && <Check size={12} className="text-green-500" />}
          {note.tags.map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{t}</span>
          ))}
        </div>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
