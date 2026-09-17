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
  setDoc,
  arrayUnion,
  type Firestore,
} from 'firebase/firestore'
import { getCurrentUser } from './auth'
import { cancelCardNotification } from './nativeNotifications'
import { CATEGORY_PRESETS, type Card, type Stats } from './types'

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

async function userRef() {
  const user = getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const db = await getDb()
  return doc(db, 'users', user.uid)
}

const ARRAY_UNION_MAX = 20

export async function getStudyDates(): Promise<string[]> {
  const ref = await userRef()
  const snap = await getDoc(ref)
  const data = snap.data()
  if (!data || !Array.isArray(data.studyDates)) return []
  return data.studyDates.filter((d): d is string => typeof d === 'string')
}

export async function addStudyDates(days: string[]): Promise<void> {
  const ref = await userRef()
  const unique = [...new Set(days)]
  for (let i = 0; i < unique.length; i += ARRAY_UNION_MAX) {
    const chunk = unique.slice(i, i + ARRAY_UNION_MAX)
    await setDoc(ref, { studyDates: arrayUnion(...chunk) }, { merge: true })
  }
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

export async function getCategoryList(): Promise<string[]> {
  const ref = await userRef()
  const snap = await getDoc(ref)
  const data = snap.data()
  if (data && Array.isArray(data.categories)) {
    const list = data.categories.filter((c): c is string => typeof c === 'string')
    if (list.length > 0) return list
  }
  return CATEGORY_PRESETS
}

export async function saveCategoryList(categories: string[]): Promise<void> {
  const ref = await userRef()
  await setDoc(ref, { categories: [...new Set(categories)] }, { merge: true })
}

export async function renameCategory(oldName: string, newName: string): Promise<void> {
  const list = await getCategoryList()
  await saveCategoryList(list.map((c) => (c === oldName ? newName : c)))
  const cards = await getCardsByCategory(oldName)
  for (const card of cards) {
    if (card.id) await updateCard(card.id, { category: newName })
  }
}

export async function deleteCategory(name: string): Promise<void> {
  const list = await getCategoryList()
  await saveCategoryList(list.filter((c) => c !== name))
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
