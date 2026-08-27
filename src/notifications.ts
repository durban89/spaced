import { getDueCards } from './db'

const CHECK_INTERVAL = 60 * 1000
const LAST_NOTIFIED_KEY = 'last-notified-time'
let timer: ReturnType<typeof setInterval> | null = null

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function checkAndNotify(): Promise<{ count: number; cards: { question: string; category: string }[] }> {
  const due = await getDueCards()
  const count = due.length

  if (count === 0) {
    localStorage.removeItem(LAST_NOTIFIED_KEY)
    return { count: 0, cards: [] }
  }

  const lastNotified = parseInt(localStorage.getItem(LAST_NOTIFIED_KEY) || '0', 10)
  const oldestDue = Math.min(...due.map(c => c.nextReview))

  if (oldestDue > lastNotified && 'Notification' in window && Notification.permission === 'granted') {
    const preview = due.slice(0, 3).map(c => c.question.slice(0, 40))

    new Notification('Ebbinghaus Memory', {
      body: `${count} cards due for review\n${preview.join('\n')}`,
      icon: '/spaced/icons/icon-192.png',
      tag: 'due-cards',
    })

    localStorage.setItem(LAST_NOTIFIED_KEY, String(Date.now()))
  }

  return {
    count,
    cards: due.map(c => ({ question: c.question, category: c.category })),
  }
}

export function startPeriodicCheck(onDue?: (count: number) => void) {
  stopPeriodicCheck()
  checkAndNotify()
  timer = setInterval(async () => {
    const { count } = await checkAndNotify()
    onDue?.(count)
  }, CHECK_INTERVAL)
}

export function stopPeriodicCheck() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
