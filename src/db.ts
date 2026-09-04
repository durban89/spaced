import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import { getCurrentUser } from './auth'
import { scheduleCardNotification, cancelCardNotification } from './nativeNotifications'
import type { Card, Stats } from './types'

let _db: Firestore | null = null

async function getDb(): Promise<Firestore> {
  if (!_db) {
    const { db } = await import('./firebase')
    _db = db
  }
  return _db
}

async function userCardsRef() {
  const user = getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const db = await getDb()
  return collection(db, 'users', user.uid, 'cards')
}

async function cardRef(id: string) {
  const user = getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const db = await getDb()
  return doc(db, 'users', user.uid, 'cards', id)
}

export async function addCard(
  card: Omit<Card, 'id' | 'level' | 'nextReview' | 'reviewHistory' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now()
  const ref = await userCardsRef()
  const docRef = await addDoc(ref, {
    ...card,
    level: 0,
    nextReview: now,
    reviewHistory: [],
    createdAt: now,
    updatedAt: now,
  })
  await scheduleCardNotification({ ...card, id: docRef.id, level: 0, nextReview: now, reviewHistory: [], createdAt: now, updatedAt: now })
  return docRef.id
}

export async function updateCard(id: string, data: Partial<Card>): Promise<void> {
  const ref = await cardRef(id)
  await updateDoc(ref, { ...data, updatedAt: Date.now() })
}

export async function deleteCard(id: string): Promise<void> {
  const ref = await cardRef(id)
  await deleteDoc(ref)
  await cancelCardNotification(id)
}

export async function getCard(id: string): Promise<Card | undefined> {
  const ref = await cardRef(id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return undefined
  return { id: snap.id, ...snap.data() } as Card
}

export async function getAllCards(): Promise<Card[]> {
  const ref = await userCardsRef()
  const snap = await getDocs(ref)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Card))
}

export async function getCardsByCategory(category: string): Promise<Card[]> {
  const ref = await userCardsRef()
  const q = query(ref, where('category', '==', category))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Card))
}

export async function getDueCards(): Promise<Card[]> {
  const ref = await userCardsRef()
  const q = query(ref, where('nextReview', '<=', Date.now()), orderBy('nextReview', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Card))
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  const all = await getAllCards()
  const map = new Map<string, number>()
  for (const card of all) {
    map.set(card.category, (map.get(card.category) || 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
}

export async function getStats(): Promise<Stats> {
  const all = await getAllCards()
  const now = Date.now()
  let mastered = 0
  let dueToday = 0
  let newCards = 0
  const catMap = new Map<string, number>()

  for (const card of all) {
    if (card.level >= 6) mastered++
    if (card.nextReview <= now) dueToday++
    if (card.reviewHistory.length === 0) newCards++
    catMap.set(card.category, (catMap.get(card.category) || 0) + 1)
  }

  return {
    total: all.length,
    mastered,
    dueToday,
    newCards,
    categories: Array.from(catMap.entries()).map(([name, count]) => ({ name, count })),
  }
}
