import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, CheckSquare } from 'lucide-react'
import type { GroupProject } from '../../types'
import { getProjectsByCourse, createProject } from '../../db/projects'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

interface Props {
  courseId: string
}

export function ProjectsTab({ courseId }: Props) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<GroupProject[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    getProjectsByCourse(courseId).then(setProjects)
  }, [courseId])

  async function handleCreate() {
    if (!newName.trim()) return
    const p = await createProject({ courseId, name: newName.trim(), members: [], links: [], tasks: [], notes: '' })
    setProjects(prev => [...prev, p])
    setCreating(false)
    setNewName('')
    navigate(`/projects/${p.id}`)
  }

  if (projects.length === 0 && !creating) {
    return (
      <EmptyState
        icon={Users}
        title="尚無小組專案"
        description="在此課程建立專案，統一管理成員、任務與連結"
        actionLabel="新增專案"
        onAction={() => setCreating(true)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{projects.length} 個專案</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> 新增專案
        </Button>
      </div>

      {creating && (
        <div className="flex gap-2 mb-4">
          <input
            className="input flex-1 text-sm"
            placeholder="專案名稱"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            autoFocus
          />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>建立</Button>
          <Button size="sm" variant="secondary" onClick={() => { setCreating(false); setNewName('') }}>取消</Button>
        </div>
      )}

      <div className="space-y-3">
        {projects.map(p => {
          const done = p.tasks.filter(t => t.done).length
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="w-full text-left flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{p.name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {p.members.length > 0 && <span>{p.members.length} 位成員</span>}
                  {p.tasks.length > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckSquare size={11} /> {done}/{p.tasks.length}
                    </span>
                  )}
                  {p.dueDate && <span>截止 {p.dueDate.slice(0, 10)}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
