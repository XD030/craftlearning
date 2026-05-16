import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Users, CheckSquare } from 'lucide-react'
import type { Course } from '../../types'
import { getCoursesBySemester, createCourse } from '../../db/courses'
import { useApp } from '../../contexts/AppContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { CourseForm } from './CourseForm'

export function CourseList() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [showAdd, setShowAdd] = useState(false)

  // Use active semester, falling back to the first available semester
  const activeSemesterId = state.activeSemesterId ?? state.semesters[0]?.id

  useEffect(() => {
    if (activeSemesterId) {
      getCoursesBySemester(activeSemesterId).then(setCourses)
    }
  }, [activeSemesterId])

  async function handleCreate(data: Omit<Course, 'id' | 'createdAt'>) {
    const course = await createCourse(data)
    setCourses(cs => [...cs, course])
    setShowAdd(false)
  }

  const semester = state.semesters.find(s => s.id === activeSemesterId)

  return (
    <div className="h-full overflow-y-auto"><div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">課程</h1>
          {semester && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{semester.name} 學期</p>}
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 新增課程
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="還沒有課程"
          description="新增本學期的課程，開始整理筆記和作業"
          actionLabel="新增第一門課"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} onClick={() => navigate(`/courses/${course.id}`)} />
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新增課程" size="lg">
        {activeSemesterId ? (
          <CourseForm
            semesterId={activeSemesterId}
            onSubmit={handleCreate}
            onCancel={() => setShowAdd(false)}
          />
        ) : (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">尚未建立學期，請先至「設定」頁面新增學期。</p>
            <Button onClick={() => setShowAdd(false)} variant="secondary">關閉</Button>
          </div>
        )}
      </Modal>
    </div></div>
  )
}

function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: course.color + '22' }}>
          <BookOpen size={18} style={{ color: course.color }} />
        </div>
        <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ backgroundColor: course.color }} />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {course.name}
      </h3>
      {course.instructor && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{course.instructor}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        {course.schedule && (
          <span className="flex items-center gap-1">
            <Users size={11} /> {course.schedule}
          </span>
        )}
        {course.credits && (
          <span className="flex items-center gap-1">
            <CheckSquare size={11} /> {course.credits} 學分
          </span>
        )}
      </div>
    </button>
  )
}
