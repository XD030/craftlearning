import { db } from './database'
import type { Note, Task, Material } from '../types'

export interface SearchResult {
  type: 'note' | 'task' | 'material'
  id: string
  title: string
  snippet?: string
  courseId: string
  meta?: string
}

function excerpt(text: string, query: string, maxLen = 80): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, maxLen)
  const start = Math.max(0, idx - 20)
  const end = Math.min(text.length, idx + query.length + 40)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

function matchNote(n: Note, q: string): boolean {
  const lq = q.toLowerCase()
  return (
    n.title.toLowerCase().includes(lq) ||
    n.content.toLowerCase().includes(lq) ||
    n.tags.some(t => t.toLowerCase().includes(lq))
  )
}

function matchTask(t: Task, q: string): boolean {
  const lq = q.toLowerCase()
  return (
    t.title.toLowerCase().includes(lq) ||
    (t.description?.toLowerCase().includes(lq) ?? false)
  )
}

function matchMaterial(m: Material, q: string): boolean {
  const lq = q.toLowerCase()
  return (
    m.title.toLowerCase().includes(lq) ||
    (m.url?.toLowerCase().includes(lq) ?? false)
  )
}

export async function searchAll(query: string, limit = 30): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const [notes, tasks, materials] = await Promise.all([
    db.notes.toArray(),
    db.tasks.toArray(),
    db.materials.toArray(),
  ])

  const results: SearchResult[] = []

  for (const n of notes) {
    if (matchNote(n, query)) {
      results.push({
        type: 'note',
        id: n.id,
        title: n.title,
        snippet: n.content ? excerpt(n.content, query) : undefined,
        courseId: n.courseId,
        meta: n.week != null ? `第 ${n.week} 週` : undefined,
      })
    }
  }

  for (const t of tasks) {
    if (matchTask(t, query)) {
      const TYPE_LABELS: Record<Task['type'], string> = { assignment: '作業', exam: '考試', report: '報告', project: '專題' }
      results.push({
        type: 'task',
        id: t.id,
        title: t.title,
        snippet: t.description ? excerpt(t.description, query) : undefined,
        courseId: t.courseId,
        meta: TYPE_LABELS[t.type],
      })
    }
  }

  for (const m of materials) {
    if (matchMaterial(m, query)) {
      results.push({
        type: 'material',
        id: m.id,
        title: m.title,
        snippet: m.url,
        courseId: m.courseId,
        meta: m.type === 'link' ? '連結' : '檔案',
      })
    }
  }

  return results.slice(0, limit)
}
