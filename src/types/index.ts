export interface Semester {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

export interface Course {
  id: string
  semesterId: string
  name: string
  code?: string
  instructor?: string
  credits?: number
  schedule?: string
  classroom?: string
  color: string
  gradingPolicy?: string
  createdAt: string
}

export interface Note {
  id: string
  courseId: string
  title: string
  content: string
  week?: number
  tags: string[]
  isHighlight: boolean
  isReviewed: boolean
  createdAt: string
  updatedAt: string
}

export interface Material {
  id: string
  courseId: string
  title: string
  type: 'file' | 'link'
  fileBlob?: Blob
  fileName?: string
  fileType?: string
  url?: string
  week?: number
  notes?: string
  createdAt: string
}

export interface Task {
  id: string
  courseId: string
  type: 'assignment' | 'exam' | 'report' | 'project'
  title: string
  description?: string
  dueDate: string
  status: 'todo' | 'in_progress' | 'done'
  scope?: string
  weight?: number
  grade?: string
  createdAt: string
}

export interface QuizQuestion {
  id: string
  courseId: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
  tags: string[]
  timesAnswered: number
  timesCorrect: number
  lastAnswered?: string
}

export interface GroupProject {
  id: string
  courseId?: string
  name: string
  members: string[]
  links: { label: string; url: string }[]
  tasks: { id: string; title: string; assignee?: string; done: boolean }[]
  notes: string
  dueDate?: string
  createdAt: string
}
