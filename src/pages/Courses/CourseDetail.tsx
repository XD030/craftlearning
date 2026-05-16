import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, FileText, Paperclip, CheckSquare, Star, Zap, Users } from 'lucide-react'
import type { Course } from '../../types'
import { getCourseById, updateCourse, deleteCourse } from '../../db/courses'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { NoteTab } from '../../components/notes/NoteTab'
import { TaskTab } from '../../components/tasks/TaskTab'
import { MaterialTab } from '../../components/materials/MaterialTab'
import { HighlightsTab } from '../../components/highlights/HighlightsTab'
import { QuizTab } from '../../components/quiz/QuizTab'
import { ProjectsTab } from '../../components/projects/ProjectsTab'
import { CourseForm } from './CourseForm'
import { clsx } from '../../utils/clsx'

const TABS = [
  { id: 'notes', icon: FileText, label: '筆記' },
  { id: 'materials', icon: Paperclip, label: '講義' },
  { id: 'tasks', icon: CheckSquare, label: '作業/考試' },
  { id: 'highlights', icon: Star, label: '重點整理' },
  { id: 'quiz', icon: Zap, label: '自測' },
  { id: 'projects', icon: Users, label: '小組專案' },
] as const

type TabId = typeof TABS[number]['id']

export function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('notes')
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (id) getCourseById(id).then(c => { if (c) setCourse(c) })
  }, [id])

  async function handleUpdate(data: Omit<Course, 'id' | 'createdAt'>) {
    if (!id) return
    await updateCourse(id, data)
    setCourse(c => c ? { ...c, ...data } : c)
    setShowEdit(false)
  }

  async function handleDelete() {
    if (!id) return
    await deleteCourse(id)
    navigate('/courses')
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">載入中…</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="px-8 pt-6 pb-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> 課程列表
        </button>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-10 rounded-full" style={{ backgroundColor: course.color }} />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{course.name}</h1>
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {course.instructor && <span>{course.instructor}</span>}
                {course.schedule && <span>{course.schedule}</span>}
                {course.classroom && <span>{course.classroom}</span>}
                {course.credits && <span>{course.credits} 學分</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)}>
              <Edit2 size={14} /> 編輯
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map(({ id: tabId, icon: Icon, label }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tabId
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'notes' && <NoteTab courseId={course.id} />}
        {activeTab === 'materials' && <MaterialTab courseId={course.id} />}
        {activeTab === 'tasks' && <TaskTab courseId={course.id} />}
        {activeTab === 'highlights' && <HighlightsTab courseId={course.id} />}
        {activeTab === 'quiz' && <QuizTab courseId={course.id} />}
        {activeTab === 'projects' && <ProjectsTab courseId={course.id} />}
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="編輯課程" size="lg">
        <CourseForm
          initial={course}
          semesterId={course.semesterId}
          onSubmit={handleUpdate}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="刪除課程"
        message={`確定要刪除「${course.name}」嗎？此操作將一併刪除所有相關筆記、講義和作業，且無法復原。`}
        confirmLabel="確認刪除"
        danger
      />
    </div>
  )
}

