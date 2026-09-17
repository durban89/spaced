import { INTERVALS, type Card, type ReviewResult } from './types'
import { updateCard, getCard, getStudyDates, addStudyDates } from './db'
import { scheduleCardNotification, cancelCardNotification } from './nativeNotifications'

const LEGACY_STREAK_KEY = 'streak'

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
  const updated = { ...card, level, nextReview }
  await updateCard(cardId, {
    level,
    nextReview,
    reviewHistory: [
      ...card.reviewHistory,
      { date: Date.now(), result },
    ],
  })
  await syncNativeSchedule(updated)
}

export async function syncNativeSchedule(card: Card): Promise<void> {
  const now = Date.now()
  if (card.nextReview > now) {
    await scheduleCardNotification(card)
  } else {
    await cancelCardNotification(card.id || '')
  }
}

function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function readLegacyDates(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_STREAK_KEY)
    if (!raw) return []
    const timestamps: number[] = JSON.parse(raw)
    return [...new Set(timestamps.map((ts) => dayKey(ts)))]
  } catch {
    return []
  }
}

function clearLegacyDates(): void {
  try {
    localStorage.removeItem(LEGACY_STREAK_KEY)
  } catch {
    // noop
  }
}

function computeStreak(dayKeys: string[]): number {
  const unique = [...new Set(dayKeys)].sort().reverse()
  const today = dayKey()
  if (unique[0] !== today) return 0

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(`${unique[i - 1]}T00:00:00`)
    prev.setDate(prev.getDate() - 1)
    if (unique[i] === dayKey(prev.getTime())) streak++
    else break
  }
  return streak
}

export async function getStreak(): Promise<number> {
  try {
    let days = await getStudyDates()
    if (days.length === 0) {
      const legacy = readLegacyDates()
      if (legacy.length > 0) {
        await addStudyDates(legacy)
        clearLegacyDates()
        days = legacy
      }
    }
    return computeStreak(days)
  } catch (e) {
    console.warn('getStreak failed, falling back to local data', e)
    return computeStreak(readLegacyDates())
  }
}

export async function recordStudyDay(): Promise<void> {
  try {
    const legacy = readLegacyDates()
    const dates = legacy.length > 0 ? [...legacy, dayKey()] : [dayKey()]
    await addStudyDates(dates)
    clearLegacyDates()
  } catch (e) {
    console.warn('recordStudyDay failed', e)
  }
}
