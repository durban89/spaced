import { openDB, type IDBPDatabase } from 'idb'
import type { Card, Stats } from './types'

const DB_NAME = 'aosibin-db'
const DB_VERSION = 1
const STORE_NAME = 'cards'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('category', 'category')
          store.createIndex('nextReview', 'nextReview')
        }
      },
    })
  }
  return dbPromise
}

export async function addCard(
  card: Omit<Card, 'id' | 'level' | 'nextReview' | 'reviewHistory' | 'createdAt' | 'updatedAt'>
): Promise<IDBValidKey> {
  const db = await getDB()
  const now = Date.now()
  return db.add(STORE_NAME, {
    ...card,
    level: 0,
    nextReview: now,
    reviewHistory: [],
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateCard(id: number, data: Partial<Card>): Promise<void> {
  const db = await getDB()
  const existing = await db.get(STORE_NAME, id)
  if (existing) {
    await db.put(STORE_NAME, { ...existing, ...data, updatedAt: Date.now() })
  }
}

export async function deleteCard(id: number): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getCard(id: number): Promise<Card | undefined> {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

export async function getAllCards(): Promise<Card[]> {
  const db = await getDB()
  return db.getAll(STORE_NAME)
}

export async function getCardsByCategory(category: string): Promise<Card[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORE_NAME, 'category', category)
}

export async function getDueCards(): Promise<Card[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  const now = Date.now()
  return all.filter((c) => c.nextReview <= now)
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
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
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  for (const card of cards) {
    const { id, ...rest } = card
    await tx.store.put(rest)
  }
  await tx.done
}
