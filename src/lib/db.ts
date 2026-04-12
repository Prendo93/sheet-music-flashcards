import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'
import type { CardRecord, ReviewLogRecord, UserSettings } from '../types.ts'
import { DEFAULT_SETTINGS } from '../types.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'sheet-music-flashcards'
const DB_VERSION = 1

// ---------------------------------------------------------------------------
// Singleton database connection
// ---------------------------------------------------------------------------

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cards store
      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' })
        cardStore.createIndex('due', 'due')
        cardStore.createIndex('state', 'state')
      }

      // Review logs store
      if (!db.objectStoreNames.contains('reviewLogs')) {
        const reviewStore = db.createObjectStore('reviewLogs', { keyPath: 'id' })
        reviewStore.createIndex('cardId', 'cardId')
        reviewStore.createIndex('reviewed_at', 'reviewed_at')
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' })
      }
    },
  })

  return dbInstance
}

// ---------------------------------------------------------------------------
// Card CRUD
// ---------------------------------------------------------------------------

export async function getCard(id: string): Promise<CardRecord | undefined> {
  const db = await getDB()
  return db.get('cards', id)
}

export async function putCard(card: CardRecord): Promise<void> {
  const db = await getDB()
  await db.put('cards', card)
}

export async function getAllCards(): Promise<CardRecord[]> {
  const db = await getDB()
  return db.getAll('cards')
}

export async function getCardsDue(before: Date): Promise<CardRecord[]> {
  const db = await getDB()
  const range = IDBKeyRange.upperBound(before)
  return db.getAllFromIndex('cards', 'due', range)
}

export async function getCardsByState(state: 0 | 1 | 2 | 3): Promise<CardRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('cards', 'state', state)
}

export async function putCards(cards: CardRecord[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('cards', 'readwrite')
  for (const card of cards) {
    await tx.store.put(card)
  }
  await tx.done
}

// ---------------------------------------------------------------------------
// Review Log CRUD
// ---------------------------------------------------------------------------

export async function addReviewLog(log: ReviewLogRecord): Promise<void> {
  const db = await getDB()
  await db.add('reviewLogs', log)
}

export async function getReviewLogsByCard(cardId: string): Promise<ReviewLogRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('reviewLogs', 'cardId', cardId)
}

export async function getReviewLogsSince(since: Date): Promise<ReviewLogRecord[]> {
  const db = await getDB()
  const range = IDBKeyRange.lowerBound(since)
  return db.getAllFromIndex('reviewLogs', 'reviewed_at', range)
}

// ---------------------------------------------------------------------------
// Settings CRUD
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<UserSettings> {
  const db = await getDB()
  const stored = await db.get('settings', 'user_settings')
  if (stored) return stored as UserSettings
  return { ...DEFAULT_SETTINGS, updated_at: new Date() }
}

export async function putSettings(settings: UserSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', settings)
}

// ---------------------------------------------------------------------------
// Storage Safety
// ---------------------------------------------------------------------------

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator?.storage?.persist) {
      return await navigator.storage.persist()
    }
    return false
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

export async function resetDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }

  // Delete the database entirely
  const request = indexedDB.deleteDatabase(DB_NAME)
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
