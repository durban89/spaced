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
  checkPermission(): Promise<{ granted: boolean }>
  testNotification(): Promise<{ ok: boolean }>
}

const plugin = registerPlugin<NotificationSchedulerPlugin>('NotificationScheduler')

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export async function fireTestNotification(): Promise<void> {
  if (!isNative()) return
  try {
    await plugin.testNotification()
  } catch (e) {
    console.warn('testNotification failed', e)
  }
}

export async function isNativeNotificationsAvailable(): Promise<boolean> {
  return isNative()
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false
  const res = await plugin.requestPermission()
  return res.granted
}

export async function checkNativeNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const res = await plugin.checkPermission()
    return res.granted
  } catch (e) {
    // 插件未注册或原生方法不可用时，将错误抛出以暴露真实原因
    throw new Error(`checkPermission failed: ${e instanceof Error ? e.message : String(e)}`)
  }
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

// 打开应用时把已登录用户所有卡片的下次提醒重新排到原生闹钟，
// 兜底处理：重启/杀进程/手动撤销精确闹钟后原生排期表丢失。
export async function resyncAllSchedules(cards: Card[]): Promise<void> {
  if (!isNative()) return
  const now = Date.now()
  for (const card of cards) {
    try {
      if (card.id && card.nextReview > now) {
        await plugin.scheduleCard({
          cardId: card.id,
          question: card.question.slice(0, 60),
          category: card.category,
          nextReviewMs: card.nextReview,
        })
      } else if (card.id) {
        await plugin.cancelCard({ cardId: card.id })
      }
    } catch (e) {
      console.warn('resync schedule failed', card.id, e)
    }
  }
}
