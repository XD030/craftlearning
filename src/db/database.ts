import Dexie, { type EntityTable } from 'dexie'
import type { Semester, Course, Note, Material, Task, QuizQuestion, GroupProject } from '../types'

class AppDatabase extends Dexie {
  semesters!: EntityTable<Semester, 'id'>
  courses!: EntityTable<Course, 'id'>
  notes!: EntityTable<Note, 'id'>
  materials!: EntityTable<Material, 'id'>
  tasks!: EntityTable<Task, 'id'>
  quizQuestions!: EntityTable<QuizQuestion, 'id'>
  groupProjects!: EntityTable<GroupProject, 'id'>

  constructor() {
    super('StudentWorkbench')
    this.version(1).stores({
      semesters: 'id, isActive',
      courses: 'id, semesterId, createdAt',
      notes: 'id, courseId, week, isHighlight, isReviewed, createdAt, updatedAt',
      materials: 'id, courseId, type, week, createdAt',
      tasks: 'id, courseId, type, status, dueDate, createdAt',
      quizQuestions: 'id, courseId, lastAnswered',
      groupProjects: 'id, courseId, createdAt',
    })
  }
}

export const db = new AppDatabase()
