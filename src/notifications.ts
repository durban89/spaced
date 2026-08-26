import { getDueCards } from './db'

const CHECK_INTERVAL = 60 * 1000
const NOTIFIED_KEY = 'notified-due'
let timer: ReturnType<typeof setInterval> | null = null

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function getNotifiedCount(): number {
  return parseInt(localStorage.getItem(NOTIFIED_KEY) || '0', 10)
}

function setNotifiedCount(count: number) {
  localStorage.setItem(NOTIFIED_KEY, String(count))
}

function resetNotifiedIfNewSession(dueCount: number) {
  if (dueCount > getNotifiedCount()) {
    setNotifiedCount(0)
  }
}

export async function checkAndNotify(): Promise<{ count: number; cards: { question: string; category: string }[] }> {
  const due = await getDueCards()
  const count = due.length

  if (count === 0) {
    setNotifiedCount(0)
    return { count: 0, cards: [] }
  }

  resetNotifiedIfNewSession(count)
  const alreadyNotified = getNotifiedCount()

  if (count > alreadyNotified && 'Notification' in window && Notification.permission === 'granted') {
    const newCount = count - alreadyNotified
    const preview = due.slice(0, 3).map(c => c.question.slice(0, 40))

    new Notification('Ebbinghaus Memory', {
      body: `${newCount} 张卡片需要复习\n${preview.join('\n')}`,
      icon: '/memory/icons/icon-192.png',
      tag: 'due-cards',
    })

    setNotifiedCount(count)
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
