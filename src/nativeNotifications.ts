import { Capacitor, registerPlugin } from '@capacitor/core'
import type { Card } from './types'

export interface NotificationSchedulerPlugin {
  scheduleCard(options: {
    cardId: string
    question: string
    category: string
    nextReviewMs: number
  }): Promise<void>
  cancelCard(options: { cardId: string }): Promise<void>
  requestPermission(): Promise<{ granted: boolean }>
}

const plugin = registerPlugin<NotificationSchedulerPlugin>('NotificationScheduler')

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export async function isNativeNotificationsAvailable(): Promise<boolean> {
  return isNative()
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false
  const res = await plugin.requestPermission()
  return res.granted
}

export async function scheduleCardNotification(card: Card): Promise<void> {
  if (!isNative() || !card.id) return
  try {
    await plugin.scheduleCard({
      cardId: card.id,
      question: card.question.slice(0, 60),
      category: card.category,
      nextReviewMs: card.nextReview,
    })
  } catch (e) {
    console.warn('scheduleCardNotification failed', e)
  }
}

export async function cancelCardNotification(cardId: string): Promise<void> {
  if (!isNative()) return
  try {
    await plugin.cancelCard({ cardId })
  } catch (e) {
    console.warn('cancelCardNotification failed', e)
  }
}
