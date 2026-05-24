import { db } from './database'
import type { Course } from '../types'
import { nanoid } from '../utils/nanoid'

export async function getCoursesBySemester(semesterId: string): Promise<Course[]> {
  return db.courses.where('semesterId').equals(semesterId).sortBy('createdAt')
}

export async function getAllCourses(): Promise<Course[]> {
  return db.courses.orderBy('createdAt').toArray()
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return db.courses.get(id)
}

export async function createCourse(data: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
  const course: Course = {
    id: nanoid(),
    createdAt: new Date().toISOString(),
    ...data,
  }
  await db.courses.add(course)
  return course
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<void> {
  await db.courses.update(id, data)
}

export async function deleteCourse(id: string): Promise<void> {
  const tables = [db.courses, db.notes, db.materials, db.tasks, db.quizQuestions]
  await db.transaction('rw', tables, async () => {
    await db.courses.delete(id)
    await db.notes.where('courseId').equals(id).delete()
    await db.materials.where('courseId').equals(id).delete()
    await db.tasks.where('courseId').equals(id).delete()
    await db.quizQuestions.where('courseId').equals(id).delete()
  })
}
