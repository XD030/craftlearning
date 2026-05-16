import { db } from './database'
import type { Material } from '../types'
import { nanoid } from '../utils/nanoid'

export async function getMaterialsByCourse(courseId: string): Promise<Material[]> {
  return db.materials.where('courseId').equals(courseId).sortBy('createdAt')
}

export async function createMaterial(data: Omit<Material, 'id' | 'createdAt'>): Promise<Material> {
  const material: Material = { id: nanoid(), createdAt: new Date().toISOString(), ...data }
  await db.materials.add(material)
  return material
}

export async function updateMaterial(id: string, data: Partial<Material>): Promise<void> {
  await db.materials.update(id, data)
}

export async function deleteMaterial(id: string): Promise<void> {
  await db.materials.delete(id)
}
