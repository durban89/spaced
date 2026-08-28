import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { getToken, onMessage, type Messaging } from 'firebase/messaging'
import { messagingPromise } from './firebase'
import { db } from './firebase'
import { getCurrentUser } from './auth'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
const FCM_SW_URL = '/spaced/firebase-messaging-sw.js'

async function getMessagingOrNull(): Promise<Messaging | null> {
  return messagingPromise
}

async function registerFcmWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  return navigator.serviceWorker.register(FCM_SW_URL, { scope: '/spaced/' })
}

export async function isPushSupportAvailable(): Promise<boolean> {
  if (!VAPID_KEY) return false
  if (!('Notification' in window)) return false
  return (await getMessagingOrNull()) !== null
}

export async function unsubscribePush(): Promise<void> {
  const messaging = await getMessagingOrNull()
  if (!messaging) return
  try {
    const registration = await registerFcmWorker()
    const current = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (current && getCurrentUser()) {
      await deleteDoc(tokenDoc(getCurrentUser()!.uid, current))
    }
  } catch {
    // silent fail
  }
}

function tokenDoc(userId: string, token: string) {
  return doc(db, 'users', userId, 'fcmTokens', token)
}

export async function setupPushSubscription(): Promise<boolean> {
  const messaging = await getMessagingOrNull()
  if (!messaging) {
    console.warn('Firebase Messaging is not supported in this browser.')
    return false
  }
  if (!VAPID_KEY) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not set. Push notifications unavailable.')
    return false
  }
  if (!('Notification' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const user = getCurrentUser()
  if (!user) return false

  try {
    const registration = await registerFcmWorker()
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return false

    await setDoc(tokenDoc(user.uid, token), {
      token,
      platform: 'web',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userAgent: navigator.userAgent,
    })

    return true
  } catch (err) {
    console.error('Failed to subscribe to push notifications.', err)
    return false
  }
}

export async function onPushMessage(callback: (payload: { body?: string; title?: string }) => void): Promise<() => void> {
  const messaging = await getMessagingOrNull()
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    })
  })
}