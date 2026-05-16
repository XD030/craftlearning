import { db } from './database'
import type { Task } from '../types'
import { nanoid } from '../utils/nanoid'

export async function getTasksByCourse(courseId: string): Promise<Task[]> {
  return db.tasks.where('courseId').equals(courseId).sortBy('dueDate')
}

export async function getUpcomingTasks(days = 14): Promise<Task[]> {
  const now = new Date()
  const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return db.tasks
    .where('dueDate')
    .between(now.toISOString(), limit.toISOString())
    .and(t => t.status !== 'done')
    .sortBy('dueDate')
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const task: Task = { id: nanoid(), createdAt: new Date().toISOString(), ...data }
  await db.tasks.add(task)
  return task
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  await db.tasks.update(id, data)
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id)
}
