import { db } from './database'
import type { GroupProject } from '../types'
import { nanoid } from '../utils/nanoid'

export async function getAllProjects(): Promise<GroupProject[]> {
  return db.groupProjects.orderBy('createdAt').reverse().toArray()
}

export async function getProjectsByCourse(courseId: string): Promise<GroupProject[]> {
  return db.groupProjects.where('courseId').equals(courseId).toArray()
}

export async function getProjectById(id: string): Promise<GroupProject | undefined> {
  return db.groupProjects.get(id)
}

export async function createProject(data: Omit<GroupProject, 'id' | 'createdAt'>): Promise<GroupProject> {
  const project: GroupProject = { id: nanoid(), createdAt: new Date().toISOString(), ...data }
  await db.groupProjects.add(project)
  return project
}

export async function updateProject(id: string, data: Partial<GroupProject>): Promise<void> {
  await db.groupProjects.update(id, data)
}

export async function deleteProject(id: string): Promise<void> {
  await db.groupProjects.delete(id)
}
