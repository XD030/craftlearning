import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, Trash2 } from 'lucide-react'
import type { GroupProject, Course } from '../../types'
import { getAllProjects, createProject, deleteProject } from '../../db/projects'
import { getAllSemesters } from '../../db/semesters'
import { getCoursesBySemester } from '../../db/courses'
import { useApp } from '../../contexts/AppContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'

export function ProjectList() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<GroupProject[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCourseId, setNewCourseId] = useState('')
  const [deleting, setDeleting] = useState<GroupProject | null>(null)

  useEffect(() => {
    getAllProjects().then(setProjects)
    getAllSemesters().then(async semesters => {
      const all = (await Promise.all(semesters.map(s => getCoursesBySemester(s.id)))).flat()
      setCourses(all)
      const firstActive = all.find(c => c.semesterId === state.activeSemesterId)
      if (firstActive) setNewCourseId(firstActive.id)
    })
  }, [state.activeSemesterId])

  async function handleCreate() {
    if (!newName.trim()) return
    const p = await createProject({
      name: newName.trim(),
      courseId: newCourseId || undefined,
      members: [],
      links: [],
      tasks: [],
      notes: '',
    })
    setProjects(prev => [p, ...prev])
    setShowNew(false)
    setNewName('')
    navigate(`/projects/${p.id}`)
  }

  async function handleDelete() {
    if (!deleting) return
    await deleteProject(deleting.id)
    setProjects(prev => prev.filter(p => p.id !== deleting.id))
    setDeleting(null)
  }

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]))

  return (
    <div className="h-full overflow-y-auto"><div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">小組專案</h1>
        <Button onClick={() => setShowNew(true)}><Plus size={14} /> 新增專案</Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={Users}
          title="尚無小組專案"
          description="建立專案來統一管理成員、連結、任務清單和筆記"
          actionLabel="新增第一個專案"
          onAction={() => setShowNew(true)}
        />
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const course = p.courseId ? courseMap[p.courseId] : null
            const doneTasks = p.tasks.filter(t => t.done).length
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer group"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                {course && (
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {course && <span>{course.name}</span>}
                    {p.members.length > 0 && <span>{p.members.length} 位成員</span>}
                    {p.tasks.length > 0 && <span>任務 {doneTasks}/{p.tasks.length}</span>}
                    {p.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {p.dueDate.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setDeleting(p) }}
                  className="p-1.5 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="新增專案" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">專案名稱</label>
            <input
              className="input"
              placeholder="例：第三組期末報告"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">關聯課程（可選）</label>
            <select className="input" value={newCourseId} onChange={e => setNewCourseId(e.target.value)}>
              <option value="">不關聯課程</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNew(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>建立並進入</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="刪除專案"
        message={`確定要刪除「${deleting?.name}」嗎？此操作無法復原。`}
        confirmLabel="確認刪除"
        danger
      />
    </div></div>
  )
}
