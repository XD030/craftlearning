import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Clock, BookMarked, FileText, CheckSquare } from 'lucide-react'
import type { Task, Course } from '../../types'
import { getUpcomingTasks } from '../../db/tasks'
import { getCoursesBySemester } from '../../db/courses'
import { getUnreviewedCountByCourse, createNote } from '../../db/notes'
import { createTask } from '../../db/tasks'
import { useApp } from '../../contexts/AppContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { TaskForm } from '../../components/tasks/TaskForm'
import { clsx } from '../../utils/clsx'

const TASK_TYPE_LABELS: Record<Task['type'], string> = {
  assignment: '作業', exam: '考試', report: '報告', project: '專題',
}

function getDaysUntil(dueDate: string): number {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number) {
  if (days <= 3) return 'text-red-600 dark:text-red-400'
  if (days <= 7) return 'text-amber-600 dark:text-amber-400'
  return 'text-slate-500 dark:text-slate-400'
}

function urgencyBg(days: number) {
  if (days <= 3) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  if (days <= 7) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
  return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
}

const DAY_OF_WEEK_MAP: Record<string, number> = {
  '週日': 0, '週一': 1, '週二': 2, '週三': 3, '週四': 4, '週五': 5, '週六': 6,
}

function parseTodayCourses(courses: Course[]): Course[] {
  const today = new Date().getDay()
  return courses.filter(c => {
    if (c.scheduleSlots && c.scheduleSlots.length > 0) {
      return c.scheduleSlots.some(s => s.day === today)
    }
    if (!c.schedule) return false
    const match = c.schedule.match(/週[一二三四五六日]/)
    return match ? DAY_OF_WEEK_MAP[match[0]] === today : false
  })
}

export function Dashboard() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [unreviewedMap, setUnreviewedMap] = useState<Record<string, number>>({})
  const [showNewNote, setShowNewNote] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [taskCourseId, setTaskCourseId] = useState('')

  useEffect(() => {
    getUpcomingTasks(14).then(setTasks)
    if (state.activeSemesterId) {
      getCoursesBySemester(state.activeSemesterId).then(async cs => {
        setCourses(cs)
        if (cs.length > 0) {
          setSelectedCourseId(cs[0].id)
          setTaskCourseId(cs[0].id)
        }
        const counts = await Promise.all(cs.map(c => getUnreviewedCountByCourse(c.id)))
        const map: Record<string, number> = {}
        cs.forEach((c, i) => { if (counts[i] > 0) map[c.id] = counts[i] })
        setUnreviewedMap(map)
      })
    }
  }, [state.activeSemesterId])

  // Cmd+N: open new note modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setShowNewNote(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleCreateNote() {
    if (!newNoteTitle.trim() || !selectedCourseId) return
    const note = await createNote({
      courseId: selectedCourseId,
      title: newNoteTitle.trim(),
      content: '',
      tags: [],
      isHighlight: false,
      isReviewed: false,
    })
    setShowNewNote(false)
    setNewNoteTitle('')
    navigate(`/notes/${note.id}`)
  }

  async function handleCreateTask(data: Omit<Task, 'id' | 'createdAt'>) {
    await createTask(data)
    setShowNewTask(false)
    getUpcomingTasks(14).then(setTasks)
  }

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]))
  const todayCourses = parseTodayCourses(courses)
  const now = new Date()
  const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']
  const dateStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日　週${DAY_NAMES[now.getDay()]}`

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{dateStr}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {state.semesters.find(s => s.id === state.activeSemesterId)?.name ?? ''} 學期
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 即將到期 */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-500 dark:text-slate-400" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">即將到期</h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">14 天內</span>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">近期沒有待辦任務</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const days = getDaysUntil(task.dueDate)
                const course = courseMap[task.courseId]
                return (
                  <button
                    key={task.id}
                    onClick={() => navigate(`/courses/${task.courseId}`)}
                    className={clsx(
                      'w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:brightness-95',
                      urgencyBg(days)
                    )}
                  >
                    {course && (
                      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {TASK_TYPE_LABELS[task.type]} · {course?.name ?? '未知課程'}
                      </p>
                    </div>
                    <span className={clsx('text-xs font-semibold flex-shrink-0', urgencyColor(days))}>
                      {days <= 0 ? '今天' : `${days} 天`}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 今日課程 */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-slate-500 dark:text-slate-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">今日課程</h2>
          </div>
          {courses.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">尚無課程</p>
          ) : todayCourses.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">今天沒有課</p>
          ) : (
            <div className="space-y-2">
              {todayCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{course.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{course.schedule}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 待整理提醒 */}
      {Object.keys(unreviewedMap).length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <BookMarked size={16} className="text-slate-500 dark:text-slate-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">待整理筆記</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {courses.filter(c => unreviewedMap[c.id]).map(course => (
              <button
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }} />
                <span className="text-slate-700 dark:text-slate-200">{course.name}</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{unreviewedMap[course.id]} 則</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 快速動作 */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setShowNewNote(true)}>
          <FileText size={15} /> 新增筆記
          <kbd className="text-xs opacity-60 font-mono ml-1">⌘N</kbd>
        </Button>
        <Button variant="secondary" onClick={() => setShowNewTask(true)}>
          <CheckSquare size={15} /> 新增作業/考試
        </Button>
        <Button variant="secondary" onClick={() => navigate('/courses')}>
          <Plus size={15} /> 新增課程
        </Button>
      </div>

      {/* 快速新增筆記 */}
      <Modal open={showNewNote} onClose={() => setShowNewNote(false)} title="快速新增筆記" size="sm">
        {courses.length === 0 ? (
          <NoCourseNotice onClose={() => setShowNewNote(false)} onGo={() => { setShowNewNote(false); navigate('/courses') }} />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">選擇課程</label>
              <select className="input" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">標題</label>
              <input
                className="input"
                placeholder="筆記標題"
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateNote() }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowNewNote(false)}>取消</Button>
              <Button onClick={handleCreateNote} disabled={!newNoteTitle.trim() || !selectedCourseId}>
                建立並開始編輯
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 快速新增作業/考試 */}
      <Modal open={showNewTask} onClose={() => setShowNewTask(false)} title="新增作業/考試" size="md">
        {courses.length === 0 ? (
          <NoCourseNotice onClose={() => setShowNewTask(false)} onGo={() => { setShowNewTask(false); navigate('/courses') }} />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">選擇課程</label>
              <select className="input" value={taskCourseId} onChange={e => setTaskCourseId(e.target.value)}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {taskCourseId && (
              <TaskForm
                courseId={taskCourseId}
                onSubmit={handleCreateTask}
                onCancel={() => setShowNewTask(false)}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function NoCourseNotice({ onClose, onGo }: { onClose: () => void; onGo: () => void }) {
  return (
    <div className="py-4 text-center space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        尚未建立任何課程。<br />請先至「課程」頁面新增課程，再回來建立筆記或作業。
      </p>
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onClose}>關閉</Button>
        <Button onClick={onGo}>前往新增課程</Button>
      </div>
    </div>
  )
}
