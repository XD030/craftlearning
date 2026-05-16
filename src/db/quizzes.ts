import { db } from './database'
import type { QuizQuestion } from '../types'
import { nanoid } from '../utils/nanoid'

export async function getQuizzesByCourse(courseId: string): Promise<QuizQuestion[]> {
  return db.quizQuestions.where('courseId').equals(courseId).toArray()
}

export async function createQuizQuestion(data: Omit<QuizQuestion, 'id' | 'timesAnswered' | 'timesCorrect'>): Promise<QuizQuestion> {
  const q: QuizQuestion = { id: nanoid(), timesAnswered: 0, timesCorrect: 0, ...data }
  await db.quizQuestions.add(q)
  return q
}

export async function updateQuizQuestion(id: string, data: Partial<QuizQuestion>): Promise<void> {
  await db.quizQuestions.update(id, data)
}

export async function recordAnswer(id: string, correct: boolean): Promise<void> {
  const q = await db.quizQuestions.get(id)
  if (!q) return
  await db.quizQuestions.update(id, {
    timesAnswered: q.timesAnswered + 1,
    timesCorrect: q.timesCorrect + (correct ? 1 : 0),
    lastAnswered: new Date().toISOString(),
  })
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  await db.quizQuestions.delete(id)
}
