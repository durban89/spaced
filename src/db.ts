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
} from 'firebase/firestore'
import { db } from './firebase'
import { getCurrentUser } from './auth'
import type { Card, Stats } from './types'

function userCardsRef() {
  const user = getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return collection(db, 'users', user.uid, 'cards')
}

function cardRef(id: string) {
  const user = getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return doc(db, 'users', user.uid, 'cards', id)
}

export async function addCard(
  card: Omit<Card, 'id' | 'level' | 'nextReview' | 'reviewHistory' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now()
  const docRef = await addDoc(userCardsRef(), {
    ...card,
    level: 0,
    nextReview: now,
    reviewHistory: [],
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateCard(id: string, data: Partial<Card>): Promise<void> {
  await updateDoc(cardRef(id), { ...data, updatedAt: Date.now() })
}

export async function deleteCard(id: string): Promise<void> {
  await deleteDoc(cardRef(id))
}

export async function getCard(id: string): Promise<Card | undefined> {
  const snap = await getDoc(cardRef(id))
  if (!snap.exists()) return undefined
  return { id: snap.id, ...snap.data() } as Card
}

export async function getAllCards(): Promise<Card[]> {
  const snap = await getDocs(userCardsRef())
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Card))
}

export async function getCardsByCategory(category: string): Promise<Card[]> {
  const q = query(userCardsRef(), where('category', '==', category))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Card))
}

export async function getDueCards(): Promise<Card[]> {
  const all = await getAllCards()
  const now = Date.now()
  return all.filter((c) => c.nextReview <= now)
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
  const dueToday = all.filter((c) => c.nextReview <= now).length
  const mastered = all.filter((c) => c.level >= 6).length
  const newCards = all.filter((c) => c.reviewHistory.length === 0).length
  const categories = await getCategories()
  return {
    total: all.length,
    mastered,
    dueToday,
    newCards,
    categories,
  }
}

export async function exportData(): Promise<Card[]> {
  return getAllCards()
}

export async function importData(cards: Card[]): Promise<void> {
  for (const card of cards) {
    const { id, ...rest } = card
    if (id) {
      await updateDoc(cardRef(id), rest)
    } else {
      await addDoc(userCardsRef(), rest)
    }
  }
}
