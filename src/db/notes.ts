import { db } from './database'
import type { Note } from '../types'
import { nanoid } from '../utils/nanoid'

export async function getNotesByCourse(courseId: string): Promise<Note[]> {
  return db.notes.where('courseId').equals(courseId).sortBy('createdAt')
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function createNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  const now = new Date().toISOString()
  const note: Note = { id: nanoid(), createdAt: now, updatedAt: now, ...data }
  await db.notes.add(note)
  return note
}

export async function updateNote(id: string, data: Partial<Note>): Promise<void> {
  await db.notes.update(id, { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id)
}

export async function getUnreviewedCountByCourse(courseId: string): Promise<number> {
  return db.notes.where('courseId').equals(courseId).and(n => !n.isReviewed).count()
}
