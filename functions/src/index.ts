import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onSchedule } from 'firebase-functions/v2/scheduler'

initializeApp()

const db = getFirestore()
const messaging = getMessaging()

const SCHEDULE = '*/30 * * * *'
const PREVIEW_LIMIT = 3
const PREVIEW_CHARS = 40

interface TokenRecord {
  token: string
  ref: FirebaseFirestore.DocumentReference
  lastNotifiedCount: number
  lastNotifiedAt: number
}

export const sendDueReminders = onSchedule(SCHEDULE, async () => {
  const now = Date.now()

  const tokenSnaps = await db.collectionGroup('fcmTokens').get()

  const tokensByUser = new Map<string, TokenRecord[]>()
  for (const snap of tokenSnaps.docs) {
    const uid = snap.ref.parent.parent?.id
    if (!uid) continue
    const data = snap.data()
    const entry: TokenRecord = {
      token: (data.token as string) ?? snap.id,
      ref: snap.ref,
      lastNotifiedCount: (data.lastNotifiedCount as number) ?? 0,
      lastNotifiedAt: (data.lastNotifiedAt as number) ?? 0,
    }
    const list = tokensByUser.get(uid)
    if (list) list.push(entry)
    else tokensByUser.set(uid, [entry])
  }

  for (const [uid, tokens] of tokensByUser) {
    try {
      await notifyUser(uid, tokens, now)
    } catch (err) {
      console.error(`Failed to notify user ${uid}:`, err)
    }
  }
})

async function notifyUser(uid: string, tokens: TokenRecord[], now: number): Promise<void> {
  const cardsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('cards')
    .where('nextReview', '<=', now)
    .orderBy('nextReview', 'asc')
    .get()

  const count = cardsSnap.size
  if (count === 0) {
    for (const token of tokens) {
      if (token.lastNotifiedCount !== 0) {
        await token.ref.update({ lastNotifiedCount: 0, lastNotifiedAt: now })
      }
    }
    return
  }

  const preview = cardsSnap.docs
    .slice(0, PREVIEW_LIMIT)
    .map((d) => String((d.data().question as string) ?? '').slice(0, PREVIEW_CHARS))

  for (const token of tokens) {
    if (token.lastNotifiedCount === count) continue

    const message = {
      token: token.token,
      notification: {
        title: 'Spaced - Ebbinghaus Memory',
        body: `${count} cards due for review\n${preview.join('\n')}`,
      },
      data: {
        url: '/spaced/',
        count: String(count),
      },
      android: {
        priority: 'high' as const,
      },
      webpush: {
        fcmOptions: { link: '/spaced/' },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: count,
          },
        },
      },
    }

    try {
      await messaging.send(message)
      await token.ref.update({ lastNotifiedCount: count, lastNotifiedAt: now })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        await token.ref.delete().catch(() => {})
      } else {
        console.error(`Send failed for token (user ${uid}):`, err)
      }
    }
  }
}