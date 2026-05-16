import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCoursesBySemester } from '../../db/courses'
import { useApp } from '../../contexts/AppContext'
import type { Course, ScheduleSlot } from '../../types'

const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6] // Mon–Sat

const START_HOUR = 8   // 08:00
const END_HOUR = 21    // 21:00
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const PX_PER_MIN = 2   // 2px per minute → 1560px total height

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesFromStart(t: string): number {
  return timeToMinutes(t) - START_HOUR * 60
}

interface SlotBlock {
  course: Course
  slot: ScheduleSlot
}

function getHourLabels(): string[] {
  const labels: string[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    labels.push(`${h.toString().padStart(2, '0')}:00`)
  }
  return labels
}

export function Timetable() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    if (!state.activeSemesterId) return
    getCoursesBySemester(state.activeSemesterId).then(setCourses)
  }, [state.activeSemesterId])

  const today = new Date().getDay()
  const hourLabels = getHourLabels()

  // Group slots by day
  const byDay: Record<number, SlotBlock[]> = {}
  for (const d of DISPLAY_DAYS) byDay[d] = []

  for (const course of courses) {
    if (!course.scheduleSlots) continue
    for (const slot of course.scheduleSlots) {
      if (byDay[slot.day]) {
        byDay[slot.day].push({ course, slot })
      }
    }
  }

  const totalHeight = TOTAL_MINUTES * PX_PER_MIN

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">課表</h1>
        {state.activeSemesterId ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {state.semesters.find(s => s.id === state.activeSemesterId)?.name}
          </p>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">尚未選擇學期，請至設定頁面啟用學期</p>
        )}
      </div>

      {courses.filter(c => c.scheduleSlots && c.scheduleSlots.length > 0).length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
          <p className="text-base font-medium mb-1">尚未設定上課時段</p>
          <p className="text-sm">至「課程」頁面編輯課程，新增上課時段後即可在這裡看到課表</p>
        </div>
      )}

      {courses.some(c => c.scheduleSlots && c.scheduleSlots.length > 0) && (
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-[600px]">
            {/* Hour axis */}
            <div className="w-14 flex-shrink-0 relative" style={{ height: totalHeight + 32 }}>
              <div className="h-8" /> {/* header spacer */}
              {hourLabels.map((label, i) => (
                <div
                  key={label}
                  className="absolute left-0 right-0 flex items-start justify-end pr-2"
                  style={{ top: 32 + i * 60 * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                >
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 -mt-1.5">{label}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DISPLAY_DAYS.map(day => (
              <div key={day} className="flex-1 flex flex-col border-l border-slate-200 dark:border-slate-700 min-w-[80px]">
                {/* Day header */}
                <div
                  className={[
                    'h-8 flex items-center justify-center text-xs font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700',
                    day === today
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400',
                  ].join(' ')}
                >
                  {DAYS[day]}
                </div>

                {/* Grid + blocks */}
                <div className="relative flex-1" style={{ height: totalHeight }}>
                  {/* Hour grid lines */}
                  {hourLabels.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800"
                      style={{ top: i * 60 * PX_PER_MIN }}
                    />
                  ))}

                  {/* Course blocks */}
                  {byDay[day].map(({ course, slot }, idx) => {
                    const top = minutesFromStart(slot.startTime) * PX_PER_MIN
                    const dur = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)
                    const height = Math.max(dur * PX_PER_MIN, 24)
                    return (
                      <button
                        key={idx}
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="absolute left-1 right-1 rounded-md px-1.5 py-1 text-left overflow-hidden text-white hover:opacity-90 transition-opacity shadow-sm"
                        style={{ top, height, backgroundColor: course.color }}
                      >
                        <div className="text-[11px] font-semibold leading-tight truncate">{course.name}</div>
                        {height >= 36 && (
                          <div className="text-[10px] opacity-80 mt-0.5 truncate">
                            {slot.startTime}–{slot.endTime}
                            {slot.location && ` · ${slot.location}`}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
