import { db } from './database'
import type { Semester } from '../types'
import { nanoid } from '../utils/nanoid'

export async function getAllSemesters(): Promise<Semester[]> {
  const semesters = await db.semesters.toArray()
  return semesters.sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export async function getActiveSemester(): Promise<Semester | undefined> {
  const all = await db.semesters.toArray()
  return all.find(s => s.isActive)
}

export async function createSemester(data: Omit<Semester, 'id'>): Promise<Semester> {
  const semester: Semester = { id: nanoid(), ...data }
  await db.semesters.add(semester)
  return semester
}

export async function updateSemester(id: string, data: Partial<Semester>): Promise<void> {
  await db.semesters.update(id, data)
}

export async function setActiveSemester(id: string): Promise<void> {
  await db.transaction('rw', db.semesters, async () => {
    const all = await db.semesters.toArray()
    await Promise.all(all.map(s => s.isActive ? db.semesters.update(s.id, { isActive: false }) : Promise.resolve()))
    await db.semesters.update(id, { isActive: true })
  })
}

export async function deleteSemester(id: string): Promise<void> {
  await db.semesters.delete(id)
}

export async function seedDefaultSemester(): Promise<void> {
  const count = await db.semesters.count()
  if (count === 0) {
    await createSemester({
      name: '114-2',
      startDate: '2025-02-17',
      endDate: '2025-06-20',
      isActive: true,
    })
  }
}
