import { INTERVALS, type Card, type ReviewResult } from './types'
import { updateCard, getCard } from './db'

export function scheduleNext(card: Card, result: ReviewResult): { level: number; nextReview: number } {
  let { level } = card

  switch (result) {
    case 'remembered':
      level = Math.min(level + 1, INTERVALS.length - 1)
      break
    case 'fuzzy':
      level = Math.max(level - 1, 0)
      break
    case 'forgotten':
      level = 0
      break
  }

  const interval = INTERVALS[level]
  const nextReview = Date.now() + interval

  return { level, nextReview }
}

export async function processReview(cardId: string, result: ReviewResult): Promise<void> {
  const card = await getCard(cardId)
  if (!card) return

  const { level, nextReview } = scheduleNext(card, result)
  await updateCard(cardId, {
    level,
    nextReview,
    reviewHistory: [
      ...card.reviewHistory,
      { date: Date.now(), result },
    ],
  })
}

export function getStreak(): number {
  const history = localStorage.getItem('streak')
  if (!history) return 0

  const dates: number[] = JSON.parse(history)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  const uniqueDates = [...new Set(dates.map((d) => {
    const dt = new Date(d)
    dt.setHours(0, 0, 0, 0)
    return dt.getTime()
  }))].sort((a, b) => b - a)

  if (uniqueDates[0] !== todayMs) return 0

  let streak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    if (todayMs - uniqueDates[i] === streak * 86400000) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function recordStudyDay(): void {
  const history = localStorage.getItem('streak')
  const dates: number[] = history ? JSON.parse(history) : []
  dates.push(Date.now())
  localStorage.setItem('streak', JSON.stringify(dates.slice(-365)))
}
