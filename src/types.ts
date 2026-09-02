export interface Card {
  id?: string
  category: string
  question: string
  answer: string
  level: number
  nextReview: number
  reviewHistory: ReviewRecord[]
  createdAt: number
  updatedAt: number
}

export interface ReviewRecord {
  date: number
  result: ReviewResult
}

export type ReviewResult = 'remembered' | 'fuzzy' | 'forgotten'

export interface Stats {
  total: number
  mastered: number
  dueToday: number
  newCards: number
  categories: { name: string; count: number }[]
}

export const INTERVALS = [
  20 * 60 * 1000,
  60 * 60 * 1000,
  9 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  6 * 24 * 60 * 60 * 1000,
  31 * 24 * 60 * 60 * 1000,
]

export const CATEGORY_PRESETS = [
  'System Integration PM',
  'PMP',
  'Software Engineer',
  'Information Security',
  'French',
  'Other',
]
