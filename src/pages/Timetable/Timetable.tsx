import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { getCoursesBySemester } from '../../db/courses'
import { useApp } from '../../contexts/AppContext'
import type { Course, ScheduleSlot } from '../../types'

const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6]

const START_HOUR = 8
const END_HOUR = 21
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60

const HOUR_LABELS: { label: string; pct: number }[] = []
for (let h = START_HOUR; h <= END_HOUR; h += 2) {
  HOUR_LABELS.push({ label: `${h}:00`, pct: ((h - START_HOUR) * 60 / TOTAL_MINUTES) * 100 })
}

const GRID_LINES: number[] = []
for (let h = START_HOUR; h <= END_HOUR; h++) {
  GRID_LINES.push(((h - START_HOUR) * 60 / TOTAL_MINUTES) * 100)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function topPct(startTime: string): number {
  return ((timeToMinutes(startTime) - START_HOUR * 60) / TOTAL_MINUTES) * 100
}

function heightPct(startTime: string, endTime: string): number {
  return ((timeToMinutes(endTime) - timeToMinutes(startTime)) / TOTAL_MINUTES) * 100
}

// Injected during print, removed after
const PRINT_STYLE_ID = 'timetable-print-style'

function injectPrintStyles() {
  if (document.getElementById(PRINT_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = PRINT_STYLE_ID
  s.textContent = `
    @page { size: landscape; margin: 8mm; }
    @media print {
      aside, header, .timetable-toolbar { display: none !important; }
      body, #root, #root > div, #root > div > div {
        overflow: visible !important;
        height: auto !important;
      }
      main { overflow: visible !important; flex: 1 !important; }
      .timetable-root { height: 100vh !important; }
    }
  `
  document.head.appendChild(s)
}

function removePrintStyles() {
  document.getElementById(PRINT_STYLE_ID)?.remove()
}

interface SlotBlock { course: Course; slot: ScheduleSlot }

export function Timetable() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    if (!state.activeSemesterId) return
    getCoursesBySemester(state.activeSemesterId).then(setCourses)
  }, [state.activeSemesterId])

  const today = new Date().getDay()

  const byDay: Record<number, SlotBlock[]> = {}
  for (const d of DISPLAY_DAYS) byDay[d] = []
  for (const course of courses) {
    for (const slot of course.scheduleSlots ?? []) {
      if (byDay[slot.day]) byDay[slot.day].push({ course, slot })
    }
  }

  const hasCourses = courses.some(c => c.scheduleSlots && c.scheduleSlots.length > 0)
  const semesterName = state.semesters.find(s => s.id === state.activeSemesterId)?.name

  function handleDownload() {
    injectPrintStyles()
    window.addEventListener('afterprint', removePrintStyles, { once: true })
    window.print()
  }

  return (
    <div className="timetable-root flex flex-col h-full min-h-0">
      {/* Toolbar — hidden during print */}
      <div className="timetable-toolbar px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">課表</h1>
          {semesterName && (
            <span className="text-sm text-slate-400 dark:text-slate-500">{semesterName}</span>
          )}
          {!state.activeSemesterId && (
            <span className="text-sm text-amber-500">尚未選擇學期，請至設定頁面啟用學期</span>
          )}
        </div>
        {hasCourses && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Download size={14} />
            下載課表
          </button>
        )}
      </div>

      {!hasCourses ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
          <p className="text-base font-medium mb-1">尚未設定上課時段</p>
          <p className="text-sm">至「課程」頁面編輯課程，新增上課時段後即可在這裡看到課表</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 p-2">
          <div
            className="h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: '32px repeat(6, 1fr)',
              gridTemplateRows: '28px 1fr',
            }}
          >
            {/* Corner */}
            <div />

            {/* Day headers */}
            {DISPLAY_DAYS.map(day => (
              <div
                key={day}
                className={[
                  'flex items-center justify-center text-xs font-semibold border-l border-slate-200 dark:border-slate-700',
                  day === today
                    ? 'bg-blue-600 text-white rounded-t'
                    : 'text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                {DAYS[day]}
              </div>
            ))}

            {/* Time labels */}
            <div className="relative border-t border-slate-200 dark:border-slate-700">
              {HOUR_LABELS.map(({ label, pct }) => (
                <div
                  key={label}
                  className="absolute right-1 text-[9px] leading-none text-slate-400 dark:text-slate-500"
                  style={{ top: `${pct}%`, transform: 'translateY(-50%)' }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DISPLAY_DAYS.map(day => (
              <div
                key={day}
                className={[
                  'relative border-l border-t border-slate-200 dark:border-slate-700',
                  day === today ? 'bg-blue-50/30 dark:bg-blue-900/10' : '',
                ].join(' ')}
              >
                {/* Hour grid lines */}
                {GRID_LINES.map((pct, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800"
                    style={{ top: `${pct}%` }}
                  />
                ))}

                {/* Course blocks */}
                {byDay[day].map(({ course, slot }, idx) => {
                  const top = topPct(slot.startTime)
                  const height = heightPct(slot.startTime, slot.endTime)
                  return (
                    <button
                      key={idx}
                      onClick={() => navigate(`/courses/${course.id}`)}
                      title={`${course.name}  ${slot.startTime}–${slot.endTime}${slot.location ? `  ${slot.location}` : ''}`}
                      className="absolute inset-x-0.5 rounded-md text-white text-left overflow-hidden hover:brightness-110 transition-all shadow-sm"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        backgroundColor: course.color,
                        minHeight: '22px',
                      }}
                    >
                      <div className="px-2 py-1 h-full flex flex-col justify-center overflow-hidden gap-0.5">
                        <span className="text-[13px] font-bold leading-snug block truncate">{course.name}</span>
                        {slot.location && height > 7 && (
                          <span className="text-[11px] opacity-80 leading-tight block truncate">{slot.location}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
