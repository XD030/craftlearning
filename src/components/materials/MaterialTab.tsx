import { useState, useEffect, useRef } from 'react'
import { Plus, Paperclip, Link, FileText, ExternalLink, Trash2, Download } from 'lucide-react'
import type { Material } from '../../types'
import { getMaterialsByCourse, createMaterial, deleteMaterial } from '../../db/materials'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'

interface MaterialTabProps {
  courseId: string
}

export function MaterialTab({ courseId }: MaterialTabProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState<'file' | 'link'>('link')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Link form
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkWeek, setLinkWeek] = useState('')

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMaterialsByCourse(courseId).then(setMaterials)
  }, [courseId])

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    if (!linkTitle.trim() || !linkUrl.trim()) return
    const m = await createMaterial({
      courseId,
      title: linkTitle.trim(),
      type: 'link',
      url: linkUrl.trim(),
      week: linkWeek ? parseInt(linkWeek) : undefined,
    })
    setMaterials(ms => [...ms, m])
    setLinkTitle(''); setLinkUrl(''); setLinkWeek('')
    setShowAdd(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const m = await createMaterial({
      courseId,
      title: file.name.replace(/\.[^.]+$/, ''),
      type: 'file',
      fileBlob: file,
      fileName: file.name,
      fileType: file.type,
    })
    setMaterials(ms => [...ms, m])
    setShowAdd(false)
    e.target.value = ''
  }

  async function handleDelete(id: string) {
    await deleteMaterial(id)
    setMaterials(ms => ms.filter(m => m.id !== id))
    setDeletingId(null)
  }

  function openMaterial(m: Material) {
    if (m.type === 'link' && m.url) {
      window.open(m.url, '_blank', 'noopener')
    } else if (m.type === 'file' && m.fileBlob) {
      const url = URL.createObjectURL(m.fileBlob)
      if (m.fileType === 'application/pdf') {
        window.open(url, '_blank')
      } else if (m.fileType?.startsWith('image/')) {
        window.open(url, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = m.fileName ?? m.title
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }

  const groupedByWeek = materials.reduce<Record<string, Material[]>>((acc, m) => {
    const key = m.week != null ? `第 ${m.week} 週` : '未分類'
    acc[key] = [...(acc[key] ?? []), m]
    return acc
  }, {})

  return (
    <div>
      <div className="flex justify-end mb-5">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> 新增講義
        </Button>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="還沒有講義"
          description="上傳檔案或貼上連結"
          actionLabel="新增"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByWeek).sort(([a], [b]) => {
            const na = parseInt(a) || 999
            const nb = parseInt(b) || 999
            return na - nb
          }).map(([week, weekMaterials]) => (
            <section key={week}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{week}</h3>
              <div className="space-y-1.5">
                {weekMaterials.map(m => (
                  <MaterialRow key={m.id} material={m} onOpen={() => openMaterial(m)} onDelete={() => setDeletingId(m.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新增講義">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAddType('link')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${addType === 'link' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}
            >
              <Link size={14} /> 貼上連結
            </button>
            <button
              onClick={() => setAddType('file')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${addType === 'file' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}
            >
              <FileText size={14} /> 上傳檔案
            </button>
          </div>

          {addType === 'link' ? (
            <form onSubmit={handleAddLink} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">標題</label>
                <input className="input" placeholder="第一週講義" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL</label>
                <input className="input" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">週次（選填）</label>
                <input className="input" type="number" min="1" placeholder="1" value={linkWeek} onChange={e => setLinkWeek(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>取消</Button>
                <Button type="submit">新增</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 py-10 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={24} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-300">點擊選擇檔案</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF、圖片、文件均可</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setShowAdd(false)}>取消</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        title="刪除講義"
        message="確定要刪除這筆講義嗎？"
        confirmLabel="確認刪除"
        danger
      />
    </div>
  )
}

function MaterialRow({ material, onOpen, onDelete }: { material: Material; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 flex-shrink-0">
        {material.type === 'link' ? <Link size={13} className="text-slate-500 dark:text-slate-400" /> : <FileText size={13} className="text-slate-500 dark:text-slate-400" />}
      </div>
      <button className="flex-1 text-left min-w-0" onClick={onOpen}>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{material.title}</p>
        {material.type === 'link' && <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{material.url}</p>}
        {material.type === 'file' && <p className="text-xs text-slate-400 dark:text-slate-500">{material.fileName}</p>}
      </button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {material.type === 'link' ? (
          <button onClick={onOpen} className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><ExternalLink size={13} /></button>
        ) : (
          <button onClick={onOpen} className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Download size={13} /></button>
        )}
        <button onClick={onDelete} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
