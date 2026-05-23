import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Check, Download, Upload, AlertTriangle, Gem, RefreshCw } from 'lucide-react'
import type { Semester } from '../../types'
import { createSemester, updateSemester, deleteSemester } from '../../db/semesters'
import { getCoursesBySemester } from '../../db/courses'
import { getNotesByCourse } from '../../db/notes'
import { db } from '../../db/database'
import { useApp } from '../../contexts/AppContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

interface SemesterFormData { name: string; startDate: string; endDate: string }

function SemesterForm({ initial, onSubmit, onCancel }: {
  initial?: SemesterFormData
  onSubmit: (d: SemesterFormData) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<SemesterFormData>({
    name: initial?.name ?? '', startDate: initial?.startDate ?? '', endDate: initial?.endDate ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">學期名稱</label>
        <input className="input" placeholder="114-2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">開始日期</label>
          <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">結束日期</label>
          <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={saving}>{saving ? '儲存中…' : '儲存'}</Button>
      </div>
    </form>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function Settings() {
  const { state, reloadSemesters, switchSemester } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Semester | null>(null)
  const [deleting, setDeleting] = useState<Semester | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [vaultSyncing, setVaultSyncing] = useState(false)
  const [vaultStatus, setVaultStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.estimate().then(est => {
      if (est.usage != null && est.quota != null) {
        setStorageUsage({ usage: est.usage, quota: est.quota })
      }
    })
  }, [])

  async function handleCreate(d: SemesterFormData) {
    await createSemester({ ...d, isActive: state.semesters.length === 0 })
    await reloadSemesters()
    setShowAdd(false)
  }

  async function handleUpdate(d: SemesterFormData) {
    if (!editing) return
    await updateSemester(editing.id, d)
    await reloadSemesters()
    setEditing(null)
  }

  async function handleDelete() {
    if (!deleting) return
    await deleteSemester(deleting.id)
    await reloadSemesters()
    setDeleting(null)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const [semesters, courses, notes, tasks, quizQuestions, groupProjects, rawMaterials] = await Promise.all([
        db.semesters.toArray(), db.courses.toArray(), db.notes.toArray(),
        db.tasks.toArray(), db.quizQuestions.toArray(), db.groupProjects.toArray(), db.materials.toArray(),
      ])
      const materials = await Promise.all(rawMaterials.map(async m => {
        if (m.fileBlob) {
          const fileBase64 = await blobToDataUrl(m.fileBlob)
          return { ...m, fileBlob: undefined, fileBase64 }
        }
        return m
      }))
      const payload = { version: 1, exportedAt: new Date().toISOString(), semesters, courses, notes, tasks, quizQuestions, groupProjects, materials }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `student-workbench-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const tables = [db.semesters, db.courses, db.notes, db.materials, db.tasks, db.quizQuestions, db.groupProjects]
      await db.transaction('rw', tables, async () => {
        await Promise.all(tables.map(t => t.clear()))
        if (data.semesters?.length) await db.semesters.bulkAdd(data.semesters)
        if (data.courses?.length) await db.courses.bulkAdd(data.courses)
        if (data.notes?.length) await db.notes.bulkAdd(data.notes)
        if (data.tasks?.length) await db.tasks.bulkAdd(data.tasks)
        if (data.quizQuestions?.length) await db.quizQuestions.bulkAdd(data.quizQuestions)
        if (data.groupProjects?.length) await db.groupProjects.bulkAdd(data.groupProjects)
        if (data.materials?.length) {
          const mats = await Promise.all(data.materials.map(async (m: Record<string, unknown>) => {
            if (m.fileBase64) {
              const res = await fetch(m.fileBase64 as string)
              const fileBlob = await res.blob()
              return { ...m, fileBlob, fileBase64: undefined }
            }
            return m
          }))
          await db.materials.bulkAdd(mats)
        }
      })
      await reloadSemesters()
      alert('匯入成功！頁面即將重新載入。')
      window.location.reload()
    } catch {
      alert('匯入失敗：檔案格式不正確。')
    } finally {
      setImporting(false)
    }
  }

  async function handleClearAll() {
    const tables = [db.semesters, db.courses, db.notes, db.materials, db.tasks, db.quizQuestions, db.groupProjects]
    await db.transaction('rw', tables, async () => {
      await Promise.all(tables.map(t => t.clear()))
    })
    await reloadSemesters()
    setShowClearConfirm(false)
    window.location.reload()
  }

  async function handleObsidianSync() {
    if (!('showDirectoryPicker' in window)) {
      setVaultStatus({ ok: false, msg: '您的瀏覽器不支援此功能，請使用 Chrome 或 Edge' })
      return
    }
    if (!state.activeSemesterId) {
      setVaultStatus({ ok: false, msg: '請先在學期管理中設定一個作用中學期' })
      return
    }

    setVaultSyncing(true)
    setVaultStatus(null)

    try {
      // Let user pick their Obsidian vault root
      const vaultHandle = await (window as Window & { showDirectoryPicker: (o?: object) => Promise<FileSystemDirectoryHandle> })
        .showDirectoryPicker({ mode: 'readwrite' })

      // Write into vault/craftlearning/ so we don't clutter their vault root
      const rootDir = await vaultHandle.getDirectoryHandle('craftlearning', { create: true })

      const courses = await getCoursesBySemester(state.activeSemesterId)
      let total = 0

      for (const course of courses) {
        const notes = await getNotesByCourse(course.id)
        if (notes.length === 0) continue

        const safeCourse = course.name.replace(/[<>:"/\\|?*]/g, '_').trim()
        const courseDir = await rootDir.getDirectoryHandle(safeCourse, { create: true })

        for (const note of notes) {
          const weekLabel = note.week != null ? `Week_${note.week}` : '未分類'
          const weekDir = await courseDir.getDirectoryHandle(weekLabel, { create: true })
          const safeTitle = (note.title.replace(/[<>:"/\\|?*]/g, '_').trim()) || 'untitled'

          // YAML frontmatter — readable by Obsidian Dataview, Properties, etc.
          const tagBlock = note.tags.length > 0
            ? `tags:\n${note.tags.map(t => `  - ${t}`).join('\n')}`
            : 'tags: []'
          const fm = [
            '---',
            `title: "${note.title.replace(/"/g, '\\"')}"`,
            `course: "${course.name.replace(/"/g, '\\"')}"`,
            `week: ${note.week ?? ''}`,
            tagBlock,
            `highlight: ${note.isHighlight}`,
            `reviewed: ${note.isReviewed}`,
            `created: ${note.createdAt.slice(0, 10)}`,
            '---',
            '',
          ].join('\n')

          const fileHandle = await weekDir.getFileHandle(`${safeTitle}.md`, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(fm + note.content)
          await writable.close()
          total++
        }
      }

      setVaultStatus({ ok: true, msg: `成功同步 ${total} 則筆記到 Obsidian 保險庫 ✓` })
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setVaultStatus({ ok: false, msg: `同步失敗：${err.message}` })
      }
    } finally {
      setVaultSyncing(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto"><div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">設定</h1>

      {/* 學期管理 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">學期管理</h2>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> 新增學期</Button>
        </div>
        <div className="space-y-2">
          {state.semesters.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
              <div className="flex items-center gap-3">
                {s.isActive && <Check size={14} className="text-green-500" />}
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.startDate} ～ {s.endDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!s.isActive && <Button size="sm" variant="ghost" onClick={() => switchSemester(s.id)}>設為作用中</Button>}
                <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => setDeleting(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 外觀 */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">外觀</h2>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">深色模式</p>
          <span className="text-sm text-slate-500 dark:text-slate-400">使用右上角按鈕切換</span>
        </div>
      </section>

      {/* Obsidian 整合 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Gem size={16} className="text-violet-500" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Obsidian 整合</h2>
        </div>
        <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10 p-5 space-y-4">
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium mb-1">同步筆記到 Obsidian 保險庫</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              選擇您的 Obsidian vault 資料夾後，所有筆記將以 <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 text-[0.8em]">.md</code> 格式寫入：
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-mono">
              vault / craftlearning / 課程名稱 / Week_N / 筆記標題.md
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              每個檔案包含 YAML frontmatter（週次、標籤、重點標記），可搭配 Dataview 外掛查詢。
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-500">需要 Chrome 或 Edge 瀏覽器</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleObsidianSync}
              disabled={vaultSyncing}
              className="border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
            >
              <RefreshCw size={13} className={vaultSyncing ? 'animate-spin' : ''} />
              {vaultSyncing ? '同步中…' : '選擇保險庫並同步'}
            </Button>
          </div>
          {vaultStatus && (
            <p className={`text-xs font-medium ${vaultStatus.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {vaultStatus.msg}
            </p>
          )}
        </div>
      </section>

      {/* 資料管理 */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">資料管理</h2>
        <div className="space-y-3">
          {/* 儲存空間 */}
          {storageUsage && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm text-slate-700 dark:text-slate-200">儲存空間使用量</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(storageUsage.usage)} / {formatBytes(storageUsage.quota)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min(storageUsage.usage / storageUsage.quota * 100, 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          )}

          {/* 匯出 */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">匯出所有資料</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">下載完整備份（含附件）</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={exporting}>
              <Download size={13} /> {exporting ? '匯出中…' : '匯出 JSON'}
            </Button>
          </div>

          {/* 匯入 */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">匯入備份</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">將覆蓋現有所有資料</p>
            </div>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = '' }}
            />
            <Button size="sm" variant="secondary" onClick={() => importRef.current?.click()} disabled={importing}>
              <Upload size={13} /> {importing ? '匯入中…' : '選擇檔案'}
            </Button>
          </div>

          {/* 清除 */}
          <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">清除所有資料</p>
                <p className="text-xs text-red-500 dark:text-red-500/70 mt-0.5">刪除後無法復原</p>
              </div>
            </div>
            <Button size="sm" variant="danger" onClick={() => setShowClearConfirm(true)}>清除</Button>
          </div>
        </div>
      </section>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新增學期">
        <SemesterForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="編輯學期">
        {editing && <SemesterForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="刪除學期"
        message={`確定要刪除「${deleting?.name}」學期嗎？`}
        confirmLabel="確認刪除"
        danger
      />
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="清除所有資料"
        message="確定要刪除所有學期、課程、筆記、作業、題目和專案嗎？此操作完全無法復原。"
        confirmLabel="確認清除"
        danger
      />
    </div></div>
  )
}
